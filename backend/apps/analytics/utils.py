from .models import AuditLog

def log_event(user, event, details=None, request=None):
    ip = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
            
    AuditLog.objects.create(
        user=user,
        event=event,
        details=details or {},
        ip_address=ip
    )
