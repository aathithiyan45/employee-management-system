"""
views.py — Full Production Views File
Covers: Auth, Dashboard, Charts, Import, Employees, Leave Management
"""

import pandas as pd
from datetime import date, timedelta, datetime

from django.contrib.auth import authenticate
from django.db.models import Q, Count
from django.core.exceptions import ValidationError
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    Employee, Division, User,
)
from apps.leave.models import LeaveBalance, LeaveRequest

import secrets
import string
import io
import openpyxl
from django.http import HttpResponse, FileResponse
import os


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def safe_date(value):
    """Parse any date value from Excel safely. Returns a date object (not datetime).
    Use for DateField columns only (dob, doa, expiry dates, etc.).
    For DateTimeField columns use safe_datetime() instead."""
    try:
        if value is None or value == "":
            return None
        if pd.isna(value):
            return None
        d = pd.to_datetime(value, errors="coerce", dayfirst=True)
        return d.date() if not pd.isna(d) else None
    except Exception:
        return None


def safe_datetime(value):
    """Parse any datetime value from Excel safely.
    Returns a timezone-aware datetime (UTC) so Django never emits a
    'received a naive datetime' RuntimeWarning for DateTimeField columns."""
    try:
        if value is None or value == "":
            return None
        if pd.isna(value):
            return None
        d = pd.to_datetime(value, errors="coerce", dayfirst=True)
        if pd.isna(d):
            return None
        # Make timezone-aware in UTC — avoids RuntimeWarning when USE_TZ=True
        return timezone.make_aware(d.to_pydatetime(), timezone.utc)
    except Exception:
        return None


def safe_get(row, key):
    """Get string value from row safely."""
    val = row.get(key)
    try:
        if pd.isna(val) or val is None:
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip() if val is not None else ""


def safe_float(val):
    """Parse float, return None if invalid."""
    try:
        f = float(val)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


def safe_bool(val):
    """Parse boolean from 0/1/True/False/Yes/No."""
    if val is None or val == "":
        return False
    try:
        if isinstance(val, bool):
            return val
        s = str(val).strip().lower()
        return s in ("1", "true", "yes", "y")
    except Exception:
        return False


def generate_password(length=10):
    """Generate a secure random password with letters, digits, and symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd)
                and any(c in "!@#$%" for c in pwd)):
            return pwd




# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    division_name = request.GET.get("division")

    if not division_name:
        return Response({"error": "Division required"}, status=400)

    today        = date.today()
    next_30_days = today + timedelta(days=30)
    next_60_days = today + timedelta(days=60)
    next_90_days = today + timedelta(days=90)

    if division_name == "all":
        employees = Employee.objects.all()
    else:
        employees = Employee.objects.filter(division__name=division_name)

    total    = employees.count()
    active   = employees.filter(is_active=True).count()
    inactive = employees.filter(is_active=False).count()

    active_employees = employees.filter(is_active=True)

    wp_expiring = active_employees.filter(
        wp_expiry__range=(today, next_60_days)
    ).count()

    passport_expiring = active_employees.filter(
        passport_expiry__range=(today, next_90_days)
    ).count()

    incomplete_profiles = employees.filter(
        Q(phone__isnull=True)          | Q(phone="") |
        Q(nationality__isnull=True)    | Q(nationality="") |
        Q(dob__isnull=True)            |
        Q(passport_no__isnull=True)    | Q(passport_no="") |
        Q(work_permit_no__isnull=True) | Q(work_permit_no="") |
        Q(date_joined_company__isnull=True)
    ).count()

    return Response({
        "total_employees":     total,
        "active_employees":    active,
        "inactive_employees":  inactive,
        "wp_expiring":         wp_expiring,
        "passport_expiring":   passport_expiring,
        "incomplete_profiles": incomplete_profiles,
    })


# ─────────────────────────────────────────────
# EMPLOYEE DASHBOARD
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_dashboard_view(request):
    if not hasattr(request.user, 'employee_profile'):
        return Response({"error": "Unauthorized. Employee profile not found."}, status=403)
    
    if request.user.role != "employee":
        return Response({"error": "Forbidden. Only employees can access this dashboard."}, status=403)

    emp = request.user.employee_profile
    today = date.today()

    # Get Leave Balance
    try:
        balance = LeaveBalance.objects.get(employee=emp, year=today.year)
        leave_balance_remaining = balance.annual_remaining + balance.casual_remaining + balance.medical_remaining
    except LeaveBalance.DoesNotExist:
        leave_balance_remaining = 0

    # Get Pending Requests Count
    pending_requests = LeaveRequest.objects.filter(employee=emp, status=LeaveRequest.STATUS_PENDING).count()

    # Get Upcoming Leaves
    upcoming_leaves = LeaveRequest.objects.filter(
        employee=emp, 
        status=LeaveRequest.STATUS_APPROVED, 
        start_date__gte=today
    ).count()

    # Recent leaves (limit 5)
    recent_leaves_qs = LeaveRequest.objects.filter(employee=emp).order_by('-created_at')[:5]
    recent_leaves = [
        {
            "id": lr.id,
            "type": lr.get_leave_type_display(),
            "start_date": lr.start_date,
            "end_date": lr.end_date,
            "total_days": lr.total_days,
            "status": lr.get_status_display()
        }
        for lr in recent_leaves_qs
    ]

    return Response({
        "user": {
            "name": emp.name,
            "emp_id": emp.emp_id,
            "role": emp.designation_aug or emp.designation_ipa or "Employee",
            "division": emp.division.name if emp.division else "N/A"
        },
        "summary": {
            "leave_balance": leave_balance_remaining,
            "pending_requests": pending_requests,
            "upcoming_leaves": upcoming_leaves
        },
        "documents": {
            "passport_expiring": emp.passport_expiring_soon,
            "wp_expiring": emp.wp_expiring_soon
        },
        "recent_leaves": recent_leaves
    })





# ─────────────────────────────────────────────
# FILE UPLOAD VALIDATION HELPER
# ─────────────────────────────────────────────

# Maximum allowed upload sizes
EXCEL_MAX_BYTES      = 10 * 1024 * 1024   # 10 MB  — Excel imports
ATTACHMENT_MAX_BYTES =  5 * 1024 * 1024   #  5 MB  — Leave attachments

# Allowed Excel magic-byte signatures (first 8 bytes of file)
# xlsx / xlsm → PK zip header (50 4B 03 04)
# xls         → Compound Document header (D0 CF 11 E0 A1 B1 1A E1)
EXCEL_MAGIC = {
    b'\x50\x4b\x03\x04',           # xlsx / xlsm (ZIP-based)
    b'\xd0\xcf\x11\xe0',           # xls  (Compound Document)
}

# Allowed leave-attachment signatures
ATTACHMENT_MAGIC = {
    b'\x25\x50\x44\x46',           # PDF  (%PDF)
    b'\x89\x50\x4e\x47',           # PNG
    b'\xff\xd8\xff',               # JPEG
    b'\x50\x4b\x03\x04',           # DOCX (ZIP-based)
}

EXCEL_EXTENSIONS      = {'.xlsx', '.xls', '.xlsm'}
ATTACHMENT_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.docx'}


def validate_upload(file, allowed_extensions, allowed_magic, max_bytes):
    """
    Three-layer file validation:
      1. Size  — reject files that exceed max_bytes
      2. Extension — reject disallowed file extensions
      3. Magic bytes — read the actual first bytes of the file to confirm
                       the content matches its claimed type.
                       This catches renamed files (e.g. malware.xlsx).

    Returns (True, None) on success.
    Returns (False, "human-readable error message") on failure.
    """
    # Layer 1 — Size check (cheap, do it first)
    if file.size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        return False, f"File too large. Maximum allowed size is {limit_mb} MB."

    # Layer 2 — Extension check (case-insensitive)
    import os
    _, ext = os.path.splitext(file.name.lower())
    if ext not in allowed_extensions:
        return False, (
            f"Invalid file type '{ext}'. "
            f"Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    # Layer 3 — Magic bytes (read first 8 bytes from actual file content)
    header = file.read(8)
    file.seek(0)   # reset so subsequent readers (e.g. Pandas) start at byte 0

    matched = any(header.startswith(magic) for magic in allowed_magic)
    if not matched:
        return False, (
            "File content does not match its extension. "
            "Upload a genuine Excel file."
        )

    return True, None


# ─────────────────────────────────────────────
# EXCEL IMPORT — with auto user creation
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_excel(request):
    """
    Asynchronous Excel import with progress tracking.
    """
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "Admin or HR access only"}, status=403)

    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    # 1. Security & File Validation
    from .views import validate_upload, EXCEL_EXTENSIONS, EXCEL_MAGIC, EXCEL_MAX_BYTES
    ok, err = validate_upload(
        file,
        allowed_extensions=EXCEL_EXTENSIONS,
        allowed_magic=EXCEL_MAGIC,
        max_bytes=EXCEL_MAX_BYTES,
    )
    if not ok:
        return Response({"error": err}, status=400)

    # 2. Calculate file hash for idempotency
    import hashlib
    sha256_hash = hashlib.sha256()
    for chunk in file.chunks():
        sha256_hash.update(chunk)
    file_hash = sha256_hash.hexdigest()

    # Check for recent identical jobs (last 5 minutes and only if still active)
    from .models import ImportJob
    from django.utils import timezone
    from datetime import timedelta
    
    recent_job = ImportJob.objects.filter(
        file_hash=file_hash,
        created_at__gte=timezone.now() - timedelta(minutes=5),
        status__in=['processing', 'pending']
    ).first()

    if recent_job:
        return Response({
            "message": "This file is already being processed.",
            "job_id": str(recent_job.id),
            "status": recent_job.status
        }, status=200)

    # 3. Save file temporarily for the worker
    import os
    import uuid
    from django.conf import settings
    
    temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_imports')
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"{uuid.uuid4()}_{file.name}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    with open(temp_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    # 4. Create Import Job
    job = ImportJob.objects.create(
        created_by=request.user,
        status='pending',
        file_hash=file_hash,
        message="Waiting for worker..."
    )

    # 4. Trigger Async Task
    send_email = request.data.get('send_email', 'true')
    # Handle both boolean and string "true"/"false" from FormData
    if isinstance(send_email, str):
        send_email_bool = send_email.lower() == 'true'
    else:
        send_email_bool = bool(send_email)

    from .tasks import process_employee_import
    process_employee_import.delay(str(job.id), temp_path, request.user.id, send_email_bool)

    return Response({
        "message": "Import started",
        "job_id": str(job.id)
    }, status=202)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def import_status(request, job_id):
    """
    Poll the status of an import job.
    """
    from .models import ImportJob
    try:
        job = ImportJob.objects.get(id=job_id)
        if job.created_by != request.user and not request.user.is_admin:
            return Response({"error": "Unauthorized"}, status=403)
            
        data = {
            "id": str(job.id),
            "status": job.status,
            "progress": job.progress,
            "total_rows": job.total_rows,
            "success_count": job.success_count,
            "failed_count": job.failed_count,
            "message": job.message,
            "duration_ms": job.duration_ms,
            "created_at": job.created_at
        }
        
        if job.status == 'completed' and job.error_file:
            data["error_file_url"] = request.build_absolute_uri(job.error_file.url)
            
        return Response(data)
    except ImportJob.DoesNotExist:
        return Response({"error": "Job not found"}, status=404)


# ─────────────────────────────────────────────
# DIVISIONS
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_divisions(request):
    divisions = Division.objects.filter(is_active=True).values("id", "name")
    return Response(list(divisions))


# ─────────────────────────────────────────────
# EMPLOYEE LIST
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_list(request):
    division     = request.GET.get("division")
    status       = request.GET.get("status")
    search       = request.GET.get("search")
    designation  = request.GET.get("designation")
    nationality  = request.GET.get("nationality")
    expiry_alert = request.GET.get("expiry_alert")
    joined_from  = request.GET.get("joined_from")
    joined_to    = request.GET.get("joined_to")
    incomplete   = request.GET.get("incomplete")

    employees = Employee.objects.select_related("division").all()

    if search:
        employees = employees.filter(
            Q(emp_id__icontains=search) | 
            Q(name__icontains=search) |
            Q(work_permit_no__icontains=search) |
            Q(fin_no__icontains=search) |
            Q(ssic_gt_sn__icontains=search)
        )
    if division and division != "all":
        employees = employees.filter(division__name=division)
    if status == "active":
        employees = employees.filter(is_active=True)
    elif status == "inactive":
        employees = employees.filter(is_active=False)
    if designation:
        employees = employees.filter(
            Q(designation_aug__icontains=designation) |
            Q(designation_ipa__icontains=designation)
        )
    if nationality:
        employees = employees.filter(nationality__icontains=nationality)
    if expiry_alert:
        today   = date.today()
        next_60 = today + timedelta(days=60)
        next_90 = today + timedelta(days=90)
        employees = employees.filter(is_active=True)
        if expiry_alert == "wp":
            employees = employees.filter(wp_expiry__range=(today, next_60))
        elif expiry_alert == "passport":
            employees = employees.filter(passport_expiry__range=(today, next_90))
    if joined_from:
        employees = employees.filter(date_joined_company__gte=joined_from)
    if joined_to:
        employees = employees.filter(date_joined_company__lte=joined_to)
    if incomplete == "true":
        employees = employees.filter(
            Q(phone__isnull=True)          | Q(phone="") |
            Q(nationality__isnull=True)    | Q(nationality="") |
            Q(dob__isnull=True)            |
            Q(passport_no__isnull=True)    | Q(passport_no="") |
            Q(work_permit_no__isnull=True) | Q(work_permit_no="") |
            Q(date_joined_company__isnull=True)
        )

    paginator = PageNumberPagination()
    # Cap page_size to prevent full-table dumps via ?page_size=999999
    paginator.page_size = min(int(request.GET.get('page_size', 15)), 100)
    result_page = paginator.paginate_queryset(employees, request)

    is_privileged = request.user.role in ('admin', 'hr')

    data = [
        {
            "emp_id":           e.emp_id,
            "name":             e.name,
            "phone":            e.phone,
            "designation":      e.designation_aug,
            "division":         e.division.name,
            "status":           "Active" if e.is_active else "Inactive",
            # Salary is sensitive — only admin/hr can see it
            **({"salary": e.ipa_salary} if is_privileged else {}),
            "date_joined":      e.date_joined_company,
            "experience_years": e.experience_years,
            "wp_expiry":        e.wp_expiry,
            "passport_expiry":  e.passport_expiry,
        }
        for e in result_page
    ]

    return paginator.get_paginated_response(data)


# ─────────────────────────────────────────────
# EMPLOYEE DETAIL
# ─────────────────────────────────────────────

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail(request, emp_id):
    try:
        e = Employee.objects.select_related("division").get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)

    if request.method == 'DELETE':
        # Fix: use role check — not is_staff (a separate, unrelated Django flag)
        if request.user.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)
        emp_info = {
            "emp_id":   e.emp_id,
            "name":     e.name,
            "division": e.division.name if e.division else None
        }
        e.delete()
        return Response({"message": "Employee deleted successfully", "employee": emp_info})

    # GET — enforce access control
    is_privileged = request.user.role in ('admin', 'hr')
    viewer_profile = getattr(request.user, 'employee_profile', None)
    is_own_profile = (
        request.user.role == 'employee'
        and viewer_profile is not None
        and viewer_profile.emp_id == emp_id
    )

    # Regular employees may only view their own record
    if not is_privileged and not is_own_profile:
        return Response({"error": "Permission denied"}, status=403)

    # Base fields — safe for all authenticated users who pass the access check
    response_data = {
        "emp_id":      e.emp_id,
        "name":        e.name,
        "phone":       e.phone,
        "nationality": e.nationality,
        "dob":         e.dob,
        "age":         e.age,
        "division":    e.division.name,
        "status":      "Active" if e.is_active else "Inactive",
        "qualification": e.qualification,

        "designation_ipa":  e.designation_ipa,
        "designation_aug":  e.designation_aug,

        "doa":                 e.doa,
        "arrival_date":        e.arrival_date,
        "date_joined_company": e.date_joined_company,
        "experience_years":    e.experience_years,

        "work_permit_no":   e.work_permit_no,
        "fin_no":           e.fin_no,
        "issue_date":       e.issue_date,
        "ic_status":        e.ic_status,
        "wp_expiry":        e.wp_expiry,
        "wp_expiring_soon": e.wp_expiring_soon,

        "passport_no":            e.passport_no,
        "passport_expiry":        e.passport_expiry,
        "passport_issue_date":    e.passport_issue_date,
        "passport_issue_place":   e.passport_issue_place,
        "passport_expiring_soon": e.passport_expiring_soon,

        "ssic_gt_sn":  e.ssic_gt_sn,
        "ssic_gt_exp": e.ssic_gt_exp,
        "ssic_ht_sn":  e.ssic_ht_sn,
        "ssic_ht_exp": e.ssic_ht_exp,

        "work_at_height":    e.work_at_height,
        "confined_space":    e.confined_space,
        "welder_no":         e.welder_no,
        "lssc_sn":           e.lssc_sn,
        "signalman_rigger":  e.signalman_rigger,
        "firewatchman":      e.firewatchman,
        "gas_meter_carrier": e.gas_meter_carrier,

        "dynamac_pass_sn":  e.dynamac_pass_sn,
        "dynamac_pass_exp": e.dynamac_pass_exp,

        "accommodation":     e.accommodation,
        "pcp_status":        e.pcp_status,
        "security_bond_no":  e.security_bond_no,
        "security_bond_exp": e.security_bond_exp,
        "remarks":           e.remarks,
    }

    # Sensitive financial fields — admin and HR only
    if is_privileged:
        response_data.update({
            "ipa_salary":   e.ipa_salary,
            "per_hr":       e.per_hr,
            "salary":       e.salary,
            "bank_account": e.bank_account,
        })

    return Response(response_data)


# ─────────────────────────────────────────────
# EXPORT EMPLOYEES
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_employees(request):
    # Export contains salary and bank data — admin and HR only
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "Admin or HR access required"}, status=403)

    division = request.GET.get("division")

    qs = Employee.objects.select_related("division").all()
    if division and division != "all":
        qs = qs.filter(division__name=division)

    def employee_generator(queryset):
        for e in queryset.iterator(chunk_size=500):
            yield {
                "EMP ID":            e.emp_id,
                "IS_ACTIVE":         1 if e.is_active else 0,
                "NAME":              e.name,
                "HP NUMBER":         e.phone,
                "NATIONALITY":       e.nationality,
                "D.O.B":             e.dob,
                "COMPANY":           e.division.name,
                "IPA DESIGNATION":   e.designation_ipa,
                "Trade":             e.designation_aug,
                "IPA SALARY":        e.ipa_salary,
                "PER HR":            e.per_hr,
                "DOA":               e.doa,
                "ARRIVAL DATE":      e.arrival_date,
                "DATE JOINED":       e.date_joined_company,
                "EXPERIENCE YEARS":  e.experience_years,
                "IC / WP NO":        e.work_permit_no,
                "FIN NO":            e.fin_no,
                "IC TYPE":           e.ic_status,
                "ISSUANCE DATE":     e.issue_date,
                "S PASS/ WP EXPRIY": e.wp_expiry,
                "PP.NO":             e.passport_no,
                "PP EXPIRY":         e.passport_expiry,
                "SSIC GT S/N":       e.ssic_gt_sn,
                "SSIC GT EXP DATE":  e.ssic_gt_exp,
                "SSIC HT S/N":       e.ssic_ht_sn,
                "SSIC HT EXP DATE":  e.ssic_ht_exp,
                "WORK-AT-HEIGHT":    1 if e.work_at_height else 0,
                "CONFINED SPACE":    1 if e.confined_space else 0,
                "WELDER NO":         e.welder_no,
                "LSSC S/N":          e.lssc_sn,
                "SIGNALMAN & RIGGER COURSE": 1 if e.signalman_rigger else 0,
                "BANK ACCOUNT NUMBER": e.bank_account,
                "ACCOMODATION":      e.accommodation,
                "PCP STATUS":        e.pcp_status,
                "REMARKS":           e.remarks,
            }

    # Since we are returning a list in JSON for the frontend, we still iterate here.
    # To truly stream, we'd need StreamingHttpResponse + JSON lines or CSV.
    # However, using iterator() at least avoids the massive queryset cache in memory.
    return Response(list(employee_generator(qs)))


# ─────────────────────────────────────────────
# UPDATE EMPLOYEE
# ─────────────────────────────────────────────

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_employee(request, emp_id):
    # Fix IDOR: only admin or HR may update any employee record
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "Admin or HR access required"}, status=403)

    try:
        emp = Employee.objects.get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({"error": f"Employee not found: {emp_id}"}, status=404)

    updated_fields = []

    def update(field, key=None):
        k = key or field
        if k in request.data:
            val = request.data[k] or None
            setattr(emp, field, val)
            updated_fields.append(field)

    for f in [
        'phone', 'nationality', 'accommodation', 'qualification', 'remarks',
        'pcp_status', 'bank_account', 'work_permit_no', 'fin_no', 'passport_no',
        'passport_issue_place', 'welder_no', 'lssc_sn', 'dynamac_pass_sn',
        'security_bond_no', 'designation_ipa', 'designation_aug', 'ic_status',
    ]:
        update(f)

    if 'name' in request.data and request.data['name']:
        emp.name = request.data['name']
        updated_fields.append('name')

    for src_key, field_names in [
        ('salary', ['ipa_salary', 'salary']),
        ('per_hr', ['per_hr']),
    ]:
        if src_key in request.data and request.data[src_key]:
            try:
                val = float(request.data[src_key])
            except (ValueError, TypeError):
                return Response({"error": f"Invalid {src_key} format"}, status=400)
            for fn in field_names:
                setattr(emp, fn, val)
                updated_fields.append(fn)

    date_fields = [
        'dob', 'issue_date', 'wp_expiry', 'passport_expiry', 'passport_issue_date',
        'doa', 'arrival_date', 'date_joined_company',
        'ssic_gt_exp', 'ssic_ht_exp', 'dynamac_pass_exp', 'security_bond_exp',
    ]
    for df_field in date_fields:
        if df_field in request.data:
            raw = request.data[df_field]
            if raw:
                try:
                    setattr(emp, df_field, datetime.strptime(raw, '%Y-%m-%d').date())
                    updated_fields.append(df_field)
                except ValueError:
                    return Response(
                        {"error": f"Invalid date for {df_field}. Use YYYY-MM-DD"},
                        status=400,
                    )
            else:
                setattr(emp, df_field, None)
                updated_fields.append(df_field)

    for bf in ['work_at_height', 'confined_space', 'signalman_rigger',
               'firewatchman', 'gas_meter_carrier']:
        if bf in request.data:
            setattr(emp, bf, bool(request.data[bf]))
            updated_fields.append(bf)

    if not updated_fields:
        return Response({"error": "No valid fields to update"}, status=400)

    emp.save()
    return Response({
        "message":          "Employee updated successfully",
        "updated_fields":   updated_fields,
        "experience_years": emp.experience_years,
    })


# ─────────────────────────────────────────────



