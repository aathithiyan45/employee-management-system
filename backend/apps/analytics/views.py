from datetime import timedelta
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.employees.models import Employee

# ─────────────────────────────────────────────
# CHARTS
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chart_division_distribution(request):
    division_param = request.GET.get("division")

    if division_param and division_param != "all":
        employees = Employee.objects.filter(division__name=division_param)
    else:
        employees = Employee.objects.all()

    division_data = (
        employees
        .values('division__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'labels': [item['division__name'] for item in division_data],
        'datasets': [{
            'data': [item['count'] for item in division_data],
            'backgroundColor': [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
            ],
            'borderWidth': 1,
        }],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chart_monthly_growth(request):
    division_param = request.GET.get("division")

    if division_param and division_param != "all":
        employees = Employee.objects.filter(division__name=division_param)
    else:
        employees = Employee.objects.all()

    # Use timezone.now() (aware datetime) not date.today() (naive date) when filtering
    # a DateTimeField — passing a plain date causes Django to emit a RuntimeWarning.
    now               = timezone.now()
    twelve_months_ago = now - timedelta(days=365)

    monthly_data = (
        employees
        .filter(created_at__gte=twelve_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    months  = []
    counts  = []
    current = twelve_months_ago.date().replace(day=1)
    end     = now.date().replace(day=1)

    month_dict = {item['month'].date(): item['count'] for item in monthly_data}

    while current <= end:
        months.append(current.strftime('%b %Y'))
        counts.append(month_dict.get(current, 0))
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    return Response({
        'labels': months[-12:],
        'datasets': [{
            'label': 'New Employees',
            'data': counts[-12:],
            'borderColor': '#3B82F6',
            'backgroundColor': 'rgba(59, 130, 246, 0.1)',
            'tension': 0.4,
            'fill': True,
        }],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chart_designation_breakdown(request):
    division_param = request.GET.get("division")

    if division_param and division_param != "all":
        employees = Employee.objects.filter(division__name=division_param)
    else:
        employees = Employee.objects.all()

    designation_data = (
        employees
        .exclude(designation_aug__isnull=True)
        .exclude(designation_aug="")
        .values('designation_aug')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    return Response({
        'labels': [item['designation_aug'] for item in designation_data],
        'datasets': [{
            'data': [item['count'] for item in designation_data],
            'backgroundColor': [
                '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
                '#EC4899', '#6B7280',
            ],
            'borderWidth': 1,
        }],
    })
