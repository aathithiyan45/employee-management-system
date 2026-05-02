import os
from datetime import date
from django.conf import settings
from django.http import FileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.employees.models import Employee
from apps.documents.models import EmployeeDocument
from apps.employees.views import validate_upload

# ─────────────────────────────────────────────────────────────────────
# DOCUMENT MANAGEMENT
# ─────────────────────────────────────────────────────────────────────

DOCUMENT_ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
DOCUMENT_MAGIC = {
    b'\x25\x50\x44\x46',           # PDF (%PDF)
    b'\xff\xd8\xff',               # JPEG
    b'\x89\x50\x4e\x47',           # PNG
}
DOCUMENT_MAX_BYTES = 10 * 1024 * 1024   # 10 MB


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def document_list_upload(request, emp_id):
    """
    GET  /api/documents/<emp_id>/  — list all documents for an employee
    POST /api/documents/<emp_id>/  — upload a new document (admin/hr only)

    Employees can GET their own documents only.
    Admin/HR can GET and POST for any employee.
    """
    try:
        emp = Employee.objects.get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=404)

    is_privileged = request.user.role in ('admin', 'hr')
    is_own        = hasattr(request.user, 'employee_profile') and \
                    request.user.employee_profile.emp_id == emp_id

    if not (is_privileged or is_own):
        return Response({'error': 'Forbidden.'}, status=403)

    # ── GET ──────────────────────────────────────────────────
    if request.method == 'GET':
        docs = EmployeeDocument.objects.filter(employee=emp).select_related('uploaded_by')
        today = date.today()
        data = []
        for d in docs:
            days_left = (d.expiry_date - today).days if d.expiry_date else None
            data.append({
                'id':            d.id,
                'doc_type':      d.doc_type,
                'doc_type_label':d.get_doc_type_display(),
                'label':         d.label or d.get_doc_type_display(),
                'file_name':     os.path.basename(d.file.name),
                'expiry_date':   d.expiry_date,
                'days_left':     days_left,
                'is_expiring_soon': d.is_expiring_soon,
                'is_expired':    d.is_expired,
                'uploaded_by':   d.uploaded_by.username if d.uploaded_by else '—',
                'uploaded_at':   d.uploaded_at.strftime('%Y-%m-%d'),
                'notes':         d.notes or '',
            })
        return Response(data)

    # ── POST (admin/hr only) ──────────────────────────────────
    if not is_privileged:
        return Response({'error': 'Only admin/HR can upload documents.'}, status=403)

    file      = request.FILES.get('file')
    doc_type  = request.data.get('doc_type', '')
    label     = request.data.get('label', '')
    expiry    = request.data.get('expiry_date') or None
    notes     = request.data.get('notes', '')

    if not file:
        return Response({'error': 'No file uploaded.'}, status=400)
    if doc_type not in ('passport', 'work_permit', 'other'):
        return Response({'error': 'Invalid doc_type.'}, status=400)

    # Reuse the existing 3-layer validate_upload for security
    ok, err = validate_upload(
        file,
        allowed_extensions=DOCUMENT_ALLOWED_EXTENSIONS,
        allowed_magic=DOCUMENT_MAGIC,
        max_bytes=DOCUMENT_MAX_BYTES,
    )
    if not ok:
        return Response({'error': err}, status=400)

    try:
        # Ensure media directory exists for this specific path
        # upload_to='employee_docs/%Y/%m/'
        media_path = os.path.join(settings.MEDIA_ROOT, 'employee_docs', date.today().strftime('%Y/%m'))
        os.makedirs(media_path, exist_ok=True)

        doc = EmployeeDocument.objects.create(
            employee    = emp,
            doc_type    = doc_type,
            label       = label,
            file        = file,
            expiry_date = expiry,
            uploaded_by = request.user,
            notes       = notes,
        )
    except Exception as e:
        return Response({'error': f"Failed to save document: {str(e)}"}, status=500)

    return Response({
        'id':          doc.id,
        'doc_type':    doc.doc_type,
        'label':       doc.label or doc.get_doc_type_display(),
        'expiry_date': doc.expiry_date,
        'uploaded_at': doc.uploaded_at.strftime('%Y-%m-%d'),
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def document_delete(request, pk):
    """DELETE /api/documents/<pk>/delete/  — admin/hr only"""
    if request.user.role not in ('admin', 'hr'):
        return Response({'error': 'Only admin/HR can delete documents.'}, status=403)
    try:
        doc = EmployeeDocument.objects.get(pk=pk)
    except EmployeeDocument.DoesNotExist:
        return Response({'error': 'Document not found.'}, status=404)

    try:
        # Log the deletion event before deleting the record
        from apps.analytics.utils import log_event
        log_event(
            request.user, 
            "document_deleted", 
            {
                "doc_id": doc.id, 
                "doc_type": doc.doc_type, 
                "label": doc.label,
                "employee_id": doc.employee.emp_id,
                "file_name": os.path.basename(doc.file.name)
            }, 
            request=request
        )

        # Remove physical file from disk
        if doc.file and os.path.isfile(doc.file.path):
            try:
                os.remove(doc.file.path)
            except Exception as e:
                # Log but continue deletion if file removal fails
                print(f"Warning: Failed to delete physical file {doc.file.path}: {e}")

        doc.delete()
        return Response({'message': 'Document deleted successfully and action logged.'})
    except Exception as e:
        return Response({'error': f"Failed to delete document: {str(e)}"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_download(request, pk):
    """
    GET /api/documents/<pk>/download/
    Serves the file as an attachment.
    Employees can only download their own docs; admin/hr can download any.
    """
    try:
        doc = EmployeeDocument.objects.select_related('employee__user').get(pk=pk)
    except EmployeeDocument.DoesNotExist:
        return Response({'error': 'Document not found.'}, status=404)

    is_privileged = request.user.role in ('admin', 'hr')
    is_own        = hasattr(request.user, 'employee_profile') and \
                    request.user.employee_profile == doc.employee

    if not (is_privileged or is_own):
        return Response({'error': 'Forbidden.'}, status=403)

    if not os.path.isfile(doc.file.path):
        return Response({'error': 'File not found on server.'}, status=404)

    file_name = os.path.basename(doc.file.name)
    response  = FileResponse(doc.file.open('rb'), as_attachment=True, filename=file_name)
    
    # Log the download event
    from apps.analytics.utils import log_event
    log_event(request.user, "document_downloaded", {"doc_id": doc.id, "doc_type": doc.doc_type}, request=request)
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_expiring(request):
    """
    GET /api/documents/expiring/
    Admin/HR: returns all documents expiring within 60 days across all employees.
    """
    if request.user.role not in ('admin', 'hr'):
        return Response({'error': 'Forbidden.'}, status=403)

    from datetime import timedelta
    cutoff = date.today() + timedelta(days=60)
    docs = (
        EmployeeDocument.objects
        .filter(expiry_date__isnull=False, expiry_date__lte=cutoff, expiry_date__gte=date.today())
        .select_related('employee', 'employee__division')
        .order_by('expiry_date')
    )
    today = date.today()
    data = [{
        'id':            d.id,
        'emp_id':        d.employee.emp_id,
        'emp_name':      d.employee.name,
        'division':      d.employee.division.name if d.employee.division else '—',
        'doc_type':      d.doc_type,
        'doc_type_label':d.get_doc_type_display(),
        'label':         d.label or d.get_doc_type_display(),
        'expiry_date':   d.expiry_date,
        'days_left':     (d.expiry_date - today).days,
    } for d in docs]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_audit_log(request):
    """
    GET /api/documents/audit/?emp_id=EMP001
    Returns upload/delete activity for documents.
    Proxies from EmployeeDocument — lists uploads as audit events.
    Admin/HR only.
    """
    if request.user.role not in ('admin', 'hr'):
        return Response({'error': 'Forbidden.'}, status=403)

    emp_id = request.GET.get('emp_id')
    qs = EmployeeDocument.objects.select_related('employee', 'uploaded_by')

    if emp_id:
        qs = qs.filter(employee__emp_id=emp_id)

    qs = qs.order_by('-uploaded_at')[:50]

    data = [{
        'id':           d.id,
        'action':       'uploaded',
        'performed_by': d.uploaded_by.username if d.uploaded_by else '—',
        'message':      f"{d.uploaded_by.username if d.uploaded_by else 'Someone'} uploaded {d.get_doc_type_display()} — {d.label or d.file.name.split('/')[-1]}",
        'timestamp':    d.uploaded_at,
    } for d in qs]

    return Response(data)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_preview(request, pk):
    """
    GET /api/documents/<pk>/preview/
    Serves the file for browser viewing (inline).
    Enforces same permissions as download.
    """
    try:
        doc = EmployeeDocument.objects.select_related('employee__user').get(pk=pk)
    except EmployeeDocument.DoesNotExist:
        return Response({'error': 'Document not found.'}, status=404)

    is_privileged = request.user.role in ('admin', 'hr')
    is_own        = hasattr(request.user, 'employee_profile') and \
                    request.user.employee_profile == doc.employee

    if not (is_privileged or is_own):
        return Response({'error': 'Forbidden.'}, status=403)

    if not os.path.isfile(doc.file.path):
        return Response({'error': f'File not found on server disk. (Path: {doc.file.path})'}, status=404)

    try:
        # Explicitly guess content type to ensure browser renders correctly (e.g. application/pdf)
        import mimetypes
        content_type, _ = mimetypes.guess_type(doc.file.name)
        
        # Use 'inline' to allow browser rendering (like PDF preview)
        response = FileResponse(
            doc.file.open('rb'), 
            content_type=content_type or 'application/octet-stream'
        )
        response['Content-Disposition'] = 'inline'
        
        # Log the view event
        from apps.analytics.utils import log_event
        log_event(request.user, "document_viewed", {"doc_id": doc.id, "doc_type": doc.doc_type}, request=request)
        
        return response
    except Exception as e:
        return Response({'error': f"Failed to open file for preview: {str(e)}"}, status=500)
