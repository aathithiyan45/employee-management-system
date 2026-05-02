from django.urls import path
from .views import (
    # Balance
    leave_balance,
    leave_balance_adjust,

    # Requests
    leave_request_list,
    leave_request_detail,
    leave_request_approve,
    leave_request_reject,
    leave_request_cancel,

    # Audit
    leave_audit_log,
)
from .analytics_views import (
    leave_analytics_summary,
    leave_by_type,
    leave_by_month,
    leave_by_division,
    leave_status_breakdown,
)

urlpatterns = [
    # ── Leave — Balance ─────────────────────────
    path('balance/<str:emp_id>/',        leave_balance),
    path('balance/<str:emp_id>/adjust/', leave_balance_adjust),

    # ── Leave — Requests ────────────────────────
    path('requests/',                    leave_request_list),
    path('requests/<int:pk>/',           leave_request_detail),
    path('requests/<int:pk>/approve/',   leave_request_approve),
    path('requests/<int:pk>/reject/',    leave_request_reject),
    path('requests/<int:pk>/cancel/',    leave_request_cancel),

    # ── Leave — Audit Log ───────────────────────
    path('audit/',                       leave_audit_log),

    # ── Analytics ───────────────────────────────
    path('analytics/summary/',    leave_analytics_summary),
    path('analytics/type/',       leave_by_type),
    path('analytics/month/',      leave_by_month),
    path('analytics/division/',   leave_by_division),
    path('analytics/status/',     leave_status_breakdown),
]
