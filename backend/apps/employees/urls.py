from django.urls import path

from .views import (
    # Dashboard
    dashboard_view,
    employee_dashboard_view,

    # Import / Export
    import_excel,
    export_employees,

    # Divisions
    get_divisions,

    # Employees
    employee_list,
    employee_detail,
    update_employee,

)

urlpatterns = [

    # Dashboard
    path('dashboard/',       dashboard_view),
    path('employee-dashboard/', employee_dashboard_view),



    # ── Import / Export ─────────────────────────
    path('import/',          import_excel),
    path('export/',          export_employees),

    # ── Divisions ───────────────────────────────
    path('divisions/',       get_divisions),

    # ── Employees ───────────────────────────────
    path('employees/',                         employee_list),
    path('employees/<str:emp_id>/',            employee_detail),
    path('employees/<str:emp_id>/update/',     update_employee),

]
