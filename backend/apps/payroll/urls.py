from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkLogViewSet, PayrollViewSet, PayrollAnalyticsView

router = DefaultRouter()
router.register(r'worklog', WorkLogViewSet, basename='worklog')
router.register(r'payroll', PayrollViewSet, basename='payroll')

urlpatterns = [
    path('', include(router.urls)),
    path('payroll-analytics/', PayrollAnalyticsView.as_view(), name='payroll-analytics'),
]
