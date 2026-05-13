from django.urls import path

from .views import (
    # Dashboard
    dashboard_view,

    # Import / Export
    import_excel,
    import_status,
    export_employees,

    # Divisions
    get_divisions,

    # Employees
    employee_list,
    employee_detail,
    update_employee,

)
from .analytics_views import (
    employee_analytics_summary,
    employee_by_division,
    employee_by_nationality,
    employee_by_designation,
    employee_hiring_trend,
    employee_expiry_alerts,
)

urlpatterns = [

    # Dashboard
    path('dashboard/',       dashboard_view),



    # ── Import / Export ─────────────────────────
    path('import/',          import_excel),
    path('import/status/<uuid:job_id>/', import_status),
    path('export/',          export_employees),

    # ── Divisions ───────────────────────────────
    path('divisions/',       get_divisions),

    # ── Employees ───────────────────────────────
    path('employees/',                         employee_list),
    path('employees/<str:emp_id>/',            employee_detail),
    path('employees/<str:emp_id>/update/',     update_employee),

    # ── Analytics ───────────────────────────────
    path('employees/analytics/summary/',    employee_analytics_summary),
    path('employees/analytics/division/',   employee_by_division),
    path('employees/analytics/nationality/',employee_by_nationality),
    path('employees/analytics/designation/',employee_by_designation),
    path('employees/analytics/hiring/',     employee_hiring_trend),
    path('employees/analytics/expiry/',     employee_expiry_alerts),

]
