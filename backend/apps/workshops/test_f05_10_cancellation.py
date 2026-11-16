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
from apps.notifications.models import Notification
from apps.payments.models import Payment


class WorkshopSessionCancellationTests(TestCase):
    """
    Test suite for F05.10 - Workshop Session Cancellation & Customer Notification.
    Verifies permission scoping, session states, booking transitions,
    capacity release without double-counting, notification generation & idempotency,
    and payment preservation.
    """

    def setUp(self):
        self.client = APIClient()

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

        # 3. Users & Relations
        self.admin = User.objects.create(
            email="admin@localcraft.vn",
            full_name="Quản Trị Viên",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.admin, role=self.role_admin)

        self.mgr_a = User.objects.create(
            email="manager.a@localcraft.vn",
            full_name="Quản lý Bát Tràng",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email="manager.b@localcraft.vn",
            full_name="Quản lý Vạn Phúc",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.tourist_1 = User.objects.create(
            email="tourist1@example.com",
            full_name="Nguyễn Văn Du Khách",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.tourist_1, role=self.role_tourist)

        self.tourist_2 = User.objects.create(
            email="tourist2@example.com",
            full_name="Trần Thị Khách",
            status="ACTIVE",
        )
        UserRole.objects.create(user=self.tourist_2, role=self.role_tourist)

        # 4. Artisan & Workshop
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name="Nghệ nhân Tô Thanh Sơn",
            verification_status="APPROVED",
        )
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name="Kỹ thuật vuốt gốm bàn xoay",
            slug="ky-thuat-vuot-gom-ban-xoay",
            description="Trải nghiệm làm gốm Bát Tràng",
            duration_minutes=120,
            price_per_person=Decimal("200000.00"),
            min_participants=1,
            location_address="Xóm 1, Bát Tràng",
            status=Workshop.WorkshopStatus.APPROVED,
        )

        # Base future time for sessions
        self.base_time = timezone.now() + timedelta(days=2)

    def test_01_permission_unauthenticated_rejected(self):
        """Unauthenticated user cannot cancel workshop session (401)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_02_permission_tourist_rejected(self):
        """Tourist role cannot cancel workshop session (403)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.tourist_1)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_permission_manager_b_cannot_cancel_manager_a_session(self):
        """Village Manager B cannot cancel Session belonging to Village A (403)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.mgr_b)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_permission_owner_manager_and_admin_allowed(self):
        """Village Manager A and Admin can successfully cancel session of Village A"""
        session_a = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.mgr_a)
        res_mgr = self.client.post(f"/api/v1/workshops/sessions/{session_a.session_id}/cancel/")
        self.assertEqual(res_mgr.status_code, status.HTTP_200_OK)
        session_a.refresh_from_db()
        self.assertEqual(session_a.status, WorkshopSession.SessionStatus.CANCELLED)

        # Admin cancels session_admin
        session_admin = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time + timedelta(days=1),
            end_at=self.base_time + timedelta(days=1, hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.admin)
        res_adm = self.client.post(f"/api/v1/workshops/sessions/{session_admin.session_id}/cancel/")
        self.assertEqual(res_adm.status_code, status.HTTP_200_OK)
        session_admin.refresh_from_db()
        self.assertEqual(session_admin.status, WorkshopSession.SessionStatus.CANCELLED)

    def test_05_cannot_cancel_already_cancelled_session(self):
        """Cannot cancel a session that is already CANCELLED (400 Bad Request)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.CANCELLED,
        )
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("đã ở trạng thái Hủy từ trước", str(res.data.get("message")))

    def test_06_cannot_cancel_completed_session(self):
        """Cannot cancel a session that is already COMPLETED (400 Bad Request)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time - timedelta(days=2),
            end_at=self.base_time - timedelta(days=2, hours=-2),
            capacity=10,
            booked_participants=5,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.COMPLETED,
        )
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("đã hoàn thành", str(res.data.get("message")))

    def test_07_cannot_cancel_past_session(self):
        """Cannot cancel a session whose end_at is in the past (400 Bad Request)"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=timezone.now() - timedelta(hours=5),
            end_at=timezone.now() - timedelta(hours=3),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("trong quá khứ", str(res.data.get("message")))

    def test_08_cancel_session_with_zero_bookings(self):
        """Cancelling session with 0 bookings succeeds, releases 0 seats, generates 0 notifications"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=15,
            booked_participants=0,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["data"]["affected_bookings"], 0)
        self.assertEqual(res.data["data"]["released_seats"], 0)
        self.assertEqual(res.data["data"]["notifications_created"], 0)

        session.refresh_from_db()
        self.assertEqual(session.status, WorkshopSession.SessionStatus.CANCELLED)
        self.assertEqual(session.booked_participants, 0)

    def test_09_cancel_session_transitions_active_bookings_and_releases_seats(self):
        """
        Session cancellation transitions CONFIRMED and PENDING bookings to CANCELLED,
        records cancelled_at timestamp, and accurately decrements booked_participants.
        """
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=20,
            booked_participants=7,  # 3 (CONFIRMED) + 4 (PENDING)
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        b_confirmed = WorkshopBooking.objects.create(
            booking_code="LC-BOOK-CONFIRMED",
            user=self.tourist_1,
            session=session,
            participant_count=3,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("600000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        b_pending = WorkshopBooking.objects.create(
            booking_code="LC-BOOK-PENDING",
            user=self.tourist_2,
            session=session,
            participant_count=4,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("800000.00"),
            status=WorkshopBooking.BookingStatus.PENDING,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["data"]["affected_bookings"], 2)
        self.assertEqual(res.data["data"]["released_seats"], 7)
        self.assertEqual(res.data["data"]["notifications_created"], 2)

        session.refresh_from_db()
        self.assertEqual(session.status, WorkshopSession.SessionStatus.CANCELLED)
        self.assertEqual(session.booked_participants, 0)

        # Check bookings
        b_confirmed.refresh_from_db()
        self.assertEqual(b_confirmed.status, WorkshopBooking.BookingStatus.CANCELLED)
        self.assertIsNotNone(b_confirmed.cancelled_at)

        b_pending.refresh_from_db()
        self.assertEqual(b_pending.status, WorkshopBooking.BookingStatus.CANCELLED)
        self.assertIsNotNone(b_pending.cancelled_at)

    def test_10_anti_double_release_with_previously_cancelled_booking(self):
        """
        Bookings cancelled PRIOR to session cancellation are NOT re-released
        and do not receive duplicate notifications.
        """
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=2,  # Only b_active is occupying seats
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        # Previously cancelled booking
        b_prior_cancelled = WorkshopBooking.objects.create(
            booking_code="LC-PRIOR-CANCELLED",
            user=self.tourist_1,
            session=session,
            participant_count=5,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("1000000.00"),
            status=WorkshopBooking.BookingStatus.CANCELLED,
            cancelled_at=timezone.now() - timedelta(days=1),
        )

        # Active booking
        b_active = WorkshopBooking.objects.create(
            booking_code="LC-STILL-ACTIVE",
            user=self.tourist_2,
            session=session,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["data"]["affected_bookings"], 1)
        self.assertEqual(res.data["data"]["released_seats"], 2)

        session.refresh_from_db()
        self.assertEqual(session.booked_participants, 0)

        # Prior cancelled booking cancelled_at must NOT be overwritten
        old_cancelled_at = b_prior_cancelled.cancelled_at
        b_prior_cancelled.refresh_from_db()
        self.assertEqual(b_prior_cancelled.cancelled_at, old_cancelled_at)

        # Tourist 1 should NOT receive notification
        notifs_t1 = Notification.objects.filter(
            user=self.tourist_1,
            target_type="WORKSHOP_SESSION",
            target_id=session.session_id,
        )
        self.assertEqual(notifs_t1.count(), 0)

        # Tourist 2 should receive notification
        notifs_t2 = Notification.objects.filter(
            user=self.tourist_2,
            target_type="WORKSHOP_SESSION",
            target_id=session.session_id,
        )
        self.assertEqual(notifs_t2.count(), 1)
        notif = notifs_t2.first()
        self.assertIn("Kỹ thuật vuốt gốm bàn xoay", notif.message)
        self.assertIn("LC-STILL-ACTIVE", notif.message)

    def test_11_notification_idempotency_on_retry(self):
        """Retrying cancellation or idempotent actions does not spawn duplicate notifications"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        b = WorkshopBooking.objects.create(
            booking_code="LC-IDEMPOTENT-01",
            user=self.tourist_1,
            session=session,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res1 = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.assertEqual(
            Notification.objects.filter(
                user=self.tourist_1,
                target_type="WORKSHOP_SESSION",
                target_id=session.session_id,
            ).count(),
            1,
        )

        # Second cancel attempt must return 400 and NOT duplicate notification
        res2 = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(
            Notification.objects.filter(
                user=self.tourist_1,
                target_type="WORKSHOP_SESSION",
                target_id=session.session_id,
            ).count(),
            1,
        )

    def test_12_payments_are_preserved_and_untouched(self):
        """
        Session cancellation MUST NOT modify or forge Payment or Refund records.
        Payment records remain intact for accounting and finance auditing.
        """
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        booking = WorkshopBooking.objects.create(
            booking_code="LC-PAYMENT-TEST",
            user=self.tourist_1,
            session=session,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        payment = Payment.objects.create(
            payment_code="PAY-LC-TEST01",
            booking=booking,
            payment_method="VNPAY",
            amount=Decimal("400000.00"),
            currency="VND",
            status=Payment.PaymentRecordStatus.SUCCESS,
            provider_transaction_id="TXN-998877",
            paid_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Payment record must remain unchanged
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.PaymentRecordStatus.SUCCESS)
        self.assertEqual(payment.amount, Decimal("400000.00"))
        self.assertEqual(payment.booking_id, booking.booking_id)

    def test_13_consistency_check_prevents_negative_booked_participants(self):
        """
        If database data is inconsistent (booked_participants < sum of active booking seats),
        the endpoint returns 409 Conflict instead of masking with negative numbers or max(0, ...).
        """
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=1,  # Corrupted state: 1 < 3
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        WorkshopBooking.objects.create(
            booking_code="LC-CORRUPT-CHECK",
            user=self.tourist_1,
            session=session,
            participant_count=3,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("600000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f"/api/v1/workshops/sessions/{session.session_id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("không nhất quán", str(res.data.get("message")))

        # Session remains OPEN, not corrupted
        session.refresh_from_db()
        self.assertEqual(session.status, WorkshopSession.SessionStatus.OPEN)
        self.assertEqual(session.booked_participants, 1)
