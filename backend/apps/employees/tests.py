from datetime import date
from decimal import Decimal
from django.test import TestCase
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.test import APIClient
from apps.employees.models import Employee, Division, User
from apps.payroll.models import Payroll, WorkLog
from apps.documents.models import EmployeeDocument


class EmployeeDataRetentionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_user(
            username="admin_audit",
            email="admin_audit@test.com",
            password="adminpassword123",
            role="admin",
            is_active=True,
            is_staff=True,
        )

        # Division
        self.division = Division.objects.create(name="Engineering", code="ENG")

        # Employee 1 with linked user and historical records
        self.emp_user = User.objects.create_user(
            username="john_doe",
            email="john@test.com",
            password="userpassword123",
            role="employee",
            is_active=True,
        )
        self.employee = Employee.objects.create(
            emp_id="EMP999",
            name="John Doe",
            division=self.division,
            user=self.emp_user,
            is_active=True,
            ipa_salary=5000.0,
            per_hr=25.0,
        )

        # Historical payroll record
        self.payroll = Payroll.objects.create(
            employee=self.employee,
            month=date(2026, 9, 1),
            total_hours=160.0,
            per_hour=Decimal("25.00"),
            total_salary=Decimal("4000.00"),
            status="paid",
        )

        # Historical work log
        self.worklog = WorkLog.objects.create(
            employee=self.employee,
            date=date(2026, 9, 15),
            hours=8.0,
            created_by=self.admin,
        )

    def test_default_deletion_is_soft_delete(self):
        """Deleting an employee defaults to soft-delete (is_active=False)."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/employees/{self.employee.emp_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("soft_deleted"))

        # Verify employee is deactivated, not deleted
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

        # Verify linked user account was also deactivated
        self.emp_user.refresh_from_db()
        self.assertFalse(self.emp_user.is_active)

        # Verify historical payroll and worklog remain 100% intact
        self.assertTrue(Payroll.objects.filter(employee=self.employee).exists())
        self.assertTrue(WorkLog.objects.filter(employee=self.employee).exists())

    def test_permanent_deletion_blocked_when_payroll_exists(self):
        """Permanent deletion is rejected with 400 when historical payroll exists."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/employees/{self.employee.emp_id}/?permanent=true")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot permanently delete employee with historical", response.data.get("error", ""))

        # Employee and payroll must still exist
        self.assertTrue(Employee.objects.filter(emp_id=self.employee.emp_id).exists())
        self.assertTrue(Payroll.objects.filter(employee=self.employee).exists())

    def test_orm_level_protected_error(self):
        """Direct ORM delete on employee raises ProtectedError due to on_delete=models.PROTECT."""
        with self.assertRaises(ProtectedError):
            self.employee.delete()

    def test_permanent_deletion_allowed_for_draft_employee(self):
        """Draft employee with zero historical records can be permanently deleted."""
        draft_emp = Employee.objects.create(
            emp_id="DRAFT001",
            name="Draft Record",
            division=self.division,
            is_active=True,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/employees/{draft_emp.emp_id}/?permanent=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("permanent"))
        self.assertFalse(Employee.objects.filter(emp_id="DRAFT001").exists())

    def test_reactivate_employee_via_update(self):
        """Deactivated employee can be reactivated via update endpoint."""
        # Deactivate first
        self.employee.is_active = False
        self.employee.save()
        self.emp_user.is_active = False
        self.emp_user.save()

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/employees/{self.employee.emp_id}/update/",
            data={"is_active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.employee.refresh_from_db()
        self.assertTrue(self.employee.is_active)
        self.emp_user.refresh_from_db()
        self.assertTrue(self.emp_user.is_active)
