from django.utils import timezone
from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from .models import WorkshopBooking
from .serializers import WorkshopBookingSerializer, CreateBookingSerializer


class BookingListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/bookings/ - List user's bookings
    POST /api/v1/bookings/ - Book a workshop session
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bookings = WorkshopBooking.objects.filter(user=request.user).select_related(
            'session', 'session__workshop', 'session__workshop__artisan'
        ).order_by('-created_at')
        serializer = WorkshopBookingSerializer(bookings, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đăng ký workshop thành công")

    def post(self, request):
        serializer = CreateBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return api_success(
            data=WorkshopBookingSerializer(booking).data,
            message="Đặt chỗ trải nghiệm thành công!",
            status_code=status.HTTP_201_CREATED
        )


class BookingDetailCancelView(generics.GenericAPIView):
    """
    GET /api/v1/bookings/<id>/
    POST /api/v1/bookings/<id>/cancel/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return WorkshopBooking.objects.select_related(
                'session', 'session__workshop', 'session__workshop__artisan'
            ).get(pk=pk, user=self.request.user)
        except WorkshopBooking.DoesNotExist:
            return None

    def get(self, request, pk):
        booking = self.get_object(pk)
        if not booking:
            return api_error(message="Không tìm thấy đơn đăng ký workshop", status_code=404)
        return api_success(data=WorkshopBookingSerializer(booking).data, message="Lấy chi tiết thành công")

    def post(self, request, pk):
        booking = self.get_object(pk)
        if not booking:
            return api_error(message="Không tìm thấy đơn đăng ký workshop", status_code=404)

        if booking.status in [WorkshopBooking.BookingStatus.CANCELLED, WorkshopBooking.BookingStatus.COMPLETED]:
            return api_error(message=f"Đơn đăng ký đang ở trạng thái {booking.status}, không thể hủy")

        booking.status = WorkshopBooking.BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=['status', 'cancelled_at', 'updated_at'])

        # Restore session capacity
        session = booking.session
        session.booked_participants = max(0, session.booked_participants - booking.participant_count)
        if session.status == session.SessionStatus.FULL:
            session.status = session.SessionStatus.OPEN
        session.save(update_fields=['booked_participants', 'status', 'updated_at'])

        return api_success(data=WorkshopBookingSerializer(booking).data, message="Hủy đơn đặt workshop thành công")
