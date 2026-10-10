from django.utils import timezone
from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách thông báo thành công")


class NotificationMarkReadView(generics.GenericAPIView):
    """
    POST /api/v1/notifications/<id>/read/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
            return api_success(data=NotificationSerializer(notif).data, message="Đánh dấu đã đọc thành công")
        except Notification.DoesNotExist:
            return api_error(message="Thông báo không tồn tại", status_code=404)
