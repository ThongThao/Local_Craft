from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product
from apps.stories.models import CraftStory
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking
from apps.orders.models import Order, VendorOrder
from apps.payments.models import Payment
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService, VillageNotificationService


class NotificationAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Village Manager User
        self.manager_user = User.objects.create(
            email='manager@battrang.vn',
            full_name='Ngô Văn Bảo',
            status=User.UserStatus.ACTIVE
        )
        self.manager_user.set_password('Password@123')
        self.manager_user.save()
        manager_role, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Quản lý làng nghề'})
        UserRole.objects.create(user=self.manager_user, role=manager_role)

        # Create Tourist User
        self.tourist_user = User.objects.create(
            email='tourist@localcraft.vn',
            full_name='Nguyễn Du Khách',
            status=User.UserStatus.ACTIVE
        )
        self.tourist_user.set_password('Password@123')
        self.tourist_user.save()
        tourist_role, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Khách du lịch'})
        UserRole.objects.create(user=self.tourist_user, role=tourist_role)

        # Create Another User (for permission isolation tests)
        self.other_user = User.objects.create(
            email='other@localcraft.vn',
            full_name='Khách Khác',
            status=User.UserStatus.ACTIVE
        )
        self.other_user.set_password('Password@123')
        self.other_user.save()

        # Create Village managed by manager_user
        self.village = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.manager_user,
        )

        # Seed sample notifications for manager_user
        self.notif_unread_1 = Notification.objects.create(
            user=self.manager_user,
            notification_type='NEW_VENDOR_ORDER',
            title='Đơn hàng mới',
            message='Đơn hàng #VO-101 cần xử lý.',
            target_type='VENDOR_ORDER',
            target_id=101,
            is_read=False,
        )
        self.notif_unread_2 = Notification.objects.create(
            user=self.manager_user,
            notification_type='NEW_WORKSHOP_BOOKING',
            title='Đặt chỗ mới',
            message='Du khách vừa đặt 2 vé.',
            target_type='BOOKING',
            target_id=202,
            is_read=False,
        )
        self.notif_read = Notification.objects.create(
            user=self.manager_user,
            notification_type='SYSTEM',
            title='Chào mừng',
            message='Chào mừng bạn đến với hệ thống.',
            target_type='SYSTEM',
            target_id=None,
            is_read=True,
        )

    def test_list_notifications(self):
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.get('/api/v1/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['data']
        self.assertEqual(data['total_count'], 3)
        self.assertEqual(data['unread_count'], 2)
        self.assertEqual(len(data['notifications']), 3)

    def test_list_notifications_filter_is_read(self):
        self.client.force_authenticate(user=self.manager_user)
        # Filter unread
        res_unread = self.client.get('/api/v1/notifications/?is_read=false')
        self.assertEqual(res_unread.status_code, status.HTTP_200_OK)
        self.assertEqual(res_unread.data['data']['total_count'], 2)
        self.assertEqual(len(res_unread.data['data']['notifications']), 2)

        # Filter read
        res_read = self.client.get('/api/v1/notifications/?is_read=true')
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertEqual(res_read.data['data']['total_count'], 1)
        self.assertEqual(len(res_read.data['data']['notifications']), 1)

    def test_unread_count_endpoint(self):
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.get('/api/v1/notifications/unread-count/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['unread_count'], 2)

    def test_mark_single_notification_read(self):
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.post(f'/api/v1/notifications/{self.notif_unread_1.pk}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif_unread_1.refresh_from_db()
        self.assertTrue(self.notif_unread_1.is_read)
        self.assertIsNotNone(self.notif_unread_1.read_at)

    def test_mark_read_isolation_cannot_mark_other_user_notification(self):
        self.client.force_authenticate(user=self.other_user)
        res = self.client.post(f'/api/v1/notifications/{self.notif_unread_1.pk}/read/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.post('/api/v1/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['updated_count'], 2)
        unread_remaining = Notification.objects.filter(user=self.manager_user, is_read=False).count()
        self.assertEqual(unread_remaining, 0)

    def test_delete_notification(self):
        self.client.force_authenticate(user=self.manager_user)
        res = self.client.delete(f'/api/v1/notifications/{self.notif_unread_1.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(pk=self.notif_unread_1.pk).exists())

    def test_village_notification_service_deduplication(self):
        notif1 = VillageNotificationService.send_to_village_manager(
            village=self.village,
            notification_type='INVENTORY_LOW_STOCK',
            title='Cảnh báo kho',
            message='Kho sắp hết',
            target_type='INVENTORY',
            target_id=999,
            dedup_minutes=10,
        )
        self.assertIsNotNone(notif1)

        notif2 = VillageNotificationService.send_to_village_manager(
            village=self.village,
            notification_type='INVENTORY_LOW_STOCK',
            title='Cảnh báo kho cập nhật',
            message='Kho chỉ còn 1 chiếc',
            target_type='INVENTORY',
            target_id=999,
            dedup_minutes=10,
        )
        self.assertEqual(notif1.pk, notif2.pk)
        notif1.refresh_from_db()
        self.assertEqual(notif1.message, 'Kho chỉ còn 1 chiếc')

    def test_village_notification_helpers(self):
        # 1. Artisan status notification
        artisan = ArtisanProfile.objects.create(
            village=self.village,
            display_name='Nghệ nhân Thử nghiệm',
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )
        notif_art = VillageNotificationService.notify_artisan_status(self.village, artisan, is_approved=True)
        self.assertIsNotNone(notif_art)
        self.assertEqual(notif_art.notification_type, 'ARTISAN_VERIFIED')

        # 2. Product status notification
        cat = Category.objects.create(category_name='Gốm mỹ nghệ', slug='gom-my-nghe')
        prod = Product.objects.create(
            village=self.village,
            category=cat,
            product_name='Bình gốm cổ',
            base_price=500000,
        )
        notif_prod = VillageNotificationService.notify_product_status(self.village, prod, is_approved=True)
        self.assertIsNotNone(notif_prod)
        self.assertEqual(notif_prod.notification_type, 'PRODUCT_APPROVED')

        # 3. Workshop status notification (F11.05)
        ws = Workshop.objects.create(
            village=self.village,
            workshop_name='Lớp vuốt gốm Bát Tràng',
            slug='lop-vuot-gom-bat-trang',
            description='Trải nghiệm thực tế',
            duration_minutes=120,
            price_per_person=350000,
            location_address='Xưởng 1, Bát Tràng',
            status=Workshop.WorkshopStatus.APPROVED,
        )
        notif_ws = VillageNotificationService.notify_workshop_status(self.village, ws, is_approved=True)
        self.assertIsNotNone(notif_ws)
        self.assertEqual(notif_ws.notification_type, 'WORKSHOP_APPROVED')

        # 4. Low stock notification
        notif_stock = VillageNotificationService.notify_low_stock(self.village, 'Bình gốm cổ', 'Men rạn', 3)
        self.assertIsNotNone(notif_stock)
        self.assertEqual(notif_stock.notification_type, 'INVENTORY_LOW_STOCK')

    def test_tourist_notifications_lifecycle(self):
        # 1. Booking confirmed
        ws = Workshop.objects.create(
            village=self.village,
            workshop_name='Khóa học làm men rạn',
            slug='khoa-hoc-lam-men-ran',
            description='Học làm men rạn cổ truyền',
            duration_minutes=90,
            price_per_person=400000,
            location_address='Số 10 đường Gốm',
            status=Workshop.WorkshopStatus.APPROVED,
        )
        session = WorkshopSession.objects.create(
            workshop=ws,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=2),
            capacity=15,
            booked_participants=2,
            price_per_person=400000,
            status=WorkshopSession.SessionStatus.OPEN,
        )
        booking = WorkshopBooking.objects.create(
            booking_code='BK-TEST-001',
            user=self.tourist_user,
            session=session,
            participant_count=2,
            unit_price=400000,
            total_amount=800000,
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        notif_b_confirmed = NotificationService.notify_tourist_booking_confirmed(booking)
        self.assertIsNotNone(notif_b_confirmed)
        self.assertEqual(notif_b_confirmed.user, self.tourist_user)
        self.assertEqual(notif_b_confirmed.notification_type, 'BOOKING_CONFIRMED')

        # 2. Booking cancelled
        notif_b_cancelled = NotificationService.notify_tourist_booking_cancelled(booking, reason="Bận việc đột xuất")
        self.assertIsNotNone(notif_b_cancelled)
        self.assertEqual(notif_b_cancelled.notification_type, 'BOOKING_CANCELLED')

        # 3. Order notifications
        parent_order = Order.objects.create(
            order_code='ORD-TEST-001',
            user=self.tourist_user,
            recipient_name='Nguyễn Du Khách',
            recipient_phone='0912345678',
            shipping_address='Hà Nội',
            subtotal=500000,
            shipping_fee=30000,
            discount_amount=0,
            total_amount=530000,
        )
        vendor_order = VendorOrder.objects.create(
            vendor_order_code='VO-TEST-001',
            order=parent_order,
            village=self.village,
            subtotal=500000,
            shipping_fee=30000,
            discount_amount=0,
            total_amount=530000,
            status=VendorOrder.VendorOrderStatus.CONFIRMED,
            recipient_name='Nguyễn Du Khách',
            recipient_phone='0912345678',
            shipping_address='Hà Nội',
        )

        notif_o_conf = NotificationService.notify_tourist_order_confirmed(vendor_order)
        self.assertIsNotNone(notif_o_conf)
        self.assertEqual(notif_o_conf.notification_type, 'ORDER_CONFIRMED')

        notif_o_ship = NotificationService.notify_tourist_order_shipped(vendor_order, tracking_code='VNPOST12345')
        self.assertIsNotNone(notif_o_ship)
        self.assertEqual(notif_o_ship.notification_type, 'ORDER_SHIPPED')
        self.assertIn('VNPOST12345', notif_o_ship.message)

        notif_o_deliv = NotificationService.notify_tourist_order_delivered(vendor_order)
        self.assertIsNotNone(notif_o_deliv)
        self.assertEqual(notif_o_deliv.notification_type, 'ORDER_DELIVERED')

        # 4. Payment success notification
        payment = Payment.objects.create(
            payment_code='PAY-TEST-001',
            order=parent_order,
            payment_method='VNPAY',
            amount=530000,
            status=Payment.PaymentRecordStatus.SUCCESS,
        )
        notif_pay = NotificationService.notify_tourist_payment_success(payment)
        self.assertIsNotNone(notif_pay)
        self.assertEqual(notif_pay.notification_type, 'PAYMENT_SUCCESS')

    def test_workshop_reminder_scheduler_command(self):
        # Create workshop session starting in 24 hours
        ws = Workshop.objects.create(
            village=self.village,
            workshop_name='Khóa làm chén trà men lam',
            slug='khoa-lam-chen-tra-men-lam',
            description='Học vẽ men lam',
            duration_minutes=120,
            price_per_person=300000,
            location_address='Nhà số 5 ngõ Gốm Bát Tràng',
            status=Workshop.WorkshopStatus.APPROVED,
        )
        session_24h = WorkshopSession.objects.create(
            workshop=ws,
            start_at=timezone.now() + timedelta(hours=24),
            end_at=timezone.now() + timedelta(hours=26),
            capacity=10,
            booked_participants=1,
            price_per_person=300000,
            status=WorkshopSession.SessionStatus.OPEN,
        )
        booking = WorkshopBooking.objects.create(
            booking_code='BK-REMIND-001',
            user=self.tourist_user,
            session=session_24h,
            participant_count=1,
            unit_price=300000,
            total_amount=300000,
            status=WorkshopBooking.BookingStatus.CONFIRMED,
        )

        # 1. Run reminder command
        call_command('send_workshop_reminders')

        # Verify 24h reminder notification was created
        notif_reminder = Notification.objects.filter(
            user=self.tourist_user,
            notification_type='WORKSHOP_REMINDER_24H',
            target_id=booking.pk,
        ).first()
        self.assertIsNotNone(notif_reminder)
        self.assertIn('Khóa làm chén trà men lam', notif_reminder.message)

        # 2. Idempotency test: Run command a second time - NO duplicate notification should be created
        call_command('send_workshop_reminders')
        reminder_count = Notification.objects.filter(
            user=self.tourist_user,
            notification_type='WORKSHOP_REMINDER_24H',
            target_id=booking.pk,
        ).count()
        self.assertEqual(reminder_count, 1)
