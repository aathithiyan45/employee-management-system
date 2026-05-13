from rest_framework.permissions import BasePermission

class IsAdminOrHR(BasePermission):
    """
    Allows access only to Admin and HR roles.
    Assumes the user is already authenticated.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) in ('admin', 'hr')
        )
