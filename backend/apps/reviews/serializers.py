from rest_framework import serializers
from .models import Review
from apps.orders.models import Order, OrderItem
from apps.bookings.models import WorkshopBooking


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.avatar_url', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    target_type = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.product_name', read_only=True, default=None)
    product_image = serializers.SerializerMethodField()
    workshop_name = serializers.CharField(source='booking.session.workshop.workshop_name', read_only=True, default=None)
    workshop_image = serializers.SerializerMethodField()
    workshop_id = serializers.SerializerMethodField()
    booking_code = serializers.CharField(source='booking.booking_code', read_only=True, default=None)
    session_id = serializers.SerializerMethodField()
    session_start_at = serializers.DateTimeField(source='booking.session.start_at', read_only=True, default=None)
    session_end_at = serializers.DateTimeField(source='booking.session.end_at', read_only=True, default=None)

    # Reply fields (V15)
    replied_by_name = serializers.CharField(source='replied_by.full_name', read_only=True, default=None)
    is_replied = serializers.BooleanField(read_only=True)

    class Meta:
        model = Review
        fields = [
            'review_id',
            'user',
            'user_name',
            'user_avatar',
            'user_email',
            'target_type',
            'product',
            'product_name',
            'product_image',
            'booking',
            'booking_code',
            'workshop_id',
            'workshop_name',
            'workshop_image',
            'session_id',
            'session_start_at',
            'session_end_at',
            'rating',
            'title',
            'content',
            'status',
            'reply_content',
            'replied_by',
            'replied_by_name',
            'replied_at',
            'reply_updated_at',
            'is_replied',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'user',
            'status',
            'created_at',
            'updated_at',
            'reply_content',
            'replied_by',
            'replied_at',
            'reply_updated_at',
            'is_replied',
        ]

    def get_target_type(self, obj) -> str:
        return 'PRODUCT' if obj.product_id else 'WORKSHOP'

    def get_product_image(self, obj):
        if not obj.product_id or not hasattr(obj, 'product') or not obj.product:
            return None
        # Try prefetched images first or fallback
        if hasattr(obj.product, 'images'):
            primary = next((img for img in obj.product.images.all() if getattr(img, 'is_primary', False)), None)
            if not primary:
                primary = obj.product.images.all().first()
            if primary and hasattr(primary, 'image_url'):
                return primary.image_url
        return None

    def get_workshop_image(self, obj):
        if not obj.booking_id or not hasattr(obj, 'booking') or not obj.booking:
            return None
        session = getattr(obj.booking, 'session', None)
        if session and hasattr(session, 'workshop') and session.workshop:
            return getattr(session.workshop, 'cover_image_url', None)
        return None

    def get_workshop_id(self, obj):
        if not obj.booking_id or not hasattr(obj, 'booking') or not obj.booking:
            return None
        session = getattr(obj.booking, 'session', None)
        if session:
            return getattr(session, 'workshop_id', None)
        return None

    def get_session_id(self, obj):
        if not obj.booking_id or not hasattr(obj, 'booking') or not obj.booking:
            return None
        return getattr(obj.booking, 'session_id', None)


class ReviewDetailSerializer(ReviewSerializer):
    """
    Detailed review serializer providing full customer context and village metadata.
    """
    village_id = serializers.SerializerMethodField()
    village_name = serializers.SerializerMethodField()

    class Meta(ReviewSerializer.Meta):
        fields = ReviewSerializer.Meta.fields + ['village_id', 'village_name']

    def get_village_id(self, obj):
        if obj.product_id and obj.product:
            return obj.product.village_id
        if obj.booking_id and obj.booking and obj.booking.session and obj.booking.session.workshop:
            return obj.booking.session.workshop.village_id
        return None

    def get_village_name(self, obj):
        if obj.product_id and obj.product and obj.product.village:
            return obj.product.village.village_name
        if obj.booking_id and obj.booking and obj.booking.session and obj.booking.session.workshop and obj.booking.session.workshop.village:
            return obj.booking.session.workshop.village.village_name
        return None


class CreateReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'product',
            'booking',
            'rating',
            'title',
            'content',
        ]

    def validate(self, attrs):
        product = attrs.get('product')
        booking = attrs.get('booking')
        user = self.context['request'].user

        if not product and not booking:
            raise serializers.ValidationError("Cần chọn sản phẩm hoặc đơn đặt workshop để đánh giá.")
        if product and booking:
            raise serializers.ValidationError("Đánh giá chỉ thuộc về sản phẩm HOẶC workshop.")

        # Check existing review to prevent duplicate
        if product:
            if Review.objects.filter(user=user, product=product).exists():
                raise serializers.ValidationError("Bạn đã đánh giá sản phẩm này rồi.")
            # Verify user purchased and received this product
            has_purchased = OrderItem.objects.filter(
                order__user=user,
                variant__product=product,
                order__status__in=[Order.OrderStatus.DELIVERED, Order.OrderStatus.COMPLETED]
            ).exists()
            if not has_purchased:
                raise serializers.ValidationError("Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công.")

        if booking:
            if Review.objects.filter(user=user, booking=booking).exists():
                raise serializers.ValidationError("Bạn đã đánh giá workshop này rồi.")
            if booking.user_id != user.user_id:
                raise serializers.ValidationError("Đơn đặt workshop không thuộc về tài khoản của bạn.")
            if booking.status != WorkshopBooking.BookingStatus.COMPLETED:
                raise serializers.ValidationError("Bạn chỉ có thể đánh giá workshop sau khi đã hoàn thành buổi trải nghiệm.")

        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = Review.ReviewStatus.VISIBLE
        return super().create(validated_data)


class ReviewReplySerializer(serializers.Serializer):
    """
    Serializer to validate village representative's reply to a review.
    """
    reply_content = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
    )
    content = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        content = attrs.get('reply_content') or attrs.get('content')
        if not content or not content.strip():
            raise serializers.ValidationError("Nội dung phản hồi không được để trống.")
        cleaned = content.strip()
        if len(cleaned) > 1000:
            raise serializers.ValidationError("Nội dung phản hồi không được vượt quá 1000 ký tự.")
        attrs['reply_content'] = cleaned
        return attrs
