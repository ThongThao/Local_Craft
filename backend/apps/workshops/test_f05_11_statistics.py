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


class WorkshopStatisticsF0511Tests(TestCase):
    """
    Test suite for F05.11 - Workshop KPI & Activity Statistics.
    Validates permission scoping, workshop/session/booking aggregations,
    F05.09 attendance rate calculation, revenue/refund breakdown,
    time-range filtering, and anti-JOIN multiplication.
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

        # 3. Users
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

        # 4. Artisans
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name="Nghệ nhân Tô Thanh Sơn",
            verification_status="APPROVED",
        )
        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name="Nghệ nhân Triệu Văn Mão",
            verification_status="APPROVED",
        )

        # 5. Workshops
        self.workshop_a1 = Workshop.objects.create(
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
        self.workshop_a2 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name="Nặn tò he nghệ thuật",
            slug="nan-to-he-nghe-thuat",
            description="Workshop làm tò he truyền thống",
            duration_minutes=90,
            price_per_person=Decimal("150000.00"),
            min_participants=1,
            location_address="Xóm 2, Bát Tràng",
            status=Workshop.WorkshopStatus.DRAFT,
        )
        self.workshop_b = Workshop.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            workshop_name="Dệt lụa tơ tằm cổ truyền",
            slug="det-lua-to-tam-co-truyen",
            description="Trải nghiệm dệt lụa Vạn Phúc",
            duration_minutes=150,
            price_per_person=Decimal("300000.00"),
            min_participants=1,
            location_address="Phố Lụa, Vạn Phúc",
            status=Workshop.WorkshopStatus.APPROVED,
        )

        self.now = timezone.now()

    def test_01_permission_unauthenticated_rejected(self):
        """Unauthenticated user cannot access workshop summary (401)"""
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_02_permission_tourist_rejected(self):
        """Tourist role cannot access village workshop summary (403)"""
        self.client.force_authenticate(user=self.tourist_1)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_empty_village_returns_zero_metrics(self):
        """A village with no sessions or bookings returns clean zeroes without division error"""
        self.client.force_authenticate(user=self.mgr_b)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data['data']
        self.assertEqual(d['overview']['total_workshops'], 1)
        self.assertEqual(d['overview']['active_workshops'], 1)
        self.assertEqual(d['overview']['total_sessions'], 0)
        self.assertEqual(d['bookings']['total_bookings'], 0)
        self.assertEqual(d['bookings']['total_participants'], 0)
        self.assertEqual(d['attendance']['attendance_rate'], 0.0)
        self.assertEqual(d['revenue']['net_realized_revenue'], 0.0)

    def test_04_scoping_manager_a_cannot_see_manager_b_data(self):
        """Manager A only sees Village A's workshops/bookings, never Village B's"""
        # Session in Village B
        sess_b = WorkshopSession.objects.create(
            workshop=self.workshop_b,
            start_at=self.now + timedelta(days=2),
            end_at=self.now + timedelta(days=2, hours=2),
            capacity=20,
            booked_participants=5,
            price_per_person=Decimal("300000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        WorkshopBooking.objects.create(
            booking_code="LC-BOOK-B01",
            user=self.tourist_1,
            session=sess_b,
            participant_count=5,
            unit_price=Decimal("300000.00"),
            total_amount=Decimal("1500000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data['data']
        # Village A has 2 workshops (workshop_a1, workshop_a2), 0 sessions
        self.assertEqual(d['overview']['total_workshops'], 2)
        self.assertEqual(d['overview']['total_sessions'], 0)
        self.assertEqual(d['bookings']['total_bookings'], 0)
        self.assertEqual(d['bookings']['total_participants'], 0)

    def test_05_comprehensive_kpi_and_attendance_rate_calculation(self):
        """
        Validates accurate KPI counts, participant sums, and F05.09 attendance rate:
        Booking A: COMPLETED, 3 participants
        Booking B: COMPLETED, 2 participants
        Booking C: NO_SHOW, 1 participant
        Booking D: CANCELLED, 4 participants (excluded from attendance rate)
        Booking E: CONFIRMED, 2 participants (excluded from attendance rate)
        Expected attendance rate: (3+2) / (3+2+1) = 5 / 6 = 83.33%
        Expected booking completion rate: 2 / (2+1) = 2/3 = 66.67%
        """
        sess = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=self.now - timedelta(days=1),
            end_at=self.now - timedelta(days=1, hours=-2),
            capacity=20,
            booked_participants=5,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.COMPLETED,
        )

        b_comp1 = WorkshopBooking.objects.create(
            booking_code="LC-COMP-01",
            user=self.tourist_1,
            session=sess,
            participant_count=3,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("600000.00"),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )
        b_comp2 = WorkshopBooking.objects.create(
            booking_code="LC-COMP-02",
            user=self.tourist_2,
            session=sess,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )
        b_noshow = WorkshopBooking.objects.create(
            booking_code="LC-NOSHOW-01",
            user=self.tourist_1,
            session=sess,
            participant_count=1,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("200000.00"),
            status=WorkshopBooking.BookingStatus.NO_SHOW,
        )
        b_cancelled = WorkshopBooking.objects.create(
            booking_code="LC-CANCEL-01",
            user=self.tourist_2,
            session=sess,
            participant_count=4,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("800000.00"),
            status=WorkshopBooking.BookingStatus.CANCELLED,
            cancelled_at=self.now - timedelta(days=2),
        )
        b_confirmed = WorkshopBooking.objects.create(
            booking_code="LC-CONFIRM-01",
            user=self.tourist_1,
            session=sess,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data['data']

        # Bookings check
        self.assertEqual(d['bookings']['total_bookings'], 5)
        # Total active participants: 3 (comp) + 2 (comp) + 2 (conf) = 7 (cancelled and no-show excluded or active)
        self.assertEqual(d['bookings']['completed'], 2)
        self.assertEqual(d['bookings']['no_show'], 1)
        self.assertEqual(d['bookings']['cancelled'], 1)
        self.assertEqual(d['bookings']['confirmed'], 1)

        # Attendance check
        att = d['attendance']
        self.assertEqual(att['attended_participants'], 5)
        self.assertEqual(att['no_show_participants'], 1)
        self.assertEqual(att['attendance_rate'], 83.33)
        self.assertEqual(att['booking_completion_rate'], 66.67)

    def test_06_revenue_payments_and_refunds_accuracy(self):
        """
        Validates financial calculations:
        - booking value: sum of active booking total_amounts
        - successful payments: sum of Payment amount where status='SUCCESS'
        - refunds: sum of Refund amount_approved where status='COMPLETED'
        - net revenue = successful payments - refunds
        """
        sess = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=self.now + timedelta(days=3),
            end_at=self.now + timedelta(days=3, hours=2),
            capacity=15,
            booked_participants=5,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        b1 = WorkshopBooking.objects.create(
            booking_code="LC-PAY-01",
            user=self.tourist_1,
            session=sess,
            participant_count=3,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("600000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )
        b2 = WorkshopBooking.objects.create(
            booking_code="LC-PAY-02",
            user=self.tourist_2,
            session=sess,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        # Successful payment for B1
        p1 = Payment.objects.create(
            payment_code="PAY-SUCCESS-01",
            booking=b1,
            payment_method="VNPAY",
            amount=Decimal("600000.00"),
            currency="VND",
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=self.now,
        )
        # Pending payment for B2 (not yet collected)
        p2 = Payment.objects.create(
            payment_code="PAY-PENDING-02",
            booking=b2,
            payment_method="VNPAY",
            amount=Decimal("400000.00"),
            currency="VND",
            status=Payment.PaymentRecordStatus.PENDING,
        )
        # Completed refund of 100,000 on P1
        Refund.objects.create(
            refund_code="REF-COMP-01",
            payment=p1,
            requested_by=self.tourist_1,
            amount_requested=Decimal("100000.00"),
            amount_approved=Decimal("100000.00"),
            reason="Khách đổi ý 1 người",
            status=Refund.RefundStatus.COMPLETED,
            processed_at=self.now,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rev = res.data['data']['revenue']

        self.assertEqual(rev['total_booking_value'], 1000000.0)  # 600k + 400k
        self.assertEqual(rev['successful_payments_amount'], 600000.0)  # Only P1 is SUCCESS
        self.assertEqual(rev['successful_refunds_amount'], 100000.0)  # 100k refunded
        self.assertEqual(rev['net_realized_revenue'], 500000.0)  # 600k - 100k = 500k

    def test_07_anti_join_multiplication_with_multiple_payments(self):
        """
        If a booking has multiple payment attempts (e.g. 1 failed, 1 successful),
        the booking counts and participant counts must NOT be duplicated.
        """
        sess = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=self.now + timedelta(days=2),
            end_at=self.now + timedelta(days=2, hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        b = WorkshopBooking.objects.create(
            booking_code="LC-MULTI-PAY",
            user=self.tourist_1,
            session=sess,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        # 3 payment records on this single booking
        Payment.objects.create(
            payment_code="PAY-FAIL-1",
            booking=b,
            payment_method="VNPAY",
            amount=Decimal("400000.00"),
            status=Payment.PaymentRecordStatus.FAILED,
        )
        Payment.objects.create(
            payment_code="PAY-SUCCESS-2",
            booking=b,
            payment_method="VNPAY",
            amount=Decimal("400000.00"),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=self.now,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get("/api/v1/workshops/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data['data']

        # Total bookings must remain exactly 1, total participants exactly 2
        self.assertEqual(d['bookings']['total_bookings'], 1)
        self.assertEqual(d['bookings']['total_participants'], 2)
        self.assertEqual(d['revenue']['successful_payments_amount'], 400000.0)

    def test_08_time_range_filter_excludes_out_of_range_data(self):
        """
        Validates time filtering:
        - Session & Booking from 10 days ago are excluded when time_range='7_DAYS'
        - Included when time_range='ALL' or time_range='30_DAYS'
        """
        sess_old = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=self.now - timedelta(days=10),
            end_at=self.now - timedelta(days=10, hours=-2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.COMPLETED,
        )
        b_old = WorkshopBooking.objects.create(
            booking_code="LC-OLD-BOOK",
            user=self.tourist_1,
            session=sess_old,
            participant_count=2,
            unit_price=Decimal("200000.00"),
            total_amount=Decimal("400000.00"),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )
        # Mock created_at to 10 days ago
        WorkshopBooking.objects.filter(pk=b_old.pk).update(created_at=self.now - timedelta(days=10))

        self.client.force_authenticate(user=self.mgr_a)

        # 7 DAYS filter
        res_7d = self.client.get("/api/v1/workshops/summary/?time_range=7_DAYS")
        self.assertEqual(res_7d.status_code, status.HTTP_200_OK)
        self.assertEqual(res_7d.data['data']['bookings']['total_bookings'], 0)
        self.assertEqual(res_7d.data['data']['overview']['total_sessions'], 0)

        # 30 DAYS filter
        res_30d = self.client.get("/api/v1/workshops/summary/?time_range=30_DAYS")
        self.assertEqual(res_30d.status_code, status.HTTP_200_OK)
        self.assertEqual(res_30d.data['data']['bookings']['total_bookings'], 1)
        self.assertEqual(res_30d.data['data']['overview']['total_sessions'], 1)

    def test_09_single_workshop_filter(self):
        """Filtering by workshop_id scopes KPIs to only that specific workshop"""
        sess_a1 = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=self.now + timedelta(days=1),
            end_at=self.now + timedelta(days=1, hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal("200000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )
        sess_a2 = WorkshopSession.objects.create(
            workshop=self.workshop_a2,
            start_at=self.now + timedelta(days=2),
            end_at=self.now + timedelta(days=2, hours=2),
            capacity=10,
            booked_participants=4,
            price_per_person=Decimal("150000.00"),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f"/api/v1/workshops/summary/?workshop_id={self.workshop_a1.workshop_id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data['data']
        self.assertEqual(d['overview']['total_workshops'], 1)
        self.assertEqual(d['overview']['total_sessions'], 1)

    def test_10_admin_can_view_any_village_summary(self):
        """Admin can pass village_id query param to inspect that village's workshop KPIs"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/v1/workshops/summary/?village_id={self.village_a.village_id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['overview']['total_workshops'], 2)

