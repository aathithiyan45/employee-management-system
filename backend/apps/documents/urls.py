from django.urls import path
from .views import (
    document_audit_log,
    documents_expiring,
    document_list_upload,
    document_delete,
    document_download,
)

urlpatterns = [
    path('audit/',            document_audit_log),
    path('expiring/',         documents_expiring),
    path('<str:emp_id>/',      document_list_upload),
    path('<int:pk>/delete/',   document_delete),
    path('<int:pk>/download/', document_download),
]
