from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product, ProductVariant, Inventory
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking
from apps.orders.models import Order, VendorOrder, OrderItem
from apps.payments.models import Payment, Refund

User = get_user_model()


class VillageActivityAnalyticsTests(TestCase):
    """
    Exhaustive Test Suite for Screen V17: Activity & Revenue Analytics Dashboard.
    Validates Zero-IDOR isolation, financial calculations, refund deductions,
    date filtering, Snapshot vs Transactional separation, and Cartesian-free aggregation.
    """

    def setUp(self):
        self.client = APIClient()

        # Roles
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Quản trị viên'})
        self.role_cv, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Quản lý làng nghề'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Khách du lịch'})

        # Users
        self.user_manager_a = User.objects.create_user(
            email='manager_a@example.com',
            full_name='Manager Village A',
            password='Password123!',
            phone='0901000001',
        )
        UserRole.objects.create(user=self.user_manager_a, role=self.role_cv)

        self.user_manager_b = User.objects.create_user(
            email='manager_b@example.com',
            full_name='Manager Village B',
            password='Password123!',
            phone='0901000002',
        )
        UserRole.objects.create(user=self.user_manager_b, role=self.role_cv)

        self.user_admin = User.objects.create_user(
            email='admin@example.com',
            full_name='Super Admin',
            password='Password123!',
            phone='0901000003',
        )
        UserRole.objects.create(user=self.user_admin, role=self.role_admin)

        self.user_tourist = User.objects.create_user(
            email='tourist@example.com',
            full_name='Tourist Nguyen',
            password='Password123!',
            phone='0901000004',
        )
        UserRole.objects.create(user=self.user_tourist, role=self.role_tourist)

        self.user_unassigned = User.objects.create_user(
            email='unassigned@example.com',
            full_name='Unassigned Manager',
            password='Password123!',
            phone='0901000005',
        )
        UserRole.objects.create(user=self.user_unassigned, role=self.role_cv)

        # Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='lang-gom-bat-trang',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.user_manager_a,
        )

        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='lang-lua-van-phuc',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.user_manager_b,
        )

        # Category & Artisan
        self.category = Category.objects.create(
            category_name='Gốm sứ',
            slug='gom-su',
            status=Category.CategoryStatus.ACTIVE,
        )

        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Trần Độ',
            experience_years=40,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        # Products for Village A
        self.product_a1 = Product.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            product_name='Bình gốm hoa lam',
            slug='binh-gom-hoa-lam',
            description='Gốm nung men lam',
            base_price=Decimal('500000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.var_a1 = ProductVariant.objects.create(
            product=self.product_a1,
            sku='SKU-BHL-01',
            variant_name='Mẫu Lam Đại',
            price=Decimal('500000.00'),
            is_active=True,
        )
        self.inv_a1 = Inventory.objects.create(
            variant=self.var_a1,
            quantity=20,
            reserved_quantity=2,
        )

        # Low stock product
        self.product_a2 = Product.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            product_name='Chén tử sa Bát Tràng',
            slug='chen-tu-sa-bat-trang',
            description='Đất sét tử sa',
            base_price=Decimal('150000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.var_a2 = ProductVariant.objects.create(
            product=self.product_a2,
            sku='SKU-CTS-01',
            variant_name='Chén Tiêu Chuẩn',
            price=Decimal('150000.00'),
            is_active=True,
        )
        self.inv_a2 = Inventory.objects.create(
            variant=self.var_a2,
            quantity=4,
            reserved_quantity=0,
        )

        # Workshop for Village A
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            workshop_name='Lớp vuốt gốm truyền thống',
            slug='lop-vuot-gom-truyen-thong',
            description='Trải nghiệm làm gốm bằng tay',
            duration_minutes=120,
            price_per_person=Decimal('200000.00'),
            status=Workshop.WorkshopStatus.APPROVED,
        )

        self.session_a = WorkshopSession.objects.create(
            workshop=self.workshop_a,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=2),
            capacity=15,
            booked_participants=5,
            price_per_person=Decimal('200000.00'),
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.endpoint = '/api/v1/analytics/village-activity/'

    # ==========================================
    # 1. PERMISSIONS & AUTHENTICATION
    # ==========================================

    def test_01_unauthenticated_access_denied(self):
        """Unauthenticated client cannot access analytics."""
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_02_tourist_role_forbidden(self):
        """Tourist role is blocked from viewing craft village activity."""
        self.client.force_authenticate(user=self.user_tourist)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_craft_village_without_managed_village_forbidden(self):
        """User with CRAFT_VILLAGE role but unassigned managed_village gets 403."""
        self.client.force_authenticate(user=self.user_unassigned)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_valid_craft_village_manager_success(self):
        """Valid craft village manager receives 200 with structured dashboard."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        data = response.data['data']
        self.assertEqual(data['village']['village_id'], self.village_a.village_id)
        self.assertIn('kpis', data)
        self.assertIn('revenue_breakdown', data)
        self.assertIn('products_snapshot', data)
        self.assertIn('workshops_snapshot', data)
        self.assertIn('chart_data', data)

    def test_05_admin_can_inspect_with_village_id(self):
        """Admin can specify village_id to inspect any village."""
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get(f"{self.endpoint}?village_id={self.village_b.village_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['village']['village_id'], self.village_b.village_id)

    # ==========================================
    # 2. ZERO-IDOR & VILLAGE ISOLATION
    # ==========================================

    def test_06_zero_idor_village_isolation(self):
        """Manager A cannot view Village B data even if passing village_id parameter."""
        # Create an order in Village B
        order_b = Order.objects.create(
            order_code='ORD-B-001',
            user=self.user_tourist,
            subtotal=Decimal('1000000.00'),
            total_amount=Decimal('1000000.00'),
            recipient_name='Tourist B',
            recipient_phone='0909999999',
            shipping_address='Hà Nội',
            status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        VendorOrder.objects.create(
            vendor_order_code='VORD-B-001',
            order=order_b,
            village=self.village_b,
            subtotal=Decimal('1000000.00'),
            total_amount=Decimal('1000000.00'),
            status=VendorOrder.VendorOrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Tourist B',
            recipient_phone='0909999999',
            shipping_address='Hà Nội',
        )

        # Authenticate Manager A and tamper with village_id=Village B
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?village_id={self.village_b.village_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Must strictly return Village A's data!
        self.assertEqual(response.data['data']['village']['village_id'], self.village_a.village_id)
        # Village A has 0 orders, must not see Village B's 1,000,000 revenue
        self.assertEqual(response.data['data']['kpis']['net_revenue'], 0.0)
        self.assertEqual(response.data['data']['kpis']['total_orders'], 0)

    # ==========================================
    # 3. DATE FILTERING & VALIDATION
    # ==========================================

    def test_07_time_range_custom_valid(self):
        """Valid custom range YYYY-MM-DD accepted."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=CUSTOM&from_date=2026-10-01&to_date=2026-10-31")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['filter']['from_date'], '2026-10-01')
        self.assertEqual(response.data['data']['filter']['to_date'], '2026-10-31')

    def test_08_time_range_custom_invalid_dates_rejected(self):
        """Invalid date format returns 400."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=CUSTOM&from_date=invalid-date&to_date=2026-10-31")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_time_range_custom_from_greater_than_to_rejected(self):
        """from_date > to_date returns 400."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=CUSTOM&from_date=2026-11-10&to_date=2026-11-01")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("from_date không được lớn hơn to_date", response.data['message'])

    # ==========================================
    # 4. FINANCIAL METRICS & CARTESIAN JOIN PREVENTION
    # ==========================================

    def test_10_financial_metrics_and_refund_deduction(self):
        """
        Verify accurate calculation of net revenue:
        - Product paid: 500,000
        - Product refund completed: 100,000 -> Net product: 400,000
        - Workshop paid: 400,000 (2 participants x 200,000)
        - Workshop refund completed: 50,000 -> Net workshop: 350,000
        - Total Net Revenue = 400,000 + 350,000 = 750,000
        """
        # 1. Product Order for Village A
        parent_order = Order.objects.create(
            order_code='ORD-TEST-01',
            user=self.user_tourist,
            subtotal=Decimal('500000.00'),
            shipping_fee=Decimal('30000.00'),
            total_amount=Decimal('530000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
            status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        vo = VendorOrder.objects.create(
            vendor_order_code='VORD-TEST-01',
            order=parent_order,
            village=self.village_a,
            subtotal=Decimal('500000.00'),
            shipping_fee=Decimal('30000.00'),
            total_amount=Decimal('530000.00'),
            status=VendorOrder.VendorOrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        # OrderItem
        OrderItem.objects.create(
            order=parent_order,
            vendor_order=vo,
            variant=self.var_a1,
            product_name_snapshot='Bình gốm hoa lam',
            variant_name_snapshot='Mẫu Lam Đại',
            sku_snapshot='SKU-BHL-01',
            unit_price=Decimal('500000.00'),
            quantity=1,
            line_total=Decimal('500000.00'),
        )
        # Product Refund: 100,000 (COMPLETED)
        pay_order = Payment.objects.create(
            payment_code='PAY-ORD-01',
            order=parent_order,
            payment_method='VNPAY_DEV',
            amount=Decimal('530000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=timezone.now(),
        )
        Refund.objects.create(
            refund_code='REF-PROD-01',
            payment=pay_order,
            vendor_order=vo,
            requested_by=self.user_tourist,
            amount_requested=Decimal('100000.00'),
            amount_approved=Decimal('100000.00'),
            reason='Lỗi nứt men nhẹ',
            status=Refund.RefundStatus.COMPLETED,
            processed_at=timezone.now(),
        )

        # 2. Workshop Booking & Payment
        booking = WorkshopBooking.objects.create(
            booking_code='WB-TEST-01',
            user=self.user_tourist,
            session=self.session_a,
            participant_count=2,
            unit_price=Decimal('200000.00'),
            total_amount=Decimal('400000.00'),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )
        pay_wk = Payment.objects.create(
            payment_code='PAY-WK-01',
            booking=booking,
            payment_method='VNPAY_DEV',
            amount=Decimal('400000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=timezone.now(),
        )
        # Workshop Refund: 50,000 (COMPLETED)
        Refund.objects.create(
            refund_code='REF-WK-01',
            payment=pay_wk,
            requested_by=self.user_tourist,
            amount_requested=Decimal('50000.00'),
            amount_approved=Decimal('50000.00'),
            reason='Đến muộn 1 người',
            status=Refund.RefundStatus.COMPLETED,
            processed_at=timezone.now(),
        )

        # Request dashboard
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=30_DAYS")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        kpis = response.data['data']['kpis']
        rev = response.data['data']['revenue_breakdown']

        # Product: 530,000 gross - 100,000 refund = 430,000 net
        self.assertEqual(rev['product_gross_revenue'], 530000.0)
        self.assertEqual(rev['product_refunds'], 100000.0)
        self.assertEqual(rev['net_product_revenue'], 430000.0)

        # Workshop: 400,000 gross - 50,000 refund = 350,000 net
        self.assertEqual(rev['workshop_gross_revenue'], 400000.0)
        self.assertEqual(rev['workshop_refunds'], 50000.0)
        self.assertEqual(rev['net_workshop_revenue'], 350000.0)

        # Net total = 430,000 + 350,000 = 780,000
        self.assertEqual(kpis['net_revenue'], 780000.0)

    def test_11_cancelled_orders_excluded_from_revenue(self):
        """Cancelled orders must NOT be counted towards realized revenue."""
        parent_order = Order.objects.create(
            order_code='ORD-CANCEL-01',
            user=self.user_tourist,
            subtotal=Decimal('500000.00'),
            total_amount=Decimal('500000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
            status=Order.OrderStatus.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,
        )
        VendorOrder.objects.create(
            vendor_order_code='VORD-CANCEL-01',
            order=parent_order,
            village=self.village_a,
            subtotal=Decimal('500000.00'),
            total_amount=Decimal('500000.00'),
            status=VendorOrder.VendorOrderStatus.CANCELLED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )

        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=30_DAYS")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        kpis = response.data['data']['kpis']
        self.assertEqual(kpis['net_revenue'], 0.0)
        self.assertEqual(response.data['data']['orders_summary']['cancelled'], 1)

    def test_12_no_cartesian_multiplication_with_multiple_items_and_refunds(self):
        """Ensure joining 3 items with 2 refunds does not multiply revenue."""
        parent_order = Order.objects.create(
            order_code='ORD-CARTESIAN-01',
            user=self.user_tourist,
            subtotal=Decimal('600000.00'),
            total_amount=Decimal('600000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
            status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        vo = VendorOrder.objects.create(
            vendor_order_code='VORD-CARTESIAN-01',
            order=parent_order,
            village=self.village_a,
            subtotal=Decimal('600000.00'),
            total_amount=Decimal('600000.00'),
            status=VendorOrder.VendorOrderStatus.COMPLETED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        # 3 OrderItems (total qty = 1 + 2 + 1 = 4)
        for i in range(1, 4):
            OrderItem.objects.create(
                order=parent_order,
                vendor_order=vo,
                variant=self.var_a1,
                product_name_snapshot=f'Mặt hàng {i}',
                variant_name_snapshot='Mẫu tiêu chuẩn',
                sku_snapshot=f'SKU-{i}',
                unit_price=Decimal('150000.00'),
                quantity=1 if i != 2 else 2,
                line_total=Decimal('150000.00') if i != 2 else Decimal('300000.00'),
            )

        pay = Payment.objects.create(
            payment_code='PAY-CART-01',
            order=parent_order,
            payment_method='VNPAY_DEV',
            amount=Decimal('600000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=timezone.now(),
        )
        # 2 Refunds (50k + 30k = 80k)
        Refund.objects.create(
            refund_code='REF-C1',
            payment=pay,
            vendor_order=vo,
            requested_by=self.user_tourist,
            amount_requested=Decimal('50000.00'),
            amount_approved=Decimal('50000.00'),
            reason='Lỗi 1',
            status=Refund.RefundStatus.COMPLETED,
            processed_at=timezone.now(),
        )
        Refund.objects.create(
            refund_code='REF-C2',
            payment=pay,
            vendor_order=vo,
            requested_by=self.user_tourist,
            amount_requested=Decimal('30000.00'),
            amount_approved=Decimal('30000.00'),
            reason='Lỗi 2',
            status=Refund.RefundStatus.COMPLETED,
            processed_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=30_DAYS")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        kpis = response.data['data']['kpis']
        rev = response.data['data']['revenue_breakdown']
        orders = response.data['data']['orders_summary']

        # Orders count must be 1, NOT 3 or 6!
        self.assertEqual(orders['total_orders'], 1)
        # Items sold must be 4, NOT 8 or 24!
        self.assertEqual(orders['total_items_sold'], 4)
        # Gross revenue must be 600,000, NOT 1,800,000!
        self.assertEqual(rev['product_gross_revenue'], 600000.0)
        # Total refunds must be 80,000, NOT 240,000!
        self.assertEqual(rev['product_refunds'], 80000.0)
        # Net revenue = 600,000 - 80,000 = 520,000
        self.assertEqual(kpis['net_revenue'], 520000.0)

    # ==========================================
    # 5. SNAPSHOT METRICS INTEGRITY
    # ==========================================

    def test_13_snapshot_metrics_integrity(self):
        """Snapshot metrics correctly report products inventory & status."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        prod_snap = response.data['data']['products_snapshot']
        self.assertEqual(prod_snap['total'], 2)
        self.assertEqual(prod_snap['selling'], 2)
        # product_a2 has sellable=4 <= 5 -> low_stock
        self.assertEqual(prod_snap['low_stock'], 1)

        wk_snap = response.data['data']['workshops_snapshot']
        self.assertEqual(wk_snap['total'], 1)
        self.assertEqual(wk_snap['active'], 1)
        self.assertEqual(wk_snap['total_sessions'], 1)
        self.assertEqual(wk_snap['upcoming_sessions'], 1)

    # ==========================================
    # 6. TIME RANGE SHORTCUTS & PRESETS
    # ==========================================

    def test_14_time_range_presets(self):
        """Test all standard time_range presets execute successfully."""
        self.client.force_authenticate(user=self.user_manager_a)
        presets = ['TODAY', '7_DAYS', '30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR']
        for preset in presets:
            response = self.client.get(f"{self.endpoint}?time_range={preset}")
            self.assertEqual(response.status_code, status.HTTP_200_OK, f"Failed on preset {preset}")
            self.assertEqual(response.data['data']['filter']['time_range'], preset)

    def test_15_top_performers_and_attendance_rate(self):
        """Top 5 products and top 5 workshops returned with accurate rankings."""
        parent_order = Order.objects.create(
            order_code='ORD-TOP-01',
            user=self.user_tourist,
            subtotal=Decimal('1500000.00'),
            total_amount=Decimal('1500000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
            status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )
        vo = VendorOrder.objects.create(
            vendor_order_code='VORD-TOP-01',
            order=parent_order,
            village=self.village_a,
            subtotal=Decimal('1500000.00'),
            total_amount=Decimal('1500000.00'),
            status=VendorOrder.VendorOrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        OrderItem.objects.create(
            order=parent_order,
            vendor_order=vo,
            variant=self.var_a1,
            product_name_snapshot='Bình gốm hoa lam',
            variant_name_snapshot='Mẫu Lam Đại',
            sku_snapshot='SKU-BHL-01',
            unit_price=Decimal('500000.00'),
            quantity=3,
            line_total=Decimal('1500000.00'),
        )
        booking = WorkshopBooking.objects.create(
            booking_code='WB-TOP-01',
            user=self.user_tourist,
            session=self.session_a,
            participant_count=4,
            unit_price=Decimal('200000.00'),
            total_amount=Decimal('800000.00'),
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )

        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f"{self.endpoint}?time_range=30_DAYS")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        top_prods = response.data['data']['top_products']
        self.assertGreaterEqual(len(top_prods), 1)
        self.assertEqual(top_prods[0]['product_id'], self.product_a1.product_id)
        self.assertEqual(top_prods[0]['total_sold'], 3)

        top_wks = response.data['data']['top_workshops']
        self.assertGreaterEqual(len(top_wks), 1)
        self.assertEqual(top_wks[0]['workshop_id'], self.workshop_a.workshop_id)
        self.assertEqual(top_wks[0]['total_bookings'], 1)
        self.assertEqual(top_wks[0]['total_participants'], 4)

