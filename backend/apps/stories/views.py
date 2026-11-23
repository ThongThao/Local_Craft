from django.db.models import Q, Count
from rest_framework import generics, permissions, status
from rest_framework.views import APIView

from apps.common.responses import api_success, api_error
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification
from apps.notifications.services import VillageNotificationService

User = get_user_model()
from .models import CraftStory
from .serializers import CraftStorySerializer


def sync_story_knowledge_source(story):
    """
    Synchronizes KnowledgeSource status whenever a CraftStory status changes.
    - If story is APPROVED -> KnowledgeSource status becomes APPROVED.
    - If story is NOT APPROVED (HIDDEN, REJECTED, DRAFT, PENDING) -> KnowledgeSource status becomes ARCHIVED.
    """
    try:
        from apps.chatbot.models import KnowledgeSource
        if story.status == CraftStory.StoryStatus.APPROVED:
            KnowledgeSource.objects.filter(related_story=story).update(
                status=KnowledgeSource.KnowledgeStatus.APPROVED
            )
        else:
            KnowledgeSource.objects.filter(related_story=story).update(
                status=KnowledgeSource.KnowledgeStatus.ARCHIVED
            )
    except Exception:
        pass


def notify_admins_story_pending(story, is_update=False):
    """
    Creates notifications for Admin users when a story is submitted or resubmitted for review.
    Avoids duplicate unread notifications for the same story.
    """
    try:
        admin_users = User.objects.filter(user_roles__role__role_code='ADMIN').distinct()
        if not admin_users.exists():
            return

        # Find admins who already have an unread pending notification for this story
        existing_admin_ids = set(
            Notification.objects.filter(
                user__in=admin_users,
                notification_type='STORY_PENDING_APPROVAL',
                target_type='CRAFT_STORY',
                target_id=story.story_id,
                is_read=False,
            ).values_list('user_id', flat=True)
        )

        action_text = "đã cập nhật và gửi duyệt lại" if is_update else "đã gửi duyệt"
        notifs = [
            Notification(
                user=admin,
                notification_type='STORY_PENDING_APPROVAL',
                title=f"Duyệt câu chuyện: {story.title[:40]}",
                message=f"Làng nghề {story.village.village_name} {action_text} câu chuyện '{story.title}'.",
                target_type='CRAFT_STORY',
                target_id=story.story_id,
            )
            for admin in admin_users
            if admin.user_id not in existing_admin_ids
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)
    except Exception:
        pass


class CraftStoryListView(generics.ListCreateAPIView):
    """
    GET /api/v1/stories/
    - Anonymous / Tourist: Only APPROVED stories (can filter by village_id, artisan_id, search).
    - Village Manager: Strictly scoped to user.managed_village stories (can filter by status, artisan_id, search).
    - Admin: All stories (can filter by village_id, status, artisan_id, search).

    POST /api/v1/stories/
    - Village Manager creates story for their managed village (defaults to DRAFT or PENDING).
    - Admin can create for any village.
    """
    serializer_class = CraftStorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = CraftStory.objects.select_related('village', 'artisan')
        user = self.request.user
        params = self.request.query_params

        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        # 1. Scoping by role
        if is_admin:
            village_id = params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)
            status_param = params.get('status')
            if status_param and status_param != 'ALL' and status_param in CraftStory.StoryStatus.values:
                qs = qs.filter(status=status_param)

        elif is_manager:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return qs.none()
            # Strictly scoped to own village
            qs = qs.filter(village=user.managed_village)

            status_param = params.get('status')
            if status_param and status_param != 'ALL' and status_param in CraftStory.StoryStatus.values:
                qs = qs.filter(status=status_param)

        else:
            # Public or Tourist
            qs = qs.filter(status=CraftStory.StoryStatus.APPROVED)
            village_id = params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)

        # 2. Common filters: artisan_id & search
        artisan_id = params.get('artisan_id')
        if artisan_id:
            qs = qs.filter(artisan_id=artisan_id)

        search = params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search)
            )

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách câu chuyện di sản thành công")

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()

        # Enforce village ownership: Village managers can only create for their own village
        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=status.HTTP_403_FORBIDDEN)
            data['village'] = user.managed_village.village_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        story = serializer.save()
        sync_story_knowledge_source(story)

        # If created directly in PENDING status, notify admin
        if story.status == CraftStory.StoryStatus.PENDING:
            notify_admins_story_pending(story, is_update=False)

        return api_success(
            data=serializer.data,
            message="Tạo câu chuyện di sản thành công!",
            status_code=status.HTTP_201_CREATED
        )


class CraftStoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/stories/<id>/
    - Tourist / Public: Only view if APPROVED.
    - Village Manager: View own village's stories in any status, or APPROVED stories of other villages.
    - Admin: View any story.

    PUT/PATCH /api/v1/stories/<id>/
    - Only Village Manager for own village, or Admin.
    - When story is PENDING, editing is prohibited unless withdrawing to DRAFT.

    DELETE /api/v1/stories/<id>/
    - Only Village Manager for own village, or Admin.
    - Can only delete if status is DRAFT or REJECTED.
    """
    serializer_class = CraftStorySerializer
    queryset = CraftStory.objects.select_related('village', 'artisan')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        if not is_admin:
            if is_manager:
                manager_village_id = getattr(getattr(user, 'managed_village', None), 'village_id', None)
                if instance.village_id != manager_village_id and instance.status != CraftStory.StoryStatus.APPROVED:
                    return api_error(
                        message="Bạn không có quyền xem câu chuyện chưa được công khai của làng nghề khác.",
                        status_code=status.HTTP_403_FORBIDDEN
                    )
            else:
                if instance.status != CraftStory.StoryStatus.APPROVED:
                    return api_error(
                        message="Bạn không có quyền xem câu chuyện chưa được công khai.",
                        status_code=status.HTTP_403_FORBIDDEN
                    )

        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết câu chuyện thành công")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Prevent changing village for village managers
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN'):
            data['village'] = instance.village_id

        old_status = instance.status
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_story = serializer.save()
        sync_story_knowledge_source(updated_story)

        # If status transitioned to PENDING, notify admin (deduplicated)
        if updated_story.status == CraftStory.StoryStatus.PENDING and old_status != CraftStory.StoryStatus.PENDING:
            notify_admins_story_pending(updated_story, is_update=True)

        if user_has_role(request.user, 'ADMIN') and old_status != updated_story.status:
            try:
                if updated_story.status == CraftStory.StoryStatus.APPROVED:
                    VillageNotificationService.notify_story_status(updated_story.village, updated_story, is_approved=True)
                elif updated_story.status == CraftStory.StoryStatus.REJECTED:
                    VillageNotificationService.notify_story_status(updated_story.village, updated_story, is_approved=False)
            except Exception:
                pass

        return api_success(data=serializer.data, message="Cập nhật câu chuyện thành công!")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        if not user_has_role(request.user, 'ADMIN'):
            if instance.status == CraftStory.StoryStatus.PENDING:
                return api_error(
                    message="Không thể xóa câu chuyện đang chờ duyệt. Vui lòng rút về bản nháp trước khi xóa.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            if instance.status == CraftStory.StoryStatus.APPROVED:
                return api_error(
                    message="Không thể xóa câu chuyện đã được duyệt và xuất bản. Bạn có thể chuyển sang trạng thái Ẩn (HIDDEN).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            if instance.status == CraftStory.StoryStatus.HIDDEN:
                return api_error(
                    message="Không thể xóa câu chuyện đang tạm ẩn. Bạn có thể khôi phục hoặc gửi duyệt lại.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

        # Archive linked knowledge sources before removing story
        try:
            from apps.chatbot.models import KnowledgeSource
            KnowledgeSource.objects.filter(related_story=instance).update(
                status=KnowledgeSource.KnowledgeStatus.ARCHIVED
            )
        except Exception:
            pass

        self.perform_destroy(instance)
        return api_success(data=None, message="Xóa câu chuyện thành công!")


class CraftStorySubmitView(APIView):
    """
    POST /api/v1/stories/<pk>/submit/
    Submit a story for Admin approval (DRAFT / REJECTED / HIDDEN -> PENDING).
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]

    def post(self, request, pk, *args, **kwargs):
        try:
            story = CraftStory.objects.select_related('village', 'artisan').get(pk=pk)
        except CraftStory.DoesNotExist:
            return api_error(message="Không tìm thấy câu chuyện tương ứng.", status_code=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, story)

        if story.status == CraftStory.StoryStatus.PENDING:
            return api_error(message="Câu chuyện này đang ở trạng thái chờ duyệt.", status_code=status.HTTP_400_BAD_REQUEST)

        if story.status == CraftStory.StoryStatus.APPROVED:
            return api_error(message="Câu chuyện này đã được duyệt và xuất bản.", status_code=status.HTTP_400_BAD_REQUEST)

        # Validate minimum content requirements before submission
        if not story.title or len(story.title.strip()) < 3:
            return api_error(message="Tiêu đề câu chuyện phải có ít nhất 3 ký tự.", status_code=status.HTTP_400_BAD_REQUEST)
        if not story.content or len(story.content.strip()) < 10:
            return api_error(message="Nội dung câu chuyện phải có ít nhất 10 ký tự trước khi gửi duyệt.", status_code=status.HTTP_400_BAD_REQUEST)

        was_update = story.status in [CraftStory.StoryStatus.REJECTED, CraftStory.StoryStatus.HIDDEN]
        story.status = CraftStory.StoryStatus.PENDING
        story.save(update_fields=['status', 'updated_at'])
        sync_story_knowledge_source(story)

        # Notify Admin (deduplicated)
        notify_admins_story_pending(story, is_update=was_update)

        serializer = CraftStorySerializer(story, context={'request': request})
        return api_success(
            data=serializer.data,
            message="Đã gửi câu chuyện lên Admin để kiểm duyệt!"
        )


class CraftStorySummaryView(APIView):
    """
    GET /api/v1/stories/summary/
    Returns story KPIs (total, draft, pending, approved, rejected, hidden) for the village.
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]

    def get(self, request, *args, **kwargs):
        user = request.user
        params = request.query_params

        if user_has_role(user, 'ADMIN'):
            village_id = params.get('village_id')
            if village_id:
                qs = CraftStory.objects.filter(village_id=village_id)
            else:
                qs = CraftStory.objects.all()
        else:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=status.HTTP_403_FORBIDDEN)
            qs = CraftStory.objects.filter(village=user.managed_village)

        summary = qs.aggregate(
            total_stories=Count('story_id'),
            draft_count=Count('story_id', filter=Q(status=CraftStory.StoryStatus.DRAFT)),
            pending_count=Count('story_id', filter=Q(status=CraftStory.StoryStatus.PENDING)),
            approved_count=Count('story_id', filter=Q(status=CraftStory.StoryStatus.APPROVED)),
            rejected_count=Count('story_id', filter=Q(status=CraftStory.StoryStatus.REJECTED)),
            hidden_count=Count('story_id', filter=Q(status=CraftStory.StoryStatus.HIDDEN)),
        )

        return api_success(data=summary, message="Lấy số liệu tổng quan câu chuyện thành công")
