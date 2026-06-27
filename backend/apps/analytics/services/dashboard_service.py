from apps.analytics.services.kpi_service import get_kpis
from apps.analytics.services.chart_service import (
    get_employee_growth,
    get_division_distribution,
    get_payroll_trend,
    get_attendance_summary
)
from apps.analytics.services.activity_service import get_recent_activities
from apps.employees.models import Division, Employee
from django.db.models import Count

def get_dashboard_summary(division_name="all"):
    """
    Orchestrates the retrieval of all dashboard widgets.
    Returns a unified response matching the requested enterprise structure.
    """
    # 1. Fetch KPIs
    kpis = get_kpis(division_name)
    
    # 2. Fetch Division Cards
    divisions = Division.objects.filter(is_active=True).annotate(
        emp_count=Count('employees')
    ).order_by('name')
    
    colors = ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#ec4899", "#6b7280"]
    bg_classes = ["marine", "offshore", "eng", "gsi-marine", "gsi-eng", "all", "safety", "finance"]
    
    # Total count for dynamic cards
    total_employees = Employee.objects.count() if division_name == "all" else Employee.objects.filter(division__name=division_name).count()
    
    division_cards = [
        {
            "key": "all",
            "label": "All Divisions",
            "count": total_employees,
            "color": "#4f46e5",
            "bgClass": "all"
        }
    ]
    for idx, d in enumerate(divisions):
        color = colors[idx % len(colors)]
        bg_class = bg_classes[idx % len(bg_classes)]
        division_cards.append({
            "key": d.name,
            "label": d.name.title(),
            "count": d.emp_count,
            "color": color,
            "bgClass": bg_class
        })
        
    return {
        "summary": kpis,
        "charts": {
            "employee_growth": get_employee_growth(division_name),
            "division_distribution": get_division_distribution(division_name),
            "payroll_trend": get_payroll_trend(division_name),
            "attendance_summary": get_attendance_summary(division_name)
        },
        "recent_activity": get_recent_activities(10),
        "alerts": [],
        "division_cards": division_cards
    }
