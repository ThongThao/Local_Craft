from django.utils import timezone
from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/
    Optional Query Parameters:
      - is_read: 'true' | 'false' (filter read status)
      - limit: int (default 20, max 100)
      - offset: int (default 0)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by('-created_at')
        is_read_param = self.request.query_params.get('is_read')
        if is_read_param is not None:
            if is_read_param.lower() in ['true', '1']:
                qs = qs.filter(is_read=True)
            elif is_read_param.lower() in ['false', '0']:
                qs = qs.filter(is_read=False)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        total_count = qs.count()
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        try:
            limit = min(int(request.query_params.get('limit', 20)), 100)
        except (ValueError, TypeError):
            limit = 20

        try:
            offset = max(int(request.query_params.get('offset', 0)), 0)
        except (ValueError, TypeError):
            offset = 0

        paged_qs = qs[offset:offset + limit]
        serializer = self.get_serializer(paged_qs, many=True)

        return api_success(
            data={
                'notifications': serializer.data,
                'total_count': total_count,
                'unread_count': unread_count,
                'limit': limit,
                'offset': offset,
            },
            message="Lấy danh sách thông báo thành công"
        )


class NotificationUnreadCountView(generics.GenericAPIView):
    """
    GET /api/v1/notifications/unread-count/
    Lightweight endpoint returning unread notification count for the Topbar badge.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return api_success(
            data={"unread_count": count},
            message="Lấy số lượng thông báo chưa đọc thành công"
        )


class NotificationMarkReadView(generics.GenericAPIView):
    """
    POST /api/v1/notifications/<id>/read/
    Marks a single notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            if not notif.is_read:
                notif.is_read = True
                notif.read_at = timezone.now()
                notif.save(update_fields=['is_read', 'read_at'])
            return api_success(data=NotificationSerializer(notif).data, message="Đánh dấu đã đọc thành công")
        except Notification.DoesNotExist:
            return api_error(message="Thông báo không tồn tại", status_code=404)


class NotificationReadAllView(generics.GenericAPIView):
    """
    POST /api/v1/notifications/read-all/
    Marks all notifications for the authenticated user as read in a single query.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=now)
        return api_success(
            data={"updated_count": updated_count},
            message="Đã đánh dấu tất cả thông báo là đã đọc"
        )


class NotificationDeleteView(generics.GenericAPIView):
    """
    DELETE /api/v1/notifications/<id>/
    Deletes a notification belonging to the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            notif.delete()
            return api_success(data=None, message="Xóa thông báo thành công")
        except Notification.DoesNotExist:
            return api_error(message="Thông báo không tồn tại", status_code=404)
