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


class V11WorkshopBookingsAPITests(TestCase):
    """
    Test suite for V11: Quản lý lượt đặt Workshop.
    Verifies role scoping, village manager isolation, search, filtering, and security.
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
            slug='bat-trang-v11',
            status='ACTIVE'
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-v11',
            status='ACTIVE'
        )

        # Users
        self.mgr_a = User.objects.create(
            email='mgr_a_v11@example.com',
            full_name='Manager Village A',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email='mgr_b_v11@example.com',
            full_name='Manager Village B',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.mgr_unassigned = User.objects.create(
            email='mgr_unassigned@example.com',
            full_name='Manager Without Village',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_unassigned, role=self.role_cv)

        self.admin = User.objects.create(
            email='admin_v11@example.com',
            full_name='Admin User',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.admin, role=self.role_admin)

        self.tourist_1 = User.objects.create(
            email='tourist_1@example.com',
            full_name='Nguyễn Văn An',
            phone='0901234567',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist_1, role=self.role_tourist)

        self.tourist_2 = User.objects.create(
            email='tourist_2@example.com',
            full_name='Trần Thị Bình',
            phone='0912345678',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist_2, role=self.role_tourist)

        # Artisans
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ Nhân A',
            experience_years=25,
            verification_status='VERIFIED'
        )
        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name='Nghệ Nhân B',
            experience_years=15,
            verification_status='VERIFIED'
        )

        # Workshops
        self.ws_a1 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name='Trải nghiệm Làm Gốm Men Lam',
            slug='trai-nghiem-lam-gom-men-lam',
            duration_minutes=120,
            price_per_person=Decimal('250000.00'),
            status=Workshop.WorkshopStatus.APPROVED
        )
        self.ws_a2 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name='Khắc Hoa Văn Gốm',
            slug='khac-hoa-van-gom',
            duration_minutes=90,
            price_per_person=Decimal('300000.00'),
            status=Workshop.WorkshopStatus.APPROVED
        )
        self.ws_b1 = Workshop.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            workshop_name='Dệt Lụa Truyền Thống',
            slug='det-lua-truyen-thong',
            duration_minutes=150,
            price_per_person=Decimal('200000.00'),
            status=Workshop.WorkshopStatus.APPROVED
        )

        # Sessions
        now = timezone.now()
        self.sess_a1 = WorkshopSession.objects.create(
            workshop=self.ws_a1,
            start_at=now + timedelta(days=2, hours=9),
            end_at=now + timedelta(days=2, hours=11),
            capacity=10,
            booked_participants=5,
            price_per_person=Decimal('250000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )
        self.sess_b1 = WorkshopSession.objects.create(
            workshop=self.ws_b1,
            start_at=now + timedelta(days=3, hours=9),
            end_at=now + timedelta(days=3, hours=11),
            capacity=8,
            booked_participants=2,
            price_per_person=Decimal('200000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        # Bookings for Village A
        self.bk_a1 = WorkshopBooking.objects.create(
            booking_code='LC-BTA001',
            user=self.tourist_1,
            session=self.sess_a1,
            participant_count=3,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('750000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED,
            special_request='Cần chỗ ngồi gần cửa'
        )
        self.bk_a2 = WorkshopBooking.objects.create(
            booking_code='LC-BTA002',
            user=self.tourist_2,
            session=self.sess_a1,
            participant_count=2,
            unit_price=Decimal('250000.00'),
            total_amount=Decimal('500000.00'),
            status=WorkshopBooking.BookingStatus.PENDING
        )

        # Booking for Village B
        self.bk_b1 = WorkshopBooking.objects.create(
            booking_code='LC-VNB001',
            user=self.tourist_1,
            session=self.sess_b1,
            participant_count=2,
            unit_price=Decimal('200000.00'),
            total_amount=Decimal('400000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

    # 1. Quản lý làng nghề xem danh sách booking: Chỉ thấy booking của làng mình
    def test_01_manager_sees_only_own_village_bookings(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [item['booking_code'] for item in res.data['data']]
        self.assertIn('LC-BTA001', codes)
        self.assertIn('LC-BTA002', codes)
        self.assertNotIn('LC-VNB001', codes)

    # 2. Quản lý A thử lấy booking chi tiết của làng B -> Bị từ chối (403)
    def test_02_manager_a_cannot_view_booking_of_village_b(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.bk_b1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 3. Quản lý làng nghề xem booking của làng mình thành công (200)
    def test_03_manager_a_views_own_village_booking_detail(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.bk_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['data']
        self.assertEqual(data['booking_code'], 'LC-BTA001')
        self.assertEqual(data['customer_name'], 'Nguyễn Văn An')
        self.assertEqual(data['customer_phone'], '0901234567')
        self.assertEqual(data['participant_count'], 3)
        self.assertEqual(data['workshop_name'], 'Trải nghiệm Làm Gốm Men Lam')

    # 4. Quản lý chưa được gắn làng nghề bị từ chối (403)
    def test_04_unassigned_manager_rejected(self):
        self.client.force_authenticate(user=self.mgr_unassigned)
        res = self.client.get('/api/v1/bookings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 5. Tourist chỉ thấy booking của chính mình
    def test_05_tourist_sees_only_own_bookings(self):
        self.client.force_authenticate(user=self.tourist_2)
        res = self.client.get('/api/v1/bookings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [item['booking_code'] for item in res.data['data']]
        self.assertIn('LC-BTA002', codes)
        self.assertNotIn('LC-BTA001', codes)
        self.assertNotIn('LC-VNB001', codes)

    # 6. Tourist không thể xem booking chi tiết của người khác
    def test_06_tourist_cannot_view_other_tourist_booking(self):
        self.client.force_authenticate(user=self.tourist_2)
        res = self.client.get(f'/api/v1/bookings/{self.bk_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 7. Admin truy cập: xem được toàn bộ hoặc lọc theo village_id
    def test_07_admin_access_all_and_filter_by_village(self):
        self.client.force_authenticate(user=self.admin)
        res_all = self.client.get('/api/v1/bookings/')
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_all.data['data']), 3)

        res_filtered = self.client.get(f'/api/v1/bookings/?village_id={self.village_b.village_id}')
        self.assertEqual(res_filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_filtered.data['data']), 1)
        self.assertEqual(res_filtered.data['data'][0]['booking_code'], 'LC-VNB001')

    # 8. Tìm kiếm theo mã booking
    def test_08_search_by_booking_code(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/?search=BTA001')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 1)
        self.assertEqual(res.data['data'][0]['booking_code'], 'LC-BTA001')

    # 9. Tìm kiếm theo tên khách hàng
    def test_09_search_by_customer_name(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/?search=Trần Thị Bình')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 1)
        self.assertEqual(res.data['data'][0]['booking_code'], 'LC-BTA002')

    # 10. Tìm kiếm theo tên workshop
    def test_10_search_by_workshop_name(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/?search=Men Lam')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 2)

    # 11. Lọc theo trạng thái CONFIRMED
    def test_11_filter_by_status(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/?status=CONFIRMED')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 1)
        self.assertEqual(res.data['data'][0]['booking_code'], 'LC-BTA001')

    # 12. Lọc theo workshop_id
    def test_12_filter_by_workshop_id(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/?workshop_id={self.ws_a1.workshop_id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 2)

        # Workshop A2 has no bookings
        res2 = self.client.get(f'/api/v1/bookings/?workshop_id={self.ws_a2.workshop_id}')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data['data']), 0)

    # 13. Booking không tồn tại -> 404
    def test_13_booking_not_found(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get('/api/v1/bookings/999999/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # 14. Hủy booking giải phóng chỗ ngồi an toàn
    def test_14_cancel_booking_releases_capacity(self):
        initial_booked = self.sess_a1.booked_participants
        self.client.force_authenticate(user=self.tourist_1)
        res = self.client.post(f'/api/v1/bookings/{self.bk_a1.booking_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['status'], 'CANCELLED')

        self.sess_a1.refresh_from_db()
        self.assertEqual(self.sess_a1.booked_participants, initial_booked - self.bk_a1.participant_count)

    # 15. Dữ liệu trả về không chứa thông tin nhạy cảm
    def test_15_security_no_sensitive_fields(self):
        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.get(f'/api/v1/bookings/{self.bk_a1.booking_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['data']
        self.assertNotIn('password', data)
        self.assertNotIn('password_hash', data)
        self.assertNotIn('token', data)

    # 16. Chống hủy lặp lại (double-cancel): không trừ chỗ lần 2 và báo lỗi rõ ràng
    def test_16_prevent_double_cancellation(self):
        self.client.force_authenticate(user=self.tourist_1)
        res1 = self.client.post(f'/api/v1/bookings/{self.bk_a1.booking_id}/cancel/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.sess_a1.refresh_from_db()
        seats_after_first_cancel = self.sess_a1.booked_participants

        # Second cancel attempt must fail with 400
        res2 = self.client.post(f'/api/v1/bookings/{self.bk_a1.booking_id}/cancel/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã được hủy trước đó', res2.data.get('message', ''))

        # Ensure seats were not decremented a second time
        self.sess_a1.refresh_from_db()
        self.assertEqual(self.sess_a1.booked_participants, seats_after_first_cancel)

    # 17. Trạng thái không được phép hủy (COMPLETED, NO_SHOW, EXPIRED) -> 400
    def test_17_cannot_cancel_completed_or_invalid_status(self):
        self.bk_a2.status = WorkshopBooking.BookingStatus.COMPLETED
        self.bk_a2.save()

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f'/api/v1/bookings/{self.bk_a2.booking_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('COMPLETED', res.data.get('message', ''))

    # 18. Xử lý không nhất quán số lượng người: phát hiện lỗi và trả về 409 Conflict, không ép âm về 0
    def test_18_data_inconsistency_rejected_with_conflict_not_masked(self):
        # Artificially set booked_participants to 1 while booking has participant_count = 2
        self.sess_a1.booked_participants = 1
        self.sess_a1.save()

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f'/api/v1/bookings/{self.bk_a2.booking_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('không nhất quán', res.data.get('message', ''))

        # Verify session booked_participants was not corrupted/set to 0
        self.sess_a1.refresh_from_db()
        self.assertEqual(self.sess_a1.booked_participants, 1)

    # 19. Khi Session đang FULL, hủy booking giúp chuyển trạng thái về OPEN
    def test_19_cancel_booking_reopens_full_session(self):
        self.sess_a1.capacity = 5
        self.sess_a1.booked_participants = 5
        self.sess_a1.status = WorkshopSession.SessionStatus.FULL
        self.sess_a1.save()

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f'/api/v1/bookings/{self.bk_a2.booking_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.sess_a1.refresh_from_db()
        self.assertEqual(self.sess_a1.booked_participants, 3)
        self.assertEqual(self.sess_a1.status, WorkshopSession.SessionStatus.OPEN)

    # 20. Giảm thiểu PII: danh sách (V11) không lộ phone/email/special_request, chi tiết (V12) có đầy đủ
    def test_20_pii_minimization_on_list_vs_detail(self):
        self.client.force_authenticate(user=self.mgr_a)

        # List API
        res_list = self.client.get('/api/v1/bookings/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        first_item = res_list.data['data'][0]
        self.assertNotIn('customer_phone', first_item)
        self.assertNotIn('customer_email', first_item)
        self.assertNotIn('special_request', first_item)
        self.assertIn('customer_name', first_item)
        self.assertIn('booking_code', first_item)

        # Detail API (V12)
        res_detail = self.client.get(f'/api/v1/bookings/{self.bk_a1.booking_id}/')
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        detail_data = res_detail.data['data']
        self.assertEqual(detail_data['customer_phone'], '0901234567')
        self.assertEqual(detail_data['customer_email'], 'tourist_1@example.com')
        self.assertEqual(detail_data['special_request'], 'Cần chỗ ngồi gần cửa')

