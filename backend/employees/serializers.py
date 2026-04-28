from rest_framework import serializers
from .models import Employee


# Safe public fields only — salary, bank_account, fin_no, passport_no are excluded.
# Views that need sensitive data build response dicts manually with an is_privileged check.
# Never add salary/bank fields here without also adding an is_privileged guard at the view layer.
SAFE_EMPLOYEE_FIELDS = [
    'emp_id',
    'name',
    'designation_ipa',
    'designation_aug',
    'division',
    'nationality',
    'phone',
    'dob',
    'doa',
    'arrival_date',
    'date_joined_company',
    'ic_status',
    'issue_date',
    'wp_expiry',
    'passport_expiry',
    'work_at_height',
    'confined_space',
    'signalman_rigger',
    'firewatchman',
    'welder_no',
    'accommodation',
    'pcp_status',
    'remarks',
    'is_active',
]


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for non-privileged contexts (e.g. employee self-view,
    public directory listings). Salary, bank details, and identity document
    numbers are explicitly excluded.

    For admin/HR responses that need salary data, build the response dict
    manually in the view with an is_privileged check — do NOT add sensitive
    fields here.
    """
    class Meta:
        model = Employee
        fields = SAFE_EMPLOYEE_FIELDS
        read_only_fields = SAFE_EMPLOYEE_FIELDS


class PrivilegedEmployeeSerializer(serializers.ModelSerializer):
    """
    Full serializer for admin/HR use ONLY.
    Never use this in a view without first checking:
        if request.user.role not in ('admin', 'hr'):
            return Response(status=403)
    """
    class Meta:
        model = Employee
        exclude = ['user']  # exclude the FK to User — never expose user.password hash
