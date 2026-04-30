from django.urls import path

from .views import (
    chart_division_distribution,
    chart_monthly_growth,
    chart_designation_breakdown,
)

urlpatterns = [
    # ── Charts ──────────────────────────────────
    path('charts/division-distribution/', chart_division_distribution),
    path('charts/monthly-growth/',        chart_monthly_growth),
    path('charts/designation-breakdown/', chart_designation_breakdown),
]
