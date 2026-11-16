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


class WorkshopSessionV10Tests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Roles
        self.role_cv, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Craft Village'})
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Admin'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Tourist'})

        # Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang-test',
            status='ACTIVE'
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-test',
            status='ACTIVE'
        )

        # Users
        self.mgr_a = User.objects.create(
            email='mgr_a@example.com',
            full_name='Manager Village A',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_a, role=self.role_cv)
        self.village_a.manager_user = self.mgr_a
        self.village_a.save()

        self.mgr_b = User.objects.create(
            email='mgr_b@example.com',
            full_name='Manager Village B',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.mgr_b, role=self.role_cv)
        self.village_b.manager_user = self.mgr_b
        self.village_b.save()

        self.tourist = User.objects.create(
            email='tourist@example.com',
            full_name='Tourist User',
            status='ACTIVE'
        )
        UserRole.objects.create(user=self.tourist, role=self.role_tourist)

        # Artisans
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Nguyễn Văn A',
            verification_status='APPROVED'
        )

        # Workshops
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            workshop_name='Làm Gốm Nghệ Thuật',
            slug='lam-gom-nghe-thuat',
            duration_minutes=120,
            price_per_person=Decimal('150000.00'),
            min_participants=2,
            location_address='Xóm 1 Bát Tràng',
            status='APPROVED'
        )

        self.workshop_b = Workshop.objects.create(
            village=self.village_b,
            workshop_name='Dệt Lụa Truyền Thống',
            slug='det-lua-truyen-thong',
            duration_minutes=90,
            price_per_person=Decimal('200000.00'),
            min_participants=1,
            location_address='Vạn Phúc',
            status='APPROVED'
        )

        self.base_time = timezone.now() + timedelta(days=2)

    def test_01_create_session_success(self):
        """Manager A can create a session for Workshop A"""
        self.client.force_authenticate(user=self.mgr_a)
        start_at = self.base_time
        end_at = start_at + timedelta(hours=2)

        payload = {
            'start_at': start_at.isoformat(),
            'end_at': end_at.isoformat(),
            'capacity': 15,
            'price_per_person': '150000.00',
        }
        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['data']['capacity'], 15)
        self.assertEqual(res.data['data']['booked_participants'], 0)
        self.assertEqual(res.data['data']['remaining_seats'], 15)

    def test_02_create_session_wrong_manager_forbidden(self):
        """Manager B cannot create a session for Workshop A of Village A"""
        self.client.force_authenticate(user=self.mgr_b)
        start_at = self.base_time
        end_at = start_at + timedelta(hours=2)

        payload = {
            'start_at': start_at.isoformat(),
            'end_at': end_at.isoformat(),
            'capacity': 15,
        }
        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', payload)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_invalid_time_and_capacity_rejected(self):
        """End time before start time, or non-positive capacity is rejected"""
        self.client.force_authenticate(user=self.mgr_a)
        start_at = self.base_time
        end_at = start_at - timedelta(hours=1)

        # Test end_at <= start_at
        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', {
            'start_at': start_at.isoformat(),
            'end_at': end_at.isoformat(),
            'capacity': 10,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Test capacity <= 0
        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', {
            'start_at': start_at.isoformat(),
            'end_at': (start_at + timedelta(hours=2)).isoformat(),
            'capacity': 0,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_artisan_schedule_conflict_detection(self):
        """Cannot create overlapping session for the same artisan"""
        start_at = self.base_time
        end_at = start_at + timedelta(hours=2)

        # Create session 1
        WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=start_at,
            end_at=end_at,
            capacity=10,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        self.client.force_authenticate(user=self.mgr_a)

        # Attempt overlapping session (start inside existing session)
        overlap_start = start_at + timedelta(hours=1)
        overlap_end = overlap_start + timedelta(hours=2)
        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', {
            'start_at': overlap_start.isoformat(),
            'end_at': overlap_end.isoformat(),
            'capacity': 10,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã có lịch', str(res.data))

        # Attempt non-overlapping session (after existing session ends)
        valid_start = end_at + timedelta(minutes=30)
        valid_end = valid_start + timedelta(hours=2)
        res_valid = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', {
            'start_at': valid_start.isoformat(),
            'end_at': valid_end.isoformat(),
            'capacity': 10,
        })
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)

    def test_05_cannot_reduce_capacity_below_booked(self):
        """Manager cannot decrease capacity below already booked participants"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=6,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        self.client.force_authenticate(user=self.mgr_a)
        # Try reducing capacity to 5 (< 6)
        res = self.client.patch(f'/api/v1/workshops/sessions/{session.session_id}/', {
            'capacity': 5
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể giảm sức chứa', str(res.data))

        # Valid reduction to 7 (>= 6)
        res_valid = self.client.patch(f'/api/v1/workshops/sessions/{session.session_id}/', {
            'capacity': 7
        })
        self.assertEqual(res_valid.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.capacity, 7)

    def test_06_cannot_delete_session_with_bookings(self):
        """Session with booking history cannot be deleted, must be cancelled"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=2,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )
        WorkshopBooking.objects.create(
            booking_code='LC-TEST01',
            user=self.tourist,
            session=session,
            participant_count=2,
            unit_price=Decimal('150000.00'),
            total_amount=Decimal('300000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.delete(f'/api/v1/workshops/sessions/{session.session_id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa', str(res.data))

        # Session without bookings CAN be deleted
        empty_session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time + timedelta(days=5),
            end_at=self.base_time + timedelta(days=5, hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )
        res_del = self.client.delete(f'/api/v1/workshops/sessions/{empty_session.session_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(WorkshopSession.objects.filter(pk=empty_session.session_id).exists())

    def test_07_explicit_session_cancellation(self):
        """Manager can explicitly cancel session, preserving all booking records"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=3,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )
        booking = WorkshopBooking.objects.create(
            booking_code='LC-TEST02',
            user=self.tourist,
            session=session,
            participant_count=3,
            unit_price=Decimal('150000.00'),
            total_amount=Decimal('450000.00'),
            status=WorkshopBooking.BookingStatus.CONFIRMED
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.post(f'/api/v1/workshops/sessions/{session.session_id}/cancel/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.status, WorkshopSession.SessionStatus.CANCELLED)

        # Booking record still exists safely and transitioned to CANCELLED per F05.10
        booking.refresh_from_db()
        self.assertEqual(booking.session_id, session.session_id)
        self.assertEqual(booking.status, WorkshopBooking.BookingStatus.CANCELLED)
        self.assertIsNotNone(booking.cancelled_at)
        self.assertEqual(session.booked_participants, 0)

    def test_08_booking_capacity_and_overbooking_prevention(self):
        """Booking cannot exceed available capacity, and cancels restore spots"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=5,
            booked_participants=0,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        self.client.force_authenticate(user=self.tourist)

        # Book 4 participants -> remaining 1 spot
        res1 = self.client.post('/api/v1/bookings/', {
            'session_id': session.session_id,
            'participant_count': 4
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        session.refresh_from_db()
        self.assertEqual(session.booked_participants, 4)
        self.assertEqual(session.remaining_seats, 1)

        # Attempt to book 2 participants -> rejected because only 1 left
        res2 = self.client.post('/api/v1/bookings/', {
            'session_id': session.session_id,
            'participant_count': 2
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không đủ chỗ trống', str(res2.data))

        # Book exactly 1 participant -> reaches full capacity
        res3 = self.client.post('/api/v1/bookings/', {
            'session_id': session.session_id,
            'participant_count': 1
        })
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)
        session.refresh_from_db()
        self.assertEqual(session.booked_participants, 5)
        self.assertEqual(session.status, WorkshopSession.SessionStatus.FULL)

        # Try to book when FULL -> rejected
        res4 = self.client.post('/api/v1/bookings/', {
            'session_id': session.session_id,
            'participant_count': 1
        })
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)

        # Cancel the 1-person booking -> restores session to OPEN with 1 spot
        booking_3_id = res3.data['data']['booking_id']
        res_cancel = self.client.post(f'/api/v1/bookings/{booking_3_id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.booked_participants, 4)
        self.assertEqual(session.status, WorkshopSession.SessionStatus.OPEN)
        self.assertEqual(session.remaining_seats, 1)

    def test_09_create_session_in_past_rejected(self):
        """Creating a new session with start_at in the past is rejected"""
        self.client.force_authenticate(user=self.mgr_a)
        past_start = timezone.now() - timedelta(hours=2)
        past_end = timezone.now() + timedelta(hours=1)

        res = self.client.post(f'/api/v1/workshops/{self.workshop_a.workshop_id}/sessions/', {
            'start_at': past_start.isoformat(),
            'end_at': past_end.isoformat(),
            'capacity': 10,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quá khứ', str(res.data))

    def test_10_cannot_edit_cancelled_or_completed_session(self):
        """Cannot edit a session that is already cancelled or completed"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.CANCELLED
        )

        self.client.force_authenticate(user=self.mgr_a)
        res = self.client.patch(f'/api/v1/workshops/sessions/{session.session_id}/', {
            'capacity': 20
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể chỉnh sửa', str(res.data))

    def test_11_manager_b_cannot_edit_or_cancel_session_a(self):
        """Manager B cannot patch, delete or cancel session of Workshop A"""
        session = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=self.base_time,
            end_at=self.base_time + timedelta(hours=2),
            capacity=10,
            booked_participants=0,
            price_per_person=Decimal('150000.00'),
            status=WorkshopSession.SessionStatus.OPEN
        )

        self.client.force_authenticate(user=self.mgr_b)

        # PATCH forbidden
        res_patch = self.client.patch(f'/api/v1/workshops/sessions/{session.session_id}/', {'capacity': 12})
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        # CANCEL forbidden
        res_cancel = self.client.post(f'/api/v1/workshops/sessions/{session.session_id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_403_FORBIDDEN)

        # DELETE forbidden
        res_del = self.client.delete(f'/api/v1/workshops/sessions/{session.session_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

