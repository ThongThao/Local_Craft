from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product, ProductVariant, Inventory
from apps.orders.models import Order, OrderItem, VendorOrder, Cart, CartItem
from apps.orders.services import cancel_parent_order, cancel_vendor_order


class V07InventoryAndOrderRollbackTests(TestCase):
    """
    Test suite for V07 Variant & Inventory Management, Concurrency Safety,
    Village Manager Permissions, and Order Cancellation Rollback.
    """

    def setUp(self):
        self.client = APIClient()

        # Seed roles
        self.role_tourist, _ = Role.objects.get_or_create(role_code=Role.RoleCode.TOURIST, defaults={'role_name': 'Du khách'})
        self.role_village, _ = Role.objects.get_or_create(role_code=Role.RoleCode.CRAFT_VILLAGE, defaults={'role_name': 'Quản lý làng nghề'})
        self.role_admin, _ = Role.objects.get_or_create(role_code=Role.RoleCode.ADMIN, defaults={'role_name': 'Quản trị viên'})

        # Users
        self.tourist = User.objects.create(email='tourist_v07@localcraft.vn', full_name='Tourist V07', status=User.UserStatus.ACTIVE)
        self.tourist.set_password('Pass1234!')
        self.tourist.save()
        UserRole.objects.create(user=self.tourist, role=self.role_tourist)

        self.manager_a = User.objects.create(email='manager_a@localcraft.vn', full_name='Manager A', status=User.UserStatus.ACTIVE)
        self.manager_a.set_password('Pass1234!')
        self.manager_a.save()
        UserRole.objects.create(user=self.manager_a, role=self.role_village)

        self.manager_b = User.objects.create(email='manager_b@localcraft.vn', full_name='Manager B', status=User.UserStatus.ACTIVE)
        self.manager_b.set_password('Pass1234!')
        self.manager_b.save()
        UserRole.objects.create(user=self.manager_b, role=self.role_village)

        # Villages
        self.village_a = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang-v07',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.manager_a,
        )
        self.village_b = CraftVillage.objects.create(
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc-v07',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
            manager_user=self.manager_b,
        )

        # Category
        self.category = Category.objects.create(
            category_name='Gốm mỹ nghệ',
            slug='gom-my-nghe-v07',
            status=Category.CategoryStatus.ACTIVE,
        )

        # Products
        self.product_a = Product.objects.create(
            village=self.village_a,
            category=self.category,
            product_name='Bình hoa men rạn Bát Tràng',
            slug='binh-hoa-men-ran',
            description='Sản phẩm thủ công độc đáo',
            base_price=Decimal('450000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.product_b = Product.objects.create(
            village=self.village_b,
            category=self.category,
            product_name='Khăn lụa tơ tằm Vạn Phúc',
            slug='khan-lua-van-phuc',
            description='Lụa truyền thống',
            base_price=Decimal('350000.00'),
            status=Product.ProductStatus.APPROVED,
        )

        # Variant & Inventory in Village A
        self.variant_a = ProductVariant.objects.create(
            product=self.product_a,
            sku='TEST-BTR-01',
            variant_name='Màu men lam cổ',
            price=Decimal('450000.00'),
            is_active=True,
        )
        self.inventory_a = Inventory.objects.create(
            variant=self.variant_a,
            quantity=20,
            reserved_quantity=2,
        )

    def test_create_variant_and_inventory(self):
        """Test 1: Tạo variant thành công và inventory tự động tạo đúng initial_quantity."""
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.post(f'/api/v1/products/{self.product_a.product_id}/variants/', {
            'sku': 'TEST-BTR-NEW',
            'variant_name': 'Mẫu men ngọc bích',
            'price': 480000,
            'initial_quantity': 15,
            'color': 'Xanh ngọc',
            'size': 'Size L',
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['sku'], 'TEST-BTR-NEW')
        self.assertEqual(res.data['data']['quantity'], 15)
        self.assertEqual(res.data['data']['sellable_quantity'], 15)

    def test_duplicate_sku_rejection(self):
        """Test 2: Trùng mã SKU bị reject kèm thông báo lỗi rõ ràng."""
        self.client.force_authenticate(user=self.manager_a)
        res = self.client.post(f'/api/v1/products/{self.product_a.product_id}/variants/', {
            'sku': 'TEST-BTR-01',  # Đã tồn tại
            'variant_name': 'Mẫu trùng SKU',
            'price': 450000,
        })
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data['success'])
        self.assertIn('sku', str(res.data['message']).lower())

    def test_inventory_adjustment_validation(self):
        """Test 3: Cập nhật tồn kho kiểm tra số âm và không được nhỏ hơn reserved_quantity."""
        self.client.force_authenticate(user=self.manager_a)

        # Thử cập nhật số âm
        res_neg = self.client.patch(f'/api/v1/products/variants/{self.variant_a.variant_id}/inventory/', {
            'quantity': -5
        })
        self.assertEqual(res_neg.status_code, 400)

        # Thử cập nhật nhỏ hơn reserved_quantity (hiện tại reserved = 2)
        res_low = self.client.patch(f'/api/v1/products/variants/{self.variant_a.variant_id}/inventory/', {
            'quantity': 1
        })
        self.assertEqual(res_low.status_code, 400)
        self.assertIn('nhỏ hơn', res_low.data['message'])

        # Cập nhật hợp lệ
        res_ok = self.client.patch(f'/api/v1/products/variants/{self.variant_a.variant_id}/inventory/', {
            'quantity': 30
        })
        self.assertEqual(res_ok.status_code, 200)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 30)
        self.assertEqual(self.inventory_a.sellable_quantity, 28)

    def test_ownership_village_isolation(self):
        """Test 4: Manager Làng B không có quyền xem/sửa variant của Làng A."""
        self.client.force_authenticate(user=self.manager_b)

        # Manager B cố truy cập variant của Làng A
        res_view = self.client.get(f'/api/v1/products/variants/{self.variant_a.variant_id}/')
        self.assertEqual(res_view.status_code, 403)

        # Manager B cố điều chỉnh tồn kho của Làng A
        res_inv = self.client.patch(f'/api/v1/products/variants/{self.variant_a.variant_id}/inventory/', {
            'quantity': 50
        })
        self.assertEqual(res_inv.status_code, 403)

        # Manager B cố thêm variant vào sản phẩm của Làng A
        res_add = self.client.post(f'/api/v1/products/{self.product_a.product_id}/variants/', {
            'sku': 'HACK-SKU',
            'variant_name': 'Hacked',
            'price': 100000,
        })
        self.assertEqual(res_add.status_code, 403)

    def test_order_cancellation_and_inventory_rollback(self):
        """Test 5 & 6: Đặt hàng trừ kho -> Hủy đơn hoàn trả đúng số lượng -> Hủy lần 2 là idempotent."""
        self.client.force_authenticate(user=self.tourist)

        # 1. Thêm vào giỏ hàng 3 sản phẩm
        self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant_a.variant_id,
            'quantity': 3,
        })

        # Tồn kho ban đầu = 20
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 20)

        # 2. Tạo đơn hàng
        order_res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Nguyễn Văn Test',
            'recipient_phone': '0988776655',
            'shipping_address': 'Hà Nội',
        })
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.data['data']['order_id']

        # Tồn kho sau khi đặt phải giảm từ 20 xuống 17
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 17)

        # 3. Hủy đơn hàng lần 1 qua API cancel
        cancel_res = self.client.post(f'/api/v1/orders/{order_id}/cancel/')
        self.assertEqual(cancel_res.status_code, 200)
        self.assertTrue(cancel_res.data['success'])

        # Kiểm tra tồn kho được hoàn trả chính xác về 20
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 20)

        # 4. Hủy đơn hàng lần 2 (Idempotency test): Không được cộng kho thêm lần nữa!
        cancel_res_2 = self.client.post(f'/api/v1/orders/{order_id}/cancel/')
        self.assertEqual(cancel_res_2.status_code, 400)  # Rejection

        # Tồn kho vẫn phải là 20, KHÔNG ĐƯỢC thành 23!
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 20)

    def test_vendor_order_status_cancellation_rollback(self):
        """Test: Khi Quản lý làng nghề chuyển VendorOrder sang CANCELLED, kho được hoàn trả đúng."""
        self.client.force_authenticate(user=self.tourist)
        self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant_a.variant_id,
            'quantity': 4,
        })
        order_res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Trần Văn B',
            'recipient_phone': '0901234567',
            'shipping_address': 'Đà Nẵng',
        })
        self.assertEqual(order_res.status_code, 201)
        vendor_order_id = order_res.data['data']['vendor_orders'][0]['vendor_order_id']

        # Kho giảm 4 (20 -> 16)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 16)

        # Manager A hủy vendor_order
        self.client.force_authenticate(user=self.manager_a)
        patch_res = self.client.patch(f'/api/v1/vendor-orders/{vendor_order_id}/status/', {
            'status': 'CANCELLED'
        })
        self.assertEqual(patch_res.status_code, 200)

        # Kho được hoàn lại 4 -> 20
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 20)

        # Hủy lại lần nữa: Không được cộng tiếp
        patch_res_2 = self.client.patch(f'/api/v1/vendor-orders/{vendor_order_id}/status/', {
            'status': 'CANCELLED'
        })
        self.assertEqual(patch_res_2.status_code, 400)
        self.inventory_a.refresh_from_db()
        self.assertEqual(self.inventory_a.quantity, 20)
