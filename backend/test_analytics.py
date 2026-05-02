import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.payroll.models import Payroll
from django.db.models import Sum, F
from django.utils.dateparse import parse_date

# Monthly Trend (last 12 months overall)
from dateutil.relativedelta import relativedelta
import datetime
twelve_months_ago = datetime.date.today() - relativedelta(months=12)
trend_payrolls = Payroll.objects.filter(month__gte=twelve_months_ago)
monthly_trend = list(trend_payrolls.values('month').annotate(
    total=Sum('total_salary')
).order_by('month'))

print("Success")
