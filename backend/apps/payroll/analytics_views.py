from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F
from django.utils.dateparse import parse_date
import datetime
from .models import Payrolla
from .permissions import IsAdminOrHR

class PayrollTrendView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request, employee_id=None):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        if employee_id:
            payrolls = payrolls.filter(employee_id=employee_id)
            
        trend = list(payrolls.values('month').annotate(total=Sum('total_salary')).order_by('month'))
        formatted = []
        for item in trend:
            # Group by month string (e.g. Jan, Feb)
            month_str = item['month'].strftime('%b') if isinstance(item['month'], datetime.date) else item['month']
            formatted.append({"month": month_str, "total": item['total']})
        
        # Merge same months if any
        merged = {}
        for item in formatted:
            merged[item['month']] = merged.get(item['month'], 0) + item['total']
            
        final_data = [{"month": k, "total": v} for k, v in merged.items()]
        return Response(final_data)

class PayrollByDivisionView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        data = list(payrolls.values(name=F('employee__division__name')).annotate(value=Sum('total_salary')).order_by('-value'))
        cleaned = [{"name": d['name'] or "Unknown", "value": d['value']} for d in data]
        return Response(cleaned)

class PayrollByDesignationView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        data = list(payrolls.values(name=F('employee__designation_ipa')).annotate(value=Sum('total_salary')).order_by('-value'))
        cleaned = [{"name": d['name'] or "Unknown", "value": d['value']} for d in data]
        return Response(cleaned)

class PayrollTopEmployeesView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        data = list(payrolls.values('employee__name').annotate(total=Sum('total_salary')).order_by('-total')[:5])
        formatted = [{"name": d['employee__name'], "total": d['total']} for d in data]
        return Response(formatted)

class PayrollScatterView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        data = list(payrolls.values('employee__name', 'total_hours', 'total_salary'))
        formatted = [{"name": d['employee__name'], "hours": d['total_hours'], "salary": d['total_salary']} for d in data]
        return Response(formatted)

class PayrollAlertsView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    def get(self, request):
        year = request.query_params.get('year', datetime.date.today().year)
        payrolls = Payroll.objects.filter(month__year=year)
        
        # Determine a reasonable high salary threshold if none, let's say 2000
        high_salary = payrolls.filter(total_salary__gt=2000).count()
        overtime = payrolls.filter(total_hours__gt=220).count()
        low_work = payrolls.filter(total_hours__lt=80).count()
        
        return Response({
            "high_salary": high_salary,
            "overtime": overtime,
            "low_work": low_work
        })
