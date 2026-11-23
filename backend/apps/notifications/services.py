import logging
from datetime import timedelta
from django.utils import timezone
from .models import Notification
from apps.villages.models import CraftVillage

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Centralized core notification service across all roles (TOURIST, CRAFT_VILLAGE, ADMIN).
    Provides robust user isolation, payload formatting, transaction safety, and deduplication (idempotency).
    """

    @classmethod
    def send_notification(
        cls,
        user,
        notification_type: str,
        title: str,
        message: str,
        target_type: str = None,
        target_id: int = None,
        dedup_minutes: int = 5,
    ):
        """
        Base method to create a user notification.
        Supports:
          - dedup_minutes > 0: updates existing unread notification within time window.
          - dedup_minutes == -1: strict lifetime deduplication (e.g., reminders).
          - dedup_minutes == 0: no deduplication check.
        """
        if not user or not getattr(user, 'pk', None):
            return None

        # Check for inactive or invalid users
        if hasattr(user, 'is_active') and not user.is_active:
            return None

        try:
            if dedup_minutes > 0:
                threshold = timezone.now() - timedelta(minutes=dedup_minutes)
                existing = Notification.objects.filter(
                    user=user,
                    notification_type=notification_type,
                    target_type=target_type,
                    target_id=target_id,
                    is_read=False,
                    created_at__gte=threshold,
                ).first()
                if existing:
                    existing.title = title
                    existing.message = message
                    existing.save(update_fields=['title', 'message'])
                    return existing
            elif dedup_minutes == -1:
                # Absolute deduplication: do not send if already sent previously
                already_exists = Notification.objects.filter(
                    user=user,
                    notification_type=notification_type,
                    target_type=target_type,
                    target_id=target_id,
                ).exists()
                if already_exists:
                    return None

            return Notification.objects.create(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                target_type=target_type,
                target_id=target_id,
                is_read=False,
            )
        except Exception as e:
            logger.error("Failed to create notification for user %s: %s", getattr(user, 'pk', None), str(e))
            return None

    # ==========================================================================
    # TOURIST NOTIFICATIONS (F11.02 & F11.03)
    # ==========================================================================

    @classmethod
    def notify_tourist_booking_confirmed(cls, booking):
        """
        F11.02 - Tourist notification when workshop booking is confirmed.
        """
        user = getattr(booking, 'user', None)
        if not user:
            return None

        booking_code = getattr(booking, 'booking_code', f"BK-{booking.pk}")
        qty = getattr(booking, 'participant_count', 1)
        ws_name = "Trải nghiệm làng nghề"
        formatted_start = ""
        location = ""

        if hasattr(booking, 'session') and booking.session:
            session = booking.session
            if session.start_at:
                formatted_start = session.start_at.strftime('%H:%M ngày %d/%m/%Y')
            if hasattr(session, 'workshop') and session.workshop:
                ws_name = session.workshop.workshop_name
                location = session.workshop.location_address or ""

        msg = f"Đơn đặt chỗ #{booking_code} cho {qty} người tại '{ws_name}' đã được xác nhận thành công."
        if formatted_start:
            msg += f" Thời gian: {formatted_start}."
        if location:
            msg += f" Địa điểm: {location}."

        return cls.send_notification(
            user=user,
            notification_type='BOOKING_CONFIRMED',
            title='Đặt chỗ workshop thành công',
            message=msg,
            target_type='BOOKING',
            target_id=booking.pk,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_booking_cancelled(cls, booking, reason: str = ""):
        """
        F11.02 - Tourist notification when booking is cancelled.
        """
        user = getattr(booking, 'user', None)
        if not user:
            return None

        booking_code = getattr(booking, 'booking_code', f"BK-{booking.pk}")
        ws_name = "Trải nghiệm làng nghề"
        if hasattr(booking, 'session') and booking.session and hasattr(booking.session, 'workshop'):
            ws_name = booking.session.workshop.workshop_name

        msg = f"Đơn đặt vé #{booking_code} cho '{ws_name}' đã được hủy thành công."
        if reason:
            msg += f" (Lý do: {reason})"

        return cls.send_notification(
            user=user,
            notification_type='BOOKING_CANCELLED',
            title='Hủy đặt chỗ workshop thành công',
            message=msg,
            target_type='BOOKING',
            target_id=booking.pk,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_order_confirmed(cls, vendor_order):
        """
        F11.03 - Tourist notification when vendor order is confirmed by village manager.
        """
        order = getattr(vendor_order, 'order', None)
        user = getattr(order, 'user', None) if order else None
        if not user:
            return None

        code = getattr(vendor_order, 'vendor_order_code', f"VO-{vendor_order.pk}")
        village_name = vendor_order.village.village_name if hasattr(vendor_order, 'village') and vendor_order.village else "Làng nghề"

        return cls.send_notification(
            user=user,
            notification_type='ORDER_CONFIRMED',
            title='Đơn hàng đã được xác nhận',
            message=f"{village_name} đã xác nhận đơn hàng #{code} của bạn. Làng nghề đang chuẩn bị tác phẩm để đóng gói.",
            target_type='VENDOR_ORDER',
            target_id=vendor_order.pk,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_order_shipped(cls, vendor_order, tracking_code: str = ""):
        """
        F11.03 - Tourist notification when order status becomes SHIPPED.
        """
        order = getattr(vendor_order, 'order', None)
        user = getattr(order, 'user', None) if order else None
        if not user:
            return None

        code = getattr(vendor_order, 'vendor_order_code', f"VO-{vendor_order.pk}")
        village_name = vendor_order.village.village_name if hasattr(vendor_order, 'village') and vendor_order.village else "Làng nghề"
        tr_code = tracking_code or getattr(vendor_order, 'tracking_code', '')

        msg = f"Đơn hàng #{code} từ {village_name} đã được giao cho đơn vị vận chuyển."
        if tr_code:
            msg += f" Mã vận đơn: {tr_code}."

        return cls.send_notification(
            user=user,
            notification_type='ORDER_SHIPPED',
            title='Đơn hàng đang được vận chuyển',
            message=msg,
            target_type='VENDOR_ORDER',
            target_id=vendor_order.pk,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_order_delivered(cls, vendor_order):
        """
        F11.03 - Tourist notification when order is delivered/completed.
        """
        order = getattr(vendor_order, 'order', None)
        user = getattr(order, 'user', None) if order else None
        if not user:
            return None

        code = getattr(vendor_order, 'vendor_order_code', f"VO-{vendor_order.pk}")
        village_name = vendor_order.village.village_name if hasattr(vendor_order, 'village') and vendor_order.village else "Làng nghề"

        return cls.send_notification(
            user=user,
            notification_type='ORDER_DELIVERED',
            title='Đơn hàng đã giao thành công',
            message=f"Đơn hàng #{code} từ {village_name} đã được giao đến bạn. Hãy chia sẻ cảm nhận và đánh giá tác phẩm nhé!",
            target_type='VENDOR_ORDER',
            target_id=vendor_order.pk,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_payment_success(cls, payment):
        """
        F11.03 - Tourist notification when payment transaction succeeds.
        """
        user = None
        target_type = None
        target_id = None
        amount = getattr(payment, 'amount', 0)
        formatted_amount = f"{int(amount):,} đ".replace(',', '.')
        item_desc = "giao dịch"

        if getattr(payment, 'order', None):
            user = payment.order.user
            target_type = 'ORDER'
            target_id = payment.order.pk
            code = getattr(payment.order, 'order_code', f"ORD-{payment.order.pk}")
            item_desc = f"đơn hàng #{code}"
        elif getattr(payment, 'booking', None):
            user = payment.booking.user
            target_type = 'BOOKING'
            target_id = payment.booking.pk
            code = getattr(payment.booking, 'booking_code', f"BK-{payment.booking.pk}")
            item_desc = f"vé workshop #{code}"

        if not user:
            return None

        return cls.send_notification(
            user=user,
            notification_type='PAYMENT_SUCCESS',
            title='Thanh toán thành công',
            message=f"Giao dịch thanh toán {formatted_amount} cho {item_desc} đã được xác nhận thành công qua {payment.payment_method}.",
            target_type=target_type,
            target_id=target_id,
            dedup_minutes=5,
        )

    @classmethod
    def notify_tourist_workshop_reminder(cls, booking, reminder_type: str = '24H'):
        """
        F11.06 - Workshop reminder notification sent 24h or 2h before session start.
        Uses lifetime deduplication (-1) to guarantee zero duplicate reminders per booking per type.
        """
        user = getattr(booking, 'user', None)
        if not user:
            return None

        session = getattr(booking, 'session', None)
        if not session or not session.start_at:
            return None

        ws = getattr(session, 'workshop', None)
        ws_name = ws.workshop_name if ws else "Trải nghiệm làng nghề"
        location = ws.location_address if ws else "Địa điểm làng nghề"
        artisan_name = ws.artisan.display_name if ws and ws.artisan else "Nghệ nhân"
        time_str = session.start_at.strftime('%H:%M ngày %d/%m/%Y')
        booking_code = getattr(booking, 'booking_code', f"BK-{booking.pk}")

        if reminder_type == '24H':
            notif_type = 'WORKSHOP_REMINDER_24H'
            title = 'Nhắc lịch: Workshop trải nghiệm diễn ra ngày mai'
            message = (
                f"Vé #{booking_code}: Buổi '{ws_name}' với {artisan_name} sẽ diễn ra lúc {time_str} tại {location}. "
                f"Vui lòng có mặt trước 15 phút để chuẩn bị trang phục và dụng cụ tốt nhất nhé!"
            )
        else:
            notif_type = 'WORKSHOP_REMINDER_2H'
            title = 'Nhắc lịch: Workshop sẽ bắt đầu sau 2 giờ'
            message = (
                f"Vé #{booking_code}: Buổi '{ws_name}' chuẩn bị bắt đầu lúc {session.start_at.strftime('%H:%M')} hôm nay tại {location}. "
                f"{artisan_name} đang chờ đón bạn!"
            )

        return cls.send_notification(
            user=user,
            notification_type=notif_type,
            title=title,
            message=message,
            target_type='BOOKING',
            target_id=booking.pk,
            dedup_minutes=-1,  # Strict lifetime deduplication
        )


class VillageNotificationService:
    """
    Centralized service for generating notifications for Craft Village Managers (CRAFT_VILLAGE).
    Supports deduplication (idempotency) and clean payload formatting for Village Managers.
    """

    @classmethod
    def send_to_village_manager(
        cls,
        village,
        notification_type: str,
        title: str,
        message: str,
        target_type: str = None,
        target_id: int = None,
        dedup_minutes: int = 5,
    ):
        """
        Send a notification to the manager of a village.
        village can be a CraftVillage instance or village_id (int).
        Includes idempotency / deduplication check to prevent duplicate unread notifications.
        """
        if isinstance(village, (int, str)):
            try:
                village_obj = CraftVillage.objects.select_related('manager_user').get(pk=village)
            except CraftVillage.DoesNotExist:
                return None
        else:
            village_obj = village

        if not village_obj or not getattr(village_obj, 'manager_user', None):
            return None

        manager_user = village_obj.manager_user
        return NotificationService.send_notification(
            user=manager_user,
            notification_type=notification_type,
            title=title,
            message=message,
            target_type=target_type,
            target_id=target_id,
            dedup_minutes=dedup_minutes,
        )

    # --------------------------------------------------------------------------
    # 1. ORDER NOTIFICATIONS FOR VILLAGE MANAGER
    # --------------------------------------------------------------------------
    @classmethod
    def notify_new_order(cls, village, vendor_order):
        code = getattr(vendor_order, 'vendor_order_code', f"VO-{vendor_order.pk}")
        customer_name = getattr(vendor_order, 'recipient_name', 'Khách hàng')
        total = getattr(vendor_order, 'total_amount', 0)
        formatted_total = f"{int(total):,} đ".replace(',', '.')
        
        return cls.send_to_village_manager(
            village=village,
            notification_type='NEW_VENDOR_ORDER',
            title='Đơn hàng mới cần xử lý',
            message=f"Đơn hàng #{code} từ khách hàng {customer_name} (Tổng trị giá: {formatted_total}). Vui lòng xác nhận đơn hàng.",
            target_type='VENDOR_ORDER',
            target_id=vendor_order.pk,
        )

    @classmethod
    def notify_order_cancelled_by_customer(cls, village, vendor_order, reason: str = ""):
        code = getattr(vendor_order, 'vendor_order_code', f"VO-{vendor_order.pk}")
        msg = f"Đơn hàng #{code} đã bị hủy bởi khách hàng. Tồn kho đã được tự động hoàn lại."
        if reason:
            msg += f" (Lý do: {reason})"
        return cls.send_to_village_manager(
            village=village,
            notification_type='ORDER_CANCELLED_BY_CUSTOMER',
            title='Khách hàng hủy đơn hàng',
            message=msg,
            target_type='VENDOR_ORDER',
            target_id=vendor_order.pk,
        )

    # --------------------------------------------------------------------------
    # 2. WORKSHOP & BOOKING NOTIFICATIONS FOR VILLAGE MANAGER
    # --------------------------------------------------------------------------
    @classmethod
    def notify_new_booking(cls, village, booking):
        b_code = getattr(booking, 'booking_code', f"BK-{booking.pk}")
        c_name = getattr(booking, 'customer_name', 'Du khách')
        qty = getattr(booking, 'participant_count', 1)
        ws_name = booking.session.workshop.workshop_name if hasattr(booking, 'session') and hasattr(booking.session, 'workshop') else 'Trải nghiệm làng nghề'
        
        return cls.send_to_village_manager(
            village=village,
            notification_type='NEW_WORKSHOP_BOOKING',
            title='Lượt đặt chỗ workshop mới',
            message=f"Du khách {c_name} vừa đặt {qty} vé ({b_code}) cho buổi '{ws_name}'. Vui lòng kiểm tra danh sách.",
            target_type='BOOKING',
            target_id=booking.pk,
        )

    @classmethod
    def notify_booking_cancelled(cls, village, booking, reason: str = ""):
        b_code = getattr(booking, 'booking_code', f"BK-{booking.pk}")
        c_name = getattr(booking, 'customer_name', 'Du khách')
        ws_name = booking.session.workshop.workshop_name if hasattr(booking, 'session') and hasattr(booking.session, 'workshop') else 'Trải nghiệm làng nghề'

        msg = f"Du khách {c_name} đã hủy vé #{b_code} buổi '{ws_name}'. Sức chứa ca đã được tự động hoàn lại."
        if reason:
            msg += f" (Lý do: {reason})"

        return cls.send_to_village_manager(
            village=village,
            notification_type='BOOKING_CANCELLED',
            title='Du khách hủy đặt chỗ workshop',
            message=msg,
            target_type='BOOKING',
            target_id=booking.pk,
        )

    # --------------------------------------------------------------------------
    # 3. REVIEWS & RATINGS NOTIFICATIONS FOR VILLAGE MANAGER
    # --------------------------------------------------------------------------
    @classmethod
    def notify_new_review(cls, village, review):
        rating = getattr(review, 'rating', 5)
        author = 'Du khách'
        if hasattr(review, 'user') and review.user:
            author = getattr(review.user, 'full_name', '') or getattr(review.user, 'email', '') or 'Du khách'

        target_name = 'Sản phẩm / Workshop'
        if getattr(review, 'product', None):
            target_name = getattr(review.product, 'product_name', 'Sản phẩm')
        elif getattr(review, 'booking', None) and getattr(review.booking, 'session', None) and getattr(review.booking.session, 'workshop', None):
            target_name = getattr(review.booking.session.workshop, 'workshop_name', 'Workshop')
        
        return cls.send_to_village_manager(
            village=village,
            notification_type='NEW_REVIEW_RECEIVED',
            title=f'Đánh giá mới ({rating}★) từ du khách',
            message=f"Du khách {author} vừa đánh giá {rating} sao cho '{target_name}'. Hãy xem và gửi phản hồi cảm ơn du khách!",
            target_type='REVIEW',
            target_id=review.pk,
        )

    # --------------------------------------------------------------------------
    # 4. ADMIN APPROVAL NOTIFICATIONS FOR VILLAGE MANAGER (F11.05)
    # --------------------------------------------------------------------------
    @classmethod
    def notify_artisan_status(cls, village, artisan, is_approved: bool, reason: str = ""):
        name = getattr(artisan, 'display_name', 'Nghệ nhân')
        if is_approved:
            title = 'Hồ sơ Nghệ nhân đã được xác minh'
            msg = f"Hồ sơ Nghệ nhân '{name}' của làng nghề đã được Quản trị viên phê duyệt xác minh thành công."
            n_type = 'ARTISAN_VERIFIED'
        else:
            title = 'Hồ sơ Nghệ nhân bị từ chối'
            msg = f"Hồ sơ Nghệ nhân '{name}' chưa được duyệt."
            if reason:
                msg += f" Lý do: {reason}"
            n_type = 'ARTISAN_REJECTED'

        return cls.send_to_village_manager(
            village=village,
            notification_type=n_type,
            title=title,
            message=msg,
            target_type='ARTISAN',
            target_id=artisan.pk,
        )

    @classmethod
    def notify_product_status(cls, village, product, is_approved: bool, reason: str = ""):
        name = getattr(product, 'product_name', 'Sản phẩm')
        if is_approved:
            title = 'Sản phẩm đã được duyệt công khai'
            msg = f"Sản phẩm '{name}' của làng nghề đã được Admin phê duyệt và cấp tem chứng nhận OCOP."
            n_type = 'PRODUCT_APPROVED'
        else:
            title = 'Sản phẩm bị từ chối phê duyệt'
            msg = f"Sản phẩm '{name}' chưa được phê duyệt."
            if reason:
                msg += f" Lý do: {reason}"
            n_type = 'PRODUCT_REJECTED'

        return cls.send_to_village_manager(
            village=village,
            notification_type=n_type,
            title=title,
            message=msg,
            target_type='PRODUCT',
            target_id=product.pk,
        )

    @classmethod
    def notify_workshop_status(cls, village, workshop, is_approved: bool, reason: str = ""):
        name = getattr(workshop, 'workshop_name', 'Workshop trải nghiệm')
        if is_approved:
            title = 'Workshop trải nghiệm đã được phê duyệt'
            msg = f"Chương trình workshop '{name}' của làng nghề đã được Admin phê duyệt và sẵn sàng mở ca đăng ký cho du khách."
            n_type = 'WORKSHOP_APPROVED'
        else:
            title = 'Workshop trải nghiệm bị từ chối'
            msg = f"Workshop '{name}' chưa được phê duyệt."
            if reason:
                msg += f" Lý do: {reason}"
            n_type = 'WORKSHOP_REJECTED'

        return cls.send_to_village_manager(
            village=village,
            notification_type=n_type,
            title=title,
            message=msg,
            target_type='WORKSHOP',
            target_id=workshop.pk,
        )

    @classmethod
    def notify_story_status(cls, village, story, is_approved: bool, reason: str = ""):
        name = getattr(story, 'title', 'Ký sự di sản')
        if is_approved:
            title = 'Ký sự di sản đã được xuất bản'
            msg = f"Bài viết '{name}' của làng nghề đã được phê duyệt và xuất bản công khai trên LocalCraft."
            n_type = 'STORY_APPROVED'
        else:
            title = 'Ký sự di sản cần điều chỉnh'
            msg = f"Bài viết '{name}' chưa được duyệt."
            if reason:
                msg += f" Góp ý: {reason}"
            n_type = 'STORY_REJECTED'

        return cls.send_to_village_manager(
            village=village,
            notification_type=n_type,
            title=title,
            message=msg,
            target_type='STORY',
            target_id=story.pk,
        )

    # --------------------------------------------------------------------------
    # 5. INVENTORY ALERT FOR VILLAGE MANAGER
    # --------------------------------------------------------------------------
    @classmethod
    def notify_low_stock(cls, village, product_name: str, variant_name: str, remaining_qty: int):
        return cls.send_to_village_manager(
            village=village,
            notification_type='INVENTORY_LOW_STOCK',
            title='Cảnh báo biến thể sắp hết hàng',
            message=f"Biến thể '{variant_name}' của sản phẩm '{product_name}' chỉ còn {remaining_qty} chiếc trong kho. Vui lòng cập nhật số lượng.",
            target_type='INVENTORY',
            target_id=None,
            dedup_minutes=60,  # Only alert once an hour per low stock item
        )
