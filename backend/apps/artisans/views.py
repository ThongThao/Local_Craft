from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from apps.common.permissions import IsArtisan
from .models import ArtisanProfile
from .serializers import ArtisanProfileSerializer, ArtisanProfileDetailSerializer


class ArtisanListView(generics.ListAPIView):
    """
    GET /api/v1/artisans/
    List approved artisans with village/experience filters.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ArtisanProfileSerializer

    def get_queryset(self):
        qs = ArtisanProfile.objects.filter(
            verification_status=ArtisanProfile.VerificationStatus.APPROVED
        ).select_related('user', 'village').prefetch_related('products', 'workshops')

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


class ArtisanDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/artisans/<id>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ArtisanProfileDetailSerializer
    queryset = ArtisanProfile.objects.filter(
        verification_status=ArtisanProfile.VerificationStatus.APPROVED
    ).select_related('user', 'village')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(
            data=serializer.data,
            message="Lấy thông tin nghệ nhân thành công"
        )


class ArtisanMeView(generics.GenericAPIView):
    """
    GET, PUT /api/v1/artisans/me/
    Manage the logged-in user's artisan profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ArtisanProfileSerializer

    def get(self, request):
        try:
            profile = request.user.artisan_profile
            serializer = self.get_serializer(profile)
            return api_success(data=serializer.data, message="Lấy hồ sơ nghệ nhân thành công")
        except ArtisanProfile.DoesNotExist:
            return api_error(message="Tài khoản chưa có hồ sơ nghệ nhân", status_code=404)

    def put(self, request):
        try:
            profile = request.user.artisan_profile
        except ArtisanProfile.DoesNotExist:
            # Create a pending artisan profile application
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            profile = serializer.save(user=request.user, verification_status=ArtisanProfile.VerificationStatus.PENDING)
            return api_success(
                data=self.get_serializer(profile).data,
                message="Đã nộp đơn đăng ký nghệ nhân, đang chờ duyệt",
                status_code=201
            )

        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return api_success(data=self.get_serializer(updated).data, message="Cập nhật hồ sơ nghệ nhân thành công")
