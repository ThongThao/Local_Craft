"""
Serializers for Authentication & Account Management.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Role, UserRole


class UserSerializer(serializers.ModelSerializer):
    """Serializer for displaying User details and roles."""
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'user_id',
            'email',
            'full_name',
            'gender',
            'birth_date',
            'phone',
            'address',
            'avatar_url',
            'status',
            'roles',
            'email_verified_at',
            'created_at',
        ]
        read_only_fields = ['user_id', 'email', 'status', 'email_verified_at', 'created_at']

    def get_roles(self, obj):
        return list(obj.user_roles.values_list('role__role_code', flat=True))


class RegisterSerializer(serializers.Serializer):
    """Validate registration payload."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    full_name = serializers.CharField(required=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    gender = serializers.CharField(required=False, allow_blank=True, default='OTHER')
    birth_date = serializers.DateField(required=False, allow_null=True)
    role = serializers.CharField(required=False, allow_blank=True, default='TOURIST')

    def validate_role(self, value):
        if not value:
            return 'TOURIST'
        val = str(value).strip().upper()
        if val == 'ADMIN':
            raise serializers.ValidationError('Không thể đăng ký tài khoản Quản trị viên công khai.')
        if val not in ['TOURIST', 'CRAFT_VILLAGE']:
            raise serializers.ValidationError('Vai trò không hợp lệ. Chỉ chấp nhận TOURIST hoặc CRAFT_VILLAGE.')
        return val

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError('Địa chỉ email này đã được sử dụng.')
        return normalized

    def validate_phone(self, value):
        if value:
            cleaned = value.strip()
            if cleaned and User.objects.filter(phone=cleaned).exists():
                raise serializers.ValidationError('Số điện thoại này đã được sử dụng.')
            return cleaned
        return None

    def validate_gender(self, value):
        if not value or str(value).upper() not in User.Gender.values:
            return User.Gender.OTHER
        return str(value).upper()

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError('Mật khẩu cần tối thiểu 6 ký tự.')
        return value


class VerifyEmailSerializer(serializers.Serializer):
    """Validate email OTP verification payload."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)


class ResendOTPSerializer(serializers.Serializer):
    """Validate resend OTP payload."""
    email = serializers.EmailField(required=True)


class LoginSerializer(serializers.Serializer):
    """Validate login credentials."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Email hoặc mật khẩu không chính xác.')

        if not user.check_password(password):
            raise serializers.ValidationError('Email hoặc mật khẩu không chính xác.')

        if user.status == User.UserStatus.SUSPENDED:
            raise serializers.ValidationError('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.')

        if not user.email_verified_at:
            raise serializers.ValidationError({
                'is_unverified': True,
                'email': user.email,
                'detail': 'Tài khoản chưa được xác thực email. Vui lòng nhập mã OTP để kích hoạt.'
            })

        attrs['user'] = user
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Validate email for sending reset password OTP."""
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """Validate reset password payload with OTP."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Update profile fields."""
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'gender', 'birth_date', 'address', 'avatar_url']

    def validate_phone(self, value):
        if value:
            user = self.instance
            if User.objects.filter(phone=value).exclude(user_id=user.user_id).exists():
                raise serializers.ValidationError('Số điện thoại này đã được sử dụng bởi tài khoản khác.')
        return value
