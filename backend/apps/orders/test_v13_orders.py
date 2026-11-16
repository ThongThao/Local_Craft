import uuid
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.products.models import Category, Product, ProductVariant, Inventory
from apps.orders.models import Order, VendorOrder, OrderItem
from apps.payments.models import Payment, Refund


class V13VendorOrdersTestCase(APITestCase):
    def setUp(self):
        # 1. Create Roles
        self.role_village, _ = Role.objects.get_or_create(
            role_code='CRAFT_VILLAGE',
            defaults={'role_name': 'Craft Village Manager'}
        )
        self.role_admin, _ = Role.objects.get_or_create(
            role_code='ADMIN',
            defaults={'role_name': 'Administrator'}
        )
        self.role_tourist, _ = Role.objects.get_or_create(
            role_code='TOURIST',
            defaults={'role_name': 'Tourist'}
        )

        # 2. Create Users
        self.manager1 = User.objects.create_user(
            email='manager1@craft.vn',
            full_name='Nguyen Van A',
            password='Password123!',
        )
        UserRole.objects.get_or_create(user=self.manager1, role=self.role_village)

        self.manager2 = User.objects.create_user(
            email='manager2@craft.vn',
            full_name='Tran Thi B',
            password='Password123!',
        )
        UserRole.objects.get_or_create(user=self.manager2, role=self.role_village)

        self.tourist = User.objects.create_user(
            email='tourist@gmail.com',
            full_name='Le Khach Hang',
            password='Password123!',
        )
        UserRole.objects.get_or_create(user=self.tourist, role=self.role_tourist)

        # 3. Create Craft Villages
        self.village1 = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug=f'lang-gom-bat-trang-{uuid.uuid4().hex[:4]}',
            province='Hà Nội',
            manager_user=self.manager1,
            status='ACTIVE'
        )
        self.manager1.managed_village = self.village1
        self.manager1.save()

        self.village2 = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug=f'lang-lua-van-phuc-{uuid.uuid4().hex[:4]}',
            province='Hà Nội',
            manager_user=self.manager2,
            status='ACTIVE'
        )
        self.manager2.managed_village = self.village2
        self.manager2.save()

        # 4. Create Category, Products, Variants
        self.cat = Category.objects.create(
            category_name='Gốm & Lụa',
            slug=f'gom-lua-{uuid.uuid4().hex[:4]}'
        )

        self.prod1 = Product.objects.create(
            village=self.village1,
            category=self.cat,
            product_name='Bình gốm sen cổ',
            slug=f'binh-gom-sen-co-{uuid.uuid4().hex[:4]}',
            base_price=Decimal('500000.00'),
            status=Product.ProductStatus.APPROVED
        )
        self.var1 = ProductVariant.objects.create(
            product=self.prod1,
            sku='GOM-SEN-01',
            variant_name='Men lam cao cấp',
            price=Decimal('550000.00')
        )
        self.inv1 = Inventory.objects.create(
            variant=self.var1,
            quantity=20,
            reserved_quantity=0
        )

        self.prod2 = Product.objects.create(
            village=self.village2,
            category=self.cat,
            product_name='Khăn lụa tơ tằm',
            slug=f'khan-lua-to-tam-{uuid.uuid4().hex[:4]}',
            base_price=Decimal('300000.00'),
            status=Product.ProductStatus.APPROVED
        )
        self.var2 = ProductVariant.objects.create(
            product=self.prod2,
            sku='LUA-VP-01',
            variant_name='Họa tiết hoa sen',
            price=Decimal('320000.00')
        )
        self.inv2 = Inventory.objects.create(
            variant=self.var2,
            quantity=15,
            reserved_quantity=0
        )

        # 5. Create Parent Order containing products from BOTH villages
        self.order = Order.objects.create(
            order_code='ORD-MULTI-VILLAGE-01',
            user=self.tourist,
            subtotal=Decimal('870000.00'),
            shipping_fee=Decimal('60000.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('930000.00'),
            recipient_name='Le Khach Hang',
            recipient_phone='0987654321',
            shipping_address='123 Phố Cổ, Hoàn Kiếm, Hà Nội',
            status=Order.OrderStatus.PENDING,
            payment_status=Order.PaymentStatus.PAID,
            placed_at=timezone.now()
        )

        # Child VendorOrder for Village 1
        self.vo1 = VendorOrder.objects.create(
            vendor_order_code=f'VORD-{self.village1.village_id}-001',
            order=self.order,
            village=self.village1,
            subtotal=Decimal('550000.00'),
            shipping_fee=Decimal('30000.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('580000.00'),
            status=VendorOrder.VendorOrderStatus.PENDING,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Le Khach Hang',
            recipient_phone='0987654321',
            shipping_address='123 Phố Cổ, Hoàn Kiếm, Hà Nội'
        )
        self.item1 = OrderItem.objects.create(
            order=self.order,
            vendor_order=self.vo1,
            variant=self.var1,
            product_name_snapshot='Bình gốm sen cổ (Snapshot)',
            variant_name_snapshot='Men lam cao cấp (Snapshot)',
            sku_snapshot='GOM-SEN-01',
            unit_price=Decimal('550000.00'),
            quantity=1,
            line_total=Decimal('550000.00')
        )

        # Child VendorOrder for Village 2
        self.vo2 = VendorOrder.objects.create(
            vendor_order_code=f'VORD-{self.village2.village_id}-002',
            order=self.order,
            village=self.village2,
            subtotal=Decimal('320000.00'),
            shipping_fee=Decimal('30000.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('350000.00'),
            status=VendorOrder.VendorOrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Le Khach Hang',
            recipient_phone='0987654321',
            shipping_address='123 Phố Cổ, Hoàn Kiếm, Hà Nội'
        )
        self.item2 = OrderItem.objects.create(
            order=self.order,
            vendor_order=self.vo2,
            variant=self.var2,
            product_name_snapshot='Khăn lụa tơ tằm (Snapshot)',
            variant_name_snapshot='Họa tiết hoa sen (Snapshot)',
            sku_snapshot='LUA-VP-01',
            unit_price=Decimal('320000.00'),
            quantity=1,
            line_total=Decimal('320000.00')
        )

        # Create Payment record linked to parent order
        self.payment = Payment.objects.create(
            payment_code='PAY-TEST-001',
            order=self.order,
            payment_method='VNPAY',
            amount=Decimal('930000.00'),
            status=Payment.PaymentRecordStatus.SUCCESS,
            paid_at=timezone.now()
        )

    def test_manager1_can_only_see_their_village_vendor_orders(self):
        """Manager 1 should only see vo1, never vo2."""
        self.client.force_authenticate(user=self.manager1)
        response = self.client.get('/api/v1/vendor-orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        orders = response.data['data']
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0]['vendor_order_id'], self.vo1.vendor_order_id)
        self.assertEqual(orders[0]['village'], self.village1.village_id)
        # Check snapshot items
        self.assertEqual(len(orders[0]['items']), 1)
        self.assertEqual(orders[0]['items'][0]['product_name_snapshot'], 'Bình gốm sen cổ (Snapshot)')
        self.assertEqual(orders[0]['items'][0]['sku_snapshot'], 'GOM-SEN-01')

    def test_manager2_can_only_see_their_village_vendor_orders(self):
        """Manager 2 should only see vo2."""
        self.client.force_authenticate(user=self.manager2)
        response = self.client.get('/api/v1/vendor-orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        orders = response.data['data']
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0]['vendor_order_id'], self.vo2.vendor_order_id)
        self.assertEqual(orders[0]['village'], self.village2.village_id)

    def test_manager1_cannot_access_manager2_order_detail(self):
        """Manager 1 trying to access vo2 detail should receive 404."""
        self.client.force_authenticate(user=self.manager1)
        response = self.client.get(f'/api/v1/vendor-orders/{self.vo2.vendor_order_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_vendor_orders_summary_kpi_counts_distinct_parent_orders(self):
        """Summary KPI endpoint counts orders accurately per village."""
        self.client.force_authenticate(user=self.manager1)
        response = self.client.get('/api/v1/vendor-orders/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kpis = response.data['data']
        self.assertEqual(kpis['total_orders'], 1)
        self.assertEqual(kpis['pending_orders'], 1)
        self.assertEqual(kpis['confirmed_orders'], 0)
        self.assertEqual(kpis['total_village_revenue'], 550000.0)

    def test_manager1_can_advance_status(self):
        """Manager 1 can advance vo1 from PENDING to CONFIRMED."""
        self.client.force_authenticate(user=self.manager1)
        url = f'/api/v1/vendor-orders/{self.vo1.vendor_order_id}/status/'
        response = self.client.patch(url, {'status': 'CONFIRMED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vo1.refresh_from_db()
        self.assertEqual(self.vo1.status, 'CONFIRMED')

        # Since vo2 is also CONFIRMED, parent order should automatically rollup to CONFIRMED!
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.OrderStatus.CONFIRMED)

    def test_cancellation_rolls_back_inventory_atomically(self):
        """Cancelling vo1 rolls back inventory for var1 by 1, leaving var2 intact."""
        initial_inv1 = self.inv1.quantity
        initial_inv2 = self.inv2.quantity

        self.client.force_authenticate(user=self.manager1)
        url = f'/api/v1/vendor-orders/{self.vo1.vendor_order_id}/status/'
        response = self.client.patch(url, {'status': 'CANCELLED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.inv1.refresh_from_db()
        self.inv2.refresh_from_db()
        self.assertEqual(self.inv1.quantity, initial_inv1 + 1)
        self.assertEqual(self.inv2.quantity, initial_inv2)

    def test_cannot_cancel_already_cancelled_order_twice(self):
        """Calling cancel on an already cancelled vendor order is rejected and does not double rollback."""
        self.client.force_authenticate(user=self.manager1)
        url = f'/api/v1/vendor-orders/{self.vo1.vendor_order_id}/status/'
        
        # 1st cancel
        res1 = self.client.patch(url, {'status': 'CANCELLED'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        inv_after_first = Inventory.objects.get(pk=self.inv1.pk).quantity

        # 2nd cancel attempt
        res2 = self.client.patch(url, {'status': 'CANCELLED'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        inv_after_second = Inventory.objects.get(pk=self.inv1.pk).quantity

        # Inventory must NOT have changed again
        self.assertEqual(inv_after_second, inv_after_first)

    def test_cannot_cancel_shipped_order(self):
        """Vendor orders in SHIPPED status cannot be cancelled."""
        self.client.force_authenticate(user=self.manager2)
        url = f'/api/v1/vendor-orders/{self.vo2.vendor_order_id}/status/'
        
        # Advance vo2 from CONFIRMED -> PROCESSING -> SHIPPED
        self.client.patch(url, {'status': 'PROCESSING'}, format='json')
        self.client.patch(url, {'status': 'SHIPPED', 'tracking_code': 'VNPOST-123'}, format='json')
        self.vo2.refresh_from_db()
        self.assertEqual(self.vo2.status, 'SHIPPED')

        # Try to cancel
        res = self.client.patch(url, {'status': 'CANCELLED'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_financial_metrics_and_refund_in_summary(self):
        """Summary accurately calculates subtotal, total_order_amount, paid_amount, refunded_amount."""
        # Create a second VendorOrder for village 1
        vo3 = VendorOrder.objects.create(
            vendor_order_code=f'VORD-{self.village1.village_id}-003',
            order=self.order,
            village=self.village1,
            subtotal=Decimal('100000.00'),
            shipping_fee=Decimal('30000.00'),
            discount_amount=Decimal('10000.00'),
            total_amount=Decimal('120000.00'),
            status=VendorOrder.VendorOrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            recipient_name='Le Khach Hang',
            recipient_phone='0987654321',
            shipping_address='123 Phố Cổ, Hoàn Kiếm, Hà Nội'
        )
        
        # Create a COMPLETED Refund for vo3
        Refund.objects.create(
            refund_code='REF-TEST-001',
            payment=self.payment,
            vendor_order=vo3,
            requested_by=self.tourist,
            amount_requested=Decimal('50000.00'),
            amount_approved=Decimal('50000.00'),
            status=Refund.RefundStatus.COMPLETED,
            reason='Đổi ý sản phẩm'
        )

        self.client.force_authenticate(user=self.manager1)
        res = self.client.get('/api/v1/vendor-orders/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        kpis = res.data['data']

        # Total vendor orders should now be 2
        self.assertEqual(kpis['total_vendor_orders'], 2)
        # Total parent orders is 1 (both belong to self.order)
        self.assertEqual(kpis['total_parent_orders'], 1)
        # Total subtotal: 550,000 + 100,000 = 650,000
        self.assertEqual(kpis['total_subtotal'], 650000.0)
        # Total order amount: 580,000 + 120,000 = 700,000
        self.assertEqual(kpis['total_order_amount'], 700000.0)
        # Both are PAID: 580,000 + 120,000 = 700,000
        self.assertEqual(kpis['total_paid_amount'], 700000.0)
        # Refunded amount: 50,000
        self.assertEqual(kpis['total_refunded_amount'], 50000.0)
        # Net realized revenue: 700,000 - 50,000 = 650,000
        self.assertEqual(kpis['net_realized_revenue'], 650000.0)

    def test_tourist_cannot_access_vendor_orders(self):
        """Tourist role is blocked from vendor-orders API with 403."""
        self.client.force_authenticate(user=self.tourist)
        res = self.client.get('/api/v1/vendor-orders/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_all_vendor_orders(self):
        """Admin can see both vo1 and vo2 across all villages."""
        admin_user = User.objects.create_user(
            email='admin@craft.vn',
            full_name='System Admin',
            password='Password123!',
        )
        UserRole.objects.get_or_create(user=admin_user, role=self.role_admin)

        self.client.force_authenticate(user=admin_user)
        res = self.client.get('/api/v1/vendor-orders/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        orders = res.data['data']
        # Admin sees both villages' vendor orders
        self.assertGreaterEqual(len(orders), 2)

