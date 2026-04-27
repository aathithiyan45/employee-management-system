from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    # Auth
    login_view,
    logout_view,
    change_password,

    # Dashboard
    dashboard_view,
    employee_dashboard_view,

    # Charts
    chart_division_distribution,
    chart_monthly_growth,
    chart_designation_breakdown,

    # Import / Export
    import_excel,
    export_employees,

    # Divisions
    get_divisions,

    # Employees
    employee_list,
    employee_detail,
    update_employee,

    # Leave — Balance
    leave_balance,
    leave_balance_adjust,

    # Leave — Requests
    leave_request_list,
    leave_request_detail,
    leave_request_approve,
    leave_request_reject,
    leave_request_cancel,

    # Leave — Audit
    leave_audit_log,
)

urlpatterns = [

    # ── Auth ────────────────────────────────────
    path('login/',           login_view),
    path('logout/',          logout_view),
    path('token/refresh/',   TokenRefreshView.as_view()),
    path('change-password/', change_password, name='change_password'),

    # ── Dashboard ───────────────────────────────
    path('dashboard/',       dashboard_view),
    path('employee-dashboard/', employee_dashboard_view),

    # ── Charts ──────────────────────────────────
    path('charts/division-distribution/', chart_division_distribution),
    path('charts/monthly-growth/',        chart_monthly_growth),
    path('charts/designation-breakdown/', chart_designation_breakdown),

    # ── Import / Export ─────────────────────────
    path('import/',          import_excel),
    path('export/',          export_employees),

    # ── Divisions ───────────────────────────────
    path('divisions/',       get_divisions),

    # ── Employees ───────────────────────────────
    path('employees/',                         employee_list),
    path('employees/<str:emp_id>/',            employee_detail),
    path('employees/<str:emp_id>/update/',     update_employee),

    # ── Leave — Balance ─────────────────────────
    path('leave/balance/<str:emp_id>/',        leave_balance),
    path('leave/balance/<str:emp_id>/adjust/', leave_balance_adjust),

    # ── Leave — Requests ────────────────────────
    path('leave/requests/',                    leave_request_list),
    path('leave/requests/<int:pk>/',           leave_request_detail),
    path('leave/requests/<int:pk>/approve/',   leave_request_approve),
    path('leave/requests/<int:pk>/reject/',    leave_request_reject),
    path('leave/requests/<int:pk>/cancel/',    leave_request_cancel),

    # ── Leave — Audit Log ───────────────────────
    path('leave/audit/',                       leave_audit_log),
]