from django.db.models import Count, Q, Avg, F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminOrHR
from rest_framework.response import Response
from .models import LeaveRequest
from apps.employees.models import Division
from datetime import date, timedelta
import calendar

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_analytics_summary(request):
    """
    General summary KPIs for leave requests.
    """
    year = int(request.GET.get('year', date.today().year))
    qs = LeaveRequest.objects.filter(start_date__year=year)
    
    total = qs.count()
    approved = qs.filter(status='approved').count()
    pending = qs.filter(status='pending').count()
    rejected = qs.filter(status='rejected').count()
    
    # Average duration
    avg_duration = qs.filter(status='approved').aggregate(avg=Avg(F('end_date') - F('start_date')))['avg']
    avg_days = (avg_duration.days + 1) if avg_duration else 0
    
    return Response({
        "total": total,
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "approval_rate": round((approved / total * 100), 1) if total > 0 else 0,
        "avg_days": avg_days
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_by_type(request):
    year = int(request.GET.get('year', date.today().year))
    res = LeaveRequest.objects.filter(start_date__year=year).values('leave_type').annotate(value=Count('id')).order_by('-value')
    
    # Map codes to labels
    type_map = dict(LeaveRequest.LEAVE_TYPE_CHOICES)
    data = [{"name": type_map.get(x['leave_type'], x['leave_type']), "value": x['value']} for x in res]
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_by_month(request):
    year = int(request.GET.get('year', date.today().year))
    data = []
    
    for m in range(1, 13):
        count = LeaveRequest.objects.filter(start_date__year=year, start_date__month=m).count()
        data.append({
            "month": calendar.month_name[m][:3],
            "count": count
        })
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_by_division(request):
    year = int(request.GET.get('year', date.today().year))
    data = Division.objects.annotate(
        value=Count('employees__leave_requests', filter=Q(employees__leave_requests__start_date__year=year))
    ).values('name', 'value').order_by('-value')
    
    return Response(list(data))

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_status_breakdown(request):
    year = int(request.GET.get('year', date.today().year))
    res = LeaveRequest.objects.filter(start_date__year=year).values('status').annotate(value=Count('id'))
    
    status_map = dict(LeaveRequest.STATUS_CHOICES)
    data = [{"name": status_map.get(x['status'], x['status']), "value": x['value']} for x in res]
    
    return Response(data)
