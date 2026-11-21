from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, Role, UserRole
from apps.artisans.models import ArtisanProfile
from apps.notifications.models import Notification
from apps.stories.models import CraftStory
from apps.villages.models import CraftVillage
from apps.chatbot.models import KnowledgeSource, KnowledgeChunk


class CraftStoryScreenV16TestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Setup Roles
        self.role_village, _ = Role.objects.get_or_create(
            role_code='CRAFT_VILLAGE', defaults={'role_name': 'Quản lý làng nghề'}
        )
        self.role_tourist, _ = Role.objects.get_or_create(
            role_code='TOURIST', defaults={'role_name': 'Du khách'}
        )
        self.role_admin, _ = Role.objects.get_or_create(
            role_code='ADMIN', defaults={'role_name': 'Quản trị viên'}
        )

        # 2. Village Manager A & Village A
        self.user_manager_a = User.objects.create(
            email='manager_a@localcraft.vn',
            full_name='Quản lý Làng A',
            status=User.UserStatus.ACTIVE,
        )
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

        # Artisan in Village A
        self.artisan_a = ArtisanProfile.objects.create(
            village=self.village_a,
            display_name='Nghệ nhân Nguyễn Văn A',
            bio='Bậc thầy gốm sứ',
            experience_years=30,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        # 3. Village Manager B & Village B
        self.user_manager_b = User.objects.create(
            email='manager_b@localcraft.vn',
            full_name='Quản lý Làng B',
            status=User.UserStatus.ACTIVE,
        )
        self.user_manager_b.set_password('Pass@123')
        self.user_manager_b.save()
        UserRole.objects.create(user=self.user_manager_b, role=self.role_village)

        self.village_b = CraftVillage.objects.create(
            manager_user=self.user_manager_b,
            village_name='Làng Chiếu Định Yên',
            slug='chieu-dinh-yen',
            province='Đồng Tháp',
            status=CraftVillage.VillageStatus.ACTIVE,
        )

        # Artisan in Village B
        self.artisan_b = ArtisanProfile.objects.create(
            village=self.village_b,
            display_name='Nghệ nhân Trần Thị B',
            bio='Bậc thầy dệt chiếu',
            experience_years=25,
            verification_status=ArtisanProfile.VerificationStatus.APPROVED,
        )

        # 4. Unassigned Manager
        self.user_unassigned = User.objects.create(
            email='unassigned@localcraft.vn',
            full_name='Chưa gán làng',
            status=User.UserStatus.ACTIVE,
        )
        self.user_unassigned.set_password('Pass@123')
        self.user_unassigned.save()
        UserRole.objects.create(user=self.user_unassigned, role=self.role_village)

        # 5. Tourist & Admin
        self.user_tourist = User.objects.create(
            email='tourist@localcraft.vn',
            full_name='Du Khách Một',
            status=User.UserStatus.ACTIVE,
        )
        self.user_tourist.set_password('Pass@123')
        self.user_tourist.save()
        UserRole.objects.create(user=self.user_tourist, role=self.role_tourist)

        self.user_admin = User.objects.create(
            email='admin@localcraft.vn',
            full_name='Quản trị viên',
            status=User.UserStatus.ACTIVE,
        )
        self.user_admin.set_password('Pass@123')
        self.user_admin.save()
        UserRole.objects.create(user=self.user_admin, role=self.role_admin)

        # Seed initial stories
        self.story_a_approved = CraftStory.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            title='Lịch sử hình thành gốm Bát Tràng',
            slug='lich-su-hinh-thanh-gom-bat-trang',
            summary='Hơn 700 năm lịch sử gìn giữ đất sét và lửa.',
            content='Nội dung chi tiết về gốm Bát Tràng qua các thời kỳ...',
            cover_image_url='https://res.cloudinary.com/localcraft/stories/story1.jpg',
            status=CraftStory.StoryStatus.APPROVED,
            published_at=timezone.now(),
        )

        self.story_a_draft = CraftStory.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            title='Bí quyết pha men rạn cổ truyền',
            slug='bi-quyet-pha-men-ran-co-truyen',
            summary='Kỹ thuật độc bản chỉ truyền lại trong dòng họ.',
            content='Chi tiết các công thức tro trấu và đất phù sa...',
            cover_image_url='https://res.cloudinary.com/localcraft/stories/story2.jpg',
            status=CraftStory.StoryStatus.DRAFT,
        )

        self.story_a_pending = CraftStory.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            title='Nghệ thuật đắp nổi hoa văn gốm men lam',
            slug='nghe-thuat-dap-noi-hoa-van-gom-men-lam',
            summary='Kỹ nghệ đắp nổi độc đáo.',
            content='Bài ký sự đang chờ ban quản trị kiểm duyệt...',
            status=CraftStory.StoryStatus.PENDING,
        )

        self.story_a_rejected = CraftStory.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            title='Thất truyền bài men tro trấu cổ',
            slug='that-truyen-bai-men-tro-trau-co',
            summary='Bài viết cần bổ sung tư liệu lịch sử xác thực.',
            content='Nội dung câu chuyện chưa đạt tiêu chuẩn kiểm duyệt của Admin...',
            status=CraftStory.StoryStatus.REJECTED,
        )

        self.story_a_hidden = CraftStory.objects.create(
            village=self.village_a,
            artisan=self.artisan_a,
            title='Kỹ thuật nung lò củi bí truyền',
            slug='ky-thuat-nung-lo-cui-bi-truyen',
            summary='Tạm thời ẩn do làng nghề đang cập nhật hình ảnh.',
            content='Nội dung kỹ thuật nung lò củi cổ truyền...',
            status=CraftStory.StoryStatus.HIDDEN,
        )

        # KnowledgeSource & Chunk linked to approved story for RAG Chatbot tests
        self.ks_approved = KnowledgeSource.objects.create(
            source_title='Tư liệu gốm Bát Tràng',
            source_type='STORY',
            source_content=self.story_a_approved.content,
            related_village=self.village_a,
            related_story=self.story_a_approved,
            status=KnowledgeSource.KnowledgeStatus.APPROVED,
            approved_by=self.user_admin,
            approved_at=timezone.now(),
        )
        self.chunk_approved = KnowledgeChunk.objects.create(
            knowledge_source=self.ks_approved,
            chunk_index=0,
            chunk_content='Gốm Bát Tràng có bề dày lịch sử hơn 700 năm, nổi tiếng với men rạn và men lam độc bản.',
        )

        self.story_b_draft = CraftStory.objects.create(
            village=self.village_b,
            artisan=self.artisan_b,
            title='Ký ức dệt chiếu Định Yên đêm chợ ma',
            slug='ky-uc-det-chieu-dinh-yen-dem-cho-ma',
            summary='Chợ họp lúc nửa đêm đến rạng sáng.',
            content='Chi tiết văn hóa chợ chiếu đêm độc nhất vô nhị...',
            status=CraftStory.StoryStatus.DRAFT,
        )

    # =========================================================================
    # 1. PUBLIC & TOURIST ACCESS TESTS
    # =========================================================================

    def test_anonymous_user_can_only_see_approved_stories(self):
        """Anonymous user only sees APPROVED stories."""
        res = self.client.get('/api/v1/stories/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        stories = res.data.get('data', [])
        self.assertEqual(len(stories), 1)
        self.assertEqual(stories[0]['story_id'], self.story_a_approved.story_id)

    def test_anonymous_cannot_view_draft_story_detail(self):
        """Anonymous gets 403 when requesting DRAFT story detail."""
        res = self.client.get(f'/api/v1/stories/{self.story_a_draft.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_view_pending_story_detail(self):
        """Anonymous gets 403 when requesting PENDING story detail."""
        res = self.client.get(f'/api/v1/stories/{self.story_a_pending.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_view_rejected_story_detail(self):
        """Anonymous gets 403 when requesting REJECTED story detail."""
        res = self.client.get(f'/api/v1/stories/{self.story_a_rejected.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_view_hidden_story_detail(self):
        """Anonymous gets 403 when requesting HIDDEN story detail."""
        res = self.client.get(f'/api/v1/stories/{self.story_a_hidden.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_tourist_cannot_view_draft_story_detail(self):
        """Tourist gets 403 when requesting non-approved story."""
        self.client.force_authenticate(user=self.user_tourist)
        res = self.client.get(f'/api/v1/stories/{self.story_a_draft.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_tourist_can_view_approved_story_detail(self):
        """Tourist can view APPROVED story detail."""
        self.client.force_authenticate(user=self.user_tourist)
        res = self.client.get(f'/api/v1/stories/{self.story_a_approved.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['title'], self.story_a_approved.title)

    def test_tourist_cannot_create_story(self):
        """Tourist does not have permission to create stories."""
        self.client.force_authenticate(user=self.user_tourist)
        res = self.client.post('/api/v1/stories/', {'title': 'Hack Story', 'content': 'Nội dung test hack'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 2. VILLAGE MANAGER SCOPE & IDOR ISOLATION TESTS
    # =========================================================================

    def test_manager_sees_all_statuses_for_own_village(self):
        """Village Manager A sees DRAFT, PENDING, APPROVED, REJECTED, HIDDEN of Village A, but NOT Village B."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.get('/api/v1/stories/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        stories = res.data.get('data', [])
        # Village A has 5 stories
        self.assertEqual(len(stories), 5)
        story_ids = [s['story_id'] for s in stories]
        self.assertIn(self.story_a_approved.story_id, story_ids)
        self.assertIn(self.story_a_draft.story_id, story_ids)
        self.assertIn(self.story_a_pending.story_id, story_ids)
        self.assertIn(self.story_a_rejected.story_id, story_ids)
        self.assertIn(self.story_a_hidden.story_id, story_ids)
        # Village B story must not appear
        self.assertNotIn(self.story_b_draft.story_id, story_ids)

    def test_manager_cannot_bypass_scope_with_village_id_param(self):
        """Village Manager A passing ?village_id=B cannot see stories of Village B."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.get(f'/api/v1/stories/?village_id={self.village_b.village_id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        stories = res.data.get('data', [])
        for s in stories:
            self.assertEqual(s['village'], self.village_a.village_id)

    def test_manager_cannot_view_or_edit_draft_of_other_village(self):
        """Village Manager A cannot view or edit draft of Village B."""
        self.client.force_authenticate(user=self.user_manager_a)
        # Retrieve non-approved story of Village B
        res_get = self.client.get(f'/api/v1/stories/{self.story_b_draft.story_id}/')
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        # Update story of Village B
        res_put = self.client.patch(
            f'/api/v1/stories/{self.story_b_draft.story_id}/',
            {'title': 'Tấn công sửa bài làng khác'}
        )
        self.assertEqual(res_put.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 3. CREATION & VALIDATION TESTS
    # =========================================================================

    def test_manager_create_story_auto_assigns_managed_village(self):
        """Creating a story automatically assigns user's managed village and generates slug."""
        self.client.force_authenticate(user=self.user_manager_a)
        payload = {
            'title': 'Ký ức lò bầu gốm sứ cổ',
            'summary': 'Những chiếc lò bầu nghi ngút khói qua trăm năm.',
            'content': 'Nội dung chi tiết về kỹ thuật xây và đốt lò bầu cổ truyền...',
            'cover_image_url': 'https://res.cloudinary.com/localcraft/stories/lo-bau.jpg',
            'artisan': self.artisan_a.artisan_id,
        }
        res = self.client.post('/api/v1/stories/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.data.get('data', {})
        self.assertEqual(data['village'], self.village_a.village_id)
        self.assertEqual(data['status'], CraftStory.StoryStatus.DRAFT)
        self.assertTrue(data['slug'].startswith('ky-uc-lo-bau-gom-su-co'))

    def test_manager_cannot_assign_artisan_from_another_village(self):
        """Assigning an artisan from another village raises validation error."""
        self.client.force_authenticate(user=self.user_manager_a)
        payload = {
            'title': 'Câu chuyện gốm sứ nhưng chọn nghệ nhân dệt chiếu',
            'content': 'Nội dung câu chuyện trải nghiệm đầy đủ...',
            'artisan': self.artisan_b.artisan_id,  # Belongs to Village B!
        }
        res = self.client.post('/api/v1/stories/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('artisan', str(res.data))

    def test_manager_cannot_self_approve_story(self):
        """Manager cannot set status=APPROVED directly."""
        self.client.force_authenticate(user=self.user_manager_a)
        payload = {
            'title': 'Cố tình tự duyệt câu chuyện',
            'content': 'Nội dung câu chuyện muốn tự duyệt mà không qua Admin...',
            'status': CraftStory.StoryStatus.APPROVED,
        }
        res = self.client.post('/api/v1/stories/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unassigned_manager_cannot_create_story(self):
        """User with CRAFT_VILLAGE role but without managed_village cannot create story."""
        self.client.force_authenticate(user=self.user_unassigned)
        res = self.client.post('/api/v1/stories/', {'title': 'Test title', 'content': 'Test content text'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 4. UPDATE & WORKFLOW TESTS
    # =========================================================================

    def test_manager_can_update_draft_story(self):
        """Manager can edit draft story."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.patch(
            f'/api/v1/stories/{self.story_a_draft.story_id}/',
            {'title': 'Bí quyết pha men rạn cổ truyền - Bản sửa đổi'}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_draft.refresh_from_db()
        self.assertEqual(self.story_a_draft.title, 'Bí quyết pha men rạn cổ truyền - Bản sửa đổi')

    def test_manager_cannot_edit_pending_story_without_withdrawing(self):
        """Manager cannot edit content of a story that is PENDING admin review."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.patch(
            f'/api/v1/stories/{self.story_a_pending.story_id}/',
            {'title': 'Chỉnh sửa khi đang chờ duyệt'}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_can_withdraw_pending_story_to_draft(self):
        """Manager can withdraw a PENDING story back to DRAFT."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.patch(
            f'/api/v1/stories/{self.story_a_pending.story_id}/',
            {'status': CraftStory.StoryStatus.DRAFT}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_pending.refresh_from_db()
        self.assertEqual(self.story_a_pending.status, CraftStory.StoryStatus.DRAFT)

    def test_manager_editing_approved_story_resubmits_for_review(self):
        """Editing an APPROVED story's content automatically moves it to PENDING for re-approval."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.patch(
            f'/api/v1/stories/{self.story_a_approved.story_id}/',
            {'content': 'Nội dung mới được cập nhật sau khi đã xuất bản...'}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_approved.refresh_from_db()
        self.assertEqual(self.story_a_approved.status, CraftStory.StoryStatus.PENDING)

    # =========================================================================
    # 5. SUBMIT ENDPOINT TESTS
    # =========================================================================

    def test_submit_draft_story_for_approval(self):
        """Submitting a DRAFT story transitions it to PENDING and notifies Admin."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.post(f'/api/v1/stories/{self.story_a_draft.story_id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_draft.refresh_from_db()
        self.assertEqual(self.story_a_draft.status, CraftStory.StoryStatus.PENDING)

        # Check notification was created for Admin
        notifs = Notification.objects.filter(target_type='CRAFT_STORY', target_id=self.story_a_draft.story_id)
        self.assertTrue(notifs.exists())

    def test_cannot_submit_already_pending_story(self):
        """Cannot submit a story that is already PENDING."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.post(f'/api/v1/stories/{self.story_a_pending.story_id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_submit_other_village_story(self):
        """Manager A cannot submit story of Village B."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.post(f'/api/v1/stories/{self.story_b_draft.story_id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 6. DELETE & SUMMARY TESTS
    # =========================================================================

    def test_manager_can_delete_draft_story(self):
        """Manager can delete DRAFT story."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.delete(f'/api/v1/stories/{self.story_a_draft.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(CraftStory.objects.filter(pk=self.story_a_draft.story_id).exists())

    def test_manager_cannot_delete_pending_or_approved_story(self):
        """Manager cannot delete PENDING or APPROVED story."""
        self.client.force_authenticate(user=self.user_manager_a)
        # Pending deletion blocked
        res_pending = self.client.delete(f'/api/v1/stories/{self.story_a_pending.story_id}/')
        self.assertEqual(res_pending.status_code, status.HTTP_400_BAD_REQUEST)

        # Approved deletion blocked
        res_approved = self.client.delete(f'/api/v1/stories/{self.story_a_approved.story_id}/')
        self.assertEqual(res_approved.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_delete_hidden_story(self):
        """Manager cannot delete HIDDEN story."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.delete(f'/api/v1/stories/{self.story_a_hidden.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_can_delete_rejected_story(self):
        """Manager can delete REJECTED story."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.delete(f'/api/v1/stories/{self.story_a_rejected.story_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(CraftStory.objects.filter(pk=self.story_a_rejected.story_id).exists())

    def test_summary_api_returns_correct_kpis(self):
        """Summary API returns correct counts for Village A."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.get('/api/v1/stories/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data.get('data', {})
        self.assertEqual(data['total_stories'], 5)
        self.assertEqual(data['approved_count'], 1)
        self.assertEqual(data['draft_count'], 1)
        self.assertEqual(data['pending_count'], 1)
        self.assertEqual(data['rejected_count'], 1)
        self.assertEqual(data['hidden_count'], 1)

    def test_filter_by_status_and_search(self):
        """Filter by status and keyword search works accurately."""
        self.client.force_authenticate(user=self.user_manager_a)
        # Filter by status=DRAFT
        res_draft = self.client.get('/api/v1/stories/?status=DRAFT')
        self.assertEqual(res_draft.status_code, status.HTTP_200_OK)
        stories_draft = res_draft.data.get('data', [])
        self.assertEqual(len(stories_draft), 1)
        self.assertEqual(stories_draft[0]['status'], 'DRAFT')

        # Search by keyword 'Bát Tràng'
        res_search = self.client.get('/api/v1/stories/?search=Bát Tràng')
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        stories_search = res_search.data.get('data', [])
        self.assertEqual(len(stories_search), 1)
        self.assertIn('Bát Tràng', stories_search[0]['title'])

    # =========================================================================
    # 7. STATE TRANSITION & NOTIFICATION TESTS
    # =========================================================================

    def test_manager_can_hide_approved_story(self):
        """Manager can transition an APPROVED story to HIDDEN."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.patch(
            f'/api/v1/stories/{self.story_a_approved.story_id}/',
            {'status': CraftStory.StoryStatus.HIDDEN}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_approved.refresh_from_db()
        self.assertEqual(self.story_a_approved.status, CraftStory.StoryStatus.HIDDEN)

        # Anonymous cannot view it now
        self.client.logout()
        res_anon = self.client.get(f'/api/v1/stories/{self.story_a_approved.story_id}/')
        self.assertEqual(res_anon.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_submit_hidden_story_for_approval(self):
        """Manager can submit a HIDDEN story for re-approval."""
        self.client.force_authenticate(user=self.user_manager_a)
        res = self.client.post(f'/api/v1/stories/{self.story_a_hidden.story_id}/submit/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.story_a_hidden.refresh_from_db()
        self.assertEqual(self.story_a_hidden.status, CraftStory.StoryStatus.PENDING)

    def test_admin_notification_deduplication(self):
        """Re-submitting a story does not create duplicate unread notifications for Admin."""
        self.client.force_authenticate(user=self.user_manager_a)
        # First submission
        res1 = self.client.post(f'/api/v1/stories/{self.story_a_draft.story_id}/submit/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        initial_notif_count = Notification.objects.filter(
            target_type='CRAFT_STORY', target_id=self.story_a_draft.story_id
        ).count()
        self.assertGreaterEqual(initial_notif_count, 1)

        # Manager withdraws to DRAFT
        self.client.patch(
            f'/api/v1/stories/{self.story_a_draft.story_id}/',
            {'status': CraftStory.StoryStatus.DRAFT}
        )

        # Manager submits again while previous notification is still unread
        res2 = self.client.post(f'/api/v1/stories/{self.story_a_draft.story_id}/submit/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        second_notif_count = Notification.objects.filter(
            target_type='CRAFT_STORY', target_id=self.story_a_draft.story_id
        ).count()
        # Count should remain identical due to deduplication of unread notifications
        self.assertEqual(initial_notif_count, second_notif_count)

    # =========================================================================
    # 8. CHATBOT KNOWLEDGE GROUNDING & LIFECYCLE TESTS
    # =========================================================================

    def test_chatbot_query_only_retrieves_approved_story(self):
        """Chatbot retrieval only includes APPROVED craft stories."""
        res = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'Hãy kể cho tôi về lịch sử hình thành gốm Bát Tràng'}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reply = res.data.get('data', {}).get('message', '')
        sources = res.data.get('data', {}).get('sources', [])
        # Should reference the approved story or knowledge chunk
        self.assertTrue(any('Bát Tràng' in s for s in sources))
        self.assertIn('Gốm Bát Tràng', reply)

    def test_chatbot_does_not_retrieve_hidden_or_rejected_or_draft_or_pending_story(self):
        """Chatbot retrieval NEVER returns DRAFT, PENDING, REJECTED, or HIDDEN stories."""
        # Query unique term from draft story: "Bí quyết pha men rạn cổ truyền"
        res_draft = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'Bí quyết pha men rạn cổ truyền trong dòng họ'}
        )
        self.assertEqual(res_draft.status_code, status.HTTP_200_OK)
        sources_draft = res_draft.data.get('data', {}).get('sources', [])
        self.assertFalse(any('Bí quyết pha men rạn' in s for s in sources_draft))

        # Query unique term from rejected story: "Thất truyền bài men tro trấu cổ"
        res_rejected = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'Thất truyền bài men tro trấu cổ'}
        )
        self.assertEqual(res_rejected.status_code, status.HTTP_200_OK)
        sources_rejected = res_rejected.data.get('data', {}).get('sources', [])
        self.assertFalse(any('Thất truyền' in s for s in sources_rejected))

        # Query unique term from hidden story: "Kỹ thuật nung lò củi bí truyền"
        res_hidden = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'Kỹ thuật nung lò củi bí truyền'}
        )
        self.assertEqual(res_hidden.status_code, status.HTTP_200_OK)
        sources_hidden = res_hidden.data.get('data', {}).get('sources', [])
        self.assertFalse(any('lò củi' in s for s in sources_hidden))

    def test_story_transition_to_hidden_immediately_revokes_chatbot_and_public_access(self):
        """When an APPROVED story transitions to HIDDEN, chatbot immediately stops using it."""
        # 1. Initially story_a_approved is used by chatbot
        res_before = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'lịch sử hình thành gốm Bát Tràng'}
        )
        self.assertEqual(res_before.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_before.data.get('data', {}).get('sources', [])) > 0)

        # 2. Village Manager transitions story to HIDDEN
        self.client.force_authenticate(user=self.user_manager_a)
        res_hide = self.client.patch(
            f'/api/v1/stories/{self.story_a_approved.story_id}/',
            {'status': CraftStory.StoryStatus.HIDDEN}
        )
        self.assertEqual(res_hide.status_code, status.HTTP_200_OK)

        # Verify KnowledgeSource status was synced to ARCHIVED
        self.ks_approved.refresh_from_db()
        self.assertEqual(self.ks_approved.status, KnowledgeSource.KnowledgeStatus.ARCHIVED)

        # 3. Chatbot query must now NOT return this story or its chunks
        self.client.logout()
        res_after = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'lịch sử hình thành gốm Bát Tràng'}
        )
        self.assertEqual(res_after.status_code, status.HTTP_200_OK)
        sources_after = res_after.data.get('data', {}).get('sources', [])
        self.assertFalse(any(self.story_a_approved.title in s for s in sources_after))

    def test_story_re_approved_becomes_available_to_chatbot(self):
        """When a story is re-approved by Admin, it becomes available to chatbot again."""
        # Story initially HIDDEN
        self.story_a_hidden.status = CraftStory.StoryStatus.APPROVED
        self.story_a_hidden.published_at = timezone.now()
        self.story_a_hidden.save()

        # Chatbot query can now retrieve it
        res = self.client.post(
            '/api/v1/chatbot/query/',
            {'message': 'Kỹ thuật nung lò củi'}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sources = res.data.get('data', {}).get('sources', [])
        self.assertTrue(any('nung lò củi' in s for s in sources))
