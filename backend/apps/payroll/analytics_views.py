"""
analytics_views.py — Payroll Analytics Endpoints
Covers: Trend, By Division, By Designation, Top Employees, Scatter, Alerts
"""

import datetime
from datetime import date

from django.db.models import Sum, F

from rest_framework import views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Payroll                  # fixed typo: was "Payrolla"
from .permissions import IsAdminOrHR


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def get_year(request):
    """Return integer year from ?year= param, defaulting to current year."""
    try:
        return int(request.query_params.get("year", date.today().year))
    except (TypeError, ValueError):
        return date.today().year


# ─────────────────────────────────────────────
# TREND — overall OR per-employee
# ─────────────────────────────────────────────

class PayrollTrendView(views.APIView):
    """
    GET /payroll/trend/?year=YYYY
    GET /payroll/trend/<employee_id>/?year=YYYY
    Returns monthly payroll totals for the given year.
    """
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request, employee_id=None):
        year = get_year(request)
        qs   = Payroll.objects.filter(month__year=year)

        if employee_id:
            if str(employee_id).isdigit():
                qs = qs.filter(employee_id=employee_id)
            else:
                qs = qs.filter(employee__emp_id=employee_id)

        trend = (
            qs.values("month")
            .annotate(total=Sum("total_salary"))
            .order_by("month")
        )

        # Merge by month label and cast Decimal → float
        merged = {}
        for item in trend:
            m     = item["month"]
            label = m.strftime("%b") if isinstance(m, date) else str(m)
            merged[label] = merged.get(label, 0.0) + float(item["total"] or 0.0)

        return Response([{"month": k, "total": v} for k, v in merged.items()])


# ─────────────────────────────────────────────
# BY DIVISION
# ─────────────────────────────────────────────

class PayrollByDivisionView(views.APIView):
    """GET /payroll/by-division/?year=YYYY"""
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        year = get_year(request)
        data = (
            Payroll.objects
            .filter(month__year=year)
            .exclude(employee__division__isnull=True)   # skip NULL divisions
            .values(name=F("employee__division__name"))
            .annotate(value=Sum("total_salary"))
            .order_by("-value")
        )
        return Response([
            {"name": d["name"] or "Unknown", "value": float(d["value"] or 0.0)}
            for d in data
        ])


# ─────────────────────────────────────────────
# BY DESIGNATION
# ─────────────────────────────────────────────

class PayrollByDesignationView(views.APIView):
    """GET /payroll/by-designation/?year=YYYY"""
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        year = get_year(request)
        data = (
            Payroll.objects
            .filter(month__year=year)
            .values(name=F("employee__designation_ipa"))
            .annotate(value=Sum("total_salary"))
            .order_by("-value")
        )
        return Response([
            {"name": d["name"] or "Unknown", "value": float(d["value"] or 0.0)}
            for d in data
        ])


# ─────────────────────────────────────────────
# TOP EMPLOYEES
# ─────────────────────────────────────────────

class PayrollTopEmployeesView(views.APIView):
    """GET /payroll/top-employees/?year=YYYY"""
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        year = get_year(request)
        data = (
            Payroll.objects
            .filter(month__year=year)
            .values("employee__name")
            .annotate(total=Sum("total_salary"))
            .order_by("-total")[:5]
        )
        return Response([
            {"name": d["employee__name"], "total": float(d["total"] or 0.0)}
            for d in data
        ])


# ─────────────────────────────────────────────
# SCATTER — hours vs salary
# ─────────────────────────────────────────────

class PayrollScatterView(views.APIView):
    """GET /payroll/scatter/?year=YYYY"""
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        year = get_year(request)
        data = (
            Payroll.objects
            .filter(month__year=year)
            .values("employee__name", "total_hours", "total_salary")
        )
        return Response([
            {
                "name":   d["employee__name"],
                "hours":  float(d["total_hours"]  or 0.0),
                "salary": float(d["total_salary"] or 0.0),
            }
            for d in data
        ])


# ─────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────

class PayrollAlertsView(views.APIView):
    """GET /payroll/alerts/?year=YYYY"""
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        year     = get_year(request)
        payrolls = Payroll.objects.filter(month__year=year)

        return Response({
            "high_salary": payrolls.filter(total_salary__gt=2000).count(),
            "overtime":    payrolls.filter(total_hours__gt=220).count(),
            "low_work":    payrolls.filter(total_hours__lt=80).count(),
        })