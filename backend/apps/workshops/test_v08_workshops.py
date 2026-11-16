import decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category
from apps.workshops.models import Workshop

User = get_user_model()


class V08WorkshopsAPITests(TestCase):
    """
    Test Suite for V08: Danh sách workshop do làng nghề tổ chức.
    Enforces ownership, active village status, search, filter, and permissions.
    """

    def setUp(self):
        self.client = APIClient()

        # Seed roles
        self.role_tourist, _ = Role.objects.get_or_create(role_code=Role.RoleCode.TOURIST, defaults={'role_name': 'Du khách'})
        self.role_village, _ = Role.objects.get_or_create(role_code=Role.RoleCode.CRAFT_VILLAGE, defaults={'role_name': 'Quản lý làng nghề'})

        # 1. Create users and managers
        self.manager_a_user = User.objects.create(
            email="manager_a@battrang.vn",
            full_name="Quản Lý Bát Tràng",
            status=User.UserStatus.ACTIVE,
        )
        self.manager_a_user.set_password("Password123!")
        self.manager_a_user.save()
        UserRole.objects.create(user=self.manager_a_user, role=self.role_village)

        self.manager_b_user = User.objects.create(
            email="manager_b@phuvinh.vn",
            full_name="Quản Lý Phú Vinh",
            status=User.UserStatus.ACTIVE,
        )
        self.manager_b_user.set_password("Password123!")
        self.manager_b_user.save()
        UserRole.objects.create(user=self.manager_b_user, role=self.role_village)

        self.tourist_user = User.objects.create(
            email="tourist@localcraft.vn",
            full_name="Du Khách Test",
            status=User.UserStatus.ACTIVE,
        )
        self.tourist_user.set_password("Password123!")
        self.tourist_user.save()
        UserRole.objects.create(user=self.tourist_user, role=self.role_tourist)

        # 2. Create two active villages linked to managers
        self.village_a = CraftVillage.objects.create(
            manager_user=self.manager_a_user,
            village_name="Làng Gốm Bát Tràng",
            slug="lang-gom-bat-trang",
            province="Hà Nội",
            status="ACTIVE",
        )
        self.village_b = CraftVillage.objects.create(
            manager_user=self.manager_b_user,
            village_name="Làng Mây Tre Đan Phú Vinh",
            slug="lang-may-tre-dan-phu-vinh",
            province="Hà Nội",
            status="ACTIVE",
        )

        # 3. Create artisans
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name="Nghệ nhân Bát Tràng",
            bio="Kinh nghiệm 25 năm làm gốm",
            verification_status="APPROVED",
        )
        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name="Nghệ nhân Phú Vinh",
            bio="Kinh nghiệm 20 năm mây tre đan",
            verification_status="APPROVED",
        )

        # 4. Create category
        self.category = Category.objects.create(
            category_name="Gốm sứ & Trải nghiệm",
            slug="gom-su-trai-nghiem",
            status="ACTIVE",
        )

        # 5. Create workshops for Village A
        self.workshop_a1 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            workshop_name="Khóa học làm gốm bàn xoay men cổ Bát Tràng",
            slug="khoa-hoc-lam-gom-ban-xoay-men-co",
            description="Học viên tự tay vuốt gốm và tráng men",
            duration_minutes=120,
            price_per_person=decimal.Decimal("350000.00"),
            min_participants=1,
            location_address="Xưởng gốm số 12 Bát Tràng, Gia Lâm, Hà Nội",
            status=Workshop.WorkshopStatus.APPROVED,
        )
        self.workshop_a2 = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            workshop_name="Nung gốm củi truyền thống - Bản nháp",
            slug="nung-gom-cui-truyen-thong-ban-nhap",
            description="Trải nghiệm kỹ thuật củi cổ",
            duration_minutes=180,
            price_per_person=decimal.Decimal("500000.00"),
            min_participants=2,
            location_address="Lò bầu Bát Tràng",
            status=Workshop.WorkshopStatus.DRAFT,
        )

        # 6. Create workshop for Village B
        self.workshop_b1 = Workshop.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            category=self.category,
            workshop_name="Đan làn mây hoa văn Phú Vinh",
            slug="dan-lan-may-hoa-van-phu-vinh",
            description="Kỹ thuật đan sợi mây thanh mảnh",
            duration_minutes=90,
            price_per_person=decimal.Decimal("250000.00"),
            min_participants=1,
            location_address="Làng nghề Phú Vinh, Chương Mỹ, Hà Nội",
            status=Workshop.WorkshopStatus.APPROVED,
        )

    def test_manager_a_only_sees_village_a_workshops(self):
        """Manager A should strictly see all workshops of Village A, and NONE of Village B."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get('/api/v1/workshops/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        data = res.data['data']
        ids = [w['workshop_id'] for w in data]

        # Village A workshops must be included
        self.assertIn(self.workshop_a1.workshop_id, ids)
        self.assertIn(self.workshop_a2.workshop_id, ids)

        # Village B workshop must NOT be included
        self.assertNotIn(self.workshop_b1.workshop_id, ids)

    def test_manager_a_cannot_bypass_village_scope_with_query_param(self):
        """Passing village_id of Village B must NOT leak Village B workshops to Manager A."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get(f'/api/v1/workshops/?village_id={self.village_b.village_id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        ids = [w['workshop_id'] for w in data]
        self.assertNotIn(self.workshop_b1.workshop_id, ids)
        self.assertIn(self.workshop_a1.workshop_id, ids)

    def test_search_workshop_by_name(self):
        """Searching workshop name filters accurately."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get('/api/v1/workshops/?search=bàn xoay')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['workshop_id'], self.workshop_a1.workshop_id)

    def test_filter_workshop_by_status(self):
        """Filtering by status=DRAFT only returns draft workshops."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get('/api/v1/workshops/?status=DRAFT')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data['data']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['workshop_id'], self.workshop_a2.workshop_id)
        self.assertEqual(data[0]['status'], 'DRAFT')

    def test_manager_a_cannot_update_or_delete_village_b_workshop(self):
        """Object-level permission check: Manager A gets 403 on Village B workshop."""
        self.client.force_authenticate(user=self.manager_a_user)

        # Try to update
        res_update = self.client.patch(
            f'/api/v1/workshops/{self.workshop_b1.workshop_id}/',
            {'workshop_name': 'Hacked Title'}
        )
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        # Try to delete
        res_delete = self.client.delete(f'/api/v1/workshops/{self.workshop_b1.workshop_id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_tourist_cannot_view_draft_workshop(self):
        """Public tourist cannot view DRAFT workshop."""
        self.client.force_authenticate(user=self.tourist_user)
        res = self.client.get(f'/api/v1/workshops/{self.workshop_a2.workshop_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_a_cannot_delete_workshop_with_booking_history(self):
        """P0 Safety: Workshop with existing tourist bookings MUST NOT be hard-deleted."""
        from django.utils import timezone
        from datetime import timedelta
        from apps.workshops.models import WorkshopSession
        from apps.bookings.models import WorkshopBooking

        now = timezone.now()
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=now + timedelta(days=2),
            end_at=now + timedelta(days=2, hours=2),
            capacity=15,
            booked_participants=2,
            price_per_person=self.workshop_a1.price_per_person,
            status=WorkshopSession.SessionStatus.OPEN,
        )

        booking = WorkshopBooking.objects.create(
            booking_code="LC-TEST-SAFE-01",
            user=self.tourist_user,
            session=session,
            participant_count=2,
            unit_price=self.workshop_a1.price_per_person,
            total_amount=self.workshop_a1.price_per_person * 2,
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.delete(f'/api/v1/workshops/{self.workshop_a1.workshop_id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data['success'])
        self.assertIn('lịch sử đặt chỗ', res.data['message'])

        # Verify workshop and booking are preserved in database
        self.assertTrue(Workshop.objects.filter(pk=self.workshop_a1.workshop_id).exists())
        self.assertTrue(WorkshopBooking.objects.filter(pk=booking.booking_id).exists())

    def test_manager_a_can_delete_workshop_without_booking_history(self):
        """Workshop without any booking history can be deleted safely."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.delete(f'/api/v1/workshops/{self.workshop_a2.workshop_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertFalse(Workshop.objects.filter(pk=self.workshop_a2.workshop_id).exists())

    def test_user_without_village_returns_empty_list(self):
        """A user with village role but no managed village assigned cannot view data."""
        user_no_village = User.objects.create(
            email="manager_novillage@test.vn",
            full_name="Quản Lý Chưa Gán Làng",
            status=User.UserStatus.ACTIVE,
        )
        UserRole.objects.create(user=user_no_village, role=self.role_village)

        self.client.force_authenticate(user=user_no_village)
        res = self.client.get('/api/v1/workshops/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data'], [])

    def test_workshop_next_session_date_only_future_open_sessions(self):
        """next_session_date must only pick future OPEN sessions, not past or cancelled."""
        from django.utils import timezone
        from datetime import timedelta
        from apps.workshops.models import WorkshopSession

        now = timezone.now()
        # 1. Past session
        WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=now - timedelta(days=2),
            end_at=now - timedelta(days=2, hours=-2),
            capacity=10,
            booked_participants=5,
            price_per_person=self.workshop_a1.price_per_person,
            status=WorkshopSession.SessionStatus.COMPLETED,
        )
        # 2. Future cancelled session
        WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=now + timedelta(days=1),
            end_at=now + timedelta(days=1, hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=self.workshop_a1.price_per_person,
            status=WorkshopSession.SessionStatus.CANCELLED,
        )
        # 3. Future OPEN session
        future_session = WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=now + timedelta(days=3),
            end_at=now + timedelta(days=3, hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=self.workshop_a1.price_per_person,
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get(f'/api/v1/workshops/{self.workshop_a1.workshop_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        expected_date_str = future_session.start_at.strftime('%H:%M - %d/%m/%Y')
        self.assertEqual(res.data['data']['next_session_date'], expected_date_str)

    def test_workshop_with_only_past_sessions_returns_none_for_next_session(self):
        """Workshop with only past sessions should return None for next_session_date."""
        from django.utils import timezone
        from datetime import timedelta
        from apps.workshops.models import WorkshopSession

        now = timezone.now()
        WorkshopSession.objects.create(
            workshop=self.workshop_a1,
            start_at=now - timedelta(days=5),
            end_at=now - timedelta(days=5, hours=-2),
            capacity=10,
            booked_participants=5,
            price_per_person=self.workshop_a1.price_per_person,
            status=WorkshopSession.SessionStatus.COMPLETED,
        )

        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get(f'/api/v1/workshops/{self.workshop_a1.workshop_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data['data']['next_session_date'])

    def test_filter_by_artisan_id(self):
        """Filtering by artisan_id returns only workshops assigned to that artisan."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get(f'/api/v1/workshops/?artisan_id={self.artisan_a.artisan_id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for w in res.data['data']:
            self.assertEqual(w['artisan'], self.artisan_a.artisan_id)

    def test_combined_search_and_status_filter(self):
        """Combined search keyword and status filter returns exact intersection."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get('/api/v1/workshops/?search=Bát Tràng&status=APPROVED')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 1)
        self.assertEqual(res.data['data'][0]['workshop_id'], self.workshop_a1.workshop_id)

    def test_filter_with_no_matches_returns_empty_list(self):
        """Filter criteria with no matches returns empty list without error."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.get('/api/v1/workshops/?search=TừKhóaKhôngTồnTại123456')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data'], [])
