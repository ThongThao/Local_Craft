from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from .models import ArtisanProfile
from .serializers import ArtisanProfileSerializer, ArtisanProfileDetailSerializer


class ArtisanListView(generics.ListCreateAPIView):
    """
    GET /api/v1/artisans/ - List approved artisans with village/experience filters.
    POST /api/v1/artisans/ - Create an artisan profile for the village (Village Manager or Admin).
    """
    serializer_class = ArtisanProfileSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = ArtisanProfile.objects.select_related('village').prefetch_related('products', 'workshops')

        # If tourist or anonymous, only show APPROVED
        user = self.request.user
        is_manager_or_admin = (
            user and user.is_authenticated and
            (user_has_role(user, 'ADMIN') or user_has_role(user, 'CRAFT_VILLAGE'))
        )
        if not is_manager_or_admin:
            qs = qs.filter(verification_status=ArtisanProfile.VerificationStatus.APPROVED)

        village_id = self.request.query_params.get('village_id')
        if village_id:
            qs = qs.filter(village_id=village_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(display_name__icontains=search)

        return qs.order_by('-experience_years')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_success(
            data=serializer.data,
            message="Lấy danh sách nghệ nhân thành công"
        )

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
        artisan = serializer.save()
        return api_success(
            data=serializer.data,
            message="Thêm hồ sơ nghệ nhân thành công!",
            status_code=status.HTTP_201_CREATED
        )


class ArtisanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/artisans/<id>/ - Public view
    PUT/PATCH /api/v1/artisans/<id>/ - Update artisan (Village Manager of this village or Admin)
    DELETE /api/v1/artisans/<id>/ - Delete artisan (Village Manager of this village or Admin)
    """
    queryset = ArtisanProfile.objects.select_related('village')
    serializer_class = ArtisanProfileDetailSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(
            data=serializer.data,
            message="Lấy thông tin nghệ nhân thành công"
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Prevent changing village to another village for village managers
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN') and 'village' in data:
            data['village'] = instance.village_id

        serializer = ArtisanProfileSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_success(
            data=serializer.data,
            message="Cập nhật hồ sơ nghệ nhân thành công!"
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return api_success(
            data=None,
            message="Xóa hồ sơ nghệ nhân thành công!"
        )
