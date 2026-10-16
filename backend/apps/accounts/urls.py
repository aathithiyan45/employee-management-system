from django.urls import path
from .auth import get_versioned_refresh_view

from .views import (
    login_view,
    logout_view,
    change_password,
    set_password_view,
)
from .user_views import (
    user_list_create_view,
    user_detail_update_delete_view,
    user_toggle_status_view,
)

urlpatterns = [
    path('login/',           login_view),
    path('logout/',          logout_view),
    path('token/refresh/',   get_versioned_refresh_view().as_view()),
    path('change-password/', change_password, name='change_password'),
    path('set-password/<str:uidb64>/<str:token>/', set_password_view, name='set_password'),

    # ── User & Roles Management
    path('users/', user_list_create_view, name='user_list_create'),
    path('users/<int:user_id>/', user_detail_update_delete_view, name='user_detail_update_delete'),
    path('users/<int:user_id>/toggle-status/', user_toggle_status_view, name='user_toggle_status'),
]

