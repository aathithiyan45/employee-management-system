from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import WorkLogViewSet, PayrollViewSet, PayrollAnalyticsView
from .analytics_views import (
    PayrollTrendView,
    PayrollByDivisionView,
    PayrollByDesignationView,
    PayrollTopEmployeesView,
    PayrollScatterView,
    PayrollAlertsView,
)

router = DefaultRouter()
router.register(r'worklog', WorkLogViewSet, basename='worklog')
router.register(r'payroll', PayrollViewSet, basename='payroll')

urlpatterns = [
    # Monthly payroll summary (used by Payroll page)
    path('payroll-summary/', PayrollAnalyticsView.as_view(), name='payroll-summary'),

    # Analytics endpoints (used by Payroll Analytics page)
    path('payroll/trend/',                    PayrollTrendView.as_view(),           name='payroll-trend'),
    path('payroll/trend/<str:employee_id>/',  PayrollTrendView.as_view(),           name='payroll-trend-employee'),
    path('payroll/by-division/',              PayrollByDivisionView.as_view(),      name='payroll-by-division'),
    path('payroll/by-designation/',           PayrollByDesignationView.as_view(),   name='payroll-by-designation'),
    path('payroll/top-employees/',            PayrollTopEmployeesView.as_view(),    name='payroll-top-employees'),
    path('payroll/scatter/',                  PayrollScatterView.as_view(),         name='payroll-scatter'),
    path('payroll/alerts/',                   PayrollAlertsView.as_view(),          name='payroll-alerts'),

    # Router handles base /payroll/ and /worklog/ routes
    path('', include(router.urls)),
]