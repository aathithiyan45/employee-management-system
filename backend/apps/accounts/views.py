from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .auth import VersionedRefreshToken, VersionedJWTAuthentication
from rest_framework.authentication import SessionAuthentication

from apps.employees.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import F
from .utils import send_invite_email
from django_ratelimit.decorators import ratelimit
from apps.analytics.utils import log_event

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
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
@ratelimit(key='post:username', rate='5/m', method='POST', block=True)
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
        # Security Hardening: Track last login IP (Proxy-aware)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        user.last_login_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        user.save(update_fields=['last_login_ip'])

        emp = getattr(user, "employee_profile", None)
        refresh = VersionedRefreshToken.for_user(user)
        access = refresh.access_token
        access['token_version'] = user.token_version

        log_event(user, "login_success", request=request)

        response = Response({
            "status":               "success",
            "username":             user.username,
            "role":                 user.role,
            "must_change_password": user.must_change_password,
            "emp_id":               emp.emp_id if emp else None,
            "access":               str(access),
        })

        # Securely set refresh token in httpOnly cookie
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=True,   # Required for samesite='None'
            samesite='None', # Required for Vercel -> Render cross-domain
            path='/api/token/refresh/',
        )
        return response

    # Generic message — intentionally does NOT reveal whether the username exists
    log_event(None, "login_failed", {"username_input": username_input}, request=request)
    return Response(
        {"status": "error", "message": "Invalid credentials"},
        status=401,
    )


# ─────────────────────────────────────────────
# LOGOUT — blacklists the refresh token
# ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([VersionedJWTAuthentication, SessionAuthentication])
def logout_view(request):
    """
    Invalidate the supplied refresh token so it cannot be used to obtain
    new access tokens after logout.  The client must also clear its own
    localStorage / cookie store.
    """
    refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
    if not refresh_token:
        return Response({'error': 'refresh token is required'}, status=400)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        # Security Hardening: Increment token_version on logout to invalidate ALL active access tokens
        user = request.user
        user.token_version = F('token_version') + 1
        user.save(update_fields=['token_version'])
        
        log_event(user, "logout_success", request=request)
    except TokenError as e:
        return Response({'error': str(e)}, status=400)

    response = Response({'message': 'Successfully logged out. All sessions invalidated.'})
    response.delete_cookie('refresh_token', path='/api/token/refresh/')
    return response


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
    user.token_version = F('token_version') + 1  # Atomic increment
    user.save(update_fields=['password', 'must_change_password', 'token_version'])
    user.refresh_from_db()  # Reload the new version from DB

    # Blacklist all outstanding tokens (sessions) for this user
    tokens = OutstandingToken.objects.filter(user=user)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)

    log_event(user, "password_changed", {"ip": request.META.get("REMOTE_ADDR")}, request=request)

    return Response({"message": "Password changed successfully. All existing sessions have been invalidated."})


# ─────────────────────────────────────────────
# EMAIL ONBOARDING
# ─────────────────────────────────────────────

@api_view(['POST'])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def set_password_view(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=400)
            
        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response({'error': e.messages}, status=400)

        user.set_password(password)
        user.is_invited = False
        user.must_change_password = False
        user.token_version = F('token_version') + 1
        user.save(update_fields=['password', 'is_invited', 'must_change_password', 'token_version'])
        user.refresh_from_db()
        
        # Blacklist any tokens issued before password was set
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)

        log_event(user, "password_set", {"ip": request.META.get("REMOTE_ADDR")}, request=request)
        return Response({'message': 'Password has been set successfully. You can now login.'})
    else:
        return Response({'error': 'The invite link is invalid or has expired.'}, status=400)


@api_view(['POST'])
@ratelimit(key='ip', rate='3/m', method='POST', block=True)
@permission_classes([IsAuthenticated])
def resend_invite_view(request, emp_id):
    if request.user.role not in ('admin', 'hr'):
        return Response({'error': 'Admin or HR access required'}, status=403)
        
    try:
        user = User.objects.get(username=emp_id)
    except User.DoesNotExist:
        # User enumeration protection: pretend we sent it
        return Response({'message': 'If account exists, email sent'})

    # Check 5 minutes cooldown
    if user.invite_sent_at and (timezone.now() - user.invite_sent_at).total_seconds() < 300:
        return Response({'error': 'Please wait 5 minutes before resending the invite'}, status=429)

    user.invite_sent_at = timezone.now()
    user.save()
    
    send_invite_email(user)
    log_event(request.user, "resend_invite", {"target_user": user.username}, request=request)
    
    return Response({'message': 'If account exists, email sent'})
