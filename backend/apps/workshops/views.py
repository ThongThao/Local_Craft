import logging
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from apps.notifications.models import Notification
from apps.bookings.models import WorkshopBooking
from apps.payments.models import Payment, Refund
from .models import Workshop, WorkshopSession
from .serializers import WorkshopSerializer, WorkshopDetailSerializer, WorkshopSessionSerializer

logger = logging.getLogger(__name__)


class WorkshopListView(generics.ListCreateAPIView):
    """
    GET /api/v1/workshops/ - List active workshops with village/search filters.
    POST /api/v1/workshops/ - Create workshop (Village Manager for own village, or Admin).
    """
    serializer_class = WorkshopSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsVillageManager()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Workshop.objects.select_related('village', 'artisan', 'category').prefetch_related('sessions')

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
            # Public / Tourist: Only APPROVED workshops
            qs = qs.filter(status=Workshop.WorkshopStatus.APPROVED)
            village_id = self.request.query_params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)

        # Status filter (DRAFT, PENDING, APPROVED, REJECTED, HIDDEN)
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL' and status_param in Workshop.WorkshopStatus.values:
            qs = qs.filter(status=status_param)

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            s = search.strip()
            qs = qs.filter(
                Q(workshop_name__icontains=s) |
                Q(artisan__display_name__icontains=s) |
                Q(location_address__icontains=s)
            )

        artisan_id = self.request.query_params.get('artisan_id')
        if artisan_id and artisan_id != 'ALL' and str(artisan_id).isdigit():
            qs = qs.filter(artisan_id=int(artisan_id))

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

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()

        # Enforce village ownership: village managers can only create for their own village
        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=403)
            data['village'] = user.managed_village.village_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        workshop = serializer.save()
        return api_success(
            data=serializer.data,
            message="Tạo workshop thành công!",
            status_code=status.HTTP_201_CREATED
        )


class WorkshopDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/workshops/<id>/
    PUT/PATCH /api/v1/workshops/<id>/ - Update workshop (Village Manager or Admin)
    DELETE /api/v1/workshops/<id>/ - Delete workshop (Village Manager or Admin)
    """
    serializer_class = WorkshopDetailSerializer
    queryset = Workshop.objects.select_related('village', 'artisan', 'category').prefetch_related('sessions')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_village_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        if not (is_admin or is_village_manager):
            if instance.status != Workshop.WorkshopStatus.APPROVED:
                return api_error(message="Không có quyền truy cập workshop này.", status_code=403)
        elif is_village_manager and not is_admin:
            if hasattr(user, 'managed_village') and user.managed_village:
                if instance.village_id != user.managed_village.village_id and instance.status != Workshop.WorkshopStatus.APPROVED:
                    return api_error(message="Không có quyền truy cập workshop của làng nghề khác.", status_code=403)

        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết workshop thành công")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Prevent changing village for village managers
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN') and 'village' in data:
            data['village'] = instance.village_id

        serializer = WorkshopSerializer(instance, data=data, partial=partial, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return api_success(data=serializer.data, message="Cập nhật workshop thành công!")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Safety Check: Prevent deleting workshops that have booking history
        from apps.bookings.models import WorkshopBooking
        has_bookings = WorkshopBooking.objects.filter(session__workshop=instance).exists()
        if has_bookings:
            return api_error(
                message="Không thể xóa workshop này vì đã phát sinh lịch sử đặt chỗ của khách du lịch. Vui lòng chuyển trạng thái sang 'Đang ẩn' (HIDDEN) để ngừng hiển thị và bảo toàn dữ liệu.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction
        with transaction.atomic():
            self.perform_destroy(instance)

        return api_success(data=None, message="Xóa workshop thành công!")


from .serializers import (
    WorkshopSerializer,
    WorkshopDetailSerializer,
    WorkshopSessionSerializer,
    WorkshopSessionDetailSerializer,
    WorkshopSessionCreateUpdateSerializer,
    WorkshopSessionRescheduleSerializer,
)


class WorkshopSessionsListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/workshops/<pk>/sessions/ - List sessions of workshop (Public gets OPEN, Manager/Admin gets all with status filter)
    POST /api/v1/workshops/<pk>/sessions/ - Create new session for workshop (Manager of village or Admin)
    """
    serializer_class = WorkshopSessionSerializer

    def _check_manager_permission(self, user, workshop):
        if not user or not user.is_authenticated:
            return False
        if user_has_role(user, 'ADMIN'):
            return True
        if user_has_role(user, 'CRAFT_VILLAGE') and hasattr(user, 'managed_village') and user.managed_village:
            return workshop.village_id == user.managed_village.village_id
        return False

    def get(self, request, pk):
        try:
            workshop = Workshop.objects.select_related('village', 'artisan').get(pk=pk)
        except Workshop.DoesNotExist:
            return api_error(message="Không tìm thấy workshop tương ứng.", status_code=status.HTTP_404_NOT_FOUND)

        is_mgr = self._check_manager_permission(request.user, workshop)

        if is_mgr:
            qs = WorkshopSession.objects.filter(workshop=workshop).select_related('workshop', 'workshop__artisan')
            status_param = request.query_params.get('status')
            if status_param:
                qs = qs.filter(status=status_param)
            qs = qs.order_by('start_at')
        else:
            qs = WorkshopSession.objects.filter(
                workshop=workshop,
                status=WorkshopSession.SessionStatus.OPEN
            ).select_related('workshop', 'workshop__artisan').order_by('start_at')

        serializer = WorkshopSessionSerializer(qs, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách phiên workshop thành công")

    def post(self, request, pk):
        try:
            workshop = Workshop.objects.select_related('village', 'artisan').get(pk=pk)
        except Workshop.DoesNotExist:
            return api_error(message="Không tìm thấy workshop tương ứng.", status_code=status.HTTP_404_NOT_FOUND)

        if not self._check_manager_permission(request.user, workshop):
            return api_error(message="Bạn không có quyền quản lý lịch tổ chức của workshop này.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = WorkshopSessionCreateUpdateSerializer(data=request.data, context={'request': request, 'workshop': workshop})
        serializer.is_valid(raise_exception=True)
        session = serializer.save(workshop=workshop)

        return api_success(
            data=WorkshopSessionSerializer(session).data,
            message="Tạo buổi workshop thành công!",
            status_code=status.HTTP_201_CREATED
        )


# Backward-compatible alias
WorkshopSessionsView = WorkshopSessionsListCreateView


class WorkshopSessionDetailUpdateDeleteView(generics.GenericAPIView):
    """
    GET /api/v1/workshops/sessions/<pk>/ - Get session details and active bookings
    PATCH /api/v1/workshops/sessions/<pk>/ - Update session parameters (capacity, times, price, status)
    DELETE /api/v1/workshops/sessions/<pk>/ - Delete session (ONLY if no bookings exist)
    """

    def _get_session_and_check_permission(self, request, pk):
        try:
            session = WorkshopSession.objects.select_related(
                'workshop', 'workshop__village', 'workshop__artisan'
            ).prefetch_related('bookings', 'bookings__user').get(pk=pk)
        except WorkshopSession.DoesNotExist:
            return None, api_error(message="Không tìm thấy phiên workshop.", status_code=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated:
            return None, api_error(message="Vui lòng đăng nhập để thực hiện thao tác.", status_code=status.HTTP_401_UNAUTHORIZED)

        is_authorized = False
        if user_has_role(user, 'ADMIN'):
            is_authorized = True
        elif user_has_role(user, 'CRAFT_VILLAGE') and hasattr(user, 'managed_village') and user.managed_village:
            if session.workshop.village_id == user.managed_village.village_id:
                is_authorized = True

        if not is_authorized:
            return None, api_error(message="Bạn không có quyền thao tác trên buổi workshop của làng nghề khác.", status_code=status.HTTP_403_FORBIDDEN)

        return session, None

    def get(self, request, pk):
        session, error_resp = self._get_session_and_check_permission(request, pk)
        if error_resp:
            return error_resp

        serializer = WorkshopSessionDetailSerializer(session)
        return api_success(data=serializer.data, message="Lấy chi tiết buổi workshop thành công")

    def patch(self, request, pk):
        session, error_resp = self._get_session_and_check_permission(request, pk)
        if error_resp:
            return error_resp

        serializer = WorkshopSessionCreateUpdateSerializer(session, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        updated_session = serializer.save()

        return api_success(data=WorkshopSessionSerializer(updated_session).data, message="Cập nhật buổi workshop thành công!")

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        session, error_resp = self._get_session_and_check_permission(request, pk)
        if error_resp:
            return error_resp

        if session.bookings.exists():
            return api_error(
                message="Không thể xóa buổi workshop đã có dữ liệu booking/đăng ký. Vui lòng chuyển trạng thái sang Hủy (CANCELLED) để bảo toàn lịch sử giao dịch.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        from django.db import transaction
        with transaction.atomic():
            session.delete()

        return api_success(data=None, message="Xóa buổi workshop thành công!")


class WorkshopSessionCancelView(generics.GenericAPIView):
    """
    POST /api/v1/workshops/sessions/<pk>/cancel/
    F05.10 - Hủy buổi workshop, giải phóng số chỗ chính xác và gửi thông báo đến khách hàng bị ảnh hưởng.
    Chỉ Quản lý làng nghề sở hữu workshop hoặc ADMIN mới có quyền thực hiện.
    """

    def post(self, request, pk):
        try:
            session = WorkshopSession.objects.select_related(
                'workshop', 'workshop__village', 'workshop__artisan'
            ).get(pk=pk)
        except WorkshopSession.DoesNotExist:
            return api_error(message="Không tìm thấy phiên workshop.", status_code=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated:
            return api_error(message="Vui lòng đăng nhập.", status_code=status.HTTP_401_UNAUTHORIZED)

        is_authorized = False
        if user_has_role(user, 'ADMIN'):
            is_authorized = True
        elif user_has_role(user, 'CRAFT_VILLAGE') and hasattr(user, 'managed_village') and user.managed_village:
            if session.workshop.village_id == user.managed_village.village_id:
                is_authorized = True

        if not is_authorized:
            return api_error(message="Bạn không có quyền thao tác trên buổi workshop này.", status_code=status.HTTP_403_FORBIDDEN)

        # Pre-lock state validations
        if session.status == WorkshopSession.SessionStatus.CANCELLED:
            return api_error(
                message="Buổi workshop này đã ở trạng thái Hủy từ trước.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        if session.status == WorkshopSession.SessionStatus.COMPLETED:
            return api_error(
                message="Không thể hủy buổi workshop đã hoàn thành.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        if timezone.now() > session.end_at:
            return api_error(
                message="Không thể hủy buổi workshop đã diễn ra trong quá khứ.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 1. Acquire row-level lock on session
            locked_session = WorkshopSession.objects.select_for_update().select_related(
                'workshop', 'workshop__village'
            ).get(pk=pk)

            # 2. Re-check state under lock to prevent concurrent race conditions
            if locked_session.status == WorkshopSession.SessionStatus.CANCELLED:
                return api_error(
                    message="Buổi workshop này đã ở trạng thái Hủy từ trước.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            if locked_session.status == WorkshopSession.SessionStatus.COMPLETED:
                return api_error(
                    message="Không thể hủy buổi workshop đã hoàn thành.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            if timezone.now() > locked_session.end_at:
                return api_error(
                    message="Không thể hủy buổi workshop đã diễn ra trong quá khứ.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 3. Fetch active bookings holding capacity with row-level locks
            active_bookings = list(
                WorkshopBooking.objects.select_for_update().filter(
                    session=locked_session,
                    status__in=[
                        WorkshopBooking.BookingStatus.CONFIRMED,
                        WorkshopBooking.BookingStatus.PENDING,
                    ]
                ).select_related('user')
            )

            # 4. Calculate total seats to release
            seats_to_release = sum(b.participant_count for b in active_bookings)

            # 5. Strict consistency check (anti-double release, no negative capacity masking)
            if locked_session.booked_participants < seats_to_release:
                logger.critical(
                    "Data inconsistency in session %s: booked_participants=%s < seats_to_release=%s",
                    locked_session.pk, locked_session.booked_participants, seats_to_release
                )
                return api_error(
                    message=f"Dữ liệu số chỗ không nhất quán: session chỉ còn {locked_session.booked_participants} người nhưng các đơn đặt yêu cầu giải phóng {seats_to_release} người.",
                    status_code=status.HTTP_409_CONFLICT
                )

            # 6. Deduct participants and transition session status to CANCELLED
            locked_session.booked_participants -= seats_to_release
            locked_session.status = WorkshopSession.SessionStatus.CANCELLED
            locked_session.save(update_fields=['status', 'booked_participants', 'updated_at'])

            # 7. Transition active bookings to CANCELLED with timestamp
            now = timezone.now()
            for b in active_bookings:
                b.status = WorkshopBooking.BookingStatus.CANCELLED
                b.cancelled_at = now
                b.save(update_fields=['status', 'cancelled_at', 'updated_at'])

            # 8. Create in-app notifications with idempotency check
            notifs_to_create = []
            formatted_start = locked_session.start_at.strftime('%H:%M ngày %d/%m/%Y')
            for b in active_bookings:
                already_notified = Notification.objects.filter(
                    user=b.user,
                    notification_type='WORKSHOP_SESSION_CANCELLED',
                    target_type='WORKSHOP_SESSION',
                    target_id=locked_session.session_id,
                    message__icontains=b.booking_code
                ).exists()

                if not already_notified:
                    notifs_to_create.append(
                        Notification(
                            user=b.user,
                            notification_type='WORKSHOP_SESSION_CANCELLED',
                            title='Thông báo hủy lịch workshop',
                            message=(
                                f'Buổi workshop "{locked_session.workshop.workshop_name}" dự kiến diễn ra lúc {formatted_start} '
                                f'đã được làng nghề thông báo hủy. Đơn đặt chỗ mã {b.booking_code} của bạn đã được chuyển sang trạng thái Đã hủy.'
                            ),
                            target_type='WORKSHOP_SESSION',
                            target_id=locked_session.session_id,
                            is_read=False,
                        )
                    )

            if notifs_to_create:
                Notification.objects.bulk_create(notifs_to_create)

        return api_success(
            data={
                'session_id': locked_session.session_id,
                'status': locked_session.status,
                'affected_bookings': len(active_bookings),
                'released_seats': seats_to_release,
                'notifications_created': len(notifs_to_create),
            },
            message="Hủy buổi workshop thành công! Toàn bộ lịch đặt và thông báo khách hàng đã được xử lý."
        )


class WorkshopSessionRescheduleView(generics.GenericAPIView):
    """
    POST /api/v1/workshops/sessions/<pk>/reschedule/
    F05.12 - Đổi lịch buổi workshop, bảo toàn booking, sức chứa và gửi thông báo du khách.
    Bảo toàn tính nhất quán dữ liệu, chống xung đột lịch nghệ nhân và race condition.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkshopSessionRescheduleSerializer

    def post(self, request, pk):
        try:
            session = WorkshopSession.objects.select_related(
                'workshop', 'workshop__village', 'workshop__artisan'
            ).get(pk=pk)
        except WorkshopSession.DoesNotExist:
            return api_error(message="Không tìm thấy phiên workshop.", status_code=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')
        is_village_owner = (
            is_village_manager and
            hasattr(user, 'managed_village') and
            user.managed_village and
            session.workshop.village_id == user.managed_village.village_id
        )

        if not (is_admin or is_village_owner):
            return api_error(
                message="Bạn không có quyền quản lý lịch của làng nghề khác.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data, context={'request': request, 'session': session})
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        new_start_at = validated_data['new_start_at']
        new_end_at = validated_data['new_end_at']
        reason = validated_data['reason']

        with transaction.atomic():
            # 1. Acquire row-level lock on the session
            locked_session = WorkshopSession.objects.select_for_update().select_related(
                'workshop', 'workshop__village', 'workshop__artisan'
            ).get(pk=pk)

            # 2. Re-verify state under lock
            now = timezone.now()
            if locked_session.status == WorkshopSession.SessionStatus.CANCELLED:
                return api_error(message="Không thể đổi lịch buổi workshop đã bị hủy.", status_code=status.HTTP_400_BAD_REQUEST)
            if locked_session.status == WorkshopSession.SessionStatus.COMPLETED:
                return api_error(message="Không thể đổi lịch buổi workshop đã kết thúc.", status_code=status.HTTP_400_BAD_REQUEST)
            if locked_session.start_at <= now:
                return api_error(message="Không thể đổi lịch buổi workshop đã bắt đầu hoặc đang diễn ra.", status_code=status.HTTP_400_BAD_REQUEST)

            # Re-verify attendance under lock
            has_attended = WorkshopBooking.objects.filter(
                session=locked_session,
                status__in=[WorkshopBooking.BookingStatus.COMPLETED, WorkshopBooking.BookingStatus.NO_SHOW]
            ).exists()
            if has_attended:
                return api_error(
                    message="Không thể đổi lịch buổi workshop đã có dữ liệu điểm danh (khách đã tham gia hoặc vắng mặt).",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Re-verify artisan conflict under lock
            if locked_session.workshop.artisan:
                artisan = locked_session.workshop.artisan
                conflict = WorkshopSession.objects.filter(
                    workshop__artisan=artisan,
                    status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL],
                    start_at__lt=new_end_at,
                    end_at__gt=new_start_at,
                ).exclude(pk=locked_session.pk).select_related('workshop').first()
                if conflict:
                    return api_error(
                        message=f"Nghệ nhân {artisan.display_name} đã có lịch phụ trách buổi khác ({conflict.workshop.workshop_name} từ {conflict.start_at.strftime('%H:%M %d/%m/%Y')} đến {conflict.end_at.strftime('%H:%M %d/%m/%Y')}).",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

            # 3. Lock active bookings to prevent concurrent modifications
            active_bookings = list(
                WorkshopBooking.objects.select_for_update().filter(
                    session=locked_session,
                    status__in=[
                        WorkshopBooking.BookingStatus.CONFIRMED,
                        WorkshopBooking.BookingStatus.PENDING,
                    ]
                ).select_related('user')
            )

            # Capture old schedule
            old_start_at = locked_session.start_at
            old_end_at = locked_session.end_at

            # 4. Update session times in-place (booked_participants, capacity, status preserved)
            locked_session.start_at = new_start_at
            locked_session.end_at = new_end_at
            locked_session.save(update_fields=['start_at', 'end_at', 'updated_at'])

            # 5. Create in-app notifications for active bookings with idempotency
            notifs_to_create = []
            formatted_old_start = old_start_at.strftime('%H:%M ngày %d/%m/%Y')
            formatted_new_start = new_start_at.strftime('%H:%M ngày %d/%m/%Y')

            for b in active_bookings:
                already_notified = Notification.objects.filter(
                    user=b.user,
                    notification_type='WORKSHOP_SESSION_RESCHEDULED',
                    target_type='WORKSHOP_SESSION',
                    target_id=locked_session.session_id,
                    message__icontains=b.booking_code,
                    created_at__gte=timezone.now() - timedelta(minutes=5)
                ).exists()

                if not already_notified:
                    msg = (
                        f'Buổi workshop "{locked_session.workshop.workshop_name}" (Mã booking: {b.booking_code}) '
                        f'đã được làng nghề điều chỉnh thời gian tổ chức từ {formatted_old_start} sang {formatted_new_start}. '
                        f'Lý do: {reason.strip()}. '
                        f'Đơn đặt chỗ của bạn vẫn được giữ nguyên hiệu lực. '
                        f'Nếu không thể tham gia lịch mới, bạn có thể gửi yêu cầu hoàn tiền 100% '
                        f'theo chính sách hỗ trợ khi làng nghề chủ động đổi lịch.'
                    )
                    notifs_to_create.append(
                        Notification(
                            user=b.user,
                            notification_type='WORKSHOP_SESSION_RESCHEDULED',
                            title='Thông báo điều chỉnh lịch workshop',
                            message=msg,
                            target_type='WORKSHOP_SESSION',
                            target_id=locked_session.session_id,
                            is_read=False,
                        )
                    )

            if notifs_to_create:
                Notification.objects.bulk_create(notifs_to_create)

        return api_success(
            data={
                'session_id': locked_session.session_id,
                'workshop_name': locked_session.workshop.workshop_name,
                'old_start_at': old_start_at.isoformat(),
                'old_end_at': old_end_at.isoformat(),
                'new_start_at': locked_session.start_at.isoformat(),
                'new_end_at': locked_session.end_at.isoformat(),
                'booked_participants': locked_session.booked_participants,
                'affected_bookings_count': len(active_bookings),
                'notifications_created': len(notifs_to_create),
            },
            message="Đổi lịch buổi workshop thành công!"
        )


class WorkshopSummaryView(generics.GenericAPIView):
    """
    GET /api/v1/workshops/summary/
    F05.11 - Cung cấp KPI và thống kê hoạt động workshop dành cho Quản lý làng nghề và Admin.
    Hỗ trợ bộ lọc thời gian: time_range (ALL, TODAY, 7_DAYS, 30_DAYS, THIS_MONTH, LAST_MONTH, CUSTOM).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        if not (is_admin or is_village_manager):
            return api_error(
                message="Bạn không có quyền truy cập thống kê làng nghề.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Scoping village
        village = None
        if is_admin:
            v_id = request.query_params.get('village_id')
            if v_id and str(v_id).isdigit():
                try:
                    from apps.villages.models import CraftVillage
                    village = CraftVillage.objects.get(pk=int(v_id))
                except Exception:
                    village = None
        else:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(
                    message="Tài khoản chưa được liên kết với làng nghề.",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            village = user.managed_village

        # Base querysets
        workshops_qs = Workshop.objects.all()
        if village:
            workshops_qs = workshops_qs.filter(village=village)
        elif not is_admin:
            workshops_qs = workshops_qs.none()

        # Workshop filter
        workshop_id_param = request.query_params.get('workshop_id')
        selected_workshop_id = None
        if workshop_id_param and str(workshop_id_param).isdigit():
            selected_workshop_id = int(workshop_id_param)
            workshops_qs = workshops_qs.filter(pk=selected_workshop_id)

        # Time range processing
        time_range = request.query_params.get('time_range', 'ALL').upper()
        now = timezone.now()
        start_dt = None
        end_dt = None

        if time_range == 'TODAY':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == '7_DAYS':
            start_dt = now - timedelta(days=7)
            end_dt = now
        elif time_range == '30_DAYS':
            start_dt = now - timedelta(days=30)
            end_dt = now
        elif time_range == 'THIS_MONTH':
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif time_range == 'LAST_MONTH':
            first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day_prev_month = first_this_month - timedelta(days=1)
            start_dt = last_day_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = last_day_prev_month.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif time_range == 'CUSTOM':
            from_str = request.query_params.get('from_date')
            to_str = request.query_params.get('to_date')
            if from_str:
                try:
                    from datetime import datetime
                    d = datetime.strptime(from_str.strip(), '%Y-%m-%d')
                    start_dt = timezone.make_aware(d.replace(hour=0, minute=0, second=0, microsecond=0))
                except Exception:
                    pass
            if to_str:
                try:
                    from datetime import datetime
                    d = datetime.strptime(to_str.strip(), '%Y-%m-%d')
                    end_dt = timezone.make_aware(d.replace(hour=23, minute=59, second=59, microsecond=999999))
                except Exception:
                    pass

        # 1. Overview Workshop KPIs
        total_workshops = workshops_qs.count()
        active_workshops = workshops_qs.filter(status=Workshop.WorkshopStatus.APPROVED).count()

        # 2. Session KPIs
        sessions_qs = WorkshopSession.objects.filter(workshop__in=workshops_qs)
        if start_dt:
            sessions_qs = sessions_qs.filter(start_at__gte=start_dt)
        if end_dt:
            sessions_qs = sessions_qs.filter(start_at__lte=end_dt)

        total_sessions = sessions_qs.count()
        upcoming_sessions = sessions_qs.filter(
            start_at__gte=now,
            status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL]
        ).count()
        completed_sessions = sessions_qs.filter(
            Q(status=WorkshopSession.SessionStatus.COMPLETED) | Q(end_at__lt=now)
        ).exclude(status=WorkshopSession.SessionStatus.CANCELLED).count()
        cancelled_sessions = sessions_qs.filter(status=WorkshopSession.SessionStatus.CANCELLED).count()

        # 3. Booking KPIs
        bookings_qs = WorkshopBooking.objects.filter(session__workshop__in=workshops_qs)
        if start_dt:
            bookings_qs = bookings_qs.filter(created_at__gte=start_dt)
        if end_dt:
            bookings_qs = bookings_qs.filter(created_at__lte=end_dt)

        booking_agg = bookings_qs.aggregate(
            total_bookings=Count('booking_id'),
            total_participants=Coalesce(
                Sum('participant_count', filter=Q(status__in=[
                    WorkshopBooking.BookingStatus.CONFIRMED,
                    WorkshopBooking.BookingStatus.COMPLETED,
                    WorkshopBooking.BookingStatus.PENDING,
                ])), 0
            ),
            pending_count=Count('booking_id', filter=Q(status=WorkshopBooking.BookingStatus.PENDING)),
            confirmed_count=Count('booking_id', filter=Q(status=WorkshopBooking.BookingStatus.CONFIRMED)),
            completed_count=Count('booking_id', filter=Q(status=WorkshopBooking.BookingStatus.COMPLETED)),
            no_show_count=Count('booking_id', filter=Q(status=WorkshopBooking.BookingStatus.NO_SHOW)),
            cancelled_count=Count('booking_id', filter=Q(status=WorkshopBooking.BookingStatus.CANCELLED)),
            attended_participants=Coalesce(
                Sum('participant_count', filter=Q(status=WorkshopBooking.BookingStatus.COMPLETED)), 0
            ),
            no_show_participants=Coalesce(
                Sum('participant_count', filter=Q(status=WorkshopBooking.BookingStatus.NO_SHOW)), 0
            ),
            total_booking_value=Coalesce(
                Sum('total_amount', filter=Q(status__in=[
                    WorkshopBooking.BookingStatus.CONFIRMED,
                    WorkshopBooking.BookingStatus.COMPLETED,
                    WorkshopBooking.BookingStatus.PENDING,
                ])), Decimal('0.00')
            )
        )

        attended_p = booking_agg['attended_participants']
        no_show_p = booking_agg['no_show_participants']
        attendance_base_p = attended_p + no_show_p
        attendance_rate = round((attended_p / attendance_base_p) * 100, 2) if attendance_base_p > 0 else 0.0

        completed_b = booking_agg['completed_count']
        no_show_b = booking_agg['no_show_count']
        attendance_base_b = completed_b + no_show_b
        completion_rate = round((completed_b / attendance_base_b) * 100, 2) if attendance_base_b > 0 else 0.0

        # 4. Revenue KPIs (Safe, isolated Payment & Refund queries without JOIN multiplication)
        payments_qs = Payment.objects.filter(booking__session__workshop__in=workshops_qs)
        if start_dt:
            payments_qs = payments_qs.filter(paid_at__gte=start_dt)
        if end_dt:
            payments_qs = payments_qs.filter(paid_at__lte=end_dt)

        payment_agg = payments_qs.filter(
            status=Payment.PaymentRecordStatus.SUCCESS
        ).aggregate(
            successful_amount=Coalesce(Sum('amount'), Decimal('0.00'))
        )
        successful_payments = payment_agg['successful_amount']

        refunds_qs = Refund.objects.filter(
            payment__booking__session__workshop__in=workshops_qs,
            status=Refund.RefundStatus.COMPLETED
        )
        if start_dt:
            refunds_qs = refunds_qs.filter(processed_at__gte=start_dt)
        if end_dt:
            refunds_qs = refunds_qs.filter(processed_at__lte=end_dt)

        refund_agg = refunds_qs.aggregate(
            refunded_amount=Coalesce(Sum('amount_approved'), Decimal('0.00'))
        )
        successful_refunds = refund_agg['refunded_amount']

        net_revenue = max(Decimal('0.00'), successful_payments - successful_refunds)

        data = {
            'overview': {
                'total_workshops': total_workshops,
                'active_workshops': active_workshops,
                'total_sessions': total_sessions,
                'upcoming_sessions': upcoming_sessions,
                'completed_sessions': completed_sessions,
                'cancelled_sessions': cancelled_sessions,
            },
            'bookings': {
                'total_bookings': booking_agg['total_bookings'],
                'total_participants': booking_agg['total_participants'],
                'pending': booking_agg['pending_count'],
                'confirmed': booking_agg['confirmed_count'],
                'completed': booking_agg['completed_count'],
                'no_show': booking_agg['no_show_count'],
                'cancelled': booking_agg['cancelled_count'],
            },
            'attendance': {
                'completed_bookings': completed_b,
                'no_show_bookings': no_show_b,
                'attended_participants': attended_p,
                'no_show_participants': no_show_p,
                'attendance_rate': attendance_rate,
                'booking_completion_rate': completion_rate,
            },
            'revenue': {
                'total_booking_value': float(booking_agg['total_booking_value']),
                'successful_payments_amount': float(successful_payments),
                'successful_refunds_amount': float(successful_refunds),
                'net_realized_revenue': float(net_revenue),
            },
            'filter': {
                'time_range': time_range,
                'from_date': start_dt.strftime('%Y-%m-%d') if start_dt else None,
                'to_date': end_dt.strftime('%Y-%m-%d') if end_dt else None,
                'workshop_id': selected_workshop_id,
            }
        }

        return api_success(data=data, message="Lấy thống kê hoạt động workshop thành công")
