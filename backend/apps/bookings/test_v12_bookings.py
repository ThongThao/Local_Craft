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


class V12WorkshopBookingDetailAPITests(TestCase):
    """
    Test suite for V12: Chi tiết đặt chỗ Workshop (Workshop Booking Detail).
    Verifies full field retrieval, role scoping, payment serialization,
    session capacity distinction, and cancellation safety.
    """

    def setUp(self):
        self.client = APIClient()

        # Roles
        self.role_cv, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Craft Village'})
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Admin'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Tourist'})

        # Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang-v12',
            status='ACTIVE'
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-v12',
            status='ACTIVE'
        )

        # Users
        self.mgr_a = User.objects.create(
            email='mgr_a_v12@example.com',
            full_name='Quản Lý Làng A',
            phone='0909111222',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email='mgr_b_v12@example.com',
            full_name='Quản Lý Làng B',
            phone='0909333444',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.admin = User.objects.create(
            email='admin_v12@example.com',
            full_name='Hệ Thống Admin',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.admin, role=self.role_admin)

        self.tourist_1 = User.objects.create(
            email='tourist_1_v12@example.com',
            full_name='Lê Hoàng Nam',
            phone='0987654321',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist_1, role=self.role_tourist)

        self.tourist_2 = User.objects.create(
            email='tourist_2_v12@example.com',
            full_name='Phạm Thị Hoa',
            phone='0978123456',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist_2, role=self.role_tourist)

        # Artisan
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ Nhân Bát Tràng',
            experience_years=30,
            verification_status='VERIFIED'
        )

        # Workshop
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name='Làm Gốm Thủ Công Men Cổ',
            slug='lam-gom-thu-cong-men-co-v12',
            description='Trải nghiệm nhào nặn đất sét và vẽ men gốm truyền thống.',
            duration_minutes=150,
            price_per_person=Decimal('350000.00'),
            location_address='Số 10 Xóm 2, Bát Tràng, Gia Lâm, Hà Nội',
            status=Workshop.WorkshopStatus.APPROVED
        )

        # Session
        now = timezone.now()
        self.session_a = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=now + timedelta(days=2, hours=8),
            end_at=now + timedelta(days=2, hours=10, minutes=30),
            capacity=12,
            booked_participants=4,
            price_per_person=Decimal('350000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        # Booking A1
        self.booking_a1 = WorkshopBooking.objects.create(
            booking_code='LC-V12-001',
            user=self.tourist_1,
            session=self.session_a,
            participant_count=4,
            unit_price=Decimal('350000.00'),
            total_amount=Decimal('1400000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
            special_request='Cần 2 tạp dề trẻ em và chỗ đỗ xe'
        )

        # Booking B1 (Village B)
        self.session_b = WorkshopSession.objects.create(
            workshop=Workshop.objects.create(
                village=self.village_b,
                workshop_name='Dệt Lụa Tơ Tằm Vạn Phúc',
                slug='det-lua-to-tam-v12',
                duration_minutes=90,
                price_per_person=Decimal('200000.00'),
                status=Workshop.WorkshopStatus.APPROVED
            ),
            start_at=now + timedelta(days=3, hours=9),
            end_at=now + timedelta(days=3, hours=10, minutes=30),
            capacity=8,
            booked_participants=2,
            price_per_person=Decimal('200000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )
        self.booking_b1 = WorkshopBooking.objects.create(
            booking_code='LC-V12-B01',
            user=self.tourist_2,
            session=self.session_b,
            participant_count=2,
            unit_price=Decimal('200000.00'),
            total_amount=Decimal('400000.00'),
            status=WorkshopBooking.BookingStatus.PENDING
        )

    # 1. Quản lý làng nghề truy cập chi tiết booking làng mình thành công (200)
    def test_01_manager_access_own_village_booking_detail(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        self.assertEqual(data['booking_code'], 'LC-V12-001')
        self.assertEqual(data['customer_name'], 'Lê Hoàng Nam')
        self.assertEqual(data['customer_email'], 'tourist_1_v12@example.com')
        self.assertEqual(data['customer_phone'], '0987654321')
        self.assertEqual(data['workshop_name'], 'Làm Gốm Thủ Công Men Cổ')
        self.assertEqual(data['artisan_name'], 'Nghệ Nhân Bát Tràng')
        self.assertEqual(data['participant_count'], 4)
        self.assertEqual(Decimal(str(data['total_amount'])), Decimal('1400000.00'))
        self.assertEqual(data['special_request'], 'Cần 2 tạp dề trẻ em và chỗ đỗ xe')

    # 2. Phân biệt rõ số người booking vs sức chứa ca tổ chức
    def test_02_session_capacity_distinction(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        # Booking's participant count
        self.assertEqual(data['participant_count'], 4)
        # Session's total capacity & booked
        self.assertEqual(data['session_capacity'], 12)
        self.assertEqual(data['session_booked_participants'], 4)
        self.assertEqual(data['session_remaining_seats'], 8)
        self.assertEqual(data['session_status'], 'OPEN')

    # 3. Thông tin thanh toán: Khi có giao dịch thanh toán thật trong DB
    def test_03_payment_info_serialized_when_payment_exists(self):
        pay = Payment.objects.create(
            payment_code='PAY-LC-V12-001',
            booking=self.booking_a1,
            payment_method='VNPAY_QR',
            amount=Decimal('1400000.00'),
            currency='VND',
            status='COMPLETED',
            provider_transaction_id='VNPAY-TRANS-987654',
            paid_at=timezone.now()
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        self.assertIsNotNone(data.get('payment_info'))
        payment_data = data['payment_info']
        self.assertEqual(payment_data['payment_code'], 'PAY-LC-V12-001')
        self.assertEqual(payment_data['payment_method'], 'VNPAY_QR')
        self.assertEqual(Decimal(payment_data['amount']), Decimal('1400000.00'))
        self.assertEqual(payment_data['status'], 'COMPLETED')
        self.assertEqual(payment_data['provider_transaction_id'], 'VNPAY-TRANS-987654')

    # 4. Thông tin thanh toán: Khi chưa có giao dịch trả về None sạch sẽ
    def test_04_payment_info_is_none_when_no_payment(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data['data'].get('payment_info'))

    # 5. Phân quyền: Quản lý Làng A bị chặn khi truy cập booking Làng B (403 Forbidden)
    def test_05_manager_a_cannot_access_village_b_booking(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.booking_b1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('không có quyền', res.data.get('message', ''))

    # 6. Phân quyền: Tourist không được truy cập booking của tourist khác (403 Forbidden)
    def test_06_tourist_cannot_access_other_tourist_booking(self):
        self.client.force_authenticate(user=self.tourist_2)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 7. Phân quyền: Admin có quyền xem chi tiết bất kỳ booking nào
    def test_07_admin_can_access_any_booking(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/v1/bookings/{self.booking_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res_b = self.client.get(f'/api/v1/bookings/{self.booking_b1.booking_id}/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)

    # 8. Booking không tồn tại -> 404
    def test_08_booking_not_found(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/99999999/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # 9. Thao tác hủy booking tại V12: hoàn trả chỗ chính xác và lưu cancelled_at
    def test_09_v12_cancel_booking_workflow(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f'/api/v1/bookings/{self.booking_a1.booking_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        self.assertEqual(data['status'], 'CANCELLED')
        self.assertIsNotNone(data['cancelled_at'])

        # Check session seat restored
        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.booked_participants, 0)
        self.assertEqual(self.session_a.remaining_seats, 12)

    # 10. Chống hủy lặp lại: Gọi cancel lần 2 bị từ chối với 400
    def test_10_v12_cancel_booking_prevents_double_cancel(self):
        self.client.force_authenticate(user=self.mgr_a)
        # Cancel first time
        res1 = self.client.post(f'/api/v1/bookings/{self.booking_a1.booking_id}/cancel/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Cancel second time
        res2 = self.client.post(f'/api/v1/bookings/{self.booking_a1.booking_id}/cancel/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã được hủy trước đó', res2.data.get('message', ''))
