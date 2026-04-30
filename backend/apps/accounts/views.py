from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.employees.models import User

# ─────────────────────────────────────────────
# CUSTOM THROTTLE — LOGIN
# ─────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    """
    Applies the 'login' rate limit scope defined in settings.py:
        'login': '10/minute'
    Throttles by IP address (REMOTE_ADDR). Returns HTTP 429 when
    the limit is exceeded, with a Retry-After header so clients
    know exactly how long to wait.
    """
    scope = 'login'


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@api_view(['POST'])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """
    Authenticate and return JWT tokens.

    Rate-limited to 10 attempts per minute per IP via LoginRateThrottle.
    On the 11th attempt within 60 s, DRF returns HTTP 429 with a
    Retry-After header automatically — no extra code needed here.

    Security note: we always return the same generic "Invalid credentials"
    message whether the username doesn't exist OR the password is wrong.
    This prevents username enumeration (an attacker learning which emp_ids
    are valid accounts by observing different error messages).
    """
    username_input = request.data.get("username")
    password = request.data.get("password")

    if not username_input or not password:
        return Response(
            {"status": "error", "message": "Username and password required"},
            status=400,
        )

    # Primary authentication attempt
    user = authenticate(username=username_input, password=password)

    # Secondary attempt: in case the input was an emp_id rather than username
    # (kept for backwards compatibility — both paths produce the same error)
    if user is None:
        try:
            emp_user = User.objects.get(username=username_input)
            user = authenticate(username=emp_user.username, password=password)
        except User.DoesNotExist:
            pass

    if user:
        emp = getattr(user, "employee_profile", None)
        refresh = RefreshToken.for_user(user)

        return Response({
            "status":               "success",
            "username":             user.username,
            "role":                 user.role,
            "must_change_password": user.must_change_password,
            "emp_id":               emp.emp_id if emp else None,
            "access":               str(refresh.access_token),
            "refresh":              str(refresh),
        })

    # Generic message — intentionally does NOT reveal whether the username exists
    return Response(
        {"status": "error", "message": "Invalid credentials"},
        status=401,
    )


# ─────────────────────────────────────────────
# LOGOUT — blacklists the refresh token
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Invalidate the supplied refresh token so it cannot be used to obtain
    new access tokens after logout.  The client must also clear its own
    localStorage / cookie store.
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'refresh token is required'}, status=400)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()          # requires rest_framework_simplejwt.token_blacklist in INSTALLED_APPS
    except TokenError as e:
        return Response({'error': str(e)}, status=400)

    return Response({'message': 'Successfully logged out.'})


# ─────────────────────────────────────────────
# CHANGE PASSWORD
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    new_password = request.data.get("new_password")
    confirm      = request.data.get("confirm_password")

    if not new_password or not confirm:
        return Response({"error": "Both fields required"}, status=400)
    if new_password != confirm:
        return Response({"error": "Passwords do not match"}, status=400)
    if len(new_password) < 8:
        return Response({"error": "Password must be at least 8 characters"}, status=400)

    user.set_password(new_password)
    user.must_change_password = False
    user.save()

    return Response({"message": "Password changed successfully"})
