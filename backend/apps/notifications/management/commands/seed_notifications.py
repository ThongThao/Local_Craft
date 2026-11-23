import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.villages.models import CraftVillage
from apps.orders.models import Order, VendorOrder
from apps.bookings.models import WorkshopBooking
from apps.workshops.models import Workshop, WorkshopSession
from apps.products.models import Product
from apps.artisans.models import ArtisanProfile
from apps.stories.models import CraftStory


class Command(BaseCommand):
    help = "Tạo dữ liệu thông báo thực tế (Real-world Notifications) cho toàn hệ thống LocalCraft"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Xóa dữ liệu thông báo cũ trước khi tạo mới (trừ thông báo hệ thống quan trọng)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== BẮT ĐẦU TẠO DỮ LIỆU THÔNG BÁO THỰC TẾ LOCALCRAFT ==="))

        if options.get('clear'):
            deleted_count, _ = Notification.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Đã dọn dẹp {deleted_count} thông báo cũ."))

        now = timezone.now()

        # ----------------------------------------------------------------------
        # 1. TÌM KIẾM CÁC THỰC THỂ DỮ LIỆU THỰC TRONG DATABASE
        # ----------------------------------------------------------------------
        # Users
        manager_bao = User.objects.filter(email='baonv.22it@vku.udn.vn').first()
        tourist_bao = User.objects.filter(email='baongo2722004@gmail.com').first()
        admin_user = User.objects.filter(email='admin@localcraft.vn').first()
        tourist_ha = User.objects.filter(email='tourist@localcraft.vn').first()
        tourist_an = User.objects.filter(email='tourist.le@localcraft.vn').first()
        tourist_khai = User.objects.filter(email='tourist.tran@localcraft.vn').first()
        manager_bt = User.objects.filter(email='manager.bat-trang@localcraft.vn').first()

        # Fallbacks nếu tài khoản chưa có
        if not manager_bao:
            manager_bao = User.objects.filter(user_roles__role__role_code='CRAFT_VILLAGE').first()
        if not tourist_bao:
            tourist_bao = User.objects.filter(user_roles__role__role_code='TOURIST').first()
        if not admin_user:
            admin_user = User.objects.filter(user_roles__role__role_code='ADMIN').first()

        # Real objects in DB
        village = CraftVillage.objects.first()
        v_orders = list(VendorOrder.objects.all()[:10])
        orders = list(Order.objects.all()[:10])
        bookings = list(WorkshopBooking.objects.all()[:10])
        workshops = list(Workshop.objects.all()[:10])
        products = list(Product.objects.all()[:10])
        artisans = list(ArtisanProfile.objects.all()[:10])
        stories = list(CraftStory.objects.all()[:10])

        notifications_to_create = []

        # ======================================================================
        # 2. THÔNG BÁO CHO QUẢN LÝ LÀNG NGHỀ (CRAFT_VILLAGE)
        #    Tập trung vào: manager_bao (Ngô Văn Bảo) và manager_bt
        # ======================================================================
        target_managers = [u for u in [manager_bao, manager_bt] if u]

        for mgr in target_managers:
            vo1_code = v_orders[0].vendor_order_code if len(v_orders) > 0 else "VO-BT-001"
            vo1_id = v_orders[0].pk if len(v_orders) > 0 else 1
            vo2_code = v_orders[1].vendor_order_code if len(v_orders) > 1 else "VO-BT-002"
            vo2_id = v_orders[1].pk if len(v_orders) > 1 else 2

            bk1_code = bookings[0].booking_code if len(bookings) > 0 else "BK-202611-001"
            bk1_id = bookings[0].pk if len(bookings) > 0 else 1
            bk2_code = bookings[1].booking_code if len(bookings) > 1 else "BK-202611-002"
            bk2_id = bookings[1].pk if len(bookings) > 1 else 2

            ws_name = workshops[0].workshop_name if workshops else "Kỹ thuật vuốt gốm bàn xoay & phục dựng men rạn cổ Bát Tràng"
            p1_name = products[0].product_name if len(products) > 0 else "Bình gốm hoa biến men ngọc Bát Tràng"
            p2_name = products[1].product_name if len(products) > 1 else "Bộ ấm chén men rạn cổ Phúc Lộc Thọ"
            artisan_name = artisans[0].display_name if artisans else "Nguyễn Văn Lợi"
            story_title = stories[0].title if stories else "Hồn gốm Bát Tràng qua nghìn năm lịch sử"

            notifications_to_create.extend([
                # 1. Đơn hàng mới (Chưa đọc - 12 phút trước)
                Notification(
                    user=mgr,
                    notification_type='NEW_VENDOR_ORDER',
                    title=f'Đơn hàng mới cần xử lý #{vo2_code}',
                    message=f'Du khách Lê Thúy An vừa đặt mua "{p2_name}" (Tổng giá trị: 1.250.000 đ). Vui lòng kiểm tra và xác nhận đơn hàng.',
                    target_type='VENDOR_ORDER',
                    target_id=vo2_id,
                    is_read=False,
                ),
                # 2. Lượt đặt workshop mới (Chưa đọc - 45 phút trước)
                Notification(
                    user=mgr,
                    notification_type='NEW_WORKSHOP_BOOKING',
                    title=f'Lượt đặt chỗ workshop mới #{bk2_code}',
                    message=f'Du khách Trần Quang Khải vừa đặt 2 vé trải nghiệm cho buổi "{ws_name}". Ca học: 09:00 ngày mai. Vui lòng sắp xếp nguyên liệu đất sét và bàn xoay.',
                    target_type='BOOKING',
                    target_id=bk2_id,
                    is_read=False,
                ),
                # 3. Cảnh báo tồn kho thấp (Chưa đọc - 2 giờ trước)
                Notification(
                    user=mgr,
                    notification_type='INVENTORY_LOW',
                    title='Cảnh báo: Biến thể sắp hết hàng',
                    message=f'Biến thể "Men rạn ngũ sắc - Cỡ đại" của tác phẩm "{p1_name}" hiện chỉ còn 2 sản phẩm khả dụng trong kho. Hãy lên kế hoạch nung gốm bổ sung.',
                    target_type='PRODUCT',
                    target_id=products[0].pk if products else 1,
                    is_read=False,
                ),
                # 4. Đánh giá mới 5 sao (Chưa đọc - 4 giờ trước)
                Notification(
                    user=mgr,
                    notification_type='NEW_REVIEW_RECEIVED',
                    title='Đánh giá mới (5★) từ du khách',
                    message=f'Du khách Nguyễn Hà vừa gửi đánh giá 5 sao cho tác phẩm "{p1_name}": "Nước men hỏa biến ngọc bích rất có chiều sâu, xương gốm đanh chắc, nghệ nhân đóng gói 3 lớp xốp cực kỳ an tâm." Hãy phản hồi cảm ơn du khách nhé!',
                    target_type='REVIEW',
                    target_id=1,
                    is_read=False,
                ),
                # 5. Phê duyệt hồ sơ Nghệ nhân (Đã đọc - 1 ngày trước)
                Notification(
                    user=mgr,
                    notification_type='ARTISAN_VERIFIED',
                    title='Hồ sơ Nghệ nhân đã được xác minh',
                    message=f'Hồ sơ Nghệ nhân "{artisan_name}" của làng nghề đã được Quản trị viên phê duyệt xác minh thành công kèm huy hiệu Bàn tay vàng OCOP.',
                    target_type='ARTISAN',
                    target_id=artisans[0].pk if artisans else 1,
                    is_read=True,
                    read_at=now - timedelta(days=1, hours=2),
                ),
                # 6. Phê duyệt sản phẩm OCOP (Đã đọc - 2 ngày trước)
                Notification(
                    user=mgr,
                    notification_type='PRODUCT_APPROVED',
                    title='Sản phẩm đã được duyệt công khai',
                    message=f'Sản phẩm "{p2_name}" của làng nghề đã được Admin phê duyệt tiêu chuẩn OCOP 4 sao và mở bán công khai trên sàn thương mại điện tử di sản.',
                    target_type='PRODUCT',
                    target_id=products[1].pk if len(products) > 1 else 2,
                    is_read=True,
                    read_at=now - timedelta(days=2, hours=3),
                ),
                # 7. Khách hàng hủy đơn hàng (Đã đọc - 3 ngày trước)
                Notification(
                    user=mgr,
                    notification_type='ORDER_CANCELLED_BY_CUSTOMER',
                    title=f'Khách hàng hủy đơn hàng #{vo1_code}',
                    message=f'Đơn hàng #{vo1_code} đã bị hủy bởi khách hàng do chọn nhầm kích thước. Tồn kho sản phẩm đã được hệ thống tự động hoàn lại an toàn.',
                    target_type='VENDOR_ORDER',
                    target_id=vo1_id,
                    is_read=True,
                    read_at=now - timedelta(days=3),
                ),
                # 8. Phê duyệt bài viết Di sản (Đã đọc - 4 ngày trước)
                Notification(
                    user=mgr,
                    notification_type='STORY_APPROVED',
                    title='Câu chuyện di sản đã được xuất bản',
                    message=f'Bài viết "{story_title}" của làng nghề đã được Ban biên tập phê duyệt và đưa lên tiêu điểm trang chủ LocalCraft.',
                    target_type='STORY',
                    target_id=stories[0].pk if stories else 1,
                    is_read=True,
                    read_at=now - timedelta(days=4),
                ),
            ])

        # ======================================================================
        # 3. THÔNG BÁO CHO DU KHÁCH (TOURIST)
        #    Tập trung vào: tourist_bao (Văn Bảo), tourist_ha, tourist_an
        # ======================================================================
        target_tourists = [u for u in [tourist_bao, tourist_ha, tourist_an, tourist_khai] if u]

        for t_user in target_tourists:
            o_code = orders[0].order_code if orders else "ORD-202611-002"
            o_id = orders[0].pk if orders else 2
            b_code = bookings[0].booking_code if bookings else "BK-202611-002"
            b_id = bookings[0].pk if bookings else 2
            ws_title = workshops[0].workshop_name if workshops else "Kỹ thuật vuốt gốm bàn xoay Bát Tràng"
            p_name = products[0].product_name if products else "Bình gốm hoa biến men ngọc"

            notifications_to_create.extend([
                # 1. Thanh toán thành công (Chưa đọc - 18 phút trước)
                Notification(
                    user=t_user,
                    notification_type='PAYMENT_SUCCESS',
                    title='Thanh toán thành công qua VNPAY',
                    message=f'Giao dịch thanh toán 1.250.000 đ cho đơn hàng #{o_code} đã được xác nhận thành công. Cảm ơn bạn đã đồng hành gìn giữ làng nghề truyền thống!',
                    target_type='ORDER',
                    target_id=o_id,
                    is_read=False,
                ),
                # 2. Đơn hàng được xác nhận (Chưa đọc - 35 phút trước)
                Notification(
                    user=t_user,
                    notification_type='ORDER_CONFIRMED',
                    title='Đơn hàng đã được xác nhận',
                    message=f'Làng Gốm Bát Tràng đã xác nhận đơn hàng #{o_code} của bạn. Các nghệ nhân đang cẩn trọng đóng gói tác phẩm với bao bì chuyên dụng chống va đập.',
                    target_type='ORDER',
                    target_id=o_id,
                    is_read=False,
                ),
                # 3. Nhắc lịch Workshop 24H (Chưa đọc - 1 giờ trước)
                Notification(
                    user=t_user,
                    notification_type='WORKSHOP_REMINDER_24H',
                    title='Nhắc lịch: Workshop trải nghiệm diễn ra ngày mai',
                    message=f'Vé #{b_code}: Buổi trải nghiệm "{ws_title}" với Nghệ nhân Ưu tú sẽ diễn ra lúc 09:00 ngày mai tại Xưởng Gốm Nghệ Nhân Bát Tràng. Vui lòng có mặt trước 15 phút để chuẩn bị trang phục làm gốm nhé!',
                    target_type='BOOKING',
                    target_id=b_id,
                    is_read=False,
                ),
                # 4. Đơn hàng đang vận chuyển (Đã đọc - 1 ngày trước)
                Notification(
                    user=t_user,
                    notification_type='ORDER_SHIPPED',
                    title='Đơn hàng đang được vận chuyển',
                    message=f'Đơn hàng #{o_code} gồm tác phẩm "{p_name}" đã được bàn giao cho Viettel Post. Mã vận đơn: VTP-LC-884920. Dự kiến giao tới bạn trong 1 - 2 ngày tới.',
                    target_type='ORDER',
                    target_id=o_id,
                    is_read=True,
                    read_at=now - timedelta(days=1),
                ),
                # 5. Phản hồi đánh giá từ nghệ nhân (Đã đọc - 2 ngày trước)
                Notification(
                    user=t_user,
                    notification_type='REVIEW_REPLY',
                    title='Nghệ nhân đã phản hồi nhận xét của bạn',
                    message='Nghệ nhân Nguyễn Văn Lợi từ Làng Gốm Bát Tràng đã gửi lời cảm ơn: "Cảm ơn bạn đã trân trọng tinh hoa men rạn cổ truyền của xưởng gốm. Chúc bạn và gia đình vạn sự an khang!"',
                    target_type='REVIEW',
                    target_id=1,
                    is_read=True,
                    read_at=now - timedelta(days=2),
                ),
                # 6. Giao hàng thành công (Đã đọc - 3 ngày trước)
                Notification(
                    user=t_user,
                    notification_type='ORDER_DELIVERED',
                    title='Đơn hàng đã giao thành công',
                    message=f'Đơn hàng #{o_code} đã được giao tận tay bạn an toàn. Hãy mở kiện hàng kiểm tra và để lại đánh giá để nhận quà tặng tri ân từ nghệ nhân nhé!',
                    target_type='ORDER',
                    target_id=o_id,
                    is_read=True,
                    read_at=now - timedelta(days=3),
                ),
                # 7. Đặt chỗ workshop thành công (Đã đọc - 5 ngày trước)
                Notification(
                    user=t_user,
                    notification_type='BOOKING_CONFIRMED',
                    title='Đặt chỗ workshop thành công',
                    message=f'Bạn đã đặt chỗ thành công cho vé #{b_code} tại workshop "{ws_title}". Mã QR check-in đã sẵn sàng trong mục Hồ sơ cá nhân của bạn.',
                    target_type='BOOKING',
                    target_id=b_id,
                    is_read=True,
                    read_at=now - timedelta(days=5),
                ),
            ])

        # ======================================================================
        # 4. THÔNG BÁO CHO QUẢN TRỊ VIÊN (ADMIN)
        # ======================================================================
        if admin_user:
            notifications_to_create.extend([
                # 1. Câu chuyện mới cần kiểm duyệt (Chưa đọc - 25 phút trước)
                Notification(
                    user=admin_user,
                    notification_type='ADMIN_STORY_PENDING',
                    title='Câu chuyện di sản mới chờ duyệt',
                    message='Làng Gốm Bát Tràng vừa gửi bài viết "Hồn gốm Bát Tràng qua nghìn năm lịch sử" để thẩm định chất lượng nội dung trước khi xuất bản công khai.',
                    target_type='STORY',
                    target_id=stories[0].pk if stories else 1,
                    is_read=False,
                ),
                # 2. Hồ sơ Nghệ nhân mới chờ thẩm định (Chưa đọc - 1 giờ trước)
                Notification(
                    user=admin_user,
                    notification_type='ADMIN_ARTISAN_PENDING',
                    title='Hồ sơ Nghệ nhân mới chờ thẩm định',
                    message='Làng Lụa Vạn Phúc vừa gửi hồ sơ thẩm định cấp tem "Bàn tay vàng di sản" cho Nghệ nhân dệt lụa tơ tằm cổ truyền.',
                    target_type='ARTISAN',
                    target_id=artisans[0].pk if artisans else 1,
                    is_read=False,
                ),
                # 3. Sản phẩm OCOP mới đăng ký (Chưa đọc - 3 giờ trước)
                Notification(
                    user=admin_user,
                    notification_type='ADMIN_PRODUCT_PENDING',
                    title='Sản phẩm đăng ký thẩm định OCOP',
                    message='Làng Hương Thủy Xuân gửi hồ sơ đề nghị cấp tem OCOP 4 sao cho sản phẩm "Nụ trầm hương ngâm thảo mộc hoàng cung Huế".',
                    target_type='PRODUCT',
                    target_id=products[0].pk if products else 1,
                    is_read=False,
                ),
                # 4. Báo cáo phản ánh từ du khách (Đã đọc - 1 ngày trước)
                Notification(
                    user=admin_user,
                    notification_type='ADMIN_REPORT_RESOLVED',
                    title='Đã giải quyết yêu cầu hỗ trợ đơn hàng',
                    message='Phản ánh về việc cập nhật chậm mã vận đơn của đơn vị vận chuyển tại Làng Đá Non Nước đã được Ban quản lý xử lý hoàn tất.',
                    target_type='ORDER',
                    target_id=orders[0].pk if orders else 1,
                    is_read=True,
                    read_at=now - timedelta(days=1),
                ),
            ])

        # ----------------------------------------------------------------------
        # 5. LƯU VÀ CẬP NHẬT MỐC THỜI GIAN THỰC TẾ
        # ----------------------------------------------------------------------
        # Lưu từng thông báo và gán created_at phân tán theo thời gian tự nhiên
        created_records = []
        for i, notif in enumerate(notifications_to_create):
            # Tính toán độ lệch thời gian:
            if not notif.is_read:
                # Chưa đọc: từ 10 phút đến 5 giờ trước
                minutes_ago = 10 + (i * 27) % 300
                delta = timedelta(minutes=minutes_ago)
            else:
                # Đã đọc: từ 1 ngày đến 5 ngày trước
                days_ago = 1 + (i % 5)
                delta = timedelta(days=days_ago, hours=(i * 3) % 24, minutes=15)

            notif.save()
            # Cập nhật thời gian created_at phân bổ tự nhiên
            Notification.objects.filter(pk=notif.pk).update(created_at=now - delta)
            created_records.append(notif)

        self.stdout.write(self.style.SUCCESS(
            f"✓ Đã tạo thành công {len(created_records)} thông báo thực tế chất lượng cao cho toàn hệ thống!"
        ))

        # In thống kê cho từng tài khoản quan trọng
        self.stdout.write(self.style.NOTICE("\nThống kê thông báo theo tài khoản:"))
        for u in [manager_bao, tourist_bao, admin_user, tourist_ha]:
            if u:
                unread = Notification.objects.filter(user=u, is_read=False).count()
                total = Notification.objects.filter(user=u).count()
                self.stdout.write(
                    f" - {u.email} ({u.full_name}): {unread} chưa đọc / {total} tổng thông báo"
                )

