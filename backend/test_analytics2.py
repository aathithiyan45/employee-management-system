import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.payroll.models import Payroll
from django.db.models import Sum

target_date = django.utils.dateparse.parse_date('2026-05-01')
payrolls = Payroll.objects.filter(month__year=target_date.year, month__month=target_date.month)

total_hours_sum = payrolls.aggregate(total=Sum('total_hours'))['total'] or 0.0
print("total_hours", total_hours_sum)

