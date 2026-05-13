from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminOrHR
from rest_framework.response import Response
from .models import Employee, Division
from datetime import date, timedelta

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_analytics_summary(request):
    """
    General summary KPIs for employee demographics.
    """
    total = Employee.objects.count()
    active = Employee.objects.filter(is_active=True).count()
    
    # Nationality distribution
    nationalities = Employee.objects.values('nationality').annotate(count=Count('id')).order_by('-count')[:5]
    
    # Gender distribution (assuming 'gender' field might exist or using designation as proxy? 
    # Let's check models again. No gender field found in models.py earlier. 
    # Let's stick to Division/Designation)
    
    divisions = Division.objects.annotate(emp_count=Count('employees')).values('name', 'emp_count')
    
    return Response({
        "total": total,
        "active": active,
        "inactive": total - active,
        "nationalities": list(nationalities),
        "divisions": list(divisions)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_by_division(request):
    data = Division.objects.annotate(value=Count('employees')).values('name', 'value').order_by('-value')
    return Response(list(data))

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_by_nationality(request):
    res = Employee.objects.values('nationality').annotate(count_val=Count('id')).order_by('-count_val')[:10]
    return Response([{"name": x['nationality'] or "Unknown", "value": x['count_val']} for x in res])

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_by_designation(request):
    res = Employee.objects.values('designation_ipa').annotate(value=Count('id')).order_by('-value')[:10]
    return Response([{"name": x['designation_ipa'] or "Unknown", "value": x['value']} for x in res])

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_hiring_trend(request):
    """
    Number of employees joined per year for the last 5 years.
    """
    today = date.today()
    years = [today.year - i for i in range(5)]
    years.reverse()
    
    data = []
    for y in years:
        count = Employee.objects.filter(date_joined_company__year=y).count()
        data.append({"year": str(y), "count": count})
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def employee_expiry_alerts(request):
    """
    Counts of documents expiring in 30, 60, 90 days.
    """
    today = date.today()
    
    wp_30 = Employee.objects.filter(is_active=True, wp_expiry__range=(today, today + timedelta(days=30))).count()
    wp_60 = Employee.objects.filter(is_active=True, wp_expiry__range=(today, today + timedelta(days=60))).count()
    
    pp_30 = Employee.objects.filter(is_active=True, passport_expiry__range=(today, today + timedelta(days=30))).count()
    pp_90 = Employee.objects.filter(is_active=True, passport_expiry__range=(today, today + timedelta(days=90))).count()
    
    return Response({
        "wp_30": wp_30,
        "wp_60": wp_60,
        "pp_30": pp_30,
        "pp_90": pp_90
    })
