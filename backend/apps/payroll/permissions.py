from rest_framework import permissions

class IsAdminOrHR(permissions.BasePermission):
    """
    Custom permission to only allow admin or HR to access payroll data.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_admin or request.user.is_hr)
        )
