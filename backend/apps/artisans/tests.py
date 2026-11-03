from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product
from apps.products.serializers import ProductSerializer
from apps.workshops.models import Workshop
from apps.workshops.serializers import WorkshopSerializer


class ArtisanProfileTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Roles
        self.role_village, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Quản lý làng nghề'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Du khách'})
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Quản trị viên'})

        # Manager A & Village A
        self.user_a = User.objects.create(email='manager_a@localcraft.vn', full_name='Manager A', status=User.UserStatus.ACTIVE)
        self.user_a.set_password('Pass@123')
        self.user_a.save()
        UserRole.objects.create(user=self.user_a, role=self.role_village)

        self.village_a = CraftVillage.objects.create(
            manager_user=self.user_a,
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # Manager B & Village B
        self.user_b = User.objects.create(email='manager_b@localcraft.vn', full_name='Manager B', status=User.UserStatus.ACTIVE)
        self.user_b.set_password('Pass@123')
        self.user_b.save()
        UserRole.objects.create(user=self.user_b, role=self.role_village)

        self.village_b = CraftVillage.objects.create(
            manager_user=self.user_b,
            village_name='Làng Lụa Vạn Phúc',
            slug='van-phuc',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # Existing Artisan in Village A
        self.artisan_a_approved = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Trần Văn Độ',
            experience_years=40,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        self.artisan_a_pending = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Chờ Duyệt',
            experience_years=10,
            verification_status=ArtisanProfile.VerificationStatus.PENDING,
        )

        # Category for products/workshops
        self.category = Category.objects.create(
            category_name='Gốm sứ',
            slug='pottery-artisan-test',
            status=Category.CategoryStatus.ACTIVE,
        )

    # TEST 01: Create Artisan hợp lệ
    def test_01_create_artisan_valid(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'display_name': 'Nghệ nhân Mới A',
            'experience_years': 15,
            'bio': 'Tiểu sử nghệ nhân mới',
        }
        res = self.client.post('/api/v1/artisans/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['data']['display_name'], 'Nghệ nhân Mới A')
        self.assertEqual(res.data['data']['verification_status'], 'PENDING')
        self.assertEqual(res.data['data']['village'], self.village_a.village_id)

    # TEST 02: Create Artisan với experience_years = -1
    def test_02_create_artisan_negative_experience(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'display_name': 'Nghệ nhân Lỗi Kinh Nghiệm',
            'experience_years': -1,
        }
        res = self.client.post('/api/v1/artisans/', payload, format='json')
        self.assertEqual(res.status_code, 400)

    # TEST 03: Create Artisan trùng tên trong cùng làng nghề
    def test_03_create_artisan_duplicate_name(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'display_name': 'Trần Văn Độ',
            'experience_years': 20,
        }
        res = self.client.post('/api/v1/artisans/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('đã tồn tại', str(res.data))

    # TEST 04 & 05: Artisan PENDING hoặc REJECTED cố public selling content -> REJECT
    def test_04_product_with_pending_artisan_rejected(self):
        data = {
            'village': self.village_a.village_id,
            'artisan': self.artisan_a_pending.artisan_id,
            'category': self.category.category_id,
            'product_name': 'Bình gốm không hợp lệ',
            'slug': 'binh-gom-khong-hop-le',
            'description': 'Mô tả chi tiết sản phẩm kiểm thử',
            'base_price': '500000.00',
            'status': 'APPROVED',
        }
        serializer = ProductSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('artisan', serializer.errors)

    # TEST 06: Artisan APPROVED public selling content -> ALLOWED
    def test_06_product_with_approved_artisan_allowed(self):
        data = {
            'village': self.village_a.village_id,
            'artisan': self.artisan_a_approved.artisan_id,
            'category': self.category.category_id,
            'product_name': 'Bình gốm hợp lệ',
            'slug': 'binh-gom-hop-le',
            'description': 'Mô tả chi tiết sản phẩm hợp lệ',
            'base_price': '500000.00',
            'status': 'APPROVED',
        }
        serializer = ProductSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    # TEST 07 & 08: Artisan PENDING cố public workshop -> REJECT
    def test_07_workshop_with_pending_artisan_rejected(self):
        data = {
            'village': self.village_a.village_id,
            'artisan': self.artisan_a_pending.artisan_id,
            'category': self.category.category_id,
            'workshop_name': 'Workshop chuốt gốm',
            'slug': 'workshop-chuot-gom',
            'description': 'Mô tả lớp học',
            'location_address': 'Xưởng Gốm Bát Tràng, Hà Nội',
            'duration_minutes': 120,
            'price_per_person': '300000.00',
            'min_participants': 2,
            'max_participants': 10,
            'status': 'APPROVED',
        }
        serializer = WorkshopSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('artisan', serializer.errors)

    # TEST 09: Artisan APPROVED public workshop -> ALLOWED
    def test_09_workshop_with_approved_artisan_allowed(self):
        data = {
            'village': self.village_a.village_id,
            'artisan': self.artisan_a_approved.artisan_id,
            'category': self.category.category_id,
            'workshop_name': 'Workshop chuốt gốm chuẩn',
            'slug': 'workshop-chuot-gom-chuan',
            'description': 'Mô tả lớp học chuẩn',
            'location_address': 'Xưởng Gốm Bát Tràng, Hà Nội',
            'duration_minutes': 120,
            'price_per_person': '300000.00',
            'min_participants': 2,
            'max_participants': 10,
            'status': 'APPROVED',
        }
        serializer = WorkshopSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    # TEST 12: Manager của Village A không được truy cập/sửa/xóa Artisan của Village B
    def test_12_manager_cannot_access_other_village_artisan(self):
        # Create an artisan in Village B
        artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name='Nghệ nhân Lụa B',
            experience_years=25,
            verification_status=ArtisanProfile.VerificationStatus.PENDING,
        )

        # Manager A attempts to update Artisan B
        self.client.force_authenticate(user=self.user_a)
        res = self.client.patch(f'/api/v1/artisans/{artisan_b.artisan_id}/', {'display_name': 'Hack Name'}, format='json')
        self.assertEqual(res.status_code, 403)

        # Manager A attempts to delete Artisan B
        res_del = self.client.delete(f'/api/v1/artisans/{artisan_b.artisan_id}/')
        self.assertEqual(res_del.status_code, 403)

    # TEST 13: GET /api/v1/artisans/ as Village Manager strictly scopes to their own village
    def test_13_get_artisans_scoped_to_managed_village(self):
        # Create an artisan in Village B
        ArtisanProfile.objects.create(
            village=self.village_b,
            display_name='Nghệ nhân Lụa Làng B',
            experience_years=20,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        self.client.force_authenticate(user=self.user_a)
        res = self.client.get('/api/v1/artisans/')
        self.assertEqual(res.status_code, 200)
        data = res.data['data']

        # Ensure only Village A artisans are returned
        village_ids = {a['village'] for a in data}
        self.assertEqual(village_ids, {self.village_a.village_id})
