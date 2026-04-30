from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Employee
from apps.leave.models import LeaveBalance

@receiver(post_save, sender=Employee)
def create_employee_leave_balance(sender, instance, created, **kwargs):
    """
    Automatically create a LeaveBalance record for the current year
    when a new Employee is created.
    """
    if created:
        year = timezone.now().year
        # Use get_or_create to avoid duplicates if something goes wrong
        LeaveBalance.objects.get_or_create(
            employee=instance,
            year=year
        )
