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
from apps.payments.models import Payment, Refund
from apps.notifications.models import Notification


class WorkshopReschedulingF0512Tests(TestCase):
    """
    Test suite for F05.12 - Workshop Session Rescheduling.
    Verifies:
      - Basic rescheduling (0 bookings, pending, confirmed, multi-bookings)
      - Validation checks (past time, end <= start, cancelled/completed session, session started)
      - F05.09 integration (blocks reschedule if COMPLETED or NO_SHOW bookings exist)
      - Reason requirement when bookings exist
      - Artisan schedule conflict detection
      - Permissions (unauthenticated 401, tourist 403, village A vs village B 403, admin 200)
      - Notification creation and idempotency
      - Financial integrity & 100% refundable amount calculation
      - Regressions for F05.09 (attendance with new schedule), F05.10 (cancel after reschedule), F05.11 (KPI summary)
    """

    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # 1. Roles
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Admin'})
        self.role_cv, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Craft Village'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Tourist'})

        # 2. Villages
        self.village_a = CraftVillage.objects.create(
            village_name="Làng gốm Bát Tràng",
            slug="lang-gom-bat-trang",
            status="ACTIVE",
        )
        self.village_b = CraftVillage.objects.create(
            village_name="Làng lụa Vạn Phúc",
            slug="lang-lua-van-phuc",
            status="ACTIVE",
        )

        # 3. Users
        self.admin = User.objects.create(
            email="admin.reschedule@localcraft.vn",
            full_name="Quản Trị Viên",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.admin, role=self.role_admin)

        self.mgr_a = User.objects.create(
            email="manager.a.reschedule@localcraft.vn",
            full_name="Quản lý Bát Tràng",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email="manager.b.reschedule@localcraft.vn",
            full_name="Quản lý Vạn Phúc",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.tourist_1 = User.objects.create(
            email="tourist.1.reschedule@localcraft.vn",
            full_name="Nguyễn Văn A",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.tourist_1, role=self.role_tourist)

        self.tourist_2 = User.objects.create(
            email="tourist.2.reschedule@localcraft.vn",
            full_name="Trần Thị B",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.tourist_2, role=self.role_tourist)

        # 4. Artisan
        self.artisan = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name="Nghệ nhân Tô Thanh Sơn",
            experience_years=35,
            verification_status="APPROVED",
        )

        # 5. Workshop
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan,
            workshop_name="Trải nghiệm làm gốm vuốt tay Bát Tràng",
            slug="trai-nghiem-lam-gom-vuot-tay-bat-trang",
            description="Tập làm gốm vuốt tay trên bàn xoay truyền thống.",
            duration_minutes=120,
            price_per_person=Decimal('250000.00'),
            location_address="Số 10 Xóm 2 Bát Tràng",
            status=Workshop.WorkshopStatus.APPROVED,
        )

        # 6. Default future session
        self.session_a = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.now + timedelta(days=2, hours=9),
            end_at=self.now + timedelta(days=2, hours=11),
            capacity=15,
            booked_participants=0,
            price_per_person=Decimal('250000.00'),
            status=WorkshopSession.SessionStatus.OPEN,
        )

    # =========================================================================
    # NHÓM A – ĐỔI LỊCH CƠ BẢN
    # =========================================================================

    def test_01_reschedule_without_bookings_success(self):
        """TC01: Đổi lịch session chưa có booking thành công, không sinh notification."""
        self.client.force_authenticate(user=self.mgr_a)
        new_start = self.now + timedelta(days=5, hours=8)
        new_end = self.now + timedelta(days=5, hours=10)

        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": new_start.isoformat(),
            "new_end_at": new_end.isoformat(),
            "reason": "Điều chỉnh theo thời khóa biểu mới",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['affected_bookings_count'], 0)
        self.assertEqual(res.data['data']['notifications_created'], 0)

        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.start_at, new_start)
        self.assertEqual(self.session_a.end_at, new_end)
        self.assertEqual(self.session_a.booked_participants, 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_02_reschedule_with_pending_booking_success(self):
        """TC02: Đổi lịch session có booking PENDING -> Giữ nguyên booking, tạo notification."""
        booking = WorkshopBooking.objects.create(
            booking_code="WB-PENDING-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.PENDING,
        )
        self.session_a.booked_participants = 2
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        new_start = self.now + timedelta(days=4, hours=14)
        new_end = self.now + timedelta(days=4, hours=16)

        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": new_start.isoformat(),
            "new_end_at": new_end.isoformat(),
            "reason": "Nghệ nhân bận họp làng nghề đột xuất",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['affected_bookings_count'], 1)
        self.assertEqual(res.data['data']['notifications_created'], 1)

        booking.refresh_from_db()
        self.assertEqual(booking.status, WorkshopBooking.BookingStatus.PENDING)
        self.assertEqual(booking.session_id, self.session_a.session_id)

        notif = Notification.objects.get(user=self.tourist_1)
        self.assertEqual(notif.notification_type, 'WORKSHOP_SESSION_RESCHEDULED')
        self.assertIn("WB-PENDING-01", notif.message)
        self.assertIn("Nghệ nhân bận họp", notif.message)

    def test_03_reschedule_with_confirmed_booking_success(self):
        """TC03: Đổi lịch session có booking CONFIRMED -> Giữ nguyên booking, tạo notification."""
        booking = WorkshopBooking.objects.create(
            booking_code="WB-CONF-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=3,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('750000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        self.session_a.booked_participants = 3
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        new_start = self.now + timedelta(days=3, hours=9)
        new_end = self.now + timedelta(days=3, hours=11)

        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": new_start.isoformat(),
            "new_end_at": new_end.isoformat(),
            "reason": "Điều chỉnh thời tiết mưa bão",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        booking.refresh_from_db()
        self.assertEqual(booking.status, WorkshopBooking.BookingStatus.CONFIRMED)

    def test_04_reschedule_multi_bookings_and_states(self):
        """TC04-05: Nhiều booking: CONFIRMED + PENDING + CANCELLED -> chỉ gửi notification cho active."""
        b_conf = WorkshopBooking.objects.create(
            booking_code="WB-MULTI-CONF",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        b_pend = WorkshopBooking.objects.create(
            booking_code="WB-MULTI-PEND",
            user=self.tourist_2,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.PENDING,
        )
        b_canc = WorkshopBooking.objects.create(
            booking_code="WB-MULTI-CANC",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CANCELLED,
            cancelled_at=self.now,
        )
        self.session_a.booked_participants = 3
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        new_start = self.now + timedelta(days=4, hours=10)
        new_end = self.now + timedelta(days=4, hours=12)

        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": new_start.isoformat(),
            "new_end_at": new_end.isoformat(),
            "reason": "Nghệ nhân tham dự triển lãm quốc tế",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['affected_bookings_count'], 2)
        self.assertEqual(res.data['data']['notifications_created'], 2)

        # Check CANCELLED booking is untouched
        b_canc.refresh_from_db()
        self.assertEqual(b_canc.status, WorkshopBooking.BookingStatus.CANCELLED)

        # Check notifications: exactly 2 notifications (none for cancelled booking)
        self.assertEqual(Notification.objects.count(), 2)
        notif_users = set(Notification.objects.values_list('user_id', flat=True))
        self.assertEqual(notif_users, {self.tourist_1.user_id, self.tourist_2.user_id})

    # =========================================================================
    # NHÓM B – KIỂM TRA DỮ LIỆU & VALIDATION
    # =========================================================================

    def test_05_validation_new_start_in_past_rejected(self):
        """TC06: Thời gian bắt đầu mới ở trong quá khứ bị từ chối 400."""
        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now - timedelta(hours=2)).isoformat(),
            "new_end_at": (self.now + timedelta(hours=1)).isoformat(),
            "reason": "Dời về quá khứ",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_06_validation_end_before_start_rejected(self):
        """TC07: Giờ kết thúc <= giờ bắt đầu bị từ chối 400."""
        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=3, hours=10)).isoformat(),
            "new_end_at": (self.now + timedelta(days=3, hours=9)).isoformat(),
            "reason": "Giờ kết thúc trước giờ bắt đầu",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_07_validation_session_cancelled_rejected(self):
        """TC08: Session đã hủy bị từ chối đổi lịch 400."""
        self.session_a.status = WorkshopSession.SessionStatus.CANCELLED
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=3, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=3, hours=11)).isoformat(),
            "reason": "Đổi lịch session đã hủy",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_08_validation_session_completed_rejected(self):
        """TC09: Session đã kết thúc bị từ chối đổi lịch 400."""
        self.session_a.status = WorkshopSession.SessionStatus.COMPLETED
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=3, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=3, hours=11)).isoformat(),
            "reason": "Đổi lịch session đã kết thúc",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_validation_session_started_rejected(self):
        """TC10: Session đã bắt đầu trong quá khứ bị từ chối đổi lịch 400."""
        self.session_a.start_at = self.now - timedelta(minutes=30)
        self.session_a.end_at = self.now + timedelta(minutes=90)
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=3, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=3, hours=11)).isoformat(),
            "reason": "Đổi lịch buổi đang diễn ra",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_10_validation_attended_booking_completed_blocks_reschedule(self):
        """TC11: Session đã có khách điểm danh COMPLETED -> Cấm đổi lịch 400."""
        WorkshopBooking.objects.create(
            booking_code="WB-COMPLETED-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Đổi lịch ca đã điểm danh",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("điểm danh", res.data.get('message', ''))

    def test_11_validation_attended_booking_noshow_blocks_reschedule(self):
        """TC12: Session đã có khách báo vắng NO_SHOW -> Cấm đổi lịch 400."""
        WorkshopBooking.objects.create(
            booking_code="WB-NOSHOW-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.NO_SHOW,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Đổi lịch ca đã có no-show",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("điểm danh", res.data.get('message', ''))

    def test_12_validation_missing_reason_when_bookings_exist(self):
        """TC13: Session đã có khách nhưng bỏ trống lý do đổi lịch -> Báo lỗi 400."""
        WorkshopBooking.objects.create(
            booking_code="WB-REASON-REQ",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "   ",  # Blank whitespace
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # NHÓM C – XUNG ĐỘT LỊCH NGHỆ NHÂN
    # =========================================================================

    def test_13_artisan_schedule_conflict_rejected(self):
        """TC14: Trùng lịch với ca khác của cùng nghệ nhân -> Báo lỗi 400."""
        # Create a second workshop with the same artisan
        workshop_2 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan,
            workshop_name="Nâng cao vuốt gốm men rạn Bát Tràng",
            slug="nang-cao-vuot-gom-men-ran-bat-trang",
            description="Lớp nâng cao",
            duration_minutes=120,
            price_per_person=Decimal('350000.00'),
            location_address="Số 10 Xóm 2 Bát Tràng",
            status=Workshop.WorkshopStatus.APPROVED,
        )
        target_start = self.now + timedelta(days=5, hours=9)
        target_end = self.now + timedelta(days=5, hours=11)

        WorkshopSession.objects.create(
            workshop=workshop_2,
            start_at=target_start,
            end_at=target_end,
            capacity=10,
            price_per_person=Decimal('350000.00'),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        # Overlapping timeframe: starts 30 mins after target_start, ends 30 mins after target_end
        payload = {
            "new_start_at": (target_start + timedelta(minutes=30)).isoformat(),
            "new_end_at": (target_end + timedelta(minutes=30)).isoformat(),
            "reason": "Thử đổi lịch trùng nghệ nhân",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Nghệ nhân", str(res.data))

    def test_14_artisan_no_conflict_different_time_success(self):
        """TC15: Cùng ngày nhưng không giao thoa thời gian với nghệ nhân -> Đổi lịch thành công 200."""
        target_start = self.now + timedelta(days=5, hours=8)
        target_end = self.now + timedelta(days=5, hours=10)

        WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=target_start,
            end_at=target_end,
            capacity=10,
            price_per_person=Decimal('250000.00'),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        # Non-overlapping: starts at 14:00 (target ends at 10:00)
        payload = {
            "new_start_at": (self.now + timedelta(days=5, hours=14)).isoformat(),
            "new_end_at": (self.now + timedelta(days=5, hours=16)).isoformat(),
            "reason": "Ca chiều không trùng ca sáng",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # =========================================================================
    # NHÓM D – PHÂN QUYỀN
    # =========================================================================

    def test_15_permission_unauthenticated_rejected(self):
        """TC16: Chưa đăng nhập bị từ chối 401."""
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        res = self.client.post(url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_16_permission_tourist_rejected(self):
        """TC17: Khách du lịch (TOURIST) không có quyền đổi lịch ca học -> 403."""
        self.client.force_authenticate(user=self.tourist_1)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=3, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=3, hours=11)).isoformat(),
            "reason": "Khách cố tình đổi lịch",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_17_permission_manager_a_cannot_reschedule_village_b(self):
        """TC18: Quản lý Làng A không thể sửa session của Làng B -> 403."""
        workshop_b = Workshop.objects.create(
            village=self.village_b,
            workshop_name="Workshop Làng Lụa Vạn Phúc",
            slug="workshop-lang-lua-van-phuc",
            description="Làng lụa",
            duration_minutes=90,
            price_per_person=Decimal('200000.00'),
            location_address="Vạn Phúc Hà Đông",
            status=Workshop.WorkshopStatus.APPROVED,
        )
        session_b = WorkshopSession.objects.create(
            workshop=workshop_b,
            start_at=self.now + timedelta(days=3, hours=9),
            end_at=self.now + timedelta(days=3, hours=11),
            capacity=10,
            price_per_person=Decimal('200000.00'),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.client.force_authenticate(user=self.mgr_a)  # Manager A
        url = f"/api/v1/workshops/sessions/{session_b.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Làng A can thiệp Làng B",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_18_permission_admin_can_reschedule_any_session(self):
        """TC19: ADMIN có quyền đổi lịch bất kỳ session nào."""
        self.client.force_authenticate(user=self.admin)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Admin điều phối lịch",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # =========================================================================
    # NHÓM E – NOTIFICATION & IDEMPOTENCY
    # =========================================================================

    def test_19_notification_idempotency_prevents_duplicate_notifications(self):
        """TC20: Cơ chế chống gửi trùng thông báo hoạt động chính xác."""
        WorkshopBooking.objects.create(
            booking_code="WB-IDEMP-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        # Pre-create a notification within 5 mins
        Notification.objects.create(
            user=self.tourist_1,
            notification_type='WORKSHOP_SESSION_RESCHEDULED',
            title='Thông báo điều chỉnh lịch workshop',
            message="Buổi workshop WB-IDEMP-01 đã được điều chỉnh",
            target_type='WORKSHOP_SESSION',
            target_id=self.session_a.session_id,
        )
        self.assertEqual(Notification.objects.count(), 1)

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Cập nhật lần 2",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Notifications count should still be 1 (no duplicate generated)
        self.assertEqual(Notification.objects.count(), 1)

    def test_20_notification_content_accuracy(self):
        """TC21: Nội dung thông báo chứa đầy đủ thông tin hỗ trợ hoàn tiền 100%."""
        WorkshopBooking.objects.create(
            booking_code="WB-CONTENT-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Trời mưa giông to",
        }
        self.client.post(url, payload, format='json')

        notif = Notification.objects.filter(user=self.tourist_1).first()
        self.assertIsNotNone(notif)
        self.assertIn("Trải nghiệm làm gốm vuốt tay", notif.message)
        self.assertIn("WB-CONTENT-01", notif.message)
        self.assertIn("Trời mưa giông to", notif.message)
        self.assertIn("hoàn tiền 100%", notif.message)
        self.assertIn("vẫn được giữ nguyên hiệu lực", notif.message)

    # =========================================================================
    # NHÓM F – HOÀN TIỀN 100% & BẢO TOÀN DỮ LIỆU
    # =========================================================================

    def test_21_financial_payments_and_refunds_intact(self):
        """TC22: Payment giữ nguyên SUCCESS, không bị tự động đánh dấu REFUNDED."""
        booking = WorkshopBooking.objects.create(
            booking_code="WB-FIN-01",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        payment = Payment.objects.create(
            payment_code="PAY-TEST-001",
            booking=booking,
            payment_method="VNPAY",
            amount=Decimal('500000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=self.now,
        )

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
            "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
            "reason": "Đổi lịch bảo toàn thanh toán",
        }
        self.client.post(url, payload, format='json')

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.PaymentRecordStatus.SUCCESS)
        self.assertEqual(payment.amount, Decimal('500000.00'))
        self.assertEqual(Refund.objects.filter(payment=payment).count(), 0)

    def test_22_refundable_amount_calculation_accuracy(self):
        """TC23: Tính toán chính xác số tiền hoàn 100% qua serializer = paid - refunds."""
        booking = WorkshopBooking.objects.create(
            booking_code="WB-REFUND-CALC",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        # Payment 1: 300,000 (SUCCESS)
        p1 = Payment.objects.create(
            payment_code="PAY-P1",
            booking=booking,
            payment_method="VNPAY",
            amount=Decimal('300000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=self.now,
        )
        # Payment 2: 200,000 (SUCCESS)
        p2 = Payment.objects.create(
            payment_code="PAY-P2",
            booking=booking,
            payment_method="VNPAY",
            amount=Decimal('200000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=self.now,
        )
        # Existing refund: 100,000 (COMPLETED)
        Refund.objects.create(
            refund_code="REF-001",
            payment=p1,
            requested_by=self.tourist_1,
            amount_requested=Decimal('100000.00'),
            amount_approved=Decimal('100000.00'),
            reason="Hoàn 1 vé",
            status=Refund.RefundStatus.COMPLETED,
        )

        from apps.bookings.serializers import WorkshopBookingDetailSerializer
        serializer = WorkshopBookingDetailSerializer(booking)
        data = serializer.data

        # Total paid: 500k, Total refunded: 100k -> Refundable remaining = 400,000
        self.assertEqual(data['refundable_amount'], 400000.0)

    # =========================================================================
    # NHÓM G – HỒI QUY (F05.09, F05.10, F05.11)
    # =========================================================================

    def test_23_regression_f05_09_attendance_with_new_schedule(self):
        """TC24: Điểm danh F05.09 theo thời gian mới hoạt động chuẩn xác."""
        booking = WorkshopBooking.objects.create(
            booking_code="WB-ATTEND-REGR",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('250000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        # Reschedule session to now + 30 minutes (within the 60-minute attendance window)
        new_start = self.now + timedelta(minutes=30)
        new_end = self.now + timedelta(minutes=150)

        self.client.force_authenticate(user=self.mgr_a)
        url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        payload = {
            "new_start_at": new_start.isoformat(),
            "new_end_at": new_end.isoformat(),
            "reason": "Dời về sớm 30 phút",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Now test F05.09 attendance check-in: session.start_at - 60 mins <= now <= end_at + 24 hrs
        attendance_url = f"/api/v1/bookings/{booking.booking_id}/attendance/"
        attend_res = self.client.post(attendance_url, {"status": "COMPLETED"}, format='json')
        self.assertEqual(attend_res.status_code, status.HTTP_200_OK)

        booking.refresh_from_db()
        self.assertEqual(booking.status, WorkshopBooking.BookingStatus.COMPLETED)

    def test_24_regression_f05_10_cancellation_after_reschedule(self):
        """TC25: Hủy Session F05.10 sau khi đổi lịch vẫn hoạt động chuẩn xác."""
        WorkshopBooking.objects.create(
            booking_code="WB-CANCEL-REGR",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        self.session_a.booked_participants = 2
        self.session_a.save()

        # Step 1: Reschedule
        self.client.force_authenticate(user=self.mgr_a)
        reschedule_url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        self.client.post(
            reschedule_url,
            {
                "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
                "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
                "reason": "Đổi lịch trước khi hủy",
            },
            format='json'
        )

        # Step 2: Cancel Session via F05.10
        cancel_url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/cancel/"
        cancel_res = self.client.post(cancel_url, {}, format='json')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.status, WorkshopSession.SessionStatus.CANCELLED)
        self.assertEqual(self.session_a.booked_participants, 0)

    def test_25_regression_f05_11_statistics_accuracy_after_reschedule(self):
        """TC26: Thống kê F05.11 không làm tăng số lượng session hay booking sau khi đổi lịch."""
        WorkshopBooking.objects.create(
            booking_code="WB-STAT-REGR",
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        self.session_a.booked_participants = 2
        self.session_a.save()

        self.client.force_authenticate(user=self.mgr_a)
        # Initial summary
        res1 = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        sess_count_1 = res1.data['data']['overview']['total_sessions']
        book_count_1 = res1.data['data']['bookings']['total_bookings']

        # Reschedule
        reschedule_url = f"/api/v1/workshops/sessions/{self.session_a.session_id}/reschedule/"
        self.client.post(
            reschedule_url,
            {
                "new_start_at": (self.now + timedelta(days=4, hours=9)).isoformat(),
                "new_end_at": (self.now + timedelta(days=4, hours=11)).isoformat(),
                "reason": "Đổi lịch kiểm tra KPI",
            },
            format='json'
        )

        # Summary after reschedule
        res2 = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        sess_count_2 = res2.data['data']['overview']['total_sessions']
        book_count_2 = res2.data['data']['bookings']['total_bookings']

        # Metrics MUST NOT increase or duplicate
        self.assertEqual(sess_count_1, sess_count_2)
        self.assertEqual(book_count_1, book_count_2)
