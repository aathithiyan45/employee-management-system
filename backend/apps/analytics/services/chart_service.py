from datetime import date
from dateutil.relativedelta import relativedelta
from django.db.models import Count, Sum
from apps.employees.models import Employee
from apps.payroll.models import Payroll, WorkLog

def get_employee_growth(division_name="all"):
    """
    Computes monthly joins, cumulative totals, and growth percentages
    for the last 6 calendar months based on company join dates.
    Uses exactly 1 database query (avoiding N+1 queries).
    """
    if division_name == "all":
        employees = Employee.objects.filter(date_joined_company__isnull=False)
    else:
        employees = Employee.objects.filter(division__name=division_name, date_joined_company__isnull=False)
        
    join_dates = list(employees.values_list('date_joined_company', flat=True))
    join_dates = [d for d in join_dates if d is not None]
    
    if not join_dates:
        return []
        
    today = date.today()
    months = [today - relativedelta(months=i) for i in range(5, -1, -1)]
    start_date = months[0].replace(day=1)
    
    base_count = sum(1 for d in join_dates if d < start_date)
    cumulative = base_count
    
    growth_data = []
    for m in months:
        joins = sum(1 for d in join_dates if d.year == m.year and d.month == m.month)
        cumulative += joins
        prev_cumulative = cumulative - joins
        growth_pct = (joins / prev_cumulative * 100) if prev_cumulative > 0 else 0.0
        
        growth_data.append({
            "month": m.strftime("%b %Y"),
            "joins": joins,
            "cumulative": cumulative,
            "growth_percentage": round(growth_pct, 1)
        })
    return growth_data

def get_division_distribution(division_name="all"):
    """
    Calculates active employee counts and percentages per division.
    """
    if division_name == "all":
        employees = Employee.objects.all()
    else:
        employees = Employee.objects.filter(division__name=division_name)
        
    total_count = employees.filter(is_active=True).count()
    if total_count == 0:
        return []
        
    div_counts = employees.filter(is_active=True).values('division__name').annotate(count=Count('id')).order_by('-count')
    
    distribution = []
    for item in div_counts:
        name = item['division__name'] or "Unassigned"
        count = item['count']
        percentage = round((count / total_count * 100), 1)
        distribution.append({
            "division": name,
            "count": count,
            "percentage": percentage
        })
    return distribution

def get_payroll_trend(division_name="all"):
    """
    Computes monthly payroll totals for the last 6 calendar months.
    Includes average monthly payroll and month-over-month comparisons.
    """
    payroll_qs = Payroll.objects.all()
    if division_name != "all":
        payroll_qs = payroll_qs.filter(employee__division__name=division_name)
        
    today = date.today()
    months = [today - relativedelta(months=i) for i in range(5, -1, -1)]
    start_date = months[0].replace(day=1)
    
    payroll_data = payroll_qs.filter(month__gte=start_date, month__lte=today)
    monthly_sums = (
        payroll_data
        .values('month')
        .annotate(total=Sum('total_salary'))
        .order_by('month')
    )
    
    sums_dict = {item['month']: float(item['total']) for item in monthly_sums if item['month']}
    
    trend = []
    totals = []
    for m in months:
        m_start = m.replace(day=1)
        total = sums_dict.get(m_start, 0.0)
        trend.append({
            "month": m_start.strftime("%b %Y"),
            "total_payroll": total
        })
        if total > 0:
            totals.append(total)
            
    avg_payroll = sum(totals) / len(totals) if totals else 0.0
    
    comparison = 0.0
    if len(trend) >= 2:
        last_val = trend[-1]["total_payroll"]
        prev_val = trend[-2]["total_payroll"]
        if prev_val > 0:
            comparison = round(((last_val - prev_val) / prev_val * 100), 1)
            
    return {
        "trend": trend,
        "average_payroll": round(avg_payroll, 2),
        "comparison": comparison
    }

def get_attendance_summary(division_name="all"):
    """
    Computes today's attendance summary.
    Leaves are returned as 0 since Leave management is currently disabled.
    """
    today = date.today()
    if division_name == "all":
        active_employees = Employee.objects.filter(is_active=True)
        worklogs = WorkLog.objects.filter(date=today)
    else:
        active_employees = Employee.objects.filter(division__name=division_name, is_active=True)
        worklogs = WorkLog.objects.filter(date=today, employee__division__name=division_name)
        
    total_active = active_employees.count()
    if total_active == 0:
        return {
            "present_count": 0,
            "absent_count": 0,
            "leave_count": 0,
            "present_percentage": 0.0,
            "absent_percentage": 0.0,
            "leave_percentage": 0.0
        }
        
    present_count = worklogs.values('employee').distinct().count()
    leave_count = 0
    absent_count = max(0, total_active - present_count - leave_count)
    
    present_pct = round((present_count / total_active * 100), 1)
    absent_pct = round((absent_count / total_active * 100), 1)
    leave_pct = 0.0
    
    return {
        "present_count": present_count,
        "absent_count": absent_count,
        "leave_count": leave_count,
        "present_percentage": present_pct,
        "absent_percentage": absent_pct,
        "leave_percentage": leave_pct
    }
