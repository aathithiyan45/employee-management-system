"""
views.py — Payroll App Views
Covers: WorkLog CRUD, Payroll Generation, Payroll CRUD, Payroll Analytics
"""

import datetime
from datetime import date

from django.db.models import Sum, Avg, F, Q
from django.utils.dateparse import parse_date

from rest_framework import viewsets, views, filters, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WorkLog, Payroll
from .serializers import WorkLogSerializer, PayrollSerializer
from .permissions import IsAdminOrHR
from apps.employees.models import Employee


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def parse_month_string(month_str):
    """
    Accept 'YYYY-MM' or 'YYYY-MM-DD'.
    Always returns a date(year, month, 1) or raises ValueError.
    """
    if not month_str:
        raise ValueError("Month is required.")
    if len(month_str) == 7:
        month_str += "-01"
    target = parse_date(month_str)
    if not target:
        raise ValueError(f"Invalid month format: '{month_str}'. Use YYYY-MM.")
    return target.replace(day=1)


# ─────────────────────────────────────────────
# WORKLOG VIEWSET
# ─────────────────────────────────────────────

class WorkLogViewSet(viewsets.ModelViewSet):
    """
    CRUD for daily work logs.

    Query params:
      ?employee=<emp_id|pk>   — filter by employee
      ?month=YYYY-MM          — filter by month
    """
    queryset = WorkLog.objects.select_related("employee").order_by("-date")
    serializer_class = WorkLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ["employee__name", "employee__emp_id"]
    ordering_fields = ["date", "hours", "employee__name"]

    def get_queryset(self):
        qs = super().get_queryset()

        employee_id = self.request.query_params.get("employee")
        month       = self.request.query_params.get("month")

        if employee_id:
            if employee_id.isdigit():
                qs = qs.filter(employee_id=employee_id)
            else:
                qs = qs.filter(employee__emp_id=employee_id)

        if month:
            try:
                year, month_num = month.split("-")
                qs = qs.filter(date__year=year, date__month=month_num)
            except ValueError:
                pass   # silently ignore malformed month — return unfiltered set

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ─────────────────────────────────────────────
# PAYROLL VIEWSET
# ─────────────────────────────────────────────

class PayrollViewSet(viewsets.ModelViewSet):
    """
    CRUD + generate action for payroll records.

    List query params:
      ?month=YYYY-MM          — filter by month (required for meaningful results)
      ?status=paid|pending    — filter by payment status
      ?search=<text>          — search employee name or emp_id
      ?ordering=<field>       — sort field (prefix '-' for descending)
      ?page=<n>               — pagination

    Actions:
      POST /payroll/generate/ { "month": "YYYY-MM" }
        — Create or update payroll records for all active employees.
          Safe to call multiple times; uses update_or_create.
    """
    queryset = Payroll.objects.select_related(
        "employee", "employee__division"
    ).order_by("-total_salary")

    serializer_class    = PayrollSerializer
    permission_classes  = [IsAuthenticated, IsAdminOrHR]

    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ["employee__name", "employee__emp_id"]
    ordering_fields  = ["total_salary", "total_hours", "employee__name", "employee__emp_id"]
    ordering         = ["-total_salary"]

    def get_queryset(self):
        qs = super().get_queryset()

        month  = self.request.query_params.get("month")
        status = self.request.query_params.get("status")

        if month:
            try:
                target = parse_month_string(month)
                qs = qs.filter(month=target)
            except ValueError:
                pass

        if status and status.lower() != "all":
            qs = qs.filter(status__iexact=status)

        return qs

    # ── Generate Payroll ──────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        """
        POST /payroll/generate/
        Body: { "month": "YYYY-MM" }

        Iterates over all active employees, sums their WorkLog hours for
        the given month, and creates/updates a Payroll record for each.
        Idempotent — safe to call multiple times for the same month.
        """
        try:
            target_date = parse_month_string(request.data.get("month", ""))
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        employees = Employee.objects.filter(is_active=True).select_related("division")
        if not employees.exists():
            return Response(
                {"error": "No active employees found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        results   = []
        created_c = 0
        updated_c = 0

        for emp in employees:
            total_hours = (
                WorkLog.objects
                .filter(
                    employee=emp,
                    date__year=target_date.year,
                    date__month=target_date.month,
                )
                .aggregate(total=Sum("hours"))["total"]
            ) or 0.0

            per_hour     = float(emp.per_hr or 0.0)
            total_salary = round(total_hours * per_hour, 2)

            payroll, created = Payroll.objects.update_or_create(
                employee=emp,
                month=target_date,
                defaults={
                    "total_hours":  total_hours,
                    "per_hour":     per_hour,
                    "bonus":        0.0,
                    "deductions":   0.0,
                    "total_salary": total_salary,
                    # Preserve existing status on re-generate
                },
            )

            if created:
                created_c += 1
            else:
                updated_c += 1

            results.append(PayrollSerializer(payroll).data)

        return Response(
            {
                "message":  "Payroll generated successfully.",
                "month":    target_date.strftime("%Y-%m"),
                "created":  created_c,
                "updated":  updated_c,
                "total":    len(results),
                "data":     results,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# PAYROLL ANALYTICS VIEW
# ─────────────────────────────────────────────

class PayrollAnalyticsView(views.APIView):
    """
    GET /payroll-summary/?month=YYYY-MM

    Returns aggregated analytics for the selected month:
      - total_salary, total_hours, avg_salary
      - pending_count, no_worklogs_count
      - division_data  — per-division cost breakdown
      - top_employees  — top 5 earners
      - monthly_trend  — last 12 months total payroll
    """
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        # ── 1. Parse month param ─────────────────────────────────────────────
        raw_month = request.query_params.get(
            "month", date.today().strftime("%Y-%m")
        )
        try:
            target_date = parse_month_string(raw_month)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)

        # ── 2. Base queryset for selected month ──────────────────────────────
        payrolls = Payroll.objects.filter(
            month__year=target_date.year,
            month__month=target_date.month,
        ).select_related("employee", "employee__division")

        # ── 3. Scalar aggregates ─────────────────────────────────────────────
        agg = payrolls.aggregate(
            total_salary=Sum("total_salary"),
            total_hours=Sum("total_hours"),
            avg_salary=Avg("total_salary"),
        )

        total_salary  = float(agg["total_salary"] or 0.0)
        total_hours   = float(agg["total_hours"]  or 0.0)
        avg_salary    = float(agg["avg_salary"]   or 0.0)

        # ── 4. Status & worklog counts ───────────────────────────────────────
        # Use case-insensitive filter to handle 'Pending' / 'pending' variants
        pending_count      = payrolls.filter(status__iexact="pending").count()
        no_worklogs_count  = payrolls.filter(total_hours=0).count()

        # ── 5. Division breakdown ────────────────────────────────────────────
        # Exclude records with no linked division to avoid None keys
        division_data = list(
            payrolls
            .exclude(employee__division__isnull=True)
            .values(division_name=F("employee__division__name"))
            .annotate(total=Sum("total_salary"))
            .order_by("-total")
        )

        # ── 6. Top 5 earners ─────────────────────────────────────────────────
        top_employees = list(
            payrolls
            .order_by("-total_salary")
            .values("employee__name", "total_salary")[:5]
        )

        # ── 7. Monthly trend — last 12 months ───────────────────────────────
        try:
            from dateutil.relativedelta import relativedelta
            twelve_months_ago = date.today() - relativedelta(months=12)
        except ImportError:
            # Fallback: approximate 12 months as 365 days if dateutil missing
            twelve_months_ago = date.today() - datetime.timedelta(days=365)

        trend_qs = (
            Payroll.objects
            .filter(month__gte=twelve_months_ago)
            .values("month")
            .annotate(total=Sum("total_salary"))
            .order_by("month")
        )

        monthly_trend = []
        for item in trend_qs:
            m = item["month"]
            label = (
                m.strftime("%b %Y")
                if isinstance(m, (date, datetime.date))
                else str(m)
            )
            monthly_trend.append({
                "month": label,
                "total": float(item["total"] or 0.0),
            })

        # ── 8. Return ────────────────────────────────────────────────────────
        return Response({
            "month":             target_date.strftime("%Y-%m"),
            "total_salary":      round(total_salary, 2),
            "total_hours":       round(total_hours, 2),
            "avg_salary":        round(avg_salary, 2),
            "pending_count":     pending_count,
            "no_worklogs_count": no_worklogs_count,
            "division_data":     division_data,
            "top_employees":     top_employees,
            "monthly_trend":     monthly_trend,
        })c