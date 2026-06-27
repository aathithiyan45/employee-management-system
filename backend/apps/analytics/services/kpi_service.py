from datetime import date, timedelta
from django.db.models import Q
from apps.employees.models import Employee
from apps.documents.models import EmployeeDocument

def get_kpis(division_name="all"):
    """
    Calculates dynamic KPI counts directly from database queries.
    Supports division-level filtering.
    """
    if division_name == "all":
        employees = Employee.objects.all()
        documents = EmployeeDocument.objects.all()
    else:
        employees = Employee.objects.filter(division__name=division_name)
        documents = EmployeeDocument.objects.filter(employee__division__name=division_name)
        
    today = date.today()
    next_60_days = today + timedelta(days=60)
    next_90_days = today + timedelta(days=90)
    
    total = employees.count()
    active = employees.filter(is_active=True).count()
    inactive = employees.filter(is_active=False).count()
    
    active_emps = employees.filter(is_active=True)
    
    passport_expiring = active_emps.filter(
        passport_expiry__range=(today, next_90_days)
    ).count()
    
    wp_expiring = active_emps.filter(
        wp_expiry__range=(today, next_60_days)
    ).count()
    
    ssic_gt_expiring = active_emps.filter(
        ssic_gt_exp__range=(today, next_60_days)
    ).count()
    
    incomplete_profiles = employees.filter(
        Q(phone__isnull=True)          | Q(phone="") |
        Q(nationality__isnull=True)    | Q(nationality="") |
        Q(dob__isnull=True)            |
        Q(passport_no__isnull=True)    | Q(passport_no="") |
        Q(work_permit_no__isnull=True) | Q(work_permit_no="") |
        Q(date_joined_company__isnull=True)
    ).count()
    
    total_docs = documents.filter(employee__is_active=True).count()
    
    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "passport_expiring": passport_expiring,
        "wp_expiring": wp_expiring,
        "ssic_gt_expiring": ssic_gt_expiring,
        "incomplete_profiles": incomplete_profiles,
        "total_documents": total_docs
    }
