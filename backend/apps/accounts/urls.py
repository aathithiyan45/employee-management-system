from django.urls import path
from .auth import get_versioned_refresh_view

from .views import (
    login_view,
    logout_view,
    change_password,
    set_password_view,
)

urlpatterns = [
    path('login/',           login_view),
    path('logout/',          logout_view),
    path('token/refresh/',   get_versioned_refresh_view().as_view()),
    path('change-password/', change_password, name='change_password'),
    path('set-password/<str:uidb64>/<str:token>/', set_password_view, name='set_password'),
]
