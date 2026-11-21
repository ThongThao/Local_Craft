from django.utils import timezone
import logging
from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from apps.common.permissions import user_has_role
from .models import WorkshopBooking
from .serializers import (
    WorkshopBookingSerializer,
    WorkshopBookingListSerializer,
    WorkshopBookingDetailSerializer,
    CreateBookingSerializer,
    BookingAttendanceSerializer,
)

logger = logging.getLogger(__name__)


class BookingListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/bookings/ - List bookings (scoped by role: Tourist sees own, Craft Village sees managed village, Admin sees all/filtered)
    POST /api/v1/bookings/ - Book a workshop session
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        user = request.user

        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        if is_admin:
            qs = WorkshopBooking.objects.all()
            village_id = request.query_params.get('village_id')
            if village_id and str(village_id).isdigit():
                qs = qs.filter(session__workshop__village_id=int(village_id))
        elif is_village_manager:
            if hasattr(user, 'managed_village') and user.managed_village:
                qs = WorkshopBooking.objects.filter(
                    session__workshop__village=user.managed_village
                )
            else:
                return api_error(message="Tài khoản chưa được liên kết với làng nghề.", status_code=status.HTTP_403_FORBIDDEN)
        else:
            qs = WorkshopBooking.objects.filter(user=user)

        # Status filter
        status_param = request.query_params.get('status')
        if status_param and status_param != 'ALL':
            if status_param in WorkshopBooking.BookingStatus.values:
                qs = qs.filter(status=status_param)

        # Workshop filter
        workshop_id = request.query_params.get('workshop_id')
        if workshop_id and workshop_id != 'ALL' and str(workshop_id).isdigit():
            qs = qs.filter(session__workshop_id=int(workshop_id))

        # Search filter (booking_code, user full_name, workshop_name)
        search = request.query_params.get('search')
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(booking_code__icontains=s) |
                Q(user__full_name__icontains=s) |
                Q(session__workshop__workshop_name__icontains=s)
            )

        qs = qs.select_related(
            'user',
            'session',
            'session__workshop',
            'session__workshop__village',
            'session__workshop__artisan'
        ).order_by('-created_at')

        # Use PII-minimized list serializer
        serializer = WorkshopBookingListSerializer(qs, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đăng ký workshop thành công")

    def post(self, request):
        if not user_has_role(request.user, 'TOURIST'):
            return api_error(
                message="Chức năng đặt chỗ workshop chỉ dành riêng cho tài khoản Du khách.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        serializer = CreateBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return api_success(
            data=WorkshopBookingDetailSerializer(booking).data,
            message="Đặt chỗ trải nghiệm thành công!",
            status_code=status.HTTP_201_CREATED
        )


class BookingDetailCancelView(generics.GenericAPIView):
    """
    GET /api/v1/bookings/<id>/ - Get booking details with strict role & village scoping
    POST /api/v1/bookings/<id>/cancel/ - Cancel booking and safely release session seats
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking_and_check_permission(self, request, pk):
        try:
            booking = WorkshopBooking.objects.select_related(
                'user',
                'session',
                'session__workshop',
                'session__workshop__village',
                'session__workshop__artisan'
            ).prefetch_related('payments').get(pk=pk)
        except WorkshopBooking.DoesNotExist:
            return None, api_error(message="Không tìm thấy đơn đăng ký workshop", status_code=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated:
            return None, api_error(message="Vui lòng đăng nhập để tiếp tục.", status_code=status.HTTP_401_UNAUTHORIZED)

        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        if is_admin:
            return booking, None

        if is_village_manager:
            if hasattr(user, 'managed_village') and user.managed_village:
                if booking.session.workshop.village_id == user.managed_village.village_id:
                    return booking, None
                return None, api_error(message="Bạn không có quyền xem đơn đăng ký của làng nghề khác.", status_code=status.HTTP_403_FORBIDDEN)
            return None, api_error(message="Tài khoản chưa được liên kết với làng nghề.", status_code=status.HTTP_403_FORBIDDEN)

        # Tourist can only access their own bookings
        if booking.user_id == user.user_id:
            return booking, None

        return None, api_error(message="Bạn không có quyền xem đơn đăng ký này.", status_code=status.HTTP_403_FORBIDDEN)

    def get(self, request, pk):
        booking, err_resp = self._get_booking_and_check_permission(request, pk)
        if err_resp:
            return err_resp
        return api_success(data=WorkshopBookingDetailSerializer(booking).data, message="Lấy chi tiết thành công")

    def post(self, request, pk):
        from django.db import transaction
        from apps.workshops.models import WorkshopSession

        with transaction.atomic():
            # 1. Lock the booking record first
            try:
                booking = WorkshopBooking.objects.select_for_update().get(pk=pk)
            except WorkshopBooking.DoesNotExist:
                return api_error(message="Không tìm thấy đơn đăng ký workshop", status_code=status.HTTP_404_NOT_FOUND)

            # 2. Lock the session record
            try:
                session = WorkshopSession.objects.select_for_update().select_related(
                    'workshop', 'workshop__village'
                ).get(pk=booking.session_id)
            except WorkshopSession.DoesNotExist:
                return api_error(message="Không tìm thấy phiên workshop liên kết", status_code=status.HTTP_404_NOT_FOUND)

            # 3. Check permissions
            user = request.user
            is_admin = user_has_role(user, 'ADMIN')
            is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')
            is_owner = (booking.user_id == user.user_id)
            is_village_owner = (
                is_village_manager and
                hasattr(user, 'managed_village') and
                user.managed_village and
                session.workshop.village_id == user.managed_village.village_id
            )

            if not (is_admin or is_owner or is_village_owner):
                return api_error(message="Bạn không có quyền thao tác trên đơn đăng ký này.", status_code=status.HTTP_403_FORBIDDEN)

            # 4. Anti-double cancellation & cancellable status validation
            if booking.status == WorkshopBooking.BookingStatus.CANCELLED:
                return api_error(
                    message="Đơn đăng ký này đã được hủy trước đó, không thể hủy lại.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            if booking.status not in [WorkshopBooking.BookingStatus.PENDING, WorkshopBooking.BookingStatus.CONFIRMED]:
                return api_error(
                    message=f"Đơn đăng ký đang ở trạng thái '{booking.status}', không thể hủy.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 5. Safe seat release without masking corruption using max(0, ...)
            if session.booked_participants < booking.participant_count:
                logger.error(
                    "Data inconsistency: session %s has booked_participants=%s < booking.participant_count=%s (booking %s)",
                    session.pk, session.booked_participants, booking.participant_count, booking.pk
                )
                return api_error(
                    message=f"Dữ liệu số chỗ không nhất quán: session chỉ còn {session.booked_participants} người nhưng đơn đặt yêu cầu {booking.participant_count} người.",
                    status_code=status.HTTP_409_CONFLICT
                )

            session.booked_participants -= booking.participant_count
            if session.status == WorkshopSession.SessionStatus.FULL and session.booked_participants < session.capacity:
                session.status = WorkshopSession.SessionStatus.OPEN
            session.save(update_fields=['booked_participants', 'status', 'updated_at'])

            # 6. Update booking status
            booking.status = WorkshopBooking.BookingStatus.CANCELLED
            booking.cancelled_at = timezone.now()
            booking.save(update_fields=['status', 'cancelled_at', 'updated_at'])

        # Fetch detail with full relations for response
        booking.refresh_from_db()
        return api_success(data=WorkshopBookingDetailSerializer(booking).data, message="Hủy đơn đặt workshop thành công")


class BookingAttendanceView(generics.GenericAPIView):
    """
    POST /api/v1/bookings/<int:pk>/attendance/
    F05.09 - Điểm danh khách tham gia workshop (Attendance Check-in / No-show).
    Chỉ cho phép Quản lý làng nghề (sở hữu workshop) hoặc Admin thực hiện.
    Chuyển đổi trạng thái:
      CONFIRMED -> COMPLETED (Xác nhận tham gia)
      CONFIRMED -> NO_SHOW (Báo vắng mặt)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingAttendanceSerializer

    def post(self, request, pk):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_status = serializer.validated_data['status']

        from datetime import timedelta
        from django.db import transaction
        from apps.workshops.models import WorkshopSession

        with transaction.atomic():
            # 1. Lock the booking record first with select_for_update() to prevent race conditions
            try:
                booking = WorkshopBooking.objects.select_for_update().select_related(
                    'session',
                    'session__workshop',
                    'session__workshop__village',
                ).get(pk=pk)
            except WorkshopBooking.DoesNotExist:
                return api_error(
                    message="Không tìm thấy đơn đăng ký workshop.",
                    status_code=status.HTTP_404_NOT_FOUND
                )

            session = booking.session
            workshop = session.workshop

            # 2. Check Permissions (Admin or Manager of the owning village)
            user = request.user
            is_admin = user_has_role(user, 'ADMIN')
            is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')
            is_village_owner = (
                is_village_manager and
                hasattr(user, 'managed_village') and
                user.managed_village and
                workshop.village_id == user.managed_village.village_id
            )

            if not (is_admin or is_village_owner):
                return api_error(
                    message="Bạn không có quyền điểm danh đơn đăng ký của làng nghề khác.",
                    status_code=status.HTTP_403_FORBIDDEN
                )

            # 3. Check Session Status
            if session.status == WorkshopSession.SessionStatus.CANCELLED:
                return api_error(
                    message="Không thể điểm danh cho ca workshop đã bị hủy.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 4. Anti-double processing & State Transition Rules
            if booking.status in [WorkshopBooking.BookingStatus.COMPLETED, WorkshopBooking.BookingStatus.NO_SHOW]:
                return api_error(
                    message=f"Đơn đăng ký này đã được xử lý điểm danh trước đó ({booking.get_status_display()}).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            if booking.status != WorkshopBooking.BookingStatus.CONFIRMED:
                return api_error(
                    message=f"Chỉ có thể điểm danh cho đơn đăng ký ở trạng thái 'Đã xác nhận' (CONFIRMED). Trạng thái hiện tại: {booking.get_status_display()}.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 5. Time Window Validation
            now = timezone.now()
            start_window = session.start_at - timedelta(minutes=60)
            end_window = session.end_at + timedelta(hours=24)

            if now < start_window:
                return api_error(
                    message=f"Chưa đến thời gian mở điểm danh cho buổi workshop này (chỉ mở trước giờ bắt đầu tối đa 60 phút, từ {start_window.strftime('%H:%M %d/%m/%Y')}).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            if now > end_window:
                return api_error(
                    message=f"Thời hạn điểm danh cho buổi workshop này đã kết thúc (khóa sau {end_window.strftime('%H:%M %d/%m/%Y')}).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Rule for NO_SHOW: cannot mark no-show before the session starts
            if target_status == WorkshopBooking.BookingStatus.NO_SHOW and now < session.start_at:
                return api_error(
                    message=f"Không thể báo vắng mặt trước khi buổi workshop chính thức bắt đầu ({session.start_at.strftime('%H:%M %d/%m/%Y')}).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 6. Apply Attendance Update (Capacity & Payment remain untouched!)
            booking.status = target_status
            booking.save(update_fields=['status', 'updated_at'])

        booking.refresh_from_db()
        action_msg = (
            "Xác nhận khách tham gia workshop thành công!"
            if target_status == WorkshopBooking.BookingStatus.COMPLETED
            else "Đã ghi nhận khách vắng mặt (No-show)."
        )
        return api_success(
            data=WorkshopBookingDetailSerializer(booking).data,
            message=action_msg
        )

