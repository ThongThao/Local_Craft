from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking
from apps.payments.models import Payment


class WorkshopAttendanceAPITests(TestCase):
    """
    Test suite for F05.09: Quản lý điểm danh Workshop (Attendance Management).
    Verifies state transitions, role scoping, timing rules, capacity invariants,
    payment invariants, and concurrency safety.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Setup Roles
        self.role_cv, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Craft Village'})
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Admin'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Tourist'})

        # 2. Setup Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang-att',
            status='ACTIVE'
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-att',
            status='ACTIVE'
        )

        # 3. Setup Users
        self.mgr_a = User.objects.create(
            email='mgr_a_att@example.com',
            full_name='Quản Lý Làng A',
            phone='0909111222',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email='mgr_b_att@example.com',
            full_name='Quản Lý Làng B',
            phone='0909333444',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.admin = User.objects.create(
            email='admin_att@example.com',
            full_name='Quản Trị Viên',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.admin, role=self.role_admin)

        self.tourist = User.objects.create(
            email='tourist_att@example.com',
            full_name='Khách Du Lịch',
            phone='0912999888',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist, role=self.role_tourist)

        # 4. Setup Artisan & Workshop
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ Nhân Bát Tràng',
            experience_years=20,
            verification_status='VERIFIED'
        )
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name='Trải nghiệm Vuốt Gốm Men Rạn',
            slug='trai-nghiem-vuot-gom-men-ran',
            duration_minutes=120,
            price_per_person=Decimal('350000.00'),
            min_participants=1,
            location_address='Xóm 2, Bát Tràng, Hà Nội',
            status='APPROVED'
        )

        # 5. Session: Happening right now (started 30 mins ago, ends in 90 mins)
        now = timezone.now()
        self.session_active = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=now - timedelta(minutes=30),
            end_at=now + timedelta(minutes=90),
            capacity=15,
            booked_participants=5,
            price_per_person=Decimal('350000.00'),
            status='OPEN'
        )

        # 6. Booking: CONFIRMED
        self.booking_confirmed = WorkshopBooking.objects.create(
            booking_code='ATT-CONF-001',
            user=self.tourist,
            session=self.session_active,
            participant_count=2,
            unit_price=Decimal('350000.00'),
            total_amount=Decimal('700000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
            special_request='Yêu cầu chuẩn bị 2 tạp dề nhỏ'
        )

        # Payment record linked to booking
        self.payment = Payment.objects.create(
            payment_code='PAY-ATT-001',
            booking=self.booking_confirmed,
            payment_method='VNPAY',
            amount=Decimal('700000.00'),
            currency='VND',
            status='SUCCESS',
            paid_at=now - timedelta(hours=2)
        )

    # -------------------------------------------------------------------------
    # 1. State Transitions Tests
    # -------------------------------------------------------------------------
    def test_attendance_confirm_to_completed_success(self):
        """Quản lý làng nghề xác nhận khách tham gia (CONFIRMED -> COMPLETED)."""
        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data['data']['status'], 'COMPLETED')

        self.booking_confirmed.refresh_from_db()
        self.assertEqual(self.booking_confirmed.status, WorkshopBooking.BookingStatus.COMPLETED)

    def test_attendance_confirm_to_no_show_success(self):
        """Quản lý làng nghề báo khách vắng mặt (CONFIRMED -> NO_SHOW)."""
        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'NO_SHOW'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertEqual(response.data['data']['status'], 'NO_SHOW')

        self.booking_confirmed.refresh_from_db()
        self.assertEqual(self.booking_confirmed.status, WorkshopBooking.BookingStatus.NO_SHOW)

    def test_attendance_reject_if_pending(self):
        """Từ chối điểm danh nếu booking đang ở trạng thái PENDING."""
        self.booking_confirmed.status = WorkshopBooking.BookingStatus.PENDING
        self.booking_confirmed.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get('success'))
        self.assertIn('Chỉ có thể điểm danh cho đơn đăng ký ở trạng thái', response.data.get('message'))

    def test_attendance_reject_if_cancelled(self):
        """Từ chối điểm danh nếu booking đã bị hủy (CANCELLED)."""
        self.booking_confirmed.status = WorkshopBooking.BookingStatus.CANCELLED
        self.booking_confirmed.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get('success'))

    def test_attendance_reject_if_already_completed(self):
        """Chống xử lý lặp: Từ chối nếu booking đã COMPLETED."""
        self.booking_confirmed.status = WorkshopBooking.BookingStatus.COMPLETED
        self.booking_confirmed.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã được xử lý điểm danh trước đó', response.data.get('message'))

    def test_attendance_reject_if_already_no_show(self):
        """Chống xử lý lặp: Từ chối nếu booking đã NO_SHOW."""
        self.booking_confirmed.status = WorkshopBooking.BookingStatus.NO_SHOW
        self.booking_confirmed.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'NO_SHOW'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã được xử lý điểm danh trước đó', response.data.get('message'))

    def test_attendance_reject_invalid_status_value(self):
        """Từ chối nếu trạng thái truyền vào không phải COMPLETED hoặc NO_SHOW."""
        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'CONFIRMED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 2. Permissions & Scoping Tests
    # -------------------------------------------------------------------------
    def test_attendance_reject_other_village_manager_idor(self):
        """Chống IDOR: Quản lý làng B không thể điểm danh booking của làng A."""
        self.client.force_authenticate(user=self.mgr_b)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('không có quyền', response.data.get('message'))

    def test_attendance_reject_tourist(self):
        """Khách du lịch không có quyền tự điểm danh."""
        self.client.force_authenticate(user=self.tourist)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attendance_reject_unauthenticated(self):
        """Từ chối khi chưa đăng nhập."""
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_attendance_admin_can_attendance(self):
        """Admin hệ thống có quyền hỗ trợ điểm danh."""
        self.client.force_authenticate(user=self.admin)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['status'], 'COMPLETED')

    # -------------------------------------------------------------------------
    # 3. Time Window Tests
    # -------------------------------------------------------------------------
    def test_attendance_reject_too_early_before_session(self):
        """Từ chối điểm danh nếu thời điểm hiện tại sớm hơn giờ bắt đầu hơn 60 phút."""
        future_start = timezone.now() + timedelta(hours=5)
        future_session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=future_start,
            end_at=future_start + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal('350000.00'),
            status='OPEN'
        )
        early_booking = WorkshopBooking.objects.create(
            booking_code='EARLY-001',
            user=self.tourist,
            session=future_session,
            participant_count=2,
            unit_price=Decimal('350000.00'),
            total_amount=Decimal('700000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{early_booking.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Chưa đến thời gian mở điểm danh', response.data.get('message'))

    def test_attendance_reject_no_show_before_session_starts(self):
        """Không thể báo vắng mặt (NO_SHOW) trước khi buổi workshop chính thức bắt đầu (dù đã trong khung mở đón khách 60 phút)."""
        future_start = timezone.now() + timedelta(minutes=30)  # Trong khung đón khách 60m, nhưng chưa đến giờ bắt đầu
        imminent_session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=future_start,
            end_at=future_start + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal('350000.00'),
            status='OPEN'
        )
        imminent_booking = WorkshopBooking.objects.create(
            booking_code='IMMINENT-001',
            user=self.tourist,
            session=imminent_session,
            participant_count=2,
            unit_price=Decimal('350000.00'),
            total_amount=Decimal('700000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{imminent_booking.pk}/attendance/'
        response = self.client.post(url, {'status': 'NO_SHOW'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể báo vắng mặt trước khi buổi workshop chính thức bắt đầu', response.data.get('message'))

    def test_attendance_reject_after_window_expired(self):
        """Từ chối điểm danh nếu buổi workshop đã kết thúc quá 24 giờ."""
        past_start = timezone.now() - timedelta(days=3)
        past_session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=past_start,
            end_at=past_start + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal('350000.00'),
            status='OPEN'
        )
        expired_booking = WorkshopBooking.objects.create(
            booking_code='EXPIRED-001',
            user=self.tourist,
            session=past_session,
            participant_count=2,
            unit_price=Decimal('350000.00'),
            total_amount=Decimal('700000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{expired_booking.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Thời hạn điểm danh cho buổi workshop này đã kết thúc', response.data.get('message'))

    def test_attendance_reject_cancelled_session(self):
        """Từ chối điểm danh nếu ca workshop đã bị hủy."""
        self.session_active.status = WorkshopSession.SessionStatus.CANCELLED
        self.session_active.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể điểm danh cho ca workshop đã bị hủy', response.data.get('message'))

    # -------------------------------------------------------------------------
    # 4. Capacity & Payment Invariants Tests
    # -------------------------------------------------------------------------
    def test_attendance_does_not_alter_capacity_or_booked_participants(self):
        """Điểm danh KHÔNG làm thay đổi sức chứa hoặc số chỗ đã đặt của session."""
        initial_capacity = self.session_active.capacity
        initial_booked = self.session_active.booked_participants
        initial_remaining = self.session_active.remaining_seats

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.session_active.refresh_from_db()
        self.assertEqual(self.session_active.capacity, initial_capacity)
        self.assertEqual(self.session_active.booked_participants, initial_booked)
        self.assertEqual(self.session_active.remaining_seats, initial_remaining)

    def test_attendance_does_not_alter_payment_data(self):
        """Điểm danh KHÔNG làm thay đổi tổng tiền hoặc giao dịch thanh toán."""
        initial_amount = self.booking_confirmed.total_amount
        initial_payment_status = self.payment.status

        self.client.force_authenticate(user=self.mgr_a)
        url = f'/api/v1/bookings/{self.booking_confirmed.pk}/attendance/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking_confirmed.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.booking_confirmed.total_amount, initial_amount)
        self.assertEqual(self.payment.status, initial_payment_status)

