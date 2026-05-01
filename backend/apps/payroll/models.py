from django.db import models
from django.conf import settings

class WorkLog(models.Model):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)

    date = models.DateField()
    hours = models.FloatField()

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("employee", "date")

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.hours} hrs)"

class Payroll(models.Model):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)

    month = models.DateField()

    total_hours = models.FloatField()
    per_hour = models.DecimalField(max_digits=10, decimal_places=2)

    bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    total_salary = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=20, default="pending")  # pending / paid

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} - {self.month.strftime('%Y-%m')} - {self.status}"
