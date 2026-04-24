import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from employees.models import Employee, Division

Employee.objects.all().delete()
Division.objects.all().delete()

print("✅ DB cleaned")