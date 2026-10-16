from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.accounts.permissions import IsAdminOnly
from apps.analytics.utils import log_event
from apps.employees.models import User


def serialize_user(user, current_user=None):
    """
    Serializes a User object into a safe dictionary for the frontend.
    Never exposes password hashes or secret tokens.
    """
    full_name = f"{user.first_name} {user.last_name}".strip()
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "full_name": full_name or user.username,
        "email": user.email or "",
        "role": user.role,
        "role_display": user.get_role_display(),
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "is_self": bool(current_user and current_user.id == user.id),
    }


# ─────────────────────────────────────────────────────────────
# LIST & CREATE USERS
# ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminOnly])
def user_list_create_view(request):
    """
    GET:  Returns paginated list of Admin and HR users with search, role, and status filters,
          plus aggregated summary metrics.
    POST: Creates a new user with 'admin' or 'hr' role securely.
    """
    if request.method == "GET":
        # Base query focuses on system management roles (admin, hr)
        qs = User.objects.filter(role__in=["admin", "hr"]).order_by("-date_joined")

        # Global metrics (unfiltered across admin & hr)
        total_users = User.objects.filter(role__in=["admin", "hr"]).count()
        admin_count = User.objects.filter(role="admin").count()
        hr_count = User.objects.filter(role="hr").count()
        active_count = User.objects.filter(role__in=["admin", "hr"], is_active=True).count()
        inactive_count = User.objects.filter(role__in=["admin", "hr"], is_active=False).count()

        # ── Filters
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        role_filter = request.GET.get("role", "").strip().lower()
        if role_filter in ["admin", "hr"]:
            qs = qs.filter(role=role_filter)

        status_filter = request.GET.get("status", "").strip().lower()
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)

        # ── Pagination
        paginator = PageNumberPagination()
        try:
            page_size = int(request.GET.get("page_size", 10))
            paginator.page_size = max(1, min(page_size, 100))
        except (ValueError, TypeError):
            paginator.page_size = 10

        page = paginator.paginate_queryset(qs, request)
        user_list = [serialize_user(u, request.user) for u in page]

        response = paginator.get_paginated_response(user_list)
        response.data["summary"] = {
            "total_users": total_users,
            "admin_count": admin_count,
            "hr_count": hr_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
        }
        return response

    elif request.method == "POST":
        data = request.data
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", "")).strip()
        email = str(data.get("email", "")).strip()
        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        role = str(data.get("role", "hr")).strip().lower()
        is_active = data.get("is_active", True)

        # Validation
        if not username:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({"error": f"Username '{username}' is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        if email and User.objects.filter(email__iexact=email).exists():
            return Response({"error": f"Email '{email}' is already in use by another user."}, status=status.HTTP_400_BAD_REQUEST)

        if not password:
            return Response({"error": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ["admin", "hr"]:
            return Response({"error": "Role must be either 'admin' or 'hr'."}, status=status.HTTP_400_BAD_REQUEST)

        # Create user
        user = User(
            username=username,
            email=email or None,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_active=bool(is_active),
            is_staff=(role == "admin"),
            must_change_password=False,
        )
        user.set_password(password)
        user.save()

        log_event(
            request.user,
            "user_created",
            {
                "created_user_id": user.id,
                "created_username": user.username,
                "role": user.role,
                "email": user.email,
            },
            request=request,
        )

        return Response(
            {
                "message": f"User '{user.username}' created successfully.",
                "user": serialize_user(user, request.user),
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────
# RETRIEVE, UPDATE, DELETE USER
# ─────────────────────────────────────────────────────────────

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminOnly])
def user_detail_update_delete_view(request, user_id):
    """
    GET:    Retrieve user details.
    PUT:    Update user details, role, or password.
    DELETE: Delete a user account (with safeguard against deleting self or last admin).
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"user": serialize_user(user, request.user)})

    elif request.method == "PUT":
        data = request.data
        updated_fields = []

        # Role modification & last admin protection
        new_role = data.get("role")
        if new_role and new_role in ["admin", "hr"]:
            if user.role == "admin" and new_role != "admin":
                # Check if this user is the last active admin
                remaining_admins = User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk).count()
                if remaining_admins < 1:
                    return Response(
                        {"error": "Cannot change the role of the last active administrator. At least one active admin is required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            user.role = new_role
            user.is_staff = (new_role == "admin")
            updated_fields.append("role")

        # Name fields
        if "first_name" in data:
            user.first_name = str(data["first_name"]).strip()
            updated_fields.append("first_name")
        if "last_name" in data:
            user.last_name = str(data["last_name"]).strip()
            updated_fields.append("last_name")

        # Email update
        if "email" in data:
            new_email = str(data["email"]).strip()
            if new_email and User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({"error": f"Email '{new_email}' is already in use by another user."}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email or None
            updated_fields.append("email")

        # Optional Password reset
        new_password = data.get("password")
        if new_password:
            new_password = str(new_password).strip()
            if len(new_password) < 6:
                return Response({"error": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.token_version = (user.token_version or 0) + 1
            updated_fields.append("password")

            # Invalidate tokens for modified user
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)

        user.save()

        log_event(
            request.user,
            "user_updated",
            {
                "target_user_id": user.id,
                "target_username": user.username,
                "updated_fields": updated_fields,
            },
            request=request,
        )

        return Response({
            "message": f"User '{user.username}' updated successfully.",
            "user": serialize_user(user, request.user),
        })

    elif request.method == "DELETE":
        # Cannot delete oneself
        if request.user.id == user.id:
            return Response({"error": "You cannot delete your own user account."}, status=status.HTTP_400_BAD_REQUEST)

        # Cannot delete last active admin
        if user.role == "admin" and user.is_active:
            remaining_admins = User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk).count()
            if remaining_admins < 1:
                return Response(
                    {"error": "Cannot delete the last active administrator. At least one active admin is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target_name = user.username
        target_id = user.id
        user.delete()

        log_event(
            request.user,
            "user_deleted",
            {"deleted_user_id": target_id, "deleted_username": target_name},
            request=request,
        )

        return Response({"message": f"User '{target_name}' deleted successfully."})


# ─────────────────────────────────────────────────────────────
# ACTIVATE / DEACTIVATE USER
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminOnly])
def user_toggle_status_view(request, user_id):
    """
    Toggles or sets the active status of a user account.
    Protects against self-deactivation and deactivating the last active administrator.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    desired_status = request.data.get("is_active")
    new_status = not user.is_active if desired_status is None else bool(desired_status)

    # If deactivating, perform safety checks
    if not new_status:
        # 1. Prevent self-deactivation
        if request.user.id == user.id:
            return Response(
                {"error": "You cannot deactivate your own account to prevent lockout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Prevent deactivating the last active administrator
        if user.role == "admin":
            remaining_admins = User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk).count()
            if remaining_admins < 1:
                return Response(
                    {"error": "Cannot deactivate the last active administrator. The system requires at least one active admin."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

    user.is_active = new_status
    if not new_status:
        # Invalidate tokens when deactivated
        user.token_version = (user.token_version or 0) + 1
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)

    user.save(update_fields=["is_active", "token_version"])

    log_event(
        request.user,
        "user_status_changed",
        {
            "target_user_id": user.id,
            "target_username": user.username,
            "is_active": user.is_active,
        },
        request=request,
    )

    action_label = "activated" if user.is_active else "deactivated"
    return Response({
        "message": f"User '{user.username}' has been {action_label}.",
        "user": serialize_user(user, request.user),
    })
