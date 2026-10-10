from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from .models import CraftVillage
from .serializers import CraftVillageSerializer


class CraftVillageListView(generics.ListAPIView):
    """
    GET /api/v1/villages/
    List active craft villages with search & province filters.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CraftVillageSerializer

    def get_queryset(self):
        qs = CraftVillage.objects.filter(status=CraftVillage.VillageStatus.ACTIVE).prefetch_related('artisans', 'stories')
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


class CraftVillageDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/villages/<id>/ or /api/v1/villages/slug/<slug>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CraftVillageSerializer
    queryset = CraftVillage.objects.filter(status=CraftVillage.VillageStatus.ACTIVE)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(
            data=serializer.data,
            message="Lấy thông tin làng nghề thành công"
        )
