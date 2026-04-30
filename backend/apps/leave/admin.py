from django.contrib import admin
from .models import LeaveBalance, LeaveRequest, LeaveAdjustmentLog

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'year', 'medical_remaining', 'casual_remaining', 'annual_remaining')
    search_fields = ('employee__emp_id', 'employee__name')
    list_filter = ('year',)

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'start_date', 'end_date', 'status')
    search_fields = ('employee__emp_id', 'employee__name')
    list_filter = ('status', 'leave_type')

@admin.register(LeaveAdjustmentLog)
class LeaveAdjustmentLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'action', 'timestamp')
    search_fields = ('employee__emp_id', 'employee__name')
    list_filter = ('action',)
