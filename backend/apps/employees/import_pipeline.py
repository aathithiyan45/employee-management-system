import pandas as pd
import io
import os
import time
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
    High-performance enterprise-grade ingestion pipeline.
    Implements a three-phase ingestion pattern:
    Phase 1: Pre-create/cache dependencies.
    Phase 2: Validate & transform (No DB writes).
    Phase 3: Clean Bulk DB Operations with fallback for visibility.
    """
    
    REQUIRED_FIELDS = ["EMP_ID", "NAME", "COMPANY"]
    MAX_ERROR_ROWS = 500
    BATCH_SIZE = 500

    def __init__(self, file_obj, user, send_email=True):
        self.file_obj = file_obj
        self.user = user
        self.send_email_global = send_email
        self.start_time = None
        self.results = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "errors": [],
            "error_file_data": None
        }
        
        # In-memory caches for fast lookups
        self.division_cache = {d.name.upper(): d for d in Division.objects.all()}
        self.existing_emails = set(User.objects.values_list("email", flat=True))
        self.existing_emp_ids = set(Employee.objects.values_list("emp_id", flat=True))
        
        # In-file duplicate detection
        self.seen_emp_ids = set()
        self.seen_emails = set()

    def _safe_str(self, value):
        if pd.isna(value): return ""
        s = str(value).strip()
        if s.lower() in ("nan", "none"): return ""
        return s

    def _safe_date(self, value):
        if pd.isna(value): return None
        s = str(value).strip()
        if not s or s.lower() in ("nan", "none"): return None
        try:
            return pd.to_datetime(value, errors="coerce").date()
        except: return None

    def _safe_float(self, value):
        if pd.isna(value): return 0.0
        s = str(value).strip()
        if not s or s.lower() in ("nan", "none"): return 0.0
        try:
            return float(value)
        except: return 0.0

    def _safe_bool(self, value):
        if pd.isna(value): return False
        s = str(value).strip().upper()
        if not s or s in ("NAN", "NONE"): return False
        return s in ("1", "Y", "YES", "TRUE", "T")

    def run(self):
        self.start_time = time.time()
        log_event(self.user, "bulk_import_started", {"filename": getattr(self.file_obj, 'name', 'unknown')})
        
        try:
            full_df = pd.read_excel(self.file_obj, dtype=str)
            
            # Aggressive normalization: Remove all non-alphanumeric characters
            # e.g. "D.O.B" -> "DOB", "EMP ID" -> "EMPID", "IC / WP NO" -> "ICWPNO"
            import re
            def normalize(c):
                return re.sub(r'[^a-zA-Z0-9]+', '', str(c)).upper()
            
            full_df.columns = [normalize(c) for c in full_df.columns]
            self.results["total"] = len(full_df)
            logger.info(f"Normalized columns: {list(full_df.columns)}")
        except Exception as e:
            logger.error(f"Excel read error: {str(e)}")
            return False, f"Invalid Excel format: {str(e)}"

        # Validate columns
        # Required: EMPID, NAME, EMAIL, COMPANY
        REQUIRED_MAP = {"EMPID": "EMP_ID", "NAME": "NAME", "COMPANY": "COMPANY"}
        missing_cols = [v for k, v in REQUIRED_MAP.items() if k not in full_df.columns]
        
        if missing_cols:
            logger.error(f"Missing columns. Expected pure keys: {list(REQUIRED_MAP.keys())}. Got: {list(full_df.columns)}")
            return False, f"Missing required columns: {', '.join(missing_cols)}"

        rows_with_errors = []
        new_users_to_invite = []

        # Process in chunks of BATCH_SIZE
        processed_rows = 0
        for i in range(0, len(full_df), self.BATCH_SIZE):
            chunk = full_df.iloc[i : i + self.BATCH_SIZE]
            self._process_chunk(chunk, rows_with_errors, new_users_to_invite)
            
            processed_rows += len(chunk)
            if hasattr(self, 'progress_callback') and callable(self.progress_callback):
                self.progress_callback(processed_rows, self.results["total"])

        # Batch Invite Emails (Async via Celery)
        if self.send_email_global and new_users_to_invite:
            from apps.accounts.tasks import send_bulk_invite_emails
            user_ids = [u.id for u in new_users_to_invite]
            send_bulk_invite_emails(user_ids)

        # Generate Error File if needed
        if rows_with_errors:
            report_data = rows_with_errors[:self.MAX_ERROR_ROWS]
            error_df = pd.DataFrame(report_data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                error_df.to_excel(writer, index=False, sheet_name='Errors')
            self.results["error_file_data"] = output.getvalue()

        duration_ms = int((time.time() - self.start_time) * 1000)
        log_event(self.user, "bulk_import_finished", {
            "total": self.results["total"],
            "success": self.results["success"],
            "failed": self.results["failed"],
            "duration_ms": duration_ms
        })

        return True, self.results

    def _process_chunk(self, chunk, rows_with_errors, new_users_to_invite):
        # --- Phase 1: Pre-create Missing Divisions (Bulk Optimization) ---
        chunk_companies = {str(row.get("COMPANY", "")).strip().upper() for _, row in chunk.iterrows() if str(row.get("COMPANY", "")).strip()}
        missing_divisions = [name for name in chunk_companies if name and name not in self.division_cache]
        if missing_divisions:
            new_divs = [Division(name=name) for name in missing_divisions]
            Division.objects.bulk_create(new_divs, ignore_conflicts=True)
            self.division_cache.update({d.name.upper(): d for d in Division.objects.filter(name__in=missing_divisions)})

        # --- Phase 2: Validation & Transformation (No DB Writes) ---
        chunk_data = []
        for index, row in chunk.iterrows():
            row_dict = row.to_dict()
            row_num = index + 2
            row_errors = []

            emp_id = self._safe_str(row_dict.get("EMPID", row_dict.get("EMP_ID", ""))).upper()
            email = self._safe_str(row_dict.get("EMAIL", "")).lower() or None
            name = self._safe_str(row_dict.get("NAME", ""))
            company = self._safe_str(row_dict.get("COMPANY", ""))

            if not emp_id or not name or not company:
                row_errors.append({"field": "GENERAL", "error": "Missing required fields (EMP ID, Name, and Company are required)"})

            if emp_id in self.seen_emp_ids:
                row_errors.append({"field": "EMP_ID", "error": "Duplicate in file"})
            self.seen_emp_ids.add(emp_id)

            if email and email in self.seen_emails:
                row_errors.append({"field": "EMAIL", "error": "Duplicate in file"})
            if email: self.seen_emails.add(email)

            if email and email in self.existing_emails and emp_id not in self.existing_emp_ids:
                row_errors.append({"field": "EMAIL", "error": "Email already in use"})

            if row_errors:
                self._handle_error(row_dict, row_num, row_errors, rows_with_errors)
                continue

            company_name = str(row_dict.get("COMPANY")).strip().upper()
            division = self.division_cache.get(company_name)
            salary = self._safe_float(row_dict.get("IPASALARY", row_dict.get("IPA_SALARY")))
            
            chunk_data.append({
                "emp_id": emp_id,
                "email": email,
                "division": division,
                "salary": salary,
                "row_dict": row_dict
            })

        if not chunk_data: return

        # --- Phase 3: Clean Bulk DB Operations ---
        try:
            with transaction.atomic():
                # Step A: Sync Users (Only for rows with emails)
                rows_with_emails = [d for d in chunk_data if d['email']]
                user_map = {}
                if rows_with_emails:
                    user_map = {u.username: u for u in User.objects.filter(username__in=[d['emp_id'] for d in rows_with_emails])}
                    users_to_create = []
                    users_to_update = []

                    for d in rows_with_emails:
                        username = d['emp_id']
                        email = d['email']
                        if username in user_map:
                            u = user_map[username]
                            if u.email != email:
                                u.email = email
                                users_to_update.append(u)
                            
                            if not u.has_usable_password():
                                row_dict = d['row_dict']
                                row_override = row_dict.get("SENDEMAIL", row_dict.get("SEND_EMAIL"))
                                should_invite = self.send_email_global
                                if row_override is not None:
                                    should_invite = self._safe_bool(row_override)
                                if should_invite:
                                    new_users_to_invite.append(u)
                        else:
                            u = User(username=username, email=email, role='employee')
                            u.set_unusable_password()
                            users_to_create.append(u)
                            
                            row_dict = d['row_dict']
                            row_override = row_dict.get("SENDEMAIL", row_dict.get("SEND_EMAIL"))
                            should_invite = self.send_email_global
                            if row_override is not None:
                                should_invite = self._safe_bool(row_override)
                            if should_invite:
                                new_users_to_invite.append(u)

                    if users_to_create:
                        User.objects.bulk_create(users_to_create)
                    if users_to_update:
                        User.objects.bulk_update(users_to_update, fields=['email'])
                    
                    # Refresh user_map after creation
                    user_map = {u.username: u for u in User.objects.filter(username__in=[d['emp_id'] for d in rows_with_emails])}

                user_map = {u.username: u for u in User.objects.filter(username__in=[d['emp_id'] for d in chunk_data])}
                emp_map = {e.emp_id: e for e in Employee.objects.filter(emp_id__in=[d['emp_id'] for d in chunk_data])}
                
                emps_to_create = []
                emps_to_update = []

                for d in chunk_data:
                    eid = d['emp_id']
                    rd = d['row_dict']
                    user = user_map.get(eid)
                    fields = {
                        "name": self._safe_str(rd.get("NAME")),
                        "phone": self._safe_str(rd.get("HPNUMBER", rd.get("PHONE", ""))) or None,
                        "nationality": self._safe_str(rd.get("NATIONALITY", "")) or None,
                        "dob": self._safe_date(rd.get("DOB")),
                        "division": d['division'],
                        "is_active": self._safe_bool(rd.get("ISACTIVE", True)),
                        "designation_ipa": self._safe_str(rd.get("IPADESIGNATION", "")) or None,
                        "designation_aug": self._safe_str(rd.get("TRADE", rd.get("DESIGNATIONAUG", ""))) or None,
                        "trade": self._safe_str(rd.get("TRADE", "")) or None,
                        "ipa_salary": d['salary'],
                        "salary": d['salary'],
                        "per_hr": self._safe_float(rd.get("PERHR")),
                        "doa": self._safe_date(rd.get("DOA")),
                        "arrival_date": self._safe_date(rd.get("ARRIVALDATE")),
                        "date_joined_company": self._safe_date(rd.get("DATEJOINED")),
                        "work_permit_no": self._safe_str(rd.get("ICWPNO", rd.get("WORKPERMITNO", ""))) or None,
                        "fin_no": self._safe_str(rd.get("FINNO", "")) or None,
                        "ic_status": self._safe_str(rd.get("ICTYPE", "")) or None,
                        "issue_date": self._safe_date(rd.get("ISSUANCEDATE")),
                        "wp_expiry": self._safe_date(rd.get("SPASSWPEXPRIY", rd.get("WPEXPIRY", rd.get("WORKPERMITEXPIRY", "")))),
                        "passport_no": self._safe_str(rd.get("PPNO", rd.get("PASSPORTNO", ""))) or None,
                        "passport_expiry": self._safe_date(rd.get("PPEXPIRY", rd.get("PASSPORTEXPIRY", ""))),
                        "ssic_gt_sn": self._safe_str(rd.get("SSICGTSN", "")) or None,
                        "ssic_gt_exp": self._safe_date(rd.get("SSICGTEXPDATE")),
                        "ssic_ht_sn": self._safe_str(rd.get("SSICHTSN", "")) or None,
                        "ssic_ht_exp": self._safe_date(rd.get("SSICHTEXPDATE")),
                        "work_at_height": self._safe_bool(rd.get("WORKATHEIGHT")),
                        "confined_space": self._safe_bool(rd.get("CONFINEDSPACE")),
                        "signalman_rigger": self._safe_bool(rd.get("SIGNALMANRIGGERCOURSE", rd.get("SIGNALMANRIGGER", ""))),
                        "bank_account": self._safe_str(rd.get("BANKACCOUNTNUMBER", "")) or None,
                        "accommodation": self._safe_str(rd.get("ACCOMODATION", rd.get("ACCOMMODATION", ""))) or None,
                        "remarks": self._safe_str(rd.get("REMARKS", "")) or None,
                        "user": user
                    }

                    if eid in emp_map:
                        e = emp_map[eid]
                        is_dirty = False
                        for attr, val in fields.items():
                            if getattr(e, attr) != val:
                                setattr(e, attr, val)
                                is_dirty = True
                        if is_dirty: emps_to_update.append(e)
                    else:
                        emps_to_create.append(Employee(emp_id=eid, **fields))

                if emps_to_create: Employee.objects.bulk_create(emps_to_create)
                if emps_to_update: Employee.objects.bulk_update(emps_to_update, fields=list(fields.keys()))

                self.results["success"] += len(chunk_data)
        except (IntegrityError, Exception) as e:
            logger.warning(f"Bulk chunk operation failed ({str(e)}), falling back to row-by-row.")
            for d in chunk_data:
                try:
                    with transaction.atomic():
                        username = d['emp_id']
                        email = d['email']
                        user = None
                        
                        if email:
                            user, created = User.objects.get_or_create(username=username, defaults={"email": email, "role": "employee"})
                            if not created:
                                if user.email != email:
                                    user.email = email
                                    user.save(update_fields=['email'])
                            else:
                                user.set_unusable_password()
                                user.save()
                            
                            # Invite if new OR existing without password
                            if not user.has_usable_password():
                                row_dict = d['row_dict']
                                row_override = row_dict.get("SENDEMAIL", row_dict.get("SEND_EMAIL"))
                                should_invite = self.send_email_global
                                if row_override is not None:
                                    should_invite = self._safe_bool(row_override)
                                if should_invite:
                                    new_users_to_invite.append(user)
                        
                        rd = d['row_dict']
                        fields = {
                            "name": self._safe_str(rd.get("NAME")),
                            "phone": self._safe_str(rd.get("HPNUMBER", rd.get("PHONE", ""))) or None,
                            "nationality": self._safe_str(rd.get("NATIONALITY", "")) or None,
                            "dob": self._safe_date(rd.get("DOB")),
                            "division": d['division'],
                            "is_active": self._safe_bool(rd.get("ISACTIVE", True)),
                            "designation_ipa": self._safe_str(rd.get("IPADESIGNATION", "")) or None,
                            "designation_aug": self._safe_str(rd.get("TRADE", rd.get("DESIGNATIONAUG", ""))) or None,
                            "trade": self._safe_str(rd.get("TRADE", "")) or None,
                            "ipa_salary": d['salary'],
                            "salary": d['salary'],
                            "per_hr": self._safe_float(rd.get("PERHR")),
                            "doa": self._safe_date(rd.get("DOA")),
                            "arrival_date": self._safe_date(rd.get("ARRIVALDATE")),
                            "date_joined_company": self._safe_date(rd.get("DATEJOINED")),
                            "work_permit_no": self._safe_str(rd.get("ICWPNO", rd.get("WORKPERMITNO", ""))) or None,
                            "fin_no": self._safe_str(rd.get("FINNO", "")) or None,
                            "ic_status": self._safe_str(rd.get("ICTYPE", "")) or None,
                            "issue_date": self._safe_date(rd.get("ISSUANCEDATE")),
                            "wp_expiry": self._safe_date(rd.get("SPASSWPEXPRIY", rd.get("WPEXPIRY", rd.get("WORKPERMITEXPIRY", "")))),
                            "passport_no": str(rd.get("PPNO", rd.get("PASSPORTNO", ""))).strip() or None,
                            "passport_expiry": self._safe_date(rd.get("PPEXPIRY", rd.get("PASSPORTEXPIRY", ""))),
                            "ssic_gt_sn": str(rd.get("SSICGTSN", "")).strip() or None,
                            "ssic_gt_exp": self._safe_date(rd.get("SSICGTEXPDATE")),
                            "ssic_ht_sn": str(rd.get("SSICHTSN", "")).strip() or None,
                            "ssic_ht_exp": self._safe_date(rd.get("SSICHTEXPDATE")),
                            "work_at_height": self._safe_bool(rd.get("WORKATHEIGHT")),
                            "confined_space": self._safe_bool(rd.get("CONFINEDSPACE")),
                            "signalman_rigger": self._safe_bool(rd.get("SIGNALMANRIGGERCOURSE", rd.get("SIGNALMANRIGGER", ""))),
                            "bank_account": str(rd.get("BANKACCOUNTNUMBER", "")).strip() or None,
                            "accommodation": str(rd.get("ACCOMODATION", rd.get("ACCOMMODATION", ""))).strip() or None,
                            "remarks": str(rd.get("REMARKS", "")).strip() or None,
                            "user": user
                        }
                        Employee.objects.update_or_create(emp_id=username, defaults=fields)
                        self.results["success"] += 1
                except Exception as row_err:
                    self._handle_error(d['row_dict'], 0, [{"field": "DB", "error": str(row_err)}], rows_with_errors)

    def _handle_error(self, row_dict, row_num, row_errors, error_list):
        self.results["failed"] += 1
        
        # Stop collecting row data for the Excel report after the limit to save RAM
        if len(error_list) < self.MAX_ERROR_ROWS:
            error_msg = "; ".join([f"{e['field']}: {e['error']}" for e in row_errors])
            row_dict["IMPORT_ERROR"] = error_msg
            error_list.append(row_dict)
            
        # Stop collecting JSON details after 100 for API response brevity
        if len(self.results["errors"]) < 100:
            self.results["errors"].append({"row": row_num, "details": row_errors})

def generate_error_response(error_data):
    response = HttpResponse(
        error_data,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="import_errors.xlsx"'
    return response
