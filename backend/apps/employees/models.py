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
    token_version = models.IntegerField(default=0, db_index=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    email = models.EmailField(unique=True, blank=True, null=True)
    is_invited = models.BooleanField(default=False)
    invite_sent_at = models.DateTimeField(null=True, blank=True)

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

    def save(self, *args, **kwargs):
        """
        Data Integrity Enforcement:
        Ensure 'ipa_salary' and 'salary' are always in sync.
        We treat 'ipa_salary' as the primary source for consistency.
        """
        if self.ipa_salary is not None:
            self.salary = self.ipa_salary
        elif self.salary is not None:
            self.ipa_salary = self.salary
            
        super().save(*args, **kwargs)

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