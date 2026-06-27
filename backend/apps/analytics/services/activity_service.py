from apps.analytics.models import AuditLog
from apps.analytics.utils.activity_mapper import map_audit_event

def get_recent_activities(limit=10):
    """
    Fetches the latest activities using select_related to prevent N+1 queries.
    Uses the mapping layer to format results.
    """
    logs = AuditLog.objects.select_related('user').order_by('-created_at')[:limit]
    return [map_audit_event(log) for log in logs]
