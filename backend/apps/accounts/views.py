"""
Authentication & Account Management API Views.
"""

from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
from .models import User, Role, UserRole
from .serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendOTPSerializer,
    LoginSerializer,
    UserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UpdateProfileSerializer,
)
from .services.otp_service import OTPService


def get_tokens_for_user(user):
    """Generate JWT access and refresh token pair for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Register a new user account with default TOURIST role and send verification OTP.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Thông tin đăng ký không hợp lệ', errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        email = data['email']
        password = data['password']
        full_name = data['full_name']
        phone = data.get('phone')
        gender = data.get('gender', User.Gender.OTHER)

        with transaction.atomic():
            # Create user in unverified status
            user = User.objects.create(
                email=email,
                full_name=full_name,
                phone=phone,
                gender=gender,
                birth_date=data.get('birth_date'),
                status=User.UserStatus.INACTIVE,
                email_verified_at=None,
            )
            user.set_password(password)
            user.save()

            # Assign role (default TOURIST or requested CRAFT_VILLAGE, never ADMIN)
            role_code = data.get('role', 'TOURIST')
            if role_code not in ['TOURIST', 'CRAFT_VILLAGE']:
                role_code = 'TOURIST'

            role_obj, _ = Role.objects.get_or_create(
                role_code=role_code,
                defaults={
                    'role_name': 'Du khách' if role_code == 'TOURIST' else 'Làng nghề',
                    'description': 'Khách du lịch trải nghiệm' if role_code == 'TOURIST' else 'Tài khoản quản lý làng nghề',
                }
            )
            UserRole.objects.create(user=user, role=role_obj)

        # Generate & send OTP
        success, msg = OTPService.create_and_send_otp(email, OTPService.PURPOSE_VERIFY_EMAIL, full_name)

        return api_success(
            data={'email': email, 'requires_verification': True},
            message='Đăng ký tài khoản thành công! Mã OTP xác thực đã được gửi đến email của bạn.',
            status_code=201
        )


class VerifyEmailView(APIView):
    """
    POST /api/v1/auth/verify-email/
    Verify email with 6-digit OTP and activate account.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu xác thực không hợp lệ', errors=serializer.errors, status_code=400)

        email = serializer.validated_data['email'].strip().lower()
        otp = serializer.validated_data['otp'].strip()

        is_valid, msg = OTPService.verify_otp(email, OTPService.PURPOSE_VERIFY_EMAIL, otp)
        if not is_valid:
            return api_error(message=msg, status_code=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return api_error(message='Không tìm thấy tài khoản với email này.', status_code=404)

        user.email_verified_at = timezone.now()
        user.status = User.UserStatus.ACTIVE
        user.save(update_fields=['email_verified_at', 'status'])

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return api_success(
            data={
                'tokens': tokens,
                'user': user_data
            },
            message='Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.'
        )


class ResendVerificationOTPView(APIView):
    """
    POST /api/v1/auth/resend-verification-otp/
    Resend verification OTP with cooldown.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu không hợp lệ', errors=serializer.errors, status_code=400)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email=email).first()
        if not user:
            return api_error(message='Không tìm thấy tài khoản với email này.', status_code=404)

        if user.email_verified_at:
            return api_error(message='Tài khoản này đã được xác thực trước đó.', status_code=400)

        success, msg = OTPService.create_and_send_otp(email, OTPService.PURPOSE_VERIFY_EMAIL, user.full_name)
        if not success:
            return api_error(message=msg, status_code=429)

        return api_success(message='Mã OTP mới đã được gửi đến email của bạn.')


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Authenticate with email & password, return JWT tokens and user info.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Đăng nhập không thành công', errors=serializer.errors, status_code=400)

        user = serializer.validated_data['user']
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return api_success(
            data={
                'tokens': tokens,
                'user': user_data,
            },
            message='Đăng nhập thành công!'
        )


class CustomTokenRefreshView(TokenRefreshView):
    """
    POST /api/v1/auth/token/refresh/
    Refresh access token wrapped in standard LocalCraft response.
    """
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                return api_success(data=response.data, message='Làm mới access token thành công.')
            return api_error(message='Token không hợp lệ hoặc đã hết hạn.', errors=response.data, status_code=401)
        except Exception:
            return api_error(message='Phiên đăng nhập đã hết hạn hoặc không tồn tại. Vui lòng đăng nhập lại.', status_code=401)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Revoke refresh token and log user out.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return api_success(message='Đăng xuất thành công!')


class MeView(APIView):
    """
    GET /api/v1/auth/me/ - Get current user profile and roles.
    PUT /api/v1/auth/me/ - Update current user profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return api_success(data=serializer.data, message='Lấy thông tin tài khoản thành công.')

    def put(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu cập nhật không hợp lệ', errors=serializer.errors, status_code=400)

        serializer.save()
        full_user = UserSerializer(request.user).data
        return api_success(data=full_user, message='Cập nhật thông tin tài khoản thành công!')


class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/
    Send password-reset OTP without revealing account existence.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu không hợp lệ', errors=serializer.errors, status_code=400)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email=email).first()

        if user:
            OTPService.create_and_send_otp(email, OTPService.PURPOSE_RESET_PASSWORD, user.full_name)

        # Always return generic message to protect privacy
        return api_success(message='Nếu email tồn tại trong hệ thống, mã OTP đã được gửi đến hộp thư của bạn.')


class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/
    Verify OTP and set new password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu đặt lại mật khẩu không hợp lệ', errors=serializer.errors, status_code=400)

        email = serializer.validated_data['email'].strip().lower()
        otp = serializer.validated_data['otp'].strip()
        new_password = serializer.validated_data['new_password']

        is_valid, msg = OTPService.verify_otp(email, OTPService.PURPOSE_RESET_PASSWORD, otp)
        if not is_valid:
            return api_error(message=msg, status_code=400)

        user = User.objects.filter(email=email).first()
        if not user:
            return api_error(message='Không tìm thấy tài khoản.', status_code=404)

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return api_success(message='Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.')


class ResendResetOTPView(APIView):
    """
    POST /api/v1/auth/resend-reset-otp/
    Resend reset password OTP.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message='Dữ liệu không hợp lệ', errors=serializer.errors, status_code=400)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email=email).first()

        if user:
            success, msg = OTPService.create_and_send_otp(email, OTPService.PURPOSE_RESET_PASSWORD, user.full_name)
            if not success:
                return api_error(message=msg, status_code=429)

        return api_success(message='Nếu email tồn tại, mã OTP mới đã được gửi.')
