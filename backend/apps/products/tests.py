from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product, ProductVariant, Inventory
from apps.workshops.models import Workshop, WorkshopSession


class BusinessAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Tourist User
        self.user = User.objects.create(
            email='tourist@localcraft.vn',
            full_name='Test Tourist',
            status=User.UserStatus.ACTIVE
        )
        self.user.set_password('Password@123')
        self.user.save()

        # Seed Village
        self.village = CraftVillage.objects.create(
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # Artisan (Informational profile, no user account)
        self.artisan = ArtisanProfile.objects.create(
            village=self.village,
            display_name='Nghệ nhân Test',
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        # Category
        self.category = Category.objects.create(
            category_name='Gốm sứ',
            slug='pottery',
            status=Category.CategoryStatus.ACTIVE,
        )

        # Product & Variant & Inventory
        self.product = Product.objects.create(
            village=self.village,
            artisan=self.artisan,
            category=self.category,
            product_name='Bình gốm Test',
            slug='binh-gom-test',
            description='Mô tả bình gốm',
            base_price=Decimal('500000.00'),
            status=Product.ProductStatus.APPROVED,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='TEST-SKU-1',
            variant_name='Màu men lam',
            price=Decimal('500000.00'),
            is_active=True,
        )
        self.inventory = Inventory.objects.create(
            variant=self.variant,
            quantity=10,
        )

    def test_list_villages(self):
        res = self.client.get('/api/v1/villages/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertGreaterEqual(len(res.data['data']), 1)

    def test_list_products(self):
        res = self.client.get('/api/v1/products/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data'][0]['product_name'], 'Bình gốm Test')

    def test_cart_and_order_flow(self):
        self.client.force_authenticate(user=self.user)

        # Add to cart
        add_res = self.client.post('/api/v1/cart/items/', {
            'variant_id': self.variant.variant_id,
            'quantity': 2,
        })
        self.assertEqual(add_res.status_code, 201)
        self.assertEqual(add_res.data['data']['total_items'], 2)

        # Create Order
        order_res = self.client.post('/api/v1/orders/', {
            'recipient_name': 'Nguyễn Văn A',
            'recipient_phone': '0912345678',
            'shipping_address': '123 Phố Huế, Hà Nội',
            'shipping_note': 'Giao giờ hành chính',
        })
        self.assertEqual(order_res.status_code, 201)
        self.assertTrue(order_res.data['success'])
        self.assertEqual(order_res.data['data']['items'][0]['quantity'], 2)
        self.assertEqual(len(order_res.data['data']['vendor_orders']), 1)
        self.assertEqual(order_res.data['data']['vendor_orders'][0]['village'], self.village.village_id)

        # Verify inventory deducted
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)

    def test_recommendation_query(self):
        res = self.client.post('/api/v1/query/', {
            'query': 'trải nghiệm làm gốm tại Hà Nội',
            'min_budget': 100000,
            'max_budget': 600000,
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])

    def test_chatbot_query(self):
        res = self.client.post('/api/v1/chatbot/query/', {
            'message': 'Giới thiệu về làng gốm Bát Tràng',
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertIn('message', res.data['data'])
