from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from .models import CraftVillage
from .serializers import CraftVillageSerializer


class CraftVillageListView(generics.ListCreateAPIView):
    """
    GET /api/v1/villages/ - List active craft villages with search & province filters.
    POST /api/v1/villages/ - Create new village (Admin or newly registered CRAFT_VILLAGE manager).
    """
    serializer_class = CraftVillageSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = CraftVillage.objects.filter(status=CraftVillage.VillageStatus.ACTIVE).select_related('manager_user').prefetch_related('artisans', 'stories')
        province = self.request.query_params.get('province')
        if province:
            qs = qs.filter(province__icontains=province)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(village_name__icontains=search)
        return qs.order_by('village_name')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_success(
            data=serializer.data,
            message="Lấy danh sách làng nghề thành công"
        )

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()

        # Enforce one-village-per-manager rule
        if not user_has_role(user, 'ADMIN'):
            if hasattr(user, 'managed_village') and user.managed_village:
                return api_error(message="Tài khoản này đã quản lý một làng nghề khác.", status_code=400)
            data['manager_user'] = user.user_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        village = serializer.save()
        return api_success(
            data=serializer.data,
            message="Tạo làng nghề thành công!",
            status_code=status.HTTP_201_CREATED
        )


class CraftVillageDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/villages/<id>/ or /api/v1/villages/slug/<slug>/
    PUT/PATCH /api/v1/villages/<id>/ - Update village (Village Manager or Admin)
    """
    serializer_class = CraftVillageSerializer
    queryset = CraftVillage.objects.select_related('manager_user').prefetch_related('artisans', 'stories')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(
            data=serializer.data,
            message="Lấy thông tin làng nghề thành công"
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Non-admin cannot reassign manager_user
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN') and 'manager_user' in data:
            data.pop('manager_user')

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_success(
            data=serializer.data,
            message="Cập nhật thông tin làng nghề thành công!"
        )


class MyVillageView(generics.GenericAPIView):
    """
    GET /api/v1/villages/my-village/ - Get logged-in user's managed village
    PUT /api/v1/villages/my-village/ - Update logged-in user's managed village
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]
    serializer_class = CraftVillageSerializer

    def get(self, request):
        if not hasattr(request.user, 'managed_village') or not request.user.managed_village:
            return api_error(message="Tài khoản chưa được chỉ định quản lý làng nghề nào.", status_code=404)
        serializer = self.get_serializer(request.user.managed_village)
        return api_success(data=serializer.data, message="Lấy thông tin làng nghề thành công")

    def put(self, request):
        if not hasattr(request.user, 'managed_village') or not request.user.managed_village:
            return api_error(message="Tài khoản chưa được chỉ định quản lý làng nghề nào.", status_code=404)
        village = request.user.managed_village

        data = request.data.copy()
        # Non-admin cannot reassign manager
        if not user_has_role(request.user, 'ADMIN') and 'manager_user' in data:
            data.pop('manager_user')

        serializer = self.get_serializer(village, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_success(data=serializer.data, message="Cập nhật thông tin làng nghề thành công!")
