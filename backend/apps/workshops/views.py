from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from .models import Workshop, WorkshopSession
from .serializers import WorkshopSerializer, WorkshopDetailSerializer, WorkshopSessionSerializer


class WorkshopListView(generics.ListAPIView):
    """
    GET /api/v1/workshops/
    List active workshops with village/search filters.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = WorkshopSerializer

    def get_queryset(self):
        qs = Workshop.objects.filter(
            status=Workshop.WorkshopStatus.APPROVED
        ).select_related('artisan', 'artisan__village', 'category').prefetch_related('sessions')

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(workshop_name__icontains=search)

        artisan_id = self.request.query_params.get('artisan_id')
        if artisan_id:
            qs = qs.filter(artisan_id=artisan_id)

        village_id = self.request.query_params.get('village_id')
        if village_id:
            qs = qs.filter(artisan__village_id=village_id)

        min_price = self.request.query_params.get('min_price')
        if min_price:
            qs = qs.filter(price_per_person__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            qs = qs.filter(price_per_person__lte=max_price)

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách workshop thành công")


class WorkshopDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/workshops/<id>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = WorkshopDetailSerializer
    queryset = Workshop.objects.filter(
        status=Workshop.WorkshopStatus.APPROVED
    ).select_related('artisan', 'artisan__village', 'category').prefetch_related('sessions')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết workshop thành công")


class WorkshopSessionsView(generics.ListAPIView):
    """
    GET /api/v1/workshops/<id>/sessions/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = WorkshopSessionSerializer

    def get_queryset(self):
        workshop_id = self.kwargs.get('pk')
        return WorkshopSession.objects.filter(
            workshop_id=workshop_id,
            status=WorkshopSession.SessionStatus.OPEN
        ).order_by('start_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách phiên workshop thành công")
