from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('check-auth/', views.check_auth, name='check-auth'),
    path('forgot-password/', views.forgot_password, name='forgot-password'),
    path('get-user-id/', views.get_user_id),
    path('reset-password/<str:uidb64>/<str:token>/', views.reset_password, name='reset-password'),
]
