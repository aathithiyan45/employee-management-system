from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/documents/', include('apps.documents.urls')),
    path('api/leave/', include('apps.leave.urls')),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.employees.urls')),
]
