import logging
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from apps.analytics.utils import log_event

logger = logging.getLogger(__name__)

def send_invite_email(user):
    if not user.email:
        logger.error(f"Cannot send invite email to user {user.username}: No email address")
        return False
        
    try:
        # Generate token and UID
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Determine base frontend URL from CORS allowed origins or hardcoded
        # Usually settings.FRONTEND_URL, but here we can assume http://localhost:3000
        # or use the first CORS origin
        frontend_url = "http://localhost:3000"
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
            frontend_url = settings.CORS_ALLOWED_ORIGINS[0]
            
        invite_link = f"{frontend_url}/set-password/{uid}/{token}/"
        
        subject = "Welcome to EMS - Set your password"
        message = f"Hello {user.username},\n\nYou have been invited to the Employee Management System.\nPlease set your password by clicking the following link:\n{invite_link}\n\nThis link is for one-time use."
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@ems.local',
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Only log email and event
        logger.info(f"Invite email sent successfully to {user.email}")
        log_event(user, "invite_sent", {"email": user.email})
        return True
    except Exception as e:
        logger.error(f"Failed to send invite email to {user.email}: {str(e)}")
        return False
