from django.db import models
from django.conf import settings

from django.core.validators import MaxValueValidator, MinValueValidator

class WorkLog(models.Model):
    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)

    date = models.DateField()
    hours = models.FloatField(validators=[MaxValueValidator(24), MinValueValidator(0.5)])

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

    def save(self, *args, **kwargs):
        """
        Automatically calculate total_salary:
        (total_hours * per_hour) + bonus - deductions
        Using Decimal for precision.
        """
        from decimal import Decimal
        hours = Decimal(str(self.total_hours or 0))
        rate = Decimal(str(self.per_hour or 0))
        bonus_val = Decimal(str(self.bonus or 0))
        deduct_val = Decimal(str(self.deductions or 0))

        self.total_salary = (hours * rate) + bonus_val - deduct_val
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee} - {self.month.strftime('%Y-%m')} - {self.status}"
