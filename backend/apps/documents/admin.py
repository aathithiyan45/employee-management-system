from django.contrib import admin
from .models import EmployeeDocument

@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'doc_type',      # ✅ correct field
        'label',         # ✅ correct field
        'expiry_date',
        'uploaded_at'
    )
    list_filter = ('doc_type',)  # ✅ correct
    search_fields = ('employee__emp_id', 'employee__name', 'label')
    readonly_fields = ('uploaded_at',)
