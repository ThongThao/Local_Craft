from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from apps.accounts.models import User, Role, UserRole
from apps.villages.models import CraftVillage
from apps.artisans.models import ArtisanProfile
from apps.products.models import Category, Product, ProductImage, ProductVariant
from apps.workshops.models import Workshop, WorkshopSession
from apps.bookings.models import WorkshopBooking
from apps.orders.models import Order, OrderItem
from apps.notifications.models import Notification
from apps.reviews.models import Review


class ReviewAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Setup Roles
        self.role_village, _ = Role.objects.get_or_create(role_code='CRAFT_VILLAGE', defaults={'role_name': 'Quản lý làng nghề'})
        self.role_tourist, _ = Role.objects.get_or_create(role_code='TOURIST', defaults={'role_name': 'Du khách'})
        self.role_admin, _ = Role.objects.get_or_create(role_code='ADMIN', defaults={'role_name': 'Quản trị viên'})

        # 2. Village Manager A & Village A
        self.user_manager_a = User.objects.create(email='manager_a@localcraft.vn', full_name='Quản lý Làng A', status=User.UserStatus.ACTIVE)
        self.user_manager_a.set_password('Pass@123')
        self.user_manager_a.save()
        UserRole.objects.create(user=self.user_manager_a, role=self.role_village)

        self.village_a = CraftVillage.objects.create(
            manager_user=self.user_manager_a,
            village_name='Làng Gốm Bát Tràng',
            slug='bat-trang',
            province='Hà Nội',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # 3. Village Manager B & Village B
        self.user_manager_b = User.objects.create(email='manager_b@localcraft.vn', full_name='Quản lý Làng B', status=User.UserStatus.ACTIVE)
        self.user_manager_b.set_password('Pass@123')
        self.user_manager_b.save()
        UserRole.objects.create(user=self.user_manager_b, role=self.role_village)

        self.village_b = CraftVillage.objects.create(
            manager_user=self.user_manager_b,
            village_name='Làng Trầm Hương Quảng Nam',
            slug='tram-huong-quang-nam',
            province='Quảng Nam',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # 4. Unassigned Manager (has CRAFT_VILLAGE role but no managed_village)
        self.user_unassigned = User.objects.create(email='unassigned@localcraft.vn', full_name='Chưa gán làng', status=User.UserStatus.ACTIVE)
        self.user_unassigned.set_password('Pass@123')
        self.user_unassigned.save()
        UserRole.objects.create(user=self.user_unassigned, role=self.role_village)

        # 5. Admin & Tourist
        self.user_admin = User.objects.create(email='admin@localcraft.vn', full_name='Admin Hệ Thống', status=User.UserStatus.ACTIVE)
        self.user_admin.set_password('Pass@123')
        self.user_admin.save()
        UserRole.objects.create(user=self.user_admin, role=self.role_admin)

        self.tourist_1 = User.objects.create(email='tourist1@localcraft.vn', full_name='Nguyễn Văn Du Khách', status=User.UserStatus.ACTIVE)
        self.tourist_1.set_password('Pass@123')
        self.tourist_1.save()
        UserRole.objects.create(user=self.tourist_1, role=self.role_tourist)

        self.tourist_2 = User.objects.create(email='tourist2@localcraft.vn', full_name='Trần Thị Khách', status=User.UserStatus.ACTIVE)
        self.tourist_2.set_password('Pass@123')
        self.tourist_2.save()
        UserRole.objects.create(user=self.tourist_2, role=self.role_tourist)

        # 6. Categories & Products
        self.cat = Category.objects.create(category_name='Gốm sứ thủ công', slug='gom-su')

        # Product in Village A
        self.prod_a1 = Product.objects.create(
            village=self.village_a,
            category=self.cat,
            product_name='Bình hoa vuốt tay Bát Tràng',
            slug='binh-hoa-bat-trang',
            description='Gốm vuốt tay men rạn cổ',
            base_price=350000,
            status=Product.ProductStatus.APPROVED,
        )
        ProductImage.objects.create(product=self.prod_a1, image_url='https://localcraft.vn/img/a1.jpg', is_primary=True)

        self.variant_a1 = ProductVariant.objects.create(
            product=self.prod_a1,
            variant_name='Men rạn cổ điển',
            sku='VA-BT-01',
            price=350000,
        )

        self.prod_a2 = Product.objects.create(
            village=self.village_a,
            category=self.cat,
            product_name='Ấm chén tử sa men lam',
            slug='am-chen-tu-sa',
            description='Bộ ấm trà thủ công',
            base_price=550000,
            status=Product.ProductStatus.APPROVED,
        )
        self.variant_a2 = ProductVariant.objects.create(
            product=self.prod_a2,
            variant_name='Bộ 6 chén',
            sku='VA-BT-02',
            price=550000,
        )

        # Product in Village B
        self.prod_b = Product.objects.create(
            village=self.village_b,
            category=self.cat,
            product_name='Vòng tay Trầm hương',
            slug='vong-tay-tram-huong',
            description='Trầm hương nguyên khối',
            base_price=1200000,
            status=Product.ProductStatus.APPROVED,
        )

        # 7. Workshops & Bookings
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Nguyễn Văn Gốm',
            experience_years=30,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        self.ws_a = Workshop.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            category=self.cat,
            workshop_name='Trải nghiệm vuốt gốm và vẽ hoa văn',
            slug='trai-nghiem-vuot-gom',
            description='Tự tay tạo hình sản phẩm gốm',
            duration_minutes=120,
            price_per_person=250000,
            location_address='Số 10 Xóm 2 Bát Tràng',
            status=Workshop.WorkshopStatus.APPROVED,
        )

        now = timezone.now()
        self.session_a = WorkshopSession.objects.create(
            workshop=self.ws_a,
            start_at=now + timedelta(days=2),
            end_at=now + timedelta(days=2, hours=2),
            capacity=10,
            price_per_person=250000,
            status=WorkshopSession.SessionStatus.OPEN,
        )

        self.booking_a = WorkshopBooking.objects.create(
            booking_code='WB-BATTRANG-001',
            user=self.tourist_1,
            session=self.session_a,
            participant_count=2,
            unit_price=250000,
            total_amount=500000,
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )

        # 8. Reviews
        # Review 1: Village A Product (5 stars)
        self.rev_a1 = Review.objects.create(
            user=self.tourist_1,
            product=self.prod_a1,
            rating=5,
            title='Bình hoa quá xuất sắc',
            content='Men rạn cực kỳ tinh xảo, đóng gói cẩn thận!',
            status=Review.ReviewStatus.VISIBLE,
        )

        # Review 2: Village A Workshop (4 stars)
        self.rev_a2 = Review.objects.create(
            user=self.tourist_2,
            booking=self.booking_a,
            rating=4,
            title='Trải nghiệm đáng giá',
            content='Nghệ nhân hướng dẫn rất tận tình, con tôi rất thích.',
            status=Review.ReviewStatus.VISIBLE,
        )

        # Review 3: Village A Product - Hidden (2 stars)
        self.rev_a3 = Review.objects.create(
            user=self.tourist_2,
            product=self.prod_a2,
            rating=2,
            title='Men bị sứt nhẹ',
            content='Giao hàng hơi lâu, góc ấm bị sứt nhẹ.',
            status=Review.ReviewStatus.HIDDEN,
        )

        # Review 4: Village B Product (5 stars)
        self.rev_b1 = Review.objects.create(
            user=self.tourist_1,
            product=self.prod_b,
            rating=5,
            title='Mùi trầm thơm tự nhiên',
            content='Đúng trầm thật, mùi ngọt dịu.',
            status=Review.ReviewStatus.VISIBLE,
        )

    def test_village_manager_list_scoped_to_own_village(self):
        """Manager A should only see reviews of Village A (3 reviews), not Village B (1 review)."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get('/api/v1/reviews/')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', [])
        review_ids = [r['review_id'] for r in data]
        self.assertIn(self.rev_a1.review_id, review_ids)
        self.assertIn(self.rev_a2.review_id, review_ids)
        self.assertIn(self.rev_a3.review_id, review_ids)
        self.assertNotIn(self.rev_b1.review_id, review_ids)
        self.assertEqual(len(data), 3)

    def test_village_manager_cannot_bypass_scope_via_param(self):
        """Manager A passes village_id of Village B, backend ignores it and stays scoped to Village A."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get(f'/api/v1/reviews/?village_id={self.village_b.village_id}')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', [])
        review_ids = [r['review_id'] for r in data]
        self.assertNotIn(self.rev_b1.review_id, review_ids)
        self.assertEqual(len(data), 3)

    def test_unassigned_village_manager_returns_403(self):
        """Manager without managed_village returns 403 Forbidden."""
        self.client.force_authenticate(user=self.user_unassigned)
        response = self.client.get('/api/v1/reviews/')
        self.assertEqual(response.status_code, 403)
        self.assertIn('chưa được liên kết', response.json().get('message', ''))

    def test_review_summary_kpi(self):
        """Summary endpoint aggregates correct database counts, avg, and reply counts for Village A."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get('/api/v1/reviews/summary/')
        self.assertEqual(response.status_code, 200)
        kpi = response.json().get('data', {})

        self.assertEqual(kpi['total_reviews'], 3)
        # Ratings: 5, 4, 2 -> average = (5+4+2)/3 = 3.67
        self.assertEqual(kpi['average_rating'], 3.67)
        self.assertEqual(kpi['rating_5_count'], 1)
        self.assertEqual(kpi['rating_4_count'], 1)
        self.assertEqual(kpi['rating_3_count'], 0)
        self.assertEqual(kpi['rating_2_count'], 1)
        self.assertEqual(kpi['rating_1_count'], 0)
        self.assertEqual(kpi['product_reviews_count'], 2)
        self.assertEqual(kpi['workshop_reviews_count'], 1)
        self.assertEqual(kpi['visible_reviews_count'], 2)
        self.assertEqual(kpi['hidden_reviews_count'], 1)
        self.assertTrue(kpi['has_reply_support'])
        self.assertEqual(kpi['replied_count'], 0)
        self.assertEqual(kpi['unreplied_count'], 3)

    def test_filter_by_rating(self):
        """Filter by rating=5 should return only 5-star reviews of Village A."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get('/api/v1/reviews/?rating=5')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', [])
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['review_id'], self.rev_a1.review_id)

    def test_filter_by_target_type(self):
        """Filter by target_type PRODUCT and WORKSHOP."""
        self.client.force_authenticate(user=self.user_manager_a)

        # PRODUCT
        res_prod = self.client.get('/api/v1/reviews/?target_type=PRODUCT')
        self.assertEqual(res_prod.status_code, 200)
        data_prod = res_prod.json().get('data', [])
        self.assertEqual(len(data_prod), 2)
        self.assertTrue(all(r['target_type'] == 'PRODUCT' for r in data_prod))

        # WORKSHOP
        res_ws = self.client.get('/api/v1/reviews/?target_type=WORKSHOP')
        self.assertEqual(res_ws.status_code, 200)
        data_ws = res_ws.json().get('data', [])
        self.assertEqual(len(data_ws), 1)
        self.assertEqual(data_ws[0]['review_id'], self.rev_a2.review_id)
        self.assertEqual(data_ws[0]['target_type'], 'WORKSHOP')

    def test_search_reviews(self):
        """Search by keyword in review content or title."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get('/api/v1/reviews/?search=tinh xảo')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', [])
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['review_id'], self.rev_a1.review_id)

    def test_pagination(self):
        """Pagination returns metadata and sliced items."""
        self.client.force_authenticate(user=self.user_manager_a)
        response = self.client.get('/api/v1/reviews/?page=1&page_size=2')
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', {})
        self.assertIn('items', data)
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['total'], 3)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['page_size'], 2)
        self.assertEqual(data['total_pages'], 2)

    def test_review_detail_permissions(self):
        """Manager A can retrieve detail for own review, but gets 403 on Village B review."""
        self.client.force_authenticate(user=self.user_manager_a)

        # Own review
        res_own = self.client.get(f'/api/v1/reviews/{self.rev_a1.review_id}/')
        self.assertEqual(res_own.status_code, 200)
        self.assertEqual(res_own.json()['data']['review_id'], self.rev_a1.review_id)
        self.assertEqual(res_own.json()['data']['village_name'], 'Làng Gốm Bát Tràng')

        # Other village review -> 403 Forbidden
        res_other = self.client.get(f'/api/v1/reviews/{self.rev_b1.review_id}/')
        self.assertEqual(res_other.status_code, 403)
        self.assertIn('không có quyền xem đánh giá của làng nghề khác', res_other.json().get('message', ''))

        # Non-existent review -> 404 Not Found
        res_none = self.client.get('/api/v1/reviews/999999/')
        self.assertEqual(res_none.status_code, 404)

    def test_admin_can_access_all_and_filter(self):
        """Admin can view all reviews or filter by village."""
        self.client.force_authenticate(user=self.user_admin)

        # All reviews across system
        res_all = self.client.get('/api/v1/reviews/')
        self.assertEqual(res_all.status_code, 200)
        data = res_all.json().get('data', [])
        self.assertEqual(len(data), 4)

        # Admin filtered by Village B
        res_b = self.client.get(f'/api/v1/reviews/?village_id={self.village_b.village_id}')
        self.assertEqual(res_b.status_code, 200)
        data_b = res_b.json().get('data', [])
        self.assertEqual(len(data_b), 1)
        self.assertEqual(data_b[0]['review_id'], self.rev_b1.review_id)

    def test_public_user_only_sees_visible_reviews(self):
        """Unauthenticated user only sees VISIBLE reviews."""
        res = self.client.get(f'/api/v1/reviews/?village_id={self.village_a.village_id}')
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', [])
        # Only rev_a1 and rev_a2 are VISIBLE; rev_a3 is HIDDEN
        review_ids = [r['review_id'] for r in data]
        self.assertIn(self.rev_a1.review_id, review_ids)
        self.assertIn(self.rev_a2.review_id, review_ids)
        self.assertNotIn(self.rev_a3.review_id, review_ids)

    # =========================================================================
    # V15 REVIEW REPLY TESTS
    # =========================================================================
    def test_village_manager_reply_success_and_creates_notification(self):
        """Village Manager A successfully replies to a review in Village A and creates customer notification."""
        self.client.force_authenticate(user=self.user_manager_a)
        reply_text = 'Làng gốm Bát Tràng trân trọng cảm ơn quý khách đã tin chọn sản phẩm bình hoa vuốt tay!'

        response = self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': reply_text},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', {})
        self.assertEqual(data['reply_content'], reply_text)
        self.assertTrue(data['is_replied'])
        self.assertEqual(data['replied_by_name'], self.user_manager_a.full_name)
        self.assertIsNotNone(data['replied_at'])
        self.assertIsNone(data['reply_updated_at'])

        # Check DB update
        self.rev_a1.refresh_from_db()
        self.assertEqual(self.rev_a1.reply_content, reply_text)
        self.assertEqual(self.rev_a1.replied_by, self.user_manager_a)
        self.assertIsNotNone(self.rev_a1.replied_at)
        self.assertTrue(self.rev_a1.is_replied)

        # Check Notification created for tourist_1
        notif = Notification.objects.filter(
            user=self.tourist_1,
            notification_type='REVIEW_REPLY',
            target_id=self.rev_a1.review_id
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn('Bát Tràng', notif.title)
        self.assertIn('bình hoa', notif.message.lower())

    def test_village_manager_update_reply_sets_updated_at(self):
        """Updating an existing reply preserves replied_at and updates reply_updated_at."""
        self.client.force_authenticate(user=self.user_manager_a)
        initial_reply = 'Cảm ơn bạn!'
        self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': initial_reply},
            format='json'
        )
        self.rev_a1.refresh_from_db()
        original_replied_at = self.rev_a1.replied_at

        # Update reply
        updated_reply = 'Làng nghề xin chân thành cảm ơn đánh giá quý báu của bạn!'
        response = self.client.patch(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': updated_reply},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', {})
        self.assertEqual(data['reply_content'], updated_reply)
        self.assertIsNotNone(data['reply_updated_at'])

        self.rev_a1.refresh_from_db()
        self.assertEqual(self.rev_a1.reply_content, updated_reply)
        self.assertEqual(self.rev_a1.replied_at, original_replied_at)
        self.assertIsNotNone(self.rev_a1.reply_updated_at)

    def test_village_manager_cannot_reply_other_village_review(self):
        """Manager B cannot reply to review rev_a1 of Village A -> 403 Forbidden."""
        self.client.force_authenticate(user=self.user_manager_b)
        response = self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': 'Trầm hương can thiệp gốm'},
            format='json'
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('không có quyền phản hồi đánh giá của làng nghề khác', response.json().get('message', ''))

    def test_tourist_cannot_reply(self):
        """Tourist role is blocked from replying to reviews -> 403 Forbidden."""
        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': 'Tự trả lời đánh giá của mình'},
            format='json'
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('không có quyền phản hồi', response.json().get('message', ''))

    def test_reply_validation_blank_and_max_length(self):
        """Empty reply or reply exceeding 1000 characters returns 400 Bad Request."""
        self.client.force_authenticate(user=self.user_manager_a)

        # Blank reply
        res_blank = self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': '   '},
            format='json'
        )
        self.assertEqual(res_blank.status_code, 400)

        # Excessively long reply (> 1000 chars)
        res_long = self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': 'a' * 1001},
            format='json'
        )
        self.assertEqual(res_long.status_code, 400)

    def test_filter_by_reply_status(self):
        """Filter reviews by reply_status=REPLIED and reply_status=UNREPLIED."""
        self.client.force_authenticate(user=self.user_manager_a)

        # Initially all 3 reviews are unreplied
        res_unrep = self.client.get('/api/v1/reviews/?reply_status=UNREPLIED')
        self.assertEqual(res_unrep.status_code, 200)
        self.assertEqual(len(res_unrep.json().get('data', [])), 3)

        res_rep = self.client.get('/api/v1/reviews/?reply_status=REPLIED')
        self.assertEqual(res_rep.status_code, 200)
        self.assertEqual(len(res_rep.json().get('data', [])), 0)

        # Reply to rev_a1
        self.client.post(
            f'/api/v1/reviews/{self.rev_a1.review_id}/reply/',
            {'reply_content': 'Đã phản hồi'},
            format='json'
        )

        # After reply: 1 replied, 2 unreplied
        res_rep2 = self.client.get('/api/v1/reviews/?reply_status=REPLIED')
        self.assertEqual(len(res_rep2.json().get('data', [])), 1)
        self.assertEqual(res_rep2.json().get('data', [])[0]['review_id'], self.rev_a1.review_id)

        res_unrep2 = self.client.get('/api/v1/reviews/?reply_status=UNREPLIED')
        self.assertEqual(len(res_unrep2.json().get('data', [])), 2)

        # Check summary KPI updates
        res_sum = self.client.get('/api/v1/reviews/summary/')
        self.assertEqual(res_sum.json()['data']['replied_count'], 1)
        self.assertEqual(res_sum.json()['data']['unreplied_count'], 2)

    def test_admin_can_reply_any_review(self):
        """System Admin has authority to reply to any review across any village."""
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.post(
            f'/api/v1/reviews/{self.rev_b1.review_id}/reply/',
            {'reply_content': 'Admin phản hồi hỗ trợ làng nghề Trầm Hương.'},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json().get('data', {})
        self.assertEqual(data['replied_by_name'], self.user_admin.full_name)

    # =========================================================================
    # CREATE REVIEW ELIGIBILITY TESTS
    # =========================================================================
    def test_customer_cannot_review_unpurchased_product(self):
        """Tourist cannot review product if no DELIVERED/COMPLETED order exists -> 400 ValidationError."""
        self.client.force_authenticate(user=self.tourist_1)
        # Tourist 1 has never bought prod_a2
        response = self.client.post(
            '/api/v1/reviews/',
            {
                'product': self.prod_a2.product_id,
                'rating': 5,
                'title': 'Chưa mua nhưng muốn đánh giá',
                'content': 'Sản phẩm trông đẹp',
            },
            format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('sau khi đã mua và nhận hàng thành công', str(response.json()))

    def test_customer_can_review_purchased_and_delivered_product(self):
        """Tourist can review product once an order containing it is DELIVERED or COMPLETED."""
        order = Order.objects.create(
            user=self.tourist_1,
            order_code='ORD-TEST-001',
            status=Order.OrderStatus.DELIVERED,
            subtotal=550000,
            total_amount=550000,
            recipient_name='Nguyễn Văn Du Khách',
            recipient_phone='0912345678',
            shipping_address='Hà Nội',
        )
        OrderItem.objects.create(
            order=order,
            variant=self.variant_a2,
            product_name_snapshot='Ấm chén tử sa men lam',
            variant_name_snapshot='Bộ 6 chén',
            sku_snapshot='VA-BT-02',
            unit_price=550000,
            quantity=1,
            line_total=550000,
        )

        self.client.force_authenticate(user=self.tourist_1)
        response = self.client.post(
            '/api/v1/reviews/',
            {
                'product': self.prod_a2.product_id,
                'rating': 5,
                'title': 'Đã nhận ấm chén rất đẹp',
                'content': 'Đóng gói bọt khí dày, màu men lam sáng bóng.',
            },
            format='json'
        )
        self.assertEqual(response.status_code, 201)
        data = response.json().get('data', {})
        self.assertEqual(data['product'], self.prod_a2.product_id)
        self.assertEqual(data['rating'], 5)

    def test_customer_cannot_review_workshop_if_not_completed_or_not_owner(self):
        """Tourist cannot review workshop booking belonging to someone else or not completed."""
        # Booking for tourist_1 without any existing review:
        booking_other = WorkshopBooking.objects.create(
            booking_code='WB-BATTRANG-OTHER',
            user=self.tourist_1,
            session=self.session_a,
            participant_count=1,
            unit_price=250000,
            total_amount=250000,
            status=WorkshopBooking.BookingStatus.COMPLETED,
        )
        self.client.force_authenticate(user=self.tourist_2)
        res_other = self.client.post(
            '/api/v1/reviews/',
            {
                'booking': booking_other.booking_id,
                'rating': 5,
                'title': 'Đánh giá booking của người khác',
            },
            format='json'
        )
        self.assertEqual(res_other.status_code, 400)
        self.assertIn('không thuộc về tài khoản', str(res_other.json()))

        # Incomplete booking for tourist 2:
        booking_pending = WorkshopBooking.objects.create(
            booking_code='WB-BATTRANG-PENDING',
            user=self.tourist_2,
            session=self.session_a,
            participant_count=1,
            unit_price=250000,
            total_amount=250000,
            status=WorkshopBooking.BookingStatus.PENDING,
        )
        res_pending = self.client.post(
            '/api/v1/reviews/',
            {
                'booking': booking_pending.booking_id,
                'rating': 5,
                'title': 'Chưa đi học nhưng đánh giá',
            },
            format='json'
        )
        self.assertEqual(res_pending.status_code, 400)
        self.assertIn('sau khi đã hoàn thành buổi trải nghiệm', str(res_pending.json()))
