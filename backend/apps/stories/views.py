from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from .models import CraftStory
from .serializers import CraftStorySerializer


class CraftStoryListView(generics.ListAPIView):
    """
    GET /api/v1/stories/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CraftStorySerializer

    def get_queryset(self):
        qs = CraftStory.objects.filter(
            status=CraftStory.StoryStatus.APPROVED
        ).select_related('village', 'artisan')

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


class CraftStoryDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/stories/<id>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CraftStorySerializer
    queryset = CraftStory.objects.filter(
        status=CraftStory.StoryStatus.APPROVED
    ).select_related('village', 'artisan')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết câu chuyện thành công")
