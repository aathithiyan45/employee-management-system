"""
models.py — Full Production Model File
Covers: User, Division, Employee, LeaveBalance, LeaveRequest, LeaveAdjustmentLog
"""

from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone


def get_current_year():
    """Callable default for LeaveBalance.year — evaluated per-instance, not at class load."""
    return timezone.now().year
from datetime import date


# ─────────────────────────────────────────────
# 1. CUSTOM USER MODEL
# ─────────────────────────────────────────────

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
        ('hr', 'HR'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    must_change_password = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_hr(self):
        return self.role == 'hr'

    @property
    def is_employee_role(self):
        return self.role == 'employee'


# ─────────────────────────────────────────────
# 2. DIVISION
# ─────────────────────────────────────────────

class Division(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, blank=True, null=True, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Division'
        verbose_name_plural = 'Divisions'
        ordering = ['name']

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# 3. EMPLOYEE
# ─────────────────────────────────────────────

class Employee(models.Model):

    # ── Link to login account
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee_profile'
    )

    # ── Basic Info
    emp_id        = models.CharField(max_length=50, unique=True, db_index=True)
    name          = models.CharField(max_length=150)
    phone         = models.CharField(max_length=20, blank=True, null=True)
    nationality   = models.CharField(max_length=50, blank=True, null=True)
    dob           = models.DateField(blank=True, null=True)
    qualification = models.CharField(max_length=100, blank=True, null=True)

    # ── Division
    division = models.ForeignKey(
        Division,
        on_delete=models.PROTECT,
        db_index=True,
        related_name='employees'
    )

    # ── Job Info
    designation_ipa  = models.CharField(max_length=100, blank=True, null=True)
    designation_aug  = models.CharField(max_length=100, blank=True, null=True)
    trade            = models.CharField(max_length=100, blank=True, null=True)
    ipa_salary       = models.FloatField(blank=True, null=True)
    per_hr           = models.FloatField(blank=True, null=True)

    # ── Employment Dates
    doa                  = models.DateField(blank=True, null=True, verbose_name="Date of Arrival")
    arrival_date         = models.DateField(blank=True, null=True, verbose_name="Arrival Date")
    date_joined_company  = models.DateField(blank=True, null=True, verbose_name="Company Join Date")

    # ── Work Permit / IC
    work_permit_no = models.CharField(max_length=50, blank=True, null=True)
    fin_no         = models.CharField(max_length=50, blank=True, null=True)
    ic_status      = models.CharField(max_length=50, blank=True, null=True)
    issue_date     = models.DateField(blank=True, null=True)
    wp_expiry      = models.DateField(blank=True, null=True)

    # ── Passport
    passport_no          = models.CharField(max_length=50, blank=True, null=True)
    passport_expiry      = models.DateField(blank=True, null=True)
    passport_issue_date  = models.DateField(blank=True, null=True)
    passport_issue_place = models.CharField(max_length=100, blank=True, null=True)

    # ── Certifications / Safety
    ssic_gt_sn  = models.CharField(max_length=100, blank=True, null=True)
    ssic_gt_exp = models.DateField(blank=True, null=True)
    ssic_ht_sn  = models.CharField(max_length=100, blank=True, null=True)
    ssic_ht_exp = models.DateField(blank=True, null=True)

    work_at_height   = models.BooleanField(default=False)
    confined_space   = models.BooleanField(default=False)
    signalman_rigger = models.BooleanField(default=False)
    firewatchman     = models.BooleanField(default=False)
    gas_meter_carrier = models.BooleanField(default=False)

    welder_no = models.CharField(max_length=100, blank=True, null=True)
    lssc_sn   = models.CharField(max_length=100, blank=True, null=True)

    # ── Project Pass
    dynamac_pass_sn  = models.CharField(max_length=100, blank=True, null=True)
    dynamac_pass_exp = models.DateField(blank=True, null=True)

    # ── Security Bond
    security_bond_no  = models.CharField(max_length=100, blank=True, null=True)
    security_bond_exp = models.DateField(blank=True, null=True)

    # ── Finance
    salary       = models.FloatField(blank=True, null=True)
    bank_account = models.CharField(max_length=100, blank=True, null=True)

    # ── Other
    accommodation = models.CharField(max_length=100, blank=True, null=True)
    pcp_status    = models.CharField(max_length=100, blank=True, null=True)
    remarks       = models.TextField(blank=True, null=True)

    # ── Status & Audit
    is_active  = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'
        ordering = ['emp_id']
        indexes = [
            models.Index(fields=['is_active', 'division']),
            models.Index(fields=['wp_expiry']),
            models.Index(fields=['passport_expiry']),
            models.Index(fields=['date_joined_company']),
        ]

    def __str__(self):
        return f"{self.emp_id} - {self.name}"

    # ── Computed helpers
    @property
    def age(self):
        if self.dob:
            today = date.today()
            return today.year - self.dob.year - (
                (today.month, today.day) < (self.dob.month, self.dob.day)
            )
        return None

    @property
    def experience_years(self):
        """Auto-calculated from date_joined_company. No Excel column needed."""
        if self.date_joined_company:
            today = date.today()
            delta = today - self.date_joined_company
            return round(delta.days / 365.25, 1)
        return None

    @property
    def wp_expiring_soon(self):
        """Returns True if WP expires within 60 days."""
        if self.wp_expiry:
            return (self.wp_expiry - date.today()).days <= 60
        return False

    @property
    def passport_expiring_soon(self):
        """Returns True if passport expires within 90 days."""
        if self.passport_expiry:
            return (self.passport_expiry - date.today()).days <= 90
        return False


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
        verbose_name = 'Leave Adjustment Log'
        verbose_name_plural = 'Leave Adjustment Logs'
        ordering = ['-timestamp']

    def __str__(self):
        return (
            f"{self.employee.emp_id} | "
            f"{self.get_action_display()} | "
            f"{self.timestamp.strftime('%Y-%m-%d %H:%M')}"
        )