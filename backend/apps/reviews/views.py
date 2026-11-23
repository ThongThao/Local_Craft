from django.db import models, transaction
from django.db.models import Avg, Q
from django.core.paginator import Paginator, EmptyPage
from django.utils import timezone
from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from apps.common.permissions import user_has_role, IsCraftVillage
from apps.notifications.models import Notification
from apps.notifications.services import VillageNotificationService
from .models import Review
from .serializers import (
    ReviewSerializer,
    ReviewDetailSerializer,
    CreateReviewSerializer,
    ReviewReplySerializer,
)


class ReviewListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/reviews/
    List reviews:
    - CRAFT_VILLAGE: Strictly scoped to their managed village (ignoring client village_id).
    - ADMIN: Global list, optionally filtered by village_id.
    - Tourist / Public: Only visible reviews, filtered by product_id or booking_id.
    Supports filtering by target_type (PRODUCT/WORKSHOP), rating (1-5), status (VISIBLE/HIDDEN),
    reply_status (ALL/REPLIED/UNREPLIED), search keyword, date range (from_date, to_date),
    and optional pagination.

    POST /api/v1/reviews/
    Create review (authenticated tourists).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request):
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        qs = Review.objects.select_related(
            'user',
            'replied_by',
            'product',
            'product__village',
            'booking',
            'booking__user',
            'booking__session',
            'booking__session__workshop',
            'booking__session__workshop__village',
        ).prefetch_related('product__images')

        # 1. Scope permissions
        if is_village_manager and not is_admin:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(
                    message="Tài khoản chưa được liên kết với làng nghề.",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            village = user.managed_village
            qs = qs.filter(
                Q(product__village=village) |
                Q(booking__session__workshop__village=village)
            )
            # Default for village manager: show both VISIBLE and HIDDEN unless filtered
            status_param = request.query_params.get('status')
            if status_param and status_param != 'ALL':
                if status_param in Review.ReviewStatus.values:
                    qs = qs.filter(status=status_param)

        elif is_admin:
            village_id = request.query_params.get('village_id')
            if village_id and str(village_id).isdigit():
                qs = qs.filter(
                    Q(product__village_id=int(village_id)) |
                    Q(booking__session__workshop__village_id=int(village_id))
                )
            status_param = request.query_params.get('status')
            if status_param and status_param != 'ALL':
                if status_param in Review.ReviewStatus.values:
                    qs = qs.filter(status=status_param)

        else:
            # Public / Tourist view
            qs = qs.filter(status=Review.ReviewStatus.VISIBLE)
            village_id = request.query_params.get('village_id')
            if village_id and str(village_id).isdigit():
                qs = qs.filter(
                    Q(product__village_id=int(village_id)) |
                    Q(booking__session__workshop__village_id=int(village_id))
                )

        # 2. Target specific ID filters
        product_id = request.query_params.get('product_id')
        if product_id and str(product_id).isdigit():
            qs = qs.filter(product_id=int(product_id))

        booking_id = request.query_params.get('booking_id')
        if booking_id and str(booking_id).isdigit():
            qs = qs.filter(booking_id=int(booking_id))

        # 3. Target Type filter (PRODUCT vs WORKSHOP)
        target_type = request.query_params.get('target_type') or request.query_params.get('type')
        if target_type:
            target_upper = target_type.strip().upper()
            if target_upper == 'PRODUCT':
                qs = qs.filter(product__isnull=False)
            elif target_upper == 'WORKSHOP':
                qs = qs.filter(booking__isnull=False)

        # 4. Rating filter (1 - 5)
        rating_param = request.query_params.get('rating')
        if rating_param and rating_param != 'ALL' and str(rating_param).isdigit():
            qs = qs.filter(rating=int(rating_param))

        # 5. Reply status filter (ALL, REPLIED, UNREPLIED)
        reply_status = request.query_params.get('reply_status')
        if reply_status:
            reply_upper = reply_status.strip().upper()
            if reply_upper == 'REPLIED':
                qs = qs.filter(reply_content__isnull=False).exclude(reply_content='')
            elif reply_upper == 'UNREPLIED':
                qs = qs.filter(Q(reply_content__isnull=True) | Q(reply_content=''))

        # 6. Search keyword
        search = (request.query_params.get('search') or request.query_params.get('q') or '').strip()
        if search:
            qs = qs.filter(
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(title__icontains=search) |
                Q(content__icontains=search) |
                Q(reply_content__icontains=search) |
                Q(product__product_name__icontains=search) |
                Q(booking__session__workshop__workshop_name__icontains=search) |
                Q(booking__booking_code__icontains=search)
            )

        # 7. Date range filtering
        from_date = request.query_params.get('from_date') or request.query_params.get('start_date')
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get('to_date') or request.query_params.get('end_date')
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        qs = qs.order_by('-created_at')

        # 8. Server-side pagination if requested
        page_param = request.query_params.get('page')
        if page_param and str(page_param).isdigit():
            page_num = max(1, int(page_param))
            page_size_param = request.query_params.get('page_size', 10)
            page_size = max(1, min(100, int(page_size_param))) if str(page_size_param).isdigit() else 10

            paginator = Paginator(qs, page_size)
            try:
                page_obj = paginator.page(page_num)
            except EmptyPage:
                page_obj = []

            serializer = ReviewSerializer(page_obj, many=True)
            return api_success(
                data={
                    'items': serializer.data,
                    'total': paginator.count,
                    'page': page_num,
                    'page_size': page_size,
                    'total_pages': paginator.num_pages,
                },
                message="Lấy danh sách đánh giá thành công"
            )

        # Return full list for backward compatibility
        serializer = ReviewSerializer(qs, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đánh giá thành công")

    def post(self, request):
        if not (request.user and request.user.is_authenticated):
            return api_error(message="Vui lòng đăng nhập để gửi đánh giá.", status_code=status.HTTP_401_UNAUTHORIZED)
        if not user_has_role(request.user, 'TOURIST'):
            return api_error(message="Chức năng gửi đánh giá chỉ dành riêng cho tài khoản Du khách.", status_code=status.HTTP_403_FORBIDDEN)
        serializer = CreateReviewSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        try:
            village = None
            if getattr(review, 'product', None) and getattr(review.product, 'village', None):
                village = review.product.village
            elif getattr(review, 'booking', None) and getattr(review.booking, 'session', None) and getattr(review.booking.session, 'workshop', None):
                village = review.booking.session.workshop.village
            if village:
                VillageNotificationService.notify_new_review(village, review)
        except Exception:
            pass
        return api_success(
            data=ReviewSerializer(review).data,
            message="Gửi đánh giá thành công!",
            status_code=status.HTTP_201_CREATED
        )


class ReviewSummaryView(generics.GenericAPIView):
    """
    GET /api/v1/reviews/summary/
    Return accurate database-level KPI aggregations for craft village reviews.
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]

    def get(self, request):
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        base_qs = Review.objects.all()

        if is_admin:
            village_id = request.query_params.get('village_id')
            if village_id and str(village_id).isdigit():
                base_qs = base_qs.filter(
                    Q(product__village_id=int(village_id)) |
                    Q(booking__session__workshop__village_id=int(village_id))
                )
        else:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(
                    message="Tài khoản chưa được liên kết với làng nghề.",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            village = user.managed_village
            base_qs = base_qs.filter(
                Q(product__village=village) |
                Q(booking__session__workshop__village=village)
            )

        total_reviews = base_qs.count()

        rating_5_count = base_qs.filter(rating=5).count()
        rating_4_count = base_qs.filter(rating=4).count()
        rating_3_count = base_qs.filter(rating=3).count()
        rating_2_count = base_qs.filter(rating=2).count()
        rating_1_count = base_qs.filter(rating=1).count()

        product_reviews_count = base_qs.filter(product__isnull=False).count()
        workshop_reviews_count = base_qs.filter(booking__isnull=False).count()

        visible_count = base_qs.filter(status=Review.ReviewStatus.VISIBLE).count()
        hidden_count = base_qs.filter(status=Review.ReviewStatus.HIDDEN).count()

        avg_val = base_qs.aggregate(avg_rating=Avg('rating'))['avg_rating']
        average_rating = round(float(avg_val), 2) if avg_val is not None else 5.0

        positive_count = rating_5_count + rating_4_count
        positive_percentage = round((positive_count / total_reviews * 100), 1) if total_reviews > 0 else 100.0

        # Phản hồi đánh giá (V15)
        replied_count = base_qs.filter(reply_content__isnull=False).exclude(reply_content='').count()
        unreplied_count = total_reviews - replied_count

        data = {
            'total_reviews': total_reviews,
            'average_rating': average_rating,
            'rating_5_count': rating_5_count,
            'rating_4_count': rating_4_count,
            'rating_3_count': rating_3_count,
            'rating_2_count': rating_2_count,
            'rating_1_count': rating_1_count,
            'product_reviews_count': product_reviews_count,
            'workshop_reviews_count': workshop_reviews_count,
            'visible_reviews_count': visible_count,
            'hidden_reviews_count': hidden_count,
            'positive_percentage': positive_percentage,
            'replied_count': replied_count,
            'unreplied_count': unreplied_count,
            'has_reply_support': True,
        }
        return api_success(data=data, message="Lấy thống kê đánh giá thành công")


class ReviewDetailView(generics.GenericAPIView):
    """
    GET /api/v1/reviews/<int:pk>/
    Retrieve single review detail with strict village ownership validation.
    """
    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get(self, request, pk):
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        review = Review.objects.select_related(
            'user',
            'replied_by',
            'product',
            'product__village',
            'booking',
            'booking__user',
            'booking__session',
            'booking__session__workshop',
            'booking__session__workshop__village',
        ).prefetch_related('product__images').filter(pk=pk).first()

        if not review:
            return api_error(message="Không tìm thấy đánh giá.", status_code=status.HTTP_404_NOT_FOUND)

        if is_village_manager and not is_admin:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(
                    message="Tài khoản chưa được liên kết với làng nghề.",
                    status_code=status.HTTP_403_FORBIDDEN
                )

            managed_village_id = user.managed_village.village_id
            review_village_id = None
            if review.product_id and review.product:
                review_village_id = review.product.village_id
            elif review.booking_id and review.booking and review.booking.session and review.booking.session.workshop:
                review_village_id = review.booking.session.workshop.village_id

            if review_village_id != managed_village_id:
                return api_error(
                    message="Bạn không có quyền xem đánh giá của làng nghề khác.",
                    status_code=status.HTTP_403_FORBIDDEN
                )

        elif not is_admin:
            if review.user_id != user.user_id and review.status != Review.ReviewStatus.VISIBLE:
                return api_error(message="Không tìm thấy đánh giá.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ReviewDetailSerializer(review)
        return api_success(data=serializer.data, message="Lấy chi tiết đánh giá thành công")


class ReviewReplyView(generics.GenericAPIView):
    """
    POST /api/v1/reviews/<int:pk>/reply/
    PATCH /api/v1/reviews/<int:pk>/reply/
    Create or update official craft village reply to a review.
    Sends automatic notification to customer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _handle_reply(self, request, pk):
        user = request.user
        is_admin = user_has_role(user, 'ADMIN')
        is_village_manager = user_has_role(user, 'CRAFT_VILLAGE')

        if not is_admin and not is_village_manager:
            return api_error(
                message="Bạn không có quyền phản hồi đánh giá.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        review = Review.objects.select_related(
            'user',
            'product',
            'product__village',
            'booking',
            'booking__user',
            'booking__session',
            'booking__session__workshop',
            'booking__session__workshop__village',
        ).filter(pk=pk).first()

        if not review:
            return api_error(message="Không tìm thấy đánh giá.", status_code=status.HTTP_404_NOT_FOUND)

        # Scoping check for Craft Village Manager
        village_name = "Làng nghề"
        if is_village_manager and not is_admin:
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(
                    message="Tài khoản chưa được liên kết với làng nghề.",
                    status_code=status.HTTP_403_FORBIDDEN
                )

            managed_village_id = user.managed_village.village_id
            review_village_id = None
            if review.product_id and review.product:
                review_village_id = review.product.village_id
                village_name = review.product.village.village_name if review.product.village else "Làng nghề"
            elif review.booking_id and review.booking and review.booking.session and review.booking.session.workshop:
                review_village_id = review.booking.session.workshop.village_id
                village_name = review.booking.session.workshop.village.village_name if review.booking.session.workshop.village else "Làng nghề"

            if review_village_id != managed_village_id:
                return api_error(
                    message="Bạn không có quyền phản hồi đánh giá của làng nghề khác.",
                    status_code=status.HTTP_403_FORBIDDEN
                )
        else:
            if review.product_id and review.product and review.product.village:
                village_name = review.product.village.village_name
            elif review.booking_id and review.booking and review.booking.session and review.booking.session.workshop and review.booking.session.workshop.village:
                village_name = review.booking.session.workshop.village.village_name

        serializer = ReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_reply_content = serializer.validated_data['reply_content']

        with transaction.atomic():
            locked_review = Review.objects.select_for_update().select_related(
                'user',
                'replied_by',
                'product',
                'product__village',
                'booking',
                'booking__user',
                'booking__session',
                'booking__session__workshop',
                'booking__session__workshop__village',
            ).get(pk=pk)

            is_update = bool(locked_review.reply_content and locked_review.reply_content.strip())
            now = timezone.now()

            locked_review.reply_content = new_reply_content
            locked_review.replied_by = user
            if is_update:
                locked_review.reply_updated_at = now
            else:
                locked_review.replied_at = now
                locked_review.reply_updated_at = None

            locked_review.save()

            # Create notification for review author
            if locked_review.user_id != user.user_id:
                target_name = ""
                if locked_review.product_id and locked_review.product:
                    target_name = locked_review.product.product_name
                elif locked_review.booking_id and locked_review.booking and locked_review.booking.session and locked_review.booking.session.workshop:
                    target_name = locked_review.booking.session.workshop.workshop_name

                action_verb = "đã cập nhật phản hồi" if is_update else "đã gửi phản hồi cho"
                notif_title = f"{village_name} {action_verb} đánh giá của bạn"
                notif_message = (
                    f"Đại diện {village_name} {action_verb} đánh giá về \"{target_name}\":\n"
                    f"\"{new_reply_content[:200]}\""
                )
                Notification.objects.create(
                    user=locked_review.user,
                    notification_type='REVIEW_REPLY',
                    title=notif_title,
                    message=notif_message,
                    target_type='REVIEW',
                    target_id=locked_review.review_id,
                    is_read=False,
                )

        result_serializer = ReviewDetailSerializer(locked_review)
        msg = "Cập nhật phản hồi thành công!" if is_update else "Gửi phản hồi đánh giá thành công!"
        return api_success(data=result_serializer.data, message=msg, status_code=status.HTTP_200_OK)

    def post(self, request, pk):
        return self._handle_reply(request, pk)

    def patch(self, request, pk):
        return self._handle_reply(request, pk)
