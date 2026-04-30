from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    login_view,
    logout_view,
    change_password,
)

urlpatterns = [
    path('login/',           login_view),
    path('logout/',          logout_view),
    path('token/refresh/',   TokenRefreshView.as_view()),
    path('change-password/', change_password, name='change_password'),
]
