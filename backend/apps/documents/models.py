from datetime import date
from django.db import models
from apps.employees.models import Employee, User

# ─────────────────────────────────────────────────────────────
# EMPLOYEE DOCUMENT
# ─────────────────────────────────────────────────────────────

class EmployeeDocument(models.Model):
    """
    Stores uploaded documents (Passport copy, Work Permit copy, etc.)
    linked to an Employee.  Files are stored under MEDIA_ROOT/employee_docs/.
    """

    DOC_PASSPORT      = 'passport'
    DOC_WORK_PERMIT   = 'work_permit'
    DOC_SSIC_GT       = 'ssic_gt'
    DOC_SSIC_HT       = 'ssic_ht'
    DOC_SECURITY_BOND = 'security_bond'
    DOC_OTHER         = 'other'

    DOC_TYPE_CHOICES = [
        (DOC_PASSPORT,      'Passport'),
        (DOC_WORK_PERMIT,   'Work Permit'),
        (DOC_SSIC_GT,       'SSIC GT'),
        (DOC_SSIC_HT,       'SSIC HT'),
        (DOC_SECURITY_BOND, 'Security Bond'),
        (DOC_OTHER,         'Other'),
    ]

    employee    = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    doc_type    = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    label       = models.CharField(
        max_length=120,
        blank=True,
        help_text="Optional human-readable label, e.g. 'Passport Renewal 2025'"
    )
    file        = models.FileField(upload_to='employee_docs/%Y/%m/')
    expiry_date = models.DateField(blank=True, null=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='uploaded_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes       = models.TextField(blank=True, null=True)

    class Meta:
        db_table            = 'employees_employeedocument'
        verbose_name        = 'Employee Document'
        verbose_name_plural = 'Employee Documents'
        ordering            = ['-uploaded_at']
        indexes             = [
            models.Index(fields=['employee', 'doc_type']),
            models.Index(fields=['expiry_date']),
        ]

    def __str__(self):
        return f"{self.employee.emp_id} | {self.get_doc_type_display()} | {self.uploaded_at.date()}"

    @property
    def is_expiring_soon(self):
        """Returns True if expiry_date is within 60 days from today."""
        if self.expiry_date:
            return (self.expiry_date - date.today()).days <= 60
        return False

    @property
    def is_expired(self):
        if self.expiry_date:
            return self.expiry_date < date.today()
        return False
