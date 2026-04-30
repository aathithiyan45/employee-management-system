import pandas as pd
import io
import os
import logging
from datetime import datetime
from django.utils import timezone
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.http import HttpResponse

from .models import Employee, Division, User
from apps.analytics.utils import log_event
from apps.accounts.utils import send_invite_email

logger = logging.getLogger(__name__)

class EmployeeImportPipeline:
    """
    Enterprise-grade Excel import pipeline.
    Optimized for memory (chunking), performance (cached lookups), 
    and data integrity (duplicate detection).
    """
    
    REQUIRED_FIELDS = ["EMP_ID", "NAME", "EMAIL", "COMPANY"]
    MAX_ERROR_ROWS = 500  # Cap error report size for stability

    def __init__(self, file_obj, user):
        self.file_obj = file_obj
        self.user = user
        self.results = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "errors": [],
            "error_file_data": None
        }
        # In-memory caches to reduce DB queries
        self.division_cache = {d.name.upper(): d for d in Division.objects.all()}
        self.seen_emp_ids = set()
        self.seen_emails = set()

    def _safe_date(self, value):
        if pd.isna(value) or not str(value).strip(): return None
        try:
            return pd.to_datetime(value, errors="coerce").date()
        except: return None

    def _safe_float(self, value):
        if pd.isna(value) or not str(value).strip(): return 0.0
        try:
            return float(value)
        except: return 0.0

    def _safe_bool(self, value):
        if pd.isna(value) or value == "": return False
        s = str(value).strip().upper()
        return s in ("1", "Y", "YES", "TRUE", "T")

    def run(self):
        log_event(self.user, "bulk_import_started", {"filename": getattr(self.file_obj, 'name', 'unknown')})
        
        try:
            # Note: pd.read_excel doesn't support chunksize natively like read_csv.
            # We load the full DF but process it in batches to manage memory/transactions.
            # For massive files (100k+ rows), openpyxl.load_workbook(read_only=True) is preferred.
            full_df = pd.read_excel(self.file_obj, dtype=str)
            full_df.columns = [c.strip().upper() for c in full_df.columns]
            self.results["total"] = len(full_df)
        except Exception as e:
            logger.error(f"Import failed during Excel read: {str(e)}")
            return False, f"Invalid Excel format: {str(e)}"

        # Validate columns
        missing_cols = [c for c in self.REQUIRED_FIELDS if c not in full_df.columns]
        if missing_cols:
            return False, f"Missing required columns: {', '.join(missing_cols)}"

        rows_with_errors = []
        
        # Process in batches of 500 for a balance of speed and partial success safety
        batch_size = 500
        for start in range(0, len(full_df), batch_size):
            chunk = full_df.iloc[start:start + batch_size]
            
            # Use atomic per batch to speed up inserts while allowing partial batch success
            # If one row fails, we catch it inside so the rest of the batch survives.
            for index, row in chunk.iterrows():
                row_dict = row.to_dict()
                row_num = index + 2
                row_errors = []

                # 1. Mandatory Field Check
                for field in self.REQUIRED_FIELDS:
                    if not str(row_dict.get(field, "")).strip():
                        row_errors.append({"field": field, "error": "Missing required field"})

                # 2. Duplicate Check (In-File)
                emp_id = str(row_dict.get("EMP_ID", "")).strip().upper()
                email = str(row_dict.get("EMAIL", "")).strip().lower()

                if emp_id in self.seen_emp_ids:
                    row_errors.append({"field": "EMP_ID", "error": "Duplicate EMP_ID in file"})
                self.seen_emp_ids.add(emp_id)

                if email:
                    if email in self.seen_emails:
                        row_errors.append({"field": "EMAIL", "error": "Duplicate EMAIL in file"})
                    self.seen_emails.add(email)
                    
                    # 3. Email Uniqueness (In-DB)
                    # Check if email exists for a DIFFERENT user
                    if User.objects.filter(email__iexact=email).exclude(username=emp_id).exists():
                        row_errors.append({"field": "EMAIL", "error": "Email already in use by another account"})

                    # 4. Email Format
                    try:
                        validate_email(email)
                    except ValidationError:
                        row_errors.append({"field": "EMAIL", "error": "Invalid email format"})

                if row_errors:
                    self._handle_error(row_dict, row_num, row_errors, rows_with_errors)
                    continue

                # 5. Process DB Operations
                try:
                    with transaction.atomic():
                        # Cached Division Lookup
                        company_name = str(row_dict.get("COMPANY")).strip().upper()
                        if company_name not in self.division_cache:
                            div = Division.objects.create(name=company_name)
                            self.division_cache[company_name] = div
                        division = self.division_cache[company_name]

                        salary = self._safe_float(row_dict.get("IPA_SALARY"))
                        
                        defaults = {
                            "name":          str(row_dict.get("NAME")).strip(),
                            "phone":         str(row_dict.get("HP_NUMBER", "")).strip() or None,
                            "nationality":   str(row_dict.get("NATIONALITY", "")).strip() or None,
                            "dob":           self._safe_date(row_dict.get("DOB")),
                            "division":      division,
                            "is_active":     self._safe_bool(row_dict.get("IS_ACTIVE", True)),
                            "designation_ipa": str(row_dict.get("IPA_DESIGNATION", "")).strip() or None,
                            "designation_aug": str(row_dict.get("TRADE", "")).strip() or None,
                            "ipa_salary":      salary,
                            "salary":          salary,
                            "per_hr":          self._safe_float(row_dict.get("PER_HR")),
                            "doa":                 self._safe_date(row_dict.get("DOA")),
                            "arrival_date":        self._safe_date(row_dict.get("ARRIVAL_DATE")),
                            "date_joined_company": self._safe_date(row_dict.get("DATE_JOINED")),
                            "work_permit_no": str(row_dict.get("IC_WP_NO", "")).strip() or None,
                            "fin_no":         str(row_dict.get("FIN_NO", "")).strip() or None,
                            "ic_status":      str(row_dict.get("IC_TYPE", "")).strip() or None,
                            "issue_date":     self._safe_date(row_dict.get("ISSUANCE_DATE")),
                            "wp_expiry":      self._safe_date(row_dict.get("WORK_PERMIT_EXPIRY")),
                            "passport_no":     str(row_dict.get("PP_NO", "")).strip() or None,
                            "passport_expiry": self._safe_date(row_dict.get("PP_EXPIRY")),
                            "ssic_gt_sn":      str(row_dict.get("SSIC_GT_SN", "")).strip() or None,
                            "ssic_gt_exp":     self._safe_date(row_dict.get("SSIC_GT_EXP_DATE")),
                            "work_at_height":   self._safe_bool(row_dict.get("WORK_AT_HEIGHT")),
                            "confined_space":   self._safe_bool(row_dict.get("CONFINED_SPACE")),
                            "signalman_rigger": self._safe_bool(row_dict.get("SIGNALMAN_RIGGER")),
                            "bank_account":     str(row_dict.get("BANK_ACCOUNT_NUMBER", "")).strip() or None,
                            "accommodation":    str(row_dict.get("ACCOMMODATION", "")).strip() or None,
                            "remarks":          str(row_dict.get("REMARKS", "")).strip() or None,
                        }

                        employee, created = Employee.objects.update_or_create(
                            emp_id=emp_id,
                            defaults=defaults
                        )

                        # User Management
                        user_obj, user_created = User.objects.get_or_create(
                            username=emp_id,
                            defaults={"email": email, "role": "employee"}
                        )
                        
                        if user_created:
                            send_invite_email(user_obj)
                        elif user_obj.email != email:
                            user_obj.email = email
                            user_obj.save(update_fields=['email'])

                        if not employee.user:
                            employee.user = user_obj
                            employee.save(update_fields=['user'])

                    self.results["success"] += 1
                except Exception as e:
                    self._handle_error(row_dict, row_num, [{"field": "SYSTEM", "error": str(e)}], rows_with_errors)

        # 6. Finalize Error Report
        if rows_with_errors:
            # Cap the report to prevent memory OOM on massive failure files
            report_data = rows_with_errors[:self.MAX_ERROR_ROWS]
            error_df = pd.DataFrame(report_data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                error_df.to_excel(writer, index=False, sheet_name='Errors')
            self.results["error_file_data"] = output.getvalue()

        log_event(self.user, "bulk_import_finished", {
            "total": self.results["total"],
            "success": self.results["success"],
            "failed": self.results["failed"],
            "has_errors": len(rows_with_errors) > 0
        })

        return True, self.results

    def _handle_error(self, row_dict, row_num, row_errors, error_list):
        self.results["failed"] += 1
        error_msg = "; ".join([f"{e['field']}: {e['error']}" for e in row_errors])
        row_dict["IMPORT_ERROR"] = error_msg
        error_list.append(row_dict)
        if len(self.results["errors"]) < 100: # Limit JSON feedback to first 100
            self.results["errors"].append({"row": row_num, "details": row_errors})

def generate_error_response(error_data):
    response = HttpResponse(
        error_data,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="import_errors.xlsx"'
    return response
