from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    must_change_password = models.BooleanField(default=True)

    def __str__(self):
        return self.username
class Division(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)

    # Basic Info
    emp_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    nationality = models.CharField(max_length=50, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)

    division = models.ForeignKey(Division, on_delete=models.CASCADE)

    # Job Info
    designation_ipa = models.CharField(max_length=100, blank=True, null=True)
    ipa_salary = models.FloatField(blank=True, null=True)
    per_hr = models.FloatField(blank=True, null=True)
    designation_aug = models.CharField(max_length=100, blank=True, null=True)

    # Work Permit / IC
    work_permit_no = models.CharField(max_length=50, blank=True, null=True)
    fin_no = models.CharField(max_length=50, blank=True, null=True)
    issue_date = models.DateField(blank=True, null=True)
    ic_status = models.CharField(max_length=50, blank=True, null=True)
    wp_expiry = models.DateField(blank=True, null=True)

    # Passport
    passport_no = models.CharField(max_length=50, blank=True, null=True)
    passport_expiry = models.DateField(blank=True, null=True)
    passport_issue_date = models.DateField(blank=True, null=True)
    passport_issue_place = models.CharField(max_length=100, blank=True, null=True)

    # Dates
    doa = models.DateField(blank=True, null=True)
    arrival_date = models.DateField(blank=True, null=True)

    # Certifications / Safety
    ssic_gt_sn = models.CharField(max_length=100, blank=True, null=True)
    ssic_gt_exp = models.DateField(blank=True, null=True)
    ssic_ht_sn = models.CharField(max_length=100, blank=True, null=True)
    ssic_ht_exp = models.DateField(blank=True, null=True)

    work_at_height = models.BooleanField(default=False)
    confined_space = models.BooleanField(default=False)
    welder_no = models.CharField(max_length=100, blank=True, null=True)
    lssc_sn = models.CharField(max_length=100, blank=True, null=True)

    signalman_rigger = models.BooleanField(default=False)
    firewatchman = models.BooleanField(default=False)
    gas_meter_carrier = models.BooleanField(default=False)

    # Project Pass
    dynamac_pass_sn = models.CharField(max_length=100, blank=True, null=True)
    dynamac_pass_exp = models.DateField(blank=True, null=True)

    # Finance
    salary = models.FloatField(blank=True, null=True)
    bank_account = models.CharField(max_length=100, blank=True, null=True)

    # Other
    qualification = models.CharField(max_length=100, blank=True, null=True)
    accommodation = models.CharField(max_length=100, blank=True, null=True)
    pcp_status = models.CharField(max_length=100, blank=True, null=True)

    security_bond_no = models.CharField(max_length=100, blank=True, null=True)
    security_bond_exp = models.DateField(blank=True, null=True)

    remarks = models.TextField(blank=True, null=True)

    # System fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.emp_id} - {self.name}"