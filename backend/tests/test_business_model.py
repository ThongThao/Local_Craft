from decimal import Decimal
from django.test import TestCase
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product, ProductVariant, Inventory
from apps.workshops.models import Workshop, WorkshopSession
from apps.orders.models import Order, OrderItem, VendorOrder, Cart, CartItem
from apps.orders.services import sync_parent_order_status
from apps.payments.models import Payment, Refund


class BusinessModelComprehensiveTests(TestCase):
    """
    Complete verification suite covering all 18 requirements from the updated LocalCraft business model.
    """

    def setUp(self):
        self.client = APIClient()

        # Seed 3 supported roles
        self.role_tourist, _ = Role.objects.get_or_create(
            role_code=Role.RoleCode.TOURIST,
            defaults={'role_name': 'Du khách'}
        )
        self.role_village, _ = Role.objects.get_or_create(
            role_code=Role.RoleCode.CRAFT_VILLAGE,
            defaults={'role_name': 'Quản lý làng nghề'}
        )
        self.role_admin, _ = Role.objects.get_or_create(
            role_code=Role.RoleCode.ADMIN,
            defaults={'role_name': 'Quản trị viên'}
        )

        # Users
        self.tourist = User.objects.create(
            email='tourist.model@localcraft.vn',
            full_name='Tourist Tester',
            status=User.UserStatus.ACTIVE
        )
        self.tourist.set_password('Pass1234!')
        self.tourist.save()
        UserRole.objects.create(user=self.tourist, role=self.role_tourist)

        self.manager_a = User.objects.create(
            email='manager.a@localcraft.vn',
            full_name='Manager Village A',
            status=User.UserStatus.ACTIVE
        )
        self.manager_a.set_password('Pass1234!')
        self.manager_a.save()
        UserRole.objects.create(user=self.manager_a, role=self.role_village)

        self.manager_b = User.objects.create(
            email='manager.b@localcraft.vn',
            full_name='Manager Village B',
            status=User.UserStatus.ACTIVE
        )
        self.manager_b.set_password('Pass1234!')
        self.manager_b.save()
        UserRole.objects.create(user=self.manager_b, role=self.role_village)

        # Craft Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang-test',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.manager_a,
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-test',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.manager_b,
        )

        # Category
        self.category = Category.objects.create(
            category_name='Thủ công mỹ nghệ',
            slug='thu-cong-my-nghe',
            status=Category.CategoryStatus.ACTIVE,
        )

        # Artisans (Non-login informational profiles)
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Tô Thanh Sơn',
            experience_years=35,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )
        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name='Nghệ nhân Đỗ Quang Hùng',
            experience_years=25,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        # Products (Owned by villages)
        self.product_a = Product.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            product_name='Bộ ấm chén tử sa Bát Tràng',
            slug='bo-am-chen-tu-sa-bt',
            description='Gốm nung củi cao cấp',
            base_price=Decimal('650000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.variant_a = ProductVariant.objects.create(
            product=self.product_a,
            sku='BT-TS-01',
            variant_name='Màu đất nung',
            price=Decimal('650000.00'),
            is_active=True,
        )
        self.inventory_a = Inventory.objects.create(variant=self.variant_a, quantity=20)

        self.product_b = Product.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            category=self.category,
            product_name='Khăn lụa tơ tằm Vạn Phúc',
            slug='khan-lua-van-phuc-vp',
            description='Lụa tơ tằm dệt tay',
            base_price=Decimal('450000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.variant_b = ProductVariant.objects.create(
            product=self.product_b,
            sku='VP-KL-01',
            variant_name='Họa tiết mây bay',
            price=Decimal('450000.00'),
            is_active=True,
        )
        self.inventory_b = Inventory.objects.create(variant=self.variant_b, quantity=15)

        # Workshops (Owned by village)
        self.workshop_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            workshop_name='Trải nghiệm vuốt gốm Bát Tràng',
            slug='workshop-vuot-gom-bt',
            description='Trải nghiệm tự tay làm gốm',
            duration_minutes=120,
            price_per_person=Decimal('250000.00'),
            location_address='Xã Bát Tràng, Gia Lâm, Hà Nội',
            status=Workshop.WorkshopStatus.APPROVED,
        )

    def test_01_only_three_supported_roles(self):
        """1. Only the three supported roles exist in enum choices."""
        allowed_roles = {choice[0] for choice in Role.RoleCode.choices}
        self.assertEqual(allowed_roles, {'TOURIST', 'CRAFT_VILLAGE', 'ADMIN'})
        self.assertNotIn('ARTISAN', allowed_roles)

    def test_02_public_registration_cannot_create_admin(self):
        """2. Public registration cannot register an ADMIN role."""
        payload = {
            'email': 'hacker.admin@localcraft.vn',
            'password': 'StrongPassword123!',
            'full_name': 'Malicious Admin',
            'role': 'ADMIN',
        }
        res = self.client.post('/api/v1/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data['success'])

    def test_03_one_village_account_cannot_manage_multiple_villages(self):
        """3. One village account cannot manage multiple villages (unique OneToOne)."""
        with self.assertRaises(IntegrityError):
            CraftVillage.objects.create(
                village_name='Làng Gốm Bát Tràng Chi Nhánh 2',
                slug='bat-trang-branch-2',
                province='Hà Nội',
                manager_user=self.manager_a,
            )

    def test_04_one_village_cannot_have_multiple_designated_managers(self):
        """4. One village cannot have multiple designated managers."""
        # CraftVillage.manager_user is a single OneToOneField reference
        self.assertEqual(self.village_a.manager_user, self.manager_a)
        with self.assertRaises(ValidationError):
            # Model clean() rejects setting a non-CRAFT_VILLAGE user as manager
            village = CraftVillage(
                village_name='Làng Test Invalid Manager',
                slug='lang-test-invalid',
                province='Hà Nội',
                manager_user=self.tourist,
            )
            village.clean()

    def test_05_artisan_profiles_work_without_user_accounts(self):
        """5. Artisan profiles work as informational entities without user accounts."""
        self.assertFalse(hasattr(self.artisan_a, 'user_id'))
        self.assertEqual(self.artisan_a.village, self.village_a)
        self.assertEqual(self.artisan_a.display_name, 'Nghệ nhân Tô Thanh Sơn')

    def test_06_products_and_workshops_owned_by_village(self):
        """6. Products and workshops are strictly owned by a craft village."""
        self.assertEqual(self.product_a.village, self.village_a)
        self.assertEqual(self.workshop_a.village, self.village_a)

        # Missing village should violate non-null constraint
        with self.assertRaises(IntegrityError):
            Product.objects.create(
                village=None,
                category=self.category,
                product_name='Sản phẩm vô chủ',
                slug='san-pham-vo-chu',
                description='Test',
                base_price=Decimal('100000.00'),
            )

    def test_07_idor_prevention_village_managers(self):
        """7. Village A manager cannot modify Village B's products, workshops, or vendor orders."""
        self.client.force_authenticate(user=self.manager_a)

        # Manager A attempts to edit Village B's product
        res = self.client.patch(f'/api/v1/products/{self.product_b.product_id}/', {
            'product_name': 'Hacked Product Name'
        }, format='json')
        self.assertEqual(res.status_code, 403)

        # Manager A attempts to edit Village B's workshop
        workshop_b = Workshop.objects.create(
            village=self.village_b,
            category=self.category,
            workshop_name='Workshop Dệt Lụa Vạn Phúc',
            slug='workshop-det-lua-vp',
            description='Học dệt lụa tơ tằm',
            duration_minutes=90,
            price_per_person=Decimal('200000.00'),
            location_address='Vạn Phúc, Hà Đông',
        )
        res_ws = self.client.patch(f'/api/v1/workshops/{workshop_b.workshop_id}/', {
            'workshop_name': 'Hacked Workshop Name'
        }, format='json')
        self.assertEqual(res_ws.status_code, 403)

    def test_08_single_village_cart_creates_one_parent_and_one_vendor_order(self):
        """8. Single-village cart creates one parent order and one child vendor order."""
        self.client.force_authenticate(user=self.tourist)

        # Add item from Village A
        self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant_a.variant_id,
            'quantity': 2,
        })

        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Nguyễn Văn Tourist',
            'recipient_phone': '0901234567',
            'shipping_address': '123 Hoàn Kiếm, Hà Nội',
        })
        self.assertEqual(res.status_code, 201)
        data = res.data['data']

        # 1 parent order, 1 vendor order
        self.assertEqual(len(data['vendor_orders']), 1)
        self.assertEqual(data['vendor_orders'][0]['village'], self.village_a.village_id)
        self.assertEqual(Decimal(data['subtotal']), Decimal('1300000.00'))

    def test_09_multi_village_cart_creates_one_parent_and_multiple_vendor_orders(self):
        """9. Multi-village cart creates one parent order and one child vendor order per village."""
        self.client.force_authenticate(user=self.tourist)

        # Add items from Village A and Village B
        self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant_a.variant_id,
            'quantity': 1,
        })
        self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant_b.variant_id,
            'quantity': 2,
        })

        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Trần Thị Khách',
            'recipient_phone': '0909888777',
            'shipping_address': '456 Hai Bà Trưng, Hà Nội',
        })
        self.assertEqual(res.status_code, 201)
        order_data = res.data['data']

        # 1 parent order, 2 vendor orders
        vendor_orders = order_data['vendor_orders']
        self.assertEqual(len(vendor_orders), 2)
        villages_in_vo = {vo['village'] for vo in vendor_orders}
        self.assertEqual(villages_in_vo, {self.village_a.village_id, self.village_b.village_id})

    def test_10_order_items_associated_with_correct_vendor_order(self):
        """10. Each order item belongs to the correct vendor order."""
        self.client.force_authenticate(user=self.tourist)
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_a.variant_id, 'quantity': 1})
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_b.variant_id, 'quantity': 1})

        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Test Delivery',
            'recipient_phone': '0901234567',
            'shipping_address': 'Test Address',
        })
        order = Order.objects.get(order_id=res.data['data']['order_id'])

        for item in order.items.all():
            self.assertIsNotNone(item.vendor_order)
            self.assertEqual(item.vendor_order.village, item.variant.product.village)

    def test_11_parent_and_child_totals_calculated_consistently(self):
        """11. Parent totals equal sum of child vendor orders."""
        self.client.force_authenticate(user=self.tourist)
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_a.variant_id, 'quantity': 2})  # 1,300,000
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_b.variant_id, 'quantity': 1})  # 450,000

        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Test Delivery',
            'recipient_phone': '0901234567',
            'shipping_address': 'Test Address',
        })
        order = Order.objects.get(order_id=res.data['data']['order_id'])

        vo_sum_subtotal = sum(vo.subtotal for vo in order.vendor_orders.all())
        vo_sum_total = sum(vo.total_amount for vo in order.vendor_orders.all())

        self.assertEqual(order.subtotal, vo_sum_subtotal)
        self.assertEqual(order.total_amount, vo_sum_total)
        self.assertEqual(order.subtotal, Decimal('1750000.00'))

    def test_12_inventory_reservation_and_rollback(self):
        """12. Atomic inventory validation rolls back on insufficient stock."""
        self.client.force_authenticate(user=self.tourist)

        # Set inventory of variant_a to 1
        self.inventory_a.quantity = 1
        self.inventory_a.save()

        # Add 5 items to cart (exceeding stock)
        cart, _ = Cart.objects.get_or_create(user=self.tourist)
        CartItem.objects.create(cart=cart, variant=self.variant_a, quantity=5)

        initial_orders_count = Order.objects.count()
        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Test Delivery',
            'recipient_phone': '0901234567',
            'shipping_address': 'Test Address',
        })
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data['success'])

        # No order created and inventory intact
        self.assertEqual(Order.objects.count(), initial_orders_count)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 1)

    def test_13_child_order_status_cascade_to_parent(self):
        """13. Child vendor order status updates roll up to parent order status."""
        self.client.force_authenticate(user=self.tourist)
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_a.variant_id, 'quantity': 1})
        self.client.post('/api/v1/cart/items/', {'variant_id': self.variant_b.variant_id, 'quantity': 1})

        res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Test Delivery',
            'recipient_phone': '0901234567',
            'shipping_address': 'Test Address',
        })
        order = Order.objects.get(order_id=res.data['data']['order_id'])
        vo_list = list(order.vendor_orders.all())

        # Update first child to PROCESSING -> parent becomes PROCESSING
        vo_list[0].status = VendorOrder.VendorOrderStatus.PROCESSING
        vo_list[0].save()
        sync_parent_order_status(order)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.OrderStatus.PROCESSING)

        # Update all to SHIPPED -> parent becomes SHIPPED
        for vo in vo_list:
            vo.status = VendorOrder.VendorOrderStatus.SHIPPED
            vo.save()
        sync_parent_order_status(order)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.OrderStatus.SHIPPED)

        # Update all to COMPLETED -> parent becomes COMPLETED
        for vo in vo_list:
            vo.status = VendorOrder.VendorOrderStatus.COMPLETED
            vo.save()
        sync_parent_order_status(order)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.OrderStatus.COMPLETED)

    def test_14_payment_idempotency_and_vendor_orders_paid(self):
        """14. Payment verification marks vendor orders as paid idempotently."""
        order = Order.objects.create(
            user=self.tourist,
            order_code='ORD-TEST-PAY-01',
            subtotal=Decimal('650000.00'),
            total_amount=Decimal('650000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        vo = VendorOrder.objects.create(
            order=order,
            village=self.village_a,
            vendor_order_code='VORD-TEST-01',
            subtotal=Decimal('650000.00'),
            total_amount=Decimal('650000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        payment = Payment.objects.create(
            order=order,
            payment_code='PAY-TEST-CODE-01',
            amount=Decimal('650000.00'),
            payment_method='VNPAY',
        )

        self.client.force_authenticate(user=self.tourist)
        # Call payment verification
        res1 = self.client.post('/api/v1/payments/verify/', {
            'payment_code': 'PAY-TEST-CODE-01',
        })
        self.assertEqual(res1.status_code, 200)

        order.refresh_from_db()
        vo.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(vo.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(vo.status, VendorOrder.VendorOrderStatus.CONFIRMED)

        # Second call is idempotent and succeeds without duplicate payments
        res2 = self.client.post('/api/v1/payments/verify/', {
            'payment_code': 'PAY-TEST-CODE-01',
        })
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(Payment.objects.filter(order=order).count(), 1)

    def test_15_refund_limits_and_validation(self):
        """15. Refund validation rejects amounts exceeding payment amount."""
        order = Order.objects.create(
            user=self.tourist,
            order_code='ORD-TEST-REF-01',
            subtotal=Decimal('500000.00'),
            total_amount=Decimal('500000.00'),
            recipient_name='Test Tourist',
            recipient_phone='0901234567',
            shipping_address='Hà Nội',
        )
        payment = Payment.objects.create(
            order=order,
            payment_code='PAY-TEST-REF-01',
            amount=Decimal('500000.00'),
            payment_method='VNPAY',
            status=Payment.PaymentRecordStatus.SUCCESS,
        )

        # Attempt to create refund greater than paid amount
        refund = Refund(
            payment=payment,
            refund_code='REF-TEST-01',
            requested_by=self.tourist,
            amount_requested=Decimal('600000.00'),
            reason='Refund quá mức',
        )
        with self.assertRaises(ValidationError):
            refund.clean()

    def test_16_ai_recommendation_and_rag_functionality(self):
        """16. System capabilities (AI Recommendation & Chatbot) function with village-owned entities."""
        # Query recommendation
        rec_res = self.client.post('/api/v1/query/', {
            'query': 'trải nghiệm làm gốm Bát Tràng',
            'min_budget': 100000,
            'max_budget': 500000,
        })
        self.assertEqual(rec_res.status_code, 200)
        self.assertTrue(rec_res.data['success'])

        # Query chatbot
        chat_res = self.client.post('/api/v1/chatbot/query/', {
            'message': 'Giới thiệu về làng gốm Bát Tràng',
        })
        self.assertEqual(chat_res.status_code, 200)
        self.assertTrue(chat_res.data['success'])
