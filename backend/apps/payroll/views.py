from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F
from django.utils.dateparse import parse_date
import datetime
from .models import WorkLog, Payroll
from .serializers import WorkLogSerializer, PayrollSerializer
from .permissions import IsAdminOrHR
from apps.employees.models import Employee

class WorkLogViewSet(viewsets.ModelViewSet):
    queryset = WorkLog.objects.all().order_by('-date')
    serializer_class = WorkLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get('employee', None)
        month = self.request.query_params.get('month', None)

        if employee_id:
            if employee_id.isdigit():
                queryset = queryset.filter(employee_id=employee_id)
            else:
                queryset = queryset.filter(employee__emp_id=employee_id)
        if month:
            # Assumes month is YYYY-MM
            try:
                year, month_num = month.split('-')
                queryset = queryset.filter(date__year=year, date__month=month_num)
            except ValueError:
                pass
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all().order_by('-month')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id', None)
        year = self.request.query_params.get('year', None)

        month = self.request.query_params.get('month', None)

        if employee_id:
            if employee_id.isdigit():
                queryset = queryset.filter(employee_id=employee_id)
            else:
                queryset = queryset.filter(employee__emp_id=employee_id)
        if year:
            queryset = queryset.filter(month__year=year)
        if month:
            queryset = queryset.filter(month=month if '-' in month and len(month) > 7 else month + "-01")
        return queryset

    @action(detail=False, methods=['post'])
    def generate(self, request):
        month_str = request.data.get('month')
        if not month_str:
            return Response({"error": "Month is required (YYYY-MM-DD or YYYY-MM)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if len(month_str) == 7:
                month_str += "-01"
            target_date = parse_date(month_str)
            if not target_date:
                raise ValueError
        except ValueError:
            return Response({"error": "Invalid month format"}, status=status.HTTP_400_BAD_REQUEST)

        employees = Employee.objects.filter(is_active=True)
        results = []

        for emp in employees:
            logs = WorkLog.objects.filter(employee=emp, date__year=target_date.year, date__month=target_date.month)
            total_hours = logs.aggregate(total=Sum('hours'))['total'] or 0.0

            per_hour = emp.per_hr or 0.0
            
            # Default bonus and deductions can be 0 initially, updated later
            bonus = 0.0
            deductions = 0.0

            total_salary = (total_hours * per_hour) + bonus - deductions

            payroll, created = Payroll.objects.update_or_create(
                employee=emp,
                month=target_date.replace(day=1),
                defaults={
                    'total_hours': total_hours,
                    'per_hour': per_hour,
                    'bonus': bonus,
                    'deductions': deductions,
                    'total_salary': total_salary,
                }
            )
            results.append(PayrollSerializer(payroll).data)

        return Response({"message": "Payroll generated successfully", "data": results})

class PayrollAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def get(self, request):
        month_str = request.query_params.get('month', datetime.date.today().strftime('%Y-%m-01'))
        if len(month_str) == 7:
            month_str += "-01"
        try:
            target_date = parse_date(month_str)
        except:
            return Response({"error": "Invalid month"}, status=400)

        payrolls = Payroll.objects.filter(month__year=target_date.year, month__month=target_date.month)

        # Monthly total
        total_salary = payrolls.aggregate(total=Sum('total_salary'))['total'] or 0.0

        # By division
        division_data = list(payrolls.values(division_name=F('employee__division__name')).annotate(
            total=Sum('total_salary')
        ).order_by('-total'))

        # Top 5 employees
        top_employees = list(payrolls.order_by('-total_salary').values(
            'employee__name', 'total_salary'
        )[:5])

        return Response({
            "total_salary": total_salary,
            "division_data": division_data,
            "top_employees": top_employees,
            "month": target_date.strftime('%Y-%m')
        })
