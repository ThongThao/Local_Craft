"""
Automated unit tests for LocalCraft Authentication & Accounts.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.accounts.services.otp_service import OTPService
from django.core.cache import cache


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role_tourist, _ = Role.objects.get_or_create(
            role_code='TOURIST',
            defaults={'role_name': 'Du khách'}
        )
        cache.clear()

    def test_01_successful_registration(self):
        """Test registration creates user with unverified status and sends OTP."""
        payload = {
            'email': 'tourist.test@localcraft.vn',
            'password': 'StrongPassword123!',
            'full_name': 'Nguyễn Văn Test',
            'phone': '0901234567',
            'gender': 'MALE'
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['success'])

        user = User.objects.get(email='tourist.test@localcraft.vn')
        self.assertFalse(user.is_active)
        self.assertIsNone(user.email_verified_at)
        self.assertTrue(user.user_roles.filter(role__role_code='TOURIST').exists())

    def test_02_duplicate_email_rejected(self):
        """Test duplicate email registration is rejected."""
        User.objects.create(email='duplicate@localcraft.vn', full_name='User Existing')
        payload = {
            'email': 'duplicate@localcraft.vn',
            'password': 'StrongPassword123!',
            'full_name': 'User Duplicate',
        }
        response = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_03_verify_email_otp(self):
        """Test verifying OTP marks user active and returns JWT tokens."""
        email = 'verify.test@localcraft.vn'
        user = User.objects.create(email=email, full_name='Verify Test', status=User.UserStatus.INACTIVE)
        user.set_password('StrongPassword123!')
        user.save()

        # Seed OTP directly in cache
        cache.set(f"otp:verify_email:{email}", {'otp': '123456', 'attempts': 0}, timeout=300)

        response = self.client.post('/api/v1/auth/verify-email/', {'email': email, 'otp': '123456'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data['data'])
        self.assertIn('access', response.data['data']['tokens'])

        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertIsNotNone(user.email_verified_at)

    def test_04_invalid_otp_rejected(self):
        """Test invalid OTP is rejected."""
        email = 'invalid.otp@localcraft.vn'
        User.objects.create(email=email, full_name='Invalid OTP Test')
        cache.set(f"otp:verify_email:{email}", {'otp': '123456', 'attempts': 0}, timeout=300)

        response = self.client.post('/api/v1/auth/verify-email/', {'email': email, 'otp': '999999'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_05_login_flow(self):
        """Test login with verified credentials succeeds."""
        email = 'login.test@localcraft.vn'
        user = User.objects.create(
            email=email,
            full_name='Login Test',
            status=User.UserStatus.ACTIVE,
            email_verified_at='2026-01-01 00:00:00'
        )
        user.set_password('Secret123!')
        user.save()

        # Valid login
        response = self.client.post('/api/v1/auth/login/', {'email': email, 'password': 'Secret123!'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertIn('access', response.data['data']['tokens'])

        # Invalid password
        bad_response = self.client.post('/api/v1/auth/login/', {'email': email, 'password': 'WrongPassword'}, format='json')
        self.assertEqual(bad_response.status_code, 400)
        self.assertFalse(bad_response.data['success'])

    def test_06_profile_me(self):
        """Test GET and PUT /api/v1/auth/me/."""
        email = 'profile.test@localcraft.vn'
        user = User.objects.create(email=email, full_name='Profile Test', status=User.UserStatus.ACTIVE)
        self.client.force_authenticate(user=user)

        # GET
        get_res = self.client.get('/api/v1/auth/me/')
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data['data']['email'], email)

        # PUT
        put_res = self.client.put('/api/v1/auth/me/', {'full_name': 'Profile Updated', 'gender': 'FEMALE'}, format='json')
        self.assertEqual(put_res.status_code, 200)
        self.assertEqual(put_res.data['data']['full_name'], 'Profile Updated')
        self.assertEqual(put_res.data['data']['gender'], 'FEMALE')

    def test_07_forgot_and_reset_password(self):
        """Test forgot password and reset password using OTP."""
        email = 'reset.test@localcraft.vn'
        user = User.objects.create(email=email, full_name='Reset Test', status=User.UserStatus.ACTIVE)
        user.set_password('OldPassword123!')
        user.save()

        # Forgot password request
        forgot_res = self.client.post('/api/v1/auth/forgot-password/', {'email': email}, format='json')
        self.assertEqual(forgot_res.status_code, 200)

        # Seed reset OTP
        cache.set(f"otp:reset_password:{email}", {'otp': '654321', 'attempts': 0}, timeout=300)

        # Reset password
        reset_res = self.client.post(
            '/api/v1/auth/reset-password/',
            {'email': email, 'otp': '654321', 'new_password': 'NewPassword123!'},
            format='json'
        )
        self.assertEqual(reset_res.status_code, 200)
        self.assertTrue(reset_res.data['success'])

        # Verify new password works
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewPassword123!'))
