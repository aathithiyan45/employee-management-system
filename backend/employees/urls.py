from django.urls import path
from .views import (
    login_view,
    dashboard_view,
    import_excel,
    get_divisions,
    employee_list,
    employee_detail   # must exist
)

urlpatterns = [
    path('login/', login_view),
    path('dashboard/', dashboard_view),
    path('import/', import_excel),
    path('divisions/', get_divisions),

    path('employees/', employee_list),
    path('employee/<str:emp_id>/', employee_detail),
]