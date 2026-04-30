from datetime import date
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.employees.models import Employee, User

def get_current_year():
    """Callable default for LeaveBalance.year — evaluated per-instance, not at class load."""
    return timezone.now().year

# ─────────────────────────────────────────────
# 4. LEAVE BALANCE
# ─────────────────────────────────────────────

class LeaveBalance(models.Model):
    """
    Stores the REMAINING leave balance per employee per year.
    Reset annually via management command or signal.
    """

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_balances'
    )
    year = models.PositiveIntegerField(default=get_current_year)

    # Entitlement
    medical_entitled = models.IntegerField(default=14)
    casual_entitled  = models.IntegerField(default=7)
    annual_entitled  = models.IntegerField(default=14)

    # Used (decremented on approval)
    medical_used = models.IntegerField(default=0)
    casual_used  = models.IntegerField(default=0)
    annual_used  = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employees_leavebalance'
        verbose_name = 'Leave Balance'
        verbose_name_plural = 'Leave Balances'
        unique_together = ('employee', 'year')
        ordering = ['-year']

    def __str__(self):
        return f"{self.employee.emp_id} | {self.year}"

    @property
    def medical_remaining(self):
        return self.medical_entitled - self.medical_used

    @property
    def casual_remaining(self):
        return self.casual_entitled - self.casual_used

    @property
    def annual_remaining(self):
        return self.annual_entitled - self.annual_used

    def get_remaining(self, leave_type: str) -> int:
        return {
            'medical': self.medical_remaining,
            'casual':  self.casual_remaining,
            'annual':  self.annual_remaining,
        }.get(leave_type, 0)

    def has_sufficient_balance(self, leave_type: str, days: int) -> bool:
        return self.get_remaining(leave_type) >= days

    def deduct(self, leave_type: str, days: int):
        field_map = {
            'medical': 'medical_used',
            'casual':  'casual_used',
            'annual':  'annual_used',
        }
        field = field_map.get(leave_type)
        if not field:
            raise ValueError(f"Unknown leave type: {leave_type}")
        if not self.has_sufficient_balance(leave_type, days):
            raise ValidationError(
                f"Insufficient {leave_type} leave balance. "
                f"Remaining: {self.get_remaining(leave_type)}, Requested: {days}"
            )
        setattr(self, field, getattr(self, field) + days)
        self.save(update_fields=[field, 'updated_at'])

    def restore(self, leave_type: str, days: int):
        field_map = {
            'medical': 'medical_used',
            'casual':  'casual_used',
            'annual':  'annual_used',
        }
        field = field_map.get(leave_type)
        if field:
            new_val = max(0, getattr(self, field) - days)
            setattr(self, field, new_val)
            self.save(update_fields=[field, 'updated_at'])


# ─────────────────────────────────────────────
# 5. LEAVE REQUEST
# ─────────────────────────────────────────────

class LeaveRequest(models.Model):

    STATUS_PENDING   = 'pending'
    STATUS_APPROVED  = 'approved'
    STATUS_REJECTED  = 'rejected'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_PENDING,   'Pending'),
        (STATUS_APPROVED,  'Approved'),
        (STATUS_REJECTED,  'Rejected'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    LEAVE_MEDICAL = 'medical'
    LEAVE_CASUAL  = 'casual'
    LEAVE_ANNUAL  = 'annual'
    LEAVE_UNPAID  = 'unpaid'

    LEAVE_TYPE_CHOICES = (
        (LEAVE_MEDICAL, 'Medical Leave'),
        (LEAVE_CASUAL,  'Casual Leave'),
        (LEAVE_ANNUAL,  'Annual Leave'),
        (LEAVE_UNPAID,  'Unpaid Leave'),
    )

    employee   = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date   = models.DateField()
    total_days = models.PositiveIntegerField()
    reason     = models.TextField(blank=True, null=True)
    attachment = models.FileField(
        upload_to='leave_attachments/%Y/%m/',
        blank=True, null=True,
        help_text="Medical certificate or supporting document"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True
    )

    reviewed_by      = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_leaves'
    )
    reviewed_at      = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employees_leaverequest'
        verbose_name = 'Leave Request'
        verbose_name_plural = 'Leave Requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['status', 'leave_type']),
        ]

    def __str__(self):
        return (
            f"{self.employee.emp_id} | "
            f"{self.get_leave_type_display()} | "
            f"{self.start_date} → {self.end_date} | "
            f"{self.get_status_display()}"
        )

    def clean(self):
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValidationError("End date cannot be before start date.")

        overlapping = LeaveRequest.objects.filter(
            employee=self.employee,
            status__in=[self.STATUS_PENDING, self.STATUS_APPROVED],
            start_date__lte=self.end_date,
            end_date__gte=self.start_date,
        ).exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError(
                "An overlapping leave request already exists for this period."
            )

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date and not self.total_days:
            self.total_days = (self.end_date - self.start_date).days + 1
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @property
    def is_approved(self):
        return self.status == self.STATUS_APPROVED

    @property
    def is_active_leave(self):
        return (
            self.status == self.STATUS_APPROVED
            and self.start_date <= date.today() <= self.end_date
        )

    def approve(self, reviewed_by: User):
        with transaction.atomic():
            # Re-fetch this request with a row lock so concurrent approvals are serialised
            lr = LeaveRequest.objects.select_for_update().get(pk=self.pk)
            if lr.status != self.STATUS_PENDING:
                raise ValidationError("Only pending requests can be approved.")

            if lr.leave_type != self.LEAVE_UNPAID:
                balance = LeaveBalance.objects.select_for_update().get(
                    employee=lr.employee,
                    year=lr.start_date.year
                )
                # Re-check balance inside the lock — prevents double-spend
                if not balance.has_sufficient_balance(lr.leave_type, lr.total_days):
                    raise ValidationError(
                        f"Insufficient {lr.leave_type} balance inside lock. "
                        f"Remaining: {balance.get_remaining(lr.leave_type)}, "
                        f"Requested: {lr.total_days}"
                    )
                balance.deduct(lr.leave_type, lr.total_days)

            lr.status = self.STATUS_APPROVED
            lr.reviewed_by = reviewed_by
            lr.reviewed_at = timezone.now()
            lr.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

            LeaveAdjustmentLog.objects.create(
                employee=lr.employee,
                leave_request=lr,
                action='approved',
                performed_by=reviewed_by,
                note=f"Approved {lr.total_days} day(s) of {lr.get_leave_type_display()}."
            )

            # Sync instance state so callers see the updated values
            self.status = lr.status
            self.reviewed_by = lr.reviewed_by
            self.reviewed_at = lr.reviewed_at

    def reject(self, reviewed_by: User, reason: str = ''):
        if self.status != self.STATUS_PENDING:
            raise ValidationError("Only pending requests can be rejected.")

        self.status = self.STATUS_REJECTED
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=[
            'status', 'reviewed_by', 'reviewed_at',
            'rejection_reason', 'updated_at'
        ])

        LeaveAdjustmentLog.objects.create(
            employee=self.employee,
            leave_request=self,
            action='rejected',
            performed_by=reviewed_by,
            note=reason or "Rejected without reason."
        )

    def cancel(self, cancelled_by: User):
        if self.status not in [self.STATUS_PENDING, self.STATUS_APPROVED]:
            raise ValidationError("Only pending or approved requests can be cancelled.")

        was_approved = self.status == self.STATUS_APPROVED
        self.status = self.STATUS_CANCELLED
        self.save(update_fields=['status', 'updated_at'])

        if was_approved and self.leave_type != self.LEAVE_UNPAID:
            try:
                balance = LeaveBalance.objects.get(
                    employee=self.employee,
                    year=self.start_date.year
                )
                balance.restore(self.leave_type, self.total_days)
            except LeaveBalance.DoesNotExist:
                pass

        LeaveAdjustmentLog.objects.create(
            employee=self.employee,
            leave_request=self,
            action='cancelled',
            performed_by=cancelled_by,
            note=f"Cancelled {'approved' if was_approved else 'pending'} leave. "
                 f"{'Balance restored.' if was_approved else ''}"
        )


# ─────────────────────────────────────────────
# 6. LEAVE ADJUSTMENT LOG (Audit Trail)
# ─────────────────────────────────────────────

class LeaveAdjustmentLog(models.Model):

    ACTION_CHOICES = (
        ('approved',      'Approved'),
        ('rejected',      'Rejected'),
        ('cancelled',     'Cancelled'),
        ('manual_add',    'Manual Balance Add'),
        ('manual_deduct', 'Manual Balance Deduct'),
        ('reset',         'Annual Reset'),
    )

    employee      = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_logs'
    )
    leave_request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs'
    )
    action       = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    note      = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employees_leaveadjustmentlog'
        verbose_name = 'Leave Adjustment Log'
        verbose_name_plural = 'Leave Adjustment Logs'
        ordering = ['-timestamp']

    def __str__(self):
        return (
            f"{self.employee.emp_id} | "
            f"{self.get_action_display()} | "
            f"{self.timestamp.strftime('%Y-%m-%d %H:%M')}"
        )
