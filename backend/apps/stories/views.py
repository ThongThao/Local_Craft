from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from .models import CraftStory
from .serializers import CraftStorySerializer


class CraftStoryListView(generics.ListCreateAPIView):
    """
    GET /api/v1/stories/ - List approved stories with village/artisan filters.
    POST /api/v1/stories/ - Create story (Village Manager for own village, or Admin).
    """
    serializer_class = CraftStorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = CraftStory.objects.select_related('village', 'artisan')

        user = self.request.user
        is_manager_or_admin = (
            user and user.is_authenticated and
            (user_has_role(user, 'ADMIN') or user_has_role(user, 'CRAFT_VILLAGE'))
        )
        if not is_manager_or_admin:
            qs = qs.filter(status=CraftStory.StoryStatus.APPROVED)

        village_id = self.request.query_params.get('village_id')
        if village_id:
            qs = qs.filter(village_id=village_id)
        artisan_id = self.request.query_params.get('artisan_id')
        if artisan_id:
            qs = qs.filter(artisan_id=artisan_id)
        return qs.order_by('-published_at', '-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách câu chuyện di sản thành công")

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()

        # Enforce village ownership: village managers can only create for their own village
        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=403)
            data['village'] = user.managed_village.village_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        story = serializer.save()
        return api_success(
            data=serializer.data,
            message="Tạo câu chuyện di sản thành công!",
            status_code=status.HTTP_201_CREATED
        )


class CraftStoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/stories/<id>/
    PUT/PATCH /api/v1/stories/<id>/ - Update story (Village Manager or Admin)
    DELETE /api/v1/stories/<id>/ - Delete story (Village Manager or Admin)
    """
    serializer_class = CraftStorySerializer
    queryset = CraftStory.objects.select_related('village', 'artisan')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết câu chuyện thành công")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Prevent changing village for village managers
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN') and 'village' in data:
            data['village'] = instance.village_id

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_success(data=serializer.data, message="Cập nhật câu chuyện thành công!")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return api_success(data=None, message="Xóa câu chuyện thành công!")
