import decimal
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category
from apps.workshops.models import Workshop


class WorkshopFormV09Tests(TestCase):
    """
    Test suite for V09 – Form tạo / cập nhật Workshop:
    - Creation (DRAFT, PENDING)
    - Auto-slug generation
    - Validation (name, description, duration, price, min_participants, location)
    - Relationship & Ownership enforcement (village, artisan)
    - Update & Security checks
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Create Roles
        self.role_cv, _ = Role.objects.get_or_create(role_code="CRAFT_VILLAGE", defaults={"role_name": "Quản lý Làng nghề"})
        self.role_admin, _ = Role.objects.get_or_create(role_code="ADMIN", defaults={"role_name": "Quản trị viên"})

        # 2. Create Users
        self.manager_a_user = User.objects.create(
            email="manager_a@localcraft.vn",
            full_name="Nguyễn Văn Quản Lý A",
            status="ACTIVE",
        )
        self.manager_a_user.set_password("Password123!")
        self.manager_a_user.save()
        UserRole.objects.create(user=self.manager_a_user, role=self.role_cv)

        self.manager_b_user = User.objects.create(
            email="manager_b@localcraft.vn",
            full_name="Trần Thị Quản Lý B",
            status="ACTIVE",
        )
        self.manager_b_user.set_password("Password123!")
        self.manager_b_user.save()
        UserRole.objects.create(user=self.manager_b_user, role=self.role_cv)

        # 3. Create Villages
        self.village_a = CraftVillage.objects.create(
            village_name="Làng Gốm Bát Tràng",
            slug="lang-gom-bat-trang",
            description="Làng gốm Bát Tràng",
            province="Hà Nội",
            status="ACTIVE",
            manager_user=self.manager_a_user,
        )

        self.village_b = CraftVillage.objects.create(
            village_name="Làng Mây Tre Đan Phú Vinh",
            slug="lang-may-tre-dan-phu-vinh",
            description="Làng nghề Phú Vinh",
            province="Hà Nội",
            status="ACTIVE",
            manager_user=self.manager_b_user,
        )

        # 4. Create Artisans
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name="Nghệ nhân Gốm Trần Độ",
            bio="Bậc thầy vuốt gốm Bát Tràng",
            experience_years=35,
            verification_status="APPROVED",
        )

        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name="Nghệ nhân Mây Tre Nguyễn Văn B",
            bio="Nghệ nhân đan mây Phú Vinh",
            experience_years=20,
            verification_status="APPROVED",
        )

        # 5. Create Category
        self.category = Category.objects.create(
            category_name="Gốm Sứ & Mỹ Nghệ",
            slug="gom-su-my-nghe",
            status="ACTIVE",
        )

        # 6. Existing Workshop in Village B
        self.workshop_b = Workshop.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            category=self.category,
            workshop_name="Khóa học đan mây cơ bản",
            slug="khoa-hoc-dan-may-co-ban",
            description="Học viên tự tay đan làn mây truyền thống",
            duration_minutes=90,
            price_per_person=decimal.Decimal("200000.00"),
            min_participants=1,
            location_address="Nhà văn hóa Phú Vinh",
            status=Workshop.WorkshopStatus.DRAFT,
        )

    def test_manager_a_creates_workshop_draft_with_auto_slug(self):
        """Manager A creates a DRAFT workshop without providing slug; backend auto-generates slug."""
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "workshop_name": "Làm gốm vuốt tay thủ công Bát Tràng",
            "category": self.category.category_id,
            "artisan": self.artisan_a.artisan_id,
            "description": "Trải nghiệm tự tay tạo hình sản phẩm trên bàn xoay và tráng men.",
            "duration_minutes": 120,
            "price_per_person": "350000.00",
            "min_participants": 2,
            "location_address": "Xưởng gốm Trần Độ, Bát Tràng, Hà Nội",
            "status": "DRAFT",
        }
        res = self.client.post('/api/v1/workshops/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.data['data']

        self.assertEqual(data['workshop_name'], payload['workshop_name'])
        self.assertEqual(data['village'], self.village_a.village_id)
        self.assertEqual(data['status'], 'DRAFT')
        self.assertTrue(data['slug'].startswith('lam-gom-vuot-tay-thu-cong-bat-trang'))

        # Verify persisted in database
        ws_in_db = Workshop.objects.get(workshop_id=data['workshop_id'])
        self.assertEqual(ws_in_db.village_id, self.village_a.village_id)
        self.assertEqual(ws_in_db.artisan_id, self.artisan_a.artisan_id)

    def test_manager_a_creates_workshop_pending_for_review(self):
        """Manager A creates a workshop and submits directly for review (PENDING)."""
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "workshop_name": "Nung gốm củi cổ truyền",
            "category": self.category.category_id,
            "artisan": self.artisan_a.artisan_id,
            "description": "Quy trình chất củi và nung lò bầu truyền thống qua đêm.",
            "duration_minutes": 180,
            "price_per_person": "500000.00",
            "min_participants": 3,
            "location_address": "Khu lò bầu Bát Tràng, Hà Nội",
            "status": "PENDING",
        }
        res = self.client.post('/api/v1/workshops/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['data']['status'], 'PENDING')

    def test_manager_cannot_create_directly_approved(self):
        """Village manager cannot bypass admin review to set status=APPROVED."""
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "workshop_name": "Workshop tự duyệt trái phép",
            "category": self.category.category_id,
            "artisan": self.artisan_a.artisan_id,
            "description": "Cố tình đặt status APPROVED trái quyền hạn.",
            "duration_minutes": 60,
            "price_per_person": "100000.00",
            "min_participants": 1,
            "location_address": "Bát Tràng",
            "status": "APPROVED",
        }
        res = self.client.post('/api/v1/workshops/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_assign_artisan_from_another_village(self):
        """Manager A cannot assign Artisan B (from Village B) to their workshop."""
        self.client.force_authenticate(user=self.manager_a_user)
        payload = {
            "workshop_name": "Workshop sai nghệ nhân",
            "category": self.category.category_id,
            "artisan": self.artisan_b.artisan_id,  # From Village B!
            "description": "Nghệ nhân mây tre đi dạy làm gốm sai làng.",
            "duration_minutes": 60,
            "price_per_person": "100000.00",
            "min_participants": 1,
            "location_address": "Bát Tràng",
            "status": "DRAFT",
        }
        res = self.client.post('/api/v1/workshops/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('artisan', str(res.data))

    def test_validation_rejects_invalid_fields(self):
        """Form validation rejects empty name/description, negative price, duration <= 0."""
        self.client.force_authenticate(user=self.manager_a_user)

        # 1. Empty workshop name
        res = self.client.post('/api/v1/workshops/', {
            "workshop_name": "   ",
            "description": "Hợp lệ",
            "duration_minutes": 60,
            "price_per_person": "100000.00",
            "location_address": "Địa chỉ",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Negative price
        res = self.client.post('/api/v1/workshops/', {
            "workshop_name": "Workshop giá âm",
            "description": "Mô tả",
            "duration_minutes": 60,
            "price_per_person": "-50000.00",
            "location_address": "Địa chỉ",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Non-positive duration
        res = self.client.post('/api/v1/workshops/', {
            "workshop_name": "Workshop thời lượng 0",
            "description": "Mô tả",
            "duration_minutes": 0,
            "price_per_person": "100000.00",
            "location_address": "Địa chỉ",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Empty location_address
        res = self.client.post('/api/v1/workshops/', {
            "workshop_name": "Workshop thiếu địa chỉ",
            "description": "Mô tả",
            "duration_minutes": 60,
            "price_per_person": "100000.00",
            "location_address": "   ",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_updates_own_workshop(self):
        """Manager A can update their own workshop via PATCH."""
        self.client.force_authenticate(user=self.manager_a_user)

        # First create workshop
        ws = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.category,
            workshop_name="Tên cũ",
            slug="ten-cu-123456",
            description="Mô tả cũ",
            duration_minutes=60,
            price_per_person=decimal.Decimal("150000.00"),
            min_participants=1,
            location_address="Bát Tràng",
            status=Workshop.WorkshopStatus.DRAFT,
        )

        update_payload = {
            "workshop_name": "Tên mới đã cập nhật",
            "price_per_person": "250000.00",
            "duration_minutes": 90,
            "status": "PENDING",
        }
        res = self.client.patch(f'/api/v1/workshops/{ws.workshop_id}/', update_payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ws.refresh_from_db()
        self.assertEqual(ws.workshop_name, "Tên mới đã cập nhật")
        self.assertEqual(ws.price_per_person, decimal.Decimal("250000.00"))
        self.assertEqual(ws.duration_minutes, 90)
        self.assertEqual(ws.status, "PENDING")

    def test_manager_cannot_update_other_village_workshop(self):
        """Manager A cannot update Workshop belonging to Village B."""
        self.client.force_authenticate(user=self.manager_a_user)
        res = self.client.patch(
            f'/api/v1/workshops/{self.workshop_b.workshop_id}/',
            {"workshop_name": "Tấn công sửa đổi trái phép"}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
