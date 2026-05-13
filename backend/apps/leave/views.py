from datetime import date, datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdminOrHR
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ValidationError

from apps.employees.models import Employee
from apps.leave.models import LeaveBalance, LeaveRequest, LeaveAdjustmentLog

from apps.employees.views import (
    validate_upload,
    ATTACHMENT_EXTENSIONS,
    ATTACHMENT_MAGIC,
    ATTACHMENT_MAX_BYTES,
)

# LEAVE — BALANCE
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_balance(request, emp_id):
    try:
        emp = Employee.objects.get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)



    year = int(request.GET.get('year', date.today().year))

    try:
        balance = LeaveBalance.objects.get(employee=emp, year=year)
    except LeaveBalance.DoesNotExist:
        return Response({"error": f"No leave balance found for {year}"}, status=404)

    return Response({
        "emp_id": emp_id,
        "year":   year,
        "medical": {
            "entitled":  balance.medical_entitled,
            "used":      balance.medical_used,
            "remaining": balance.medical_remaining,
        },
        "casual": {
            "entitled":  balance.casual_entitled,
            "used":      balance.casual_used,
            "remaining": balance.casual_remaining,
        },
        "annual": {
            "entitled":  balance.annual_entitled,
            "used":      balance.annual_used,
            "remaining": balance.annual_remaining,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_balance_adjust(request, emp_id):
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "HR or Admin access required"}, status=403)

    try:
        emp = Employee.objects.get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)

    year       = int(request.data.get('year', date.today().year))
    leave_type = request.data.get('leave_type')
    action     = request.data.get('action')
    days       = request.data.get('days')
    note       = request.data.get('note', '')

    if leave_type not in ('medical', 'casual', 'annual'):
        return Response({"error": "Invalid leave_type"}, status=400)
    if action not in ('add', 'deduct'):
        return Response({"error": "action must be 'add' or 'deduct'"}, status=400)
    try:
        days = int(days)
        if days <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({"error": "days must be a positive integer"}, status=400)

    balance, _ = LeaveBalance.objects.get_or_create(
        employee=emp, year=year,
        defaults={
            'medical_entitled': 14,
            'casual_entitled':  7,
            'annual_entitled':  14,
        },
    )

    field_map = {
        'medical': 'medical_used',
        'casual':  'casual_used',
        'annual':  'annual_used',
    }
    field = field_map[leave_type]

    if action == 'add':
        new_val = max(0, getattr(balance, field) - days)
        setattr(balance, field, new_val)
        log_action = 'manual_add'
    else:
        if not balance.has_sufficient_balance(leave_type, days):
            return Response(
                {"error": f"Insufficient {leave_type} balance. Remaining: {balance.get_remaining(leave_type)}"},
                status=400,
            )
        setattr(balance, field, getattr(balance, field) + days)
        log_action = 'manual_deduct'

    balance.save(update_fields=[field, 'updated_at'])

    LeaveAdjustmentLog.objects.create(
        employee=emp,
        leave_request=None,
        action=log_action,
        performed_by=request.user,
        note=note or f"Manual {action} of {days} {leave_type} day(s) for {year}.",
    )

    return Response({
        "message":   f"Balance {action}ed successfully",
        "remaining": balance.get_remaining(leave_type),
    })


# ─────────────────────────────────────────────
# LEAVE — REQUESTS
# ─────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_request_list(request):
    if request.method == 'GET':
        qs = LeaveRequest.objects.select_related('employee', 'reviewed_by').all()

        emp_id     = request.GET.get('emp_id')
        status     = request.GET.get('status')
        leave_type = request.GET.get('leave_type')
        from_date  = request.GET.get('from_date')
        to_date    = request.GET.get('to_date')

        if emp_id:
            qs = qs.filter(employee__emp_id=emp_id)
        if status:
            qs = qs.filter(status=status)
        if leave_type:
            qs = qs.filter(leave_type=leave_type)
        if from_date:
            qs = qs.filter(start_date__gte=from_date)
        if to_date:
            qs = qs.filter(end_date__lte=to_date)

        paginator = PageNumberPagination()
        # Cap to 100 — prevents full-table dumps via ?page_size=999999
        paginator.page_size = min(int(request.GET.get('page_size', 20)), 100)
        result_page = paginator.paginate_queryset(qs, request)

        data = [
            {
                "id":               lr.id,
                "emp_id":           lr.employee.emp_id,
                "emp_name":         lr.employee.name,
                "leave_type":       lr.get_leave_type_display(),
                "start_date":       lr.start_date,
                "end_date":         lr.end_date,
                "total_days":       lr.total_days,
                "status":           lr.get_status_display(),
                "reason":           lr.reason,
                "reviewed_by":      lr.reviewed_by.username if lr.reviewed_by else None,
                "reviewed_at":      lr.reviewed_at,
                "rejection_reason": lr.rejection_reason,
                "created_at":       lr.created_at,
            }
            for lr in result_page
        ]
        return paginator.get_paginated_response(data)

    # POST
    emp_id = request.data.get('emp_id')
    if not emp_id:
        return Response({"error": "emp_id is required"}, status=400)
    try:
        employee = Employee.objects.get(emp_id=emp_id)
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)

    leave_type = request.data.get('leave_type')
    start_raw  = request.data.get('start_date')
    end_raw    = request.data.get('end_date')
    reason     = request.data.get('reason', '')

    if not all([leave_type, start_raw, end_raw]):
        return Response({"error": "leave_type, start_date and end_date are required"}, status=400)

    try:
        start_date = datetime.strptime(start_raw, '%Y-%m-%d').date()
        end_date   = datetime.strptime(end_raw,   '%Y-%m-%d').date()
    except ValueError:
        return Response({"error": "Dates must be YYYY-MM-DD"}, status=400)

    if leave_type not in dict(LeaveRequest.LEAVE_TYPE_CHOICES):
        return Response({"error": "Invalid leave_type"}, status=400)

    if leave_type != LeaveRequest.LEAVE_UNPAID:
        try:
            balance = LeaveBalance.objects.get(employee=employee, year=start_date.year)
        except LeaveBalance.DoesNotExist:
            return Response(
                {"error": f"No leave balance record for {start_date.year}. Contact HR."},
                status=400,
            )
        total_days = (end_date - start_date).days + 1
        if not balance.has_sufficient_balance(leave_type, total_days):
            return Response(
                {"error": f"Insufficient {leave_type} balance. Remaining: {balance.get_remaining(leave_type)}, Requested: {total_days}"},
                status=400,
            )

    try:
        lr = LeaveRequest(
            employee=employee,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
        )
        if 'attachment' in request.FILES:
            attachment = request.FILES['attachment']
            ok, err = validate_upload(
                attachment,
                allowed_extensions=ATTACHMENT_EXTENSIONS,
                allowed_magic=ATTACHMENT_MAGIC,
                max_bytes=ATTACHMENT_MAX_BYTES,
            )
            if not ok:
                return Response({"error": f"Attachment invalid — {err}"}, status=400)
            lr.attachment = attachment
        lr.save()
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response(
        {
            "message":    "Leave request submitted",
            "id":         lr.id,
            "total_days": lr.total_days,
            "status":     lr.get_status_display(),
        },
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_request_detail(request, pk):
    try:
        lr = LeaveRequest.objects.select_related('employee', 'reviewed_by').get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({"error": "Leave request not found"}, status=404)



    return Response({
        "id":               lr.id,
        "emp_id":           lr.employee.emp_id,
        "emp_name":         lr.employee.name,
        "leave_type":       lr.get_leave_type_display(),
        "start_date":       lr.start_date,
        "end_date":         lr.end_date,
        "total_days":       lr.total_days,
        "reason":           lr.reason,
        "attachment":       lr.attachment.url if lr.attachment else None,
        "status":           lr.get_status_display(),
        "reviewed_by":      lr.reviewed_by.username if lr.reviewed_by else None,
        "reviewed_at":      lr.reviewed_at,
        "rejection_reason": lr.rejection_reason,
        "created_at":       lr.created_at,
        "updated_at":       lr.updated_at,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_request_approve(request, pk):
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "HR or Admin access required"}, status=403)

    try:
        lr = LeaveRequest.objects.select_related('employee').get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({"error": "Leave request not found"}, status=404)

    if lr.leave_type != LeaveRequest.LEAVE_UNPAID:
        try:
            LeaveBalance.objects.get(employee=lr.employee, year=lr.start_date.year)
        except LeaveBalance.DoesNotExist:
            return Response(
                {"error": f"No leave balance record for {lr.start_date.year}. Create one first."},
                status=400,
            )

    try:
        lr.approve(reviewed_by=request.user)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({"message": "Leave request approved", "id": lr.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_request_reject(request, pk):
    if request.user.role not in ('admin', 'hr'):
        return Response({"error": "HR or Admin access required"}, status=403)

    try:
        lr = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({"error": "Leave request not found"}, status=404)

    try:
        lr.reject(reviewed_by=request.user, reason=request.data.get('reason', ''))
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({"message": "Leave request rejected", "id": lr.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_request_cancel(request, pk):
    try:
        lr = LeaveRequest.objects.select_related('employee').get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({"error": "Leave request not found"}, status=404)



    try:
        lr.cancel(cancelled_by=request.user)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({"message": "Leave request cancelled", "id": lr.id})


# ─────────────────────────────────────────────
# LEAVE — AUDIT LOG
# ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrHR])
def leave_audit_log(request):
    qs = LeaveAdjustmentLog.objects.select_related(
        'employee', 'leave_request', 'performed_by'
    ).all()

    emp_id = request.GET.get('emp_id')
    action = request.GET.get('action')
    if emp_id:
        qs = qs.filter(employee__emp_id=emp_id)
    if action:
        qs = qs.filter(action=action)

    paginator = PageNumberPagination()
    # Cap to 100 — prevents full-table dumps via ?page_size=999999
    paginator.page_size = min(int(request.GET.get('page_size', 30)), 100)
    result_page = paginator.paginate_queryset(qs, request)

    data = [
        {
            "id":               log.id,
            "emp_id":           log.employee.emp_id,
            "emp_name":         log.employee.name,
            "action":           log.get_action_display(),
            "leave_request_id": log.leave_request_id,
            "performed_by":     log.performed_by.username if log.performed_by else None,
            "note":             log.note,
            "timestamp":        log.timestamp,
        }
        for log in result_page
    ]

    return paginator.get_paginated_response(data)
