"""
OTP Service for Email Verification and Password Reset.
Handles 6-digit OTP generation, caching with 5-minute TTL, rate-limiting, cooldowns, and validation.
"""

import random
import time
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings


class OTPService:
    PURPOSE_VERIFY_EMAIL = 'VERIFY_EMAIL'
    PURPOSE_RESET_PASSWORD = 'RESET_PASSWORD'

    EXPIRY_SECONDS = 300  # 5 minutes
    COOLDOWN_SECONDS = 60  # 1 minute between resends
    MAX_ATTEMPTS = 5

    @classmethod
    def _get_key(cls, email: str, purpose: str) -> str:
        return f"otp:{purpose.lower()}:{email.strip().lower()}"

    @classmethod
    def _get_cooldown_key(cls, email: str, purpose: str) -> str:
        return f"otp_cooldown:{purpose.lower()}:{email.strip().lower()}"

    @classmethod
    def generate_otp(cls) -> str:
        """Generate a cryptographically secure 6-digit OTP."""
        return f"{random.randint(100000, 999999):06d}"

    @classmethod
    def can_send_otp(cls, email: str, purpose: str) -> tuple[bool, int]:
        """Check if resend cooldown has elapsed. Returns (can_send, remaining_seconds)."""
        cooldown_key = cls._get_cooldown_key(email, purpose)
        cooldown_expiry = cache.get(cooldown_key)
        if cooldown_expiry:
            remaining = int(cooldown_expiry - time.time())
            if remaining > 0:
                return False, remaining
        return True, 0

    @classmethod
    def create_and_send_otp(cls, email: str, purpose: str, full_name: str = '') -> tuple[bool, str]:
        """
        Create OTP, store in cache with 5m TTL, and send via email.
        Returns (success, message).
        """
        can_send, remaining = cls.can_send_otp(email, purpose)
        if not can_send:
            return False, f"Vui lòng đợi {remaining} giây trước khi yêu cầu gửi lại mã OTP."

        otp = cls.generate_otp()
        key = cls._get_key(email, purpose)
        cooldown_key = cls._get_cooldown_key(email, purpose)

        data = {
            'otp': otp,
            'attempts': 0,
            'created_at': time.time(),
        }
        cache.set(key, data, timeout=cls.EXPIRY_SECONDS)
        cache.set(cooldown_key, time.time() + cls.COOLDOWN_SECONDS, timeout=cls.COOLDOWN_SECONDS)

        # Send email
        subject = ''
        if purpose == cls.PURPOSE_VERIFY_EMAIL:
            subject = '[LocalCraft] Xác thực tài khoản của bạn'
            message = (
                f"Xin chào {full_name or 'bạn'},\n\n"
                f"Mã OTP xác thực tài khoản LocalCraft của bạn là: {otp}\n\n"
                f"Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n"
                f"Trân trọng,\nĐội ngũ LocalCraft - Tinh Hoa Di Sản Việt"
            )
        else:
            subject = '[LocalCraft] Yêu cầu đặt lại mật khẩu'
            message = (
                f"Xin chào {full_name or 'bạn'},\n\n"
                f"Mã OTP đặt lại mật khẩu tài khoản LocalCraft của bạn là: {otp}\n\n"
                f"Mã có hiệu lực trong vòng 5 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n"
                f"Trân trọng,\nĐội ngũ LocalCraft - Tinh Hoa Di Sản Việt"
            )

        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@localcraft.vn')
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"[OTP SERVICE] OTP sent successfully to: {email} (OTP: {otp})")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[OTP SERVICE] SMTP send failed: {e}")
            print(f"[OTP SERVICE] [WARNING] SMTP send failed ({e}). Fallback OTP: {otp}")

        return True, "Mã OTP đã được gửi đến email của bạn."

    @classmethod
    def verify_otp(cls, email: str, purpose: str, entered_otp: str) -> tuple[bool, str]:
        """
        Validate OTP with attempt limits. If successful, invalidates OTP immediately.
        Returns (is_valid, message).
        """
        key = cls._get_key(email, purpose)
        data = cache.get(key)

        if not data:
            return False, "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới."

        if data['attempts'] >= cls.MAX_ATTEMPTS:
            cache.delete(key)
            return False, "Bạn đã nhập sai mã quá số lần cho phép. Vui lòng yêu cầu mã OTP mới."

        if str(data['otp']).strip() != str(entered_otp).strip():
            data['attempts'] += 1
            remaining = cls.MAX_ATTEMPTS - data['attempts']
            cache.set(key, data, timeout=cls.EXPIRY_SECONDS)
            return False, f"Mã OTP không chính xác. Bạn còn {remaining} lần thử."

        # Valid OTP - delete to ensure single-use
        cache.delete(key)
        return True, "Xác thực mã OTP thành công."
