from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings
from rest_framework.authentication import SessionAuthentication

# ── TOKEN CLASSES ───────────────────────────────────────────

class VersionedRefreshToken(RefreshToken):
    """
    Custom RefreshToken that includes the user's token_version in the payload.
    """
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['token_version'] = user.token_version
        return token

class VersionedAccessToken(AccessToken):
    """
    Custom AccessToken that includes the user's token_version in the payload.
    """
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['token_version'] = user.token_version
        return token


# ── AUTHENTICATION ENGINE ────────────────────────────────────

class VersionedJWTAuthentication(JWTAuthentication):
    """
    Custom JWTAuthentication that verifies the token_version in the payload
    matches the current token_version in the database.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        
        token_version = validated_token.get('token_version')
        
        if token_version is None:
            raise AuthenticationFailed("Invalid token format (missing security version).")

        if token_version != user.token_version:
            raise InvalidToken("Token is invalid (session expired, password changed, or logged out).")
            
        return user


# ── REFRESH HARDENING ────────────────────────────────────────
# We use local imports inside methods to break circular dependencies
# during Django's initial setting load.

def get_versioned_refresh_view():
    from rest_framework_simplejwt.views import TokenRefreshView
    from rest_framework_simplejwt.serializers import TokenRefreshSerializer

    class VersionedTokenRefreshSerializer(TokenRefreshSerializer):
        def validate(self, attrs):
            request = self.context.get('request')
            refresh_token = request.COOKIES.get('refresh_token')
            
            if not refresh_token:
                raise InvalidToken("Secure session cookie missing. Please login again.")

            # Hardening: Exclusively use the cookie, ignore any token in request body
            attrs['refresh'] = refresh_token
            data = super().validate(attrs)
            
            # Extract user to generate versioned access token
            refresh = RefreshToken(refresh_token)
            user_id = refresh.payload.get('user_id')
            from apps.employees.models import User
            user = User.objects.get(id=user_id)
            
            access = VersionedAccessToken.for_user(user)
            data['access'] = str(access)
            return data

    class VersionedTokenRefreshView(TokenRefreshView):
        serializer_class = VersionedTokenRefreshSerializer
        authentication_classes = [SessionAuthentication]

        def post(self, request, *args, **kwargs):
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200 and 'refresh' in response.data:
                new_refresh = response.data.pop('refresh')
                response.set_cookie(
                    key='refresh_token',
                    value=new_refresh,
                    httponly=True,
                    secure=True,   # Required for samesite='None'
                    samesite='None', # Required for cross-domain
                    path='/api/token/refresh/',
                )
            return response

    return VersionedTokenRefreshView
