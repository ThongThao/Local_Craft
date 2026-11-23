from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from apps.notifications.services import VillageNotificationService
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

        user = self.request.user
        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_village_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        if is_admin:
            village_id = self.request.query_params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)
        elif is_village_manager:
            # CRAFT_VILLAGE: Strictly scope to the user's managed village
            if hasattr(user, 'managed_village') and user.managed_village:
                qs = qs.filter(village=user.managed_village)
            else:
                qs = qs.none()
        else:
            # Tourist or anonymous: only show APPROVED artisans
            qs = qs.filter(verification_status=ArtisanProfile.VerificationStatus.APPROVED)
            village_id = self.request.query_params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)

        # Verification status filter
        verification_status = self.request.query_params.get('verification_status')
        if verification_status and (is_admin or is_village_manager):
            qs = qs.filter(verification_status=verification_status)

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
            village = user.managed_village
            data['village'] = village.village_id
            # Non-admin creates with PENDING status for review
            data['verification_status'] = ArtisanProfile.VerificationStatus.PENDING
            data['verification_note'] = None
        else:
            village_id = data.get('village')
            # pyrefly: ignore [missing-import]
            from apps.villages.models import CraftVillage
            village = CraftVillage.objects.filter(village_id=village_id).first() if village_id else None

        display_name = data.get('display_name', '').strip()
        if village and display_name:
            if ArtisanProfile.objects.filter(village=village, display_name__iexact=display_name).exists():
                return api_error(
                    message=f"Nghệ nhân với tên '{display_name}' đã tồn tại trong làng nghề.",
                    status_code=400
                )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_success(
            data=serializer.data,
            message="Thêm hồ sơ nghệ nhân thành công!",
            status_code=status.HTTP_201_CREATED
        )


class ArtisanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/artisans/<id>/ - Public view (approved) or owner/admin view
    PUT/PATCH /api/v1/artisans/<id>/ - Update artisan (Village Manager of this village or Admin)
    DELETE /api/v1/artisans/<id>/ - Delete artisan (Village Manager of this village or Admin)
    """
    queryset = ArtisanProfile.objects.select_related('village')
    serializer_class = ArtisanProfileDetailSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_village_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        if is_admin:
            return obj

        if is_village_manager:
            if not hasattr(user, 'managed_village') or not user.managed_village or obj.village_id != user.managed_village.village_id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Bạn không có quyền truy cập hồ sơ nghệ nhân của làng nghề khác.")
            return obj

        # Anonymous or tourist can only view APPROVED artisans
        if obj.verification_status != ArtisanProfile.VerificationStatus.APPROVED:
            from rest_framework.exceptions import NotFound
            raise NotFound("Hồ sơ nghệ nhân không tồn tại hoặc chưa được phê duyệt.")
        return obj

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

        data = request.data.copy()
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')

        # Prevent changing village to another village for village managers
        if not is_admin:
            if 'village' in data:
                data['village'] = instance.village_id
            # Non-admin cannot unilaterally APPROVE or edit verification_note
            if 'verification_status' in data and data['verification_status'] == ArtisanProfile.VerificationStatus.APPROVED:
                data['verification_status'] = instance.verification_status
            if 'verification_note' in data:
                data['verification_note'] = instance.verification_note

        # Duplicate check if display_name changed
        display_name = data.get('display_name')
        if display_name and display_name.strip() != instance.display_name:
            if ArtisanProfile.objects.filter(
                village=instance.village,
                display_name__iexact=display_name.strip()
            ).exclude(artisan_id=instance.artisan_id).exists():
                return api_error(
                    message=f"Nghệ nhân với tên '{display_name.strip()}' đã tồn tại trong làng nghề.",
                    status_code=400
                )

        old_status = instance.verification_status
        serializer = ArtisanProfileSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        if is_admin and old_status != instance.verification_status:
            try:
                if instance.verification_status == ArtisanProfile.VerificationStatus.APPROVED:
                    VillageNotificationService.notify_artisan_status(instance.village, instance, is_approved=True)
                elif instance.verification_status == ArtisanProfile.VerificationStatus.REJECTED:
                    VillageNotificationService.notify_artisan_status(instance.village, instance, is_approved=False, reason=instance.verification_note or "")
            except Exception:
                pass
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
