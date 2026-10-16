from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.employees.models import User


class UserAndRolesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create admin user
        self.admin_user = User.objects.create_user(
            username="admin_test",
            email="admin@test.com",
            password="adminpassword123",
            role="admin",
            is_active=True,
            is_staff=True,
        )

        # Create secondary admin user
        self.admin_user_2 = User.objects.create_user(
            username="admin_test_2",
            email="admin2@test.com",
            password="adminpassword123",
            role="admin",
            is_active=True,
            is_staff=True,
        )

        # Create hr user
        self.hr_user = User.objects.create_user(
            username="hr_test",
            email="hr@test.com",
            password="hrpassword123",
            role="hr",
            is_active=True,
        )

        # Create employee user (non-admin/non-hr or standard employee)
        self.employee_user = User.objects.create_user(
            username="emp_test",
            email="emp@test.com",
            password="emppassword123",
            role="employee",
            is_active=True,
        )

    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests must be rejected with 401."""
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_access_denied(self):
        """Non-admin users (such as HR or employee role) cannot manage users."""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_users_with_summary(self):
        """Admin can list users and view summary statistics."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        summary = response.data["summary"]
        self.assertEqual(summary["total_users"], 3)
        self.assertEqual(summary["admin_count"], 2)
        self.assertEqual(summary["hr_count"], 1)

    def test_admin_can_create_user(self):
        """Admin can create a new user with secure password hashing."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "username": "new_hr_person",
            "email": "new_hr@test.com",
            "password": "strongPassword123",
            "first_name": "New",
            "last_name": "HR",
            "role": "hr",
            "is_active": True,
        }
        response = self.client.post("/api/users/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "new_hr_person")
        self.assertNotIn("password", response.data["user"])

        # Verify password in database
        created = User.objects.get(username="new_hr_person")
        self.assertTrue(created.check_password("strongPassword123"))
        self.assertNotEqual(created.password, "strongPassword123")

    def test_create_user_validation(self):
        """Validates duplicate username, duplicate email, and short passwords."""
        self.client.force_authenticate(user=self.admin_user)

        # Duplicate username
        res = self.client.post(
            "/api/users/",
            data={"username": "admin_test", "password": "password123", "role": "hr"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already taken", res.data["error"])

        # Duplicate email
        res = self.client.post(
            "/api/users/",
            data={"username": "unique_user", "email": "admin@test.com", "password": "password123", "role": "hr"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already in use", res.data["error"])

        # Password too short
        res = self.client.post(
            "/api/users/",
            data={"username": "unique_user2", "password": "123", "role": "hr"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least 6 characters", res.data["error"])

    def test_admin_can_update_user(self):
        """Admin can update user names, role, and reset password."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "first_name": "UpdatedHR",
            "last_name": "Manager",
            "email": "updated_hr@test.com",
            "password": "newSecurePassword999",
        }
        response = self.client.put(f"/api/users/{self.hr_user.id}/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.hr_user.refresh_from_db()
        self.assertEqual(self.hr_user.first_name, "UpdatedHR")
        self.assertEqual(self.hr_user.email, "updated_hr@test.com")
        self.assertTrue(self.hr_user.check_password("newSecurePassword999"))

    def test_prevent_self_deactivation(self):
        """Admin cannot deactivate their own account."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f"/api/users/{self.admin_user.id}/toggle-status/", data={"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot deactivate your own account", response.data["error"])

    def test_prevent_self_deletion(self):
        """Admin cannot delete their own account."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f"/api/users/{self.admin_user.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot delete your own user account", response.data["error"])

    def test_prevent_last_active_admin_lockout(self):
        """System prevents deactivating, demoting, or deleting the last active admin."""
        # Deactivate admin 2 so admin_user is the sole active admin
        self.admin_user_2.is_active = False
        self.admin_user_2.save()

        # Admin 1 authenticates
        self.client.force_authenticate(user=self.admin_user)

        # Attempt to demote admin_user
        res = self.client.put(f"/api/users/{self.admin_user.id}/", data={"role": "hr"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("last active administrator", res.data["error"])

        # Attempt to delete admin_user
        res = self.client.delete(f"/api/users/{self.admin_user.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_toggle_user_status(self):
        """Admin can activate and deactivate other non-admin or secondary users."""
        self.client.force_authenticate(user=self.admin_user)

        # Deactivate hr user
        res = self.client.post(f"/api/users/{self.hr_user.id}/toggle-status/", data={"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.hr_user.refresh_from_db()
        self.assertFalse(self.hr_user.is_active)

        # Reactivate hr user
        res = self.client.post(f"/api/users/{self.hr_user.id}/toggle-status/", data={"is_active": True}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.hr_user.refresh_from_db()
        self.assertTrue(self.hr_user.is_active)


class CorsSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_localhost_origin_allowed(self):
        """Verified local development origin is accepted."""
        response = self.client.options(
            "/api/login/",
            HTTP_ORIGIN="http://localhost:3000",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")
        self.assertEqual(response.headers.get("Access-Control-Allow-Credentials"), "true")

    def test_production_vercel_origin_allowed(self):
        """Verified production Vercel frontend origin is accepted."""
        response = self.client.options(
            "/api/login/",
            HTTP_ORIGIN="https://employee-management-system-6sgf.vercel.app",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://employee-management-system-6sgf.vercel.app")
        self.assertEqual(response.headers.get("Access-Control-Allow-Credentials"), "true")

    def test_project_preview_vercel_origin_allowed(self):
        """Verified preview branch of this project is accepted."""
        response = self.client.options(
            "/api/login/",
            HTTP_ORIGIN="https://employee-management-system-6sgf-pr12.vercel.app",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://employee-management-system-6sgf-pr12.vercel.app")

    def test_unauthorized_vercel_origin_rejected(self):
        """Arbitrary third-party Vercel subdomains must be rejected."""
        response = self.client.options(
            "/api/login/",
            HTTP_ORIGIN="https://attacker-app.vercel.app",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    def test_arbitrary_unauthorized_origin_rejected(self):
        """Random web origins must be rejected."""
        response = self.client.options(
            "/api/login/",
            HTTP_ORIGIN="https://evil-site.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)
