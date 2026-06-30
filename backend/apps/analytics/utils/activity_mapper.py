def map_audit_event(log):
    """
    Transforms a technical AuditLog record into a user-friendly business activity.
    Returns a dictionary matching the frontend Timeline expectations.
    """
    event = log.event
    details = log.details or {}
    user_display = f"{log.user.get_full_name() or log.user.username}" if log.user else "System"
    
    title = event.replace("_", " ").title()
    desc = ""
    icon = "user"
    
    if event == "login_success":
        title = "User Sign In"
        role = details.get("role", log.user.role if log.user else "User")
        desc = f"{user_display} ({role.upper()}) signed in successfully"
        icon = "user"
    elif event == "employee_created":
        title = "New Employee Added"
        desc = f"New employee {details.get('name', '')} ({details.get('emp_id', '')}) was registered"
        icon = "user"
    elif event == "employee_updated":
        title = "Employee Profile Updated"
        desc = f"Updated profile for {details.get('name', '')} ({details.get('emp_id', '')})"
        icon = "user"
    elif event == "employee_deleted":
        title = "Employee Removed"
        desc = f"Employee {details.get('name', '')} ({details.get('emp_id', '')}) was removed"
        icon = "user"
    elif event == "document_uploaded":
        doc_type_label = details.get("doc_type", "Document").replace("_", " ").title()
        title = f"{doc_type_label} Uploaded"
        desc = f"Document '{details.get('label', '')}' uploaded for employee {details.get('employee_id', '')}"
        icon = "import"
    elif event == "work_permit_updated":
        title = "Work Permit Updated"
        desc = f"Work permit updated for employee {details.get('employee_id', '')}"
        icon = "import"
    elif event == "payroll_generated":
        title = "Payroll Generated"
        desc = f"Monthly payroll generated for {details.get('month', '')}"
        icon = "payroll"
    elif event == "invoice_created":
        title = "Invoice Created"
        desc = f"Invoice {details.get('invoice_no', '')} created for project {details.get('project_name', '')}"
        icon = "invoice"
    elif event == "invoice_updated":
        title = "Invoice Updated"
        desc = f"Invoice {details.get('invoice_no', '')} updated for project {details.get('project_name', '')}"
        icon = "invoice"
    elif event == "bulk_import":
        title = "Employee Import Completed"
        desc = f"Bulk import completed (Success: {details.get('success', 0)}, Failed: {details.get('failed', 0)})"
        icon = "import"
    elif event == "leave_approved":
        title = "Leave Request Approved"
        desc = f"Leave request approved for employee {details.get('employee_id', '')}"
        icon = "user"
    elif event == "leave_rejected":
        title = "Leave Request Rejected"
        desc = f"Leave request rejected for employee {details.get('employee_id', '')}"
        icon = "user"
    else:
        title = event.replace("_", " ").title()
        desc = f"Action performed by {user_display}"
        icon = "user"
        
    employee_photo = None
    employee_name = None
    emp_id = details.get('emp_id') or details.get('employee_id')
    if emp_id:
        from apps.employees.models import Employee
        try:
            emp = Employee.objects.only('profile_photo', 'name').get(emp_id=emp_id)
            employee_name = emp.name
            if emp.profile_photo:
                employee_photo = emp.profile_photo.url
        except Employee.DoesNotExist:
            pass

    return {
        "id": log.id,
        "icon": icon,
        "title": title,
        "description": desc,
        "entity": "AuditLog",
        "user": user_display,
        "employee_photo": employee_photo,
        "employee_name": employee_name,
        "created_at": log.created_at.isoformat()
    }
