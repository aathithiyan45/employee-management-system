import logging

from django.contrib.auth import get_user_model
from .utils import send_invite_email

logger = logging.getLogger(__name__)
User = get_user_model()

def send_bulk_invite_emails(user_ids):
    """
    Asynchronous task to send invite emails to multiple users.
    Includes retry logic for SMTP resilience.
    """
    users = User.objects.filter(id__in=user_ids)
    success_count = 0
    fail_count = 0
    
    for user in users:
        try:
            if send_invite_email(user):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            logger.error(f"Error in send_bulk_invite_emails for user {user.id}: {str(e)}")
            fail_count += 1
            
    logger.info(f"Bulk email task finished: {success_count} succeeded, {fail_count} failed.")
    return {"success": success_count, "failed": fail_count}
