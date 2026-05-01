from rest_framework import serializers
from .models import WorkLog, Payroll
from apps.employees.models import Employee

class WorkLogSerializer(serializers.ModelSerializer):
    employee = serializers.SlugRelatedField(slug_field='emp_id', queryset=Employee.objects.all())
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_id_str = serializers.CharField(source='employee.emp_id', read_only=True)

    class Meta:
        model = WorkLog
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')

    def validate_hours(self, value):
        if value <= 0 or value > 24:
            raise serializers.ValidationError("Hours must be > 0 and <= 24")
        return value

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_id_str = serializers.CharField(source='employee.emp_id', read_only=True)

    class Meta:
        model = Payroll
        fields = '__all__'
        read_only_fields = ('created_at',)
