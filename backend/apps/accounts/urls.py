"""
Authentication & Accounts URL configuration under /api/v1/auth/
"""

from django.urls import path
from .views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationOTPView,
    LoginView,
    CustomTokenRefreshView,
    LogoutView,
    MeView,
    ForgotPasswordView,
    ResetPasswordView,
    ResendResetOTPView,
)

app_name = 'accounts'

urlpatterns = [
    # Registration & Email OTP Verification
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification-otp/', ResendVerificationOTPView.as_view(), name='resend-verification-otp'),

    # Login, Refresh Token & Logout
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Current User Profile
    path('me/', MeView.as_view(), name='me'),

    # Forgot & Reset Password with OTP
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('resend-reset-otp/', ResendResetOTPView.as_view(), name='resend-reset-otp'),
]
