from rest_framework import serializers
from .models import Review
from apps.orders.models import OrderItem
from apps.bookings.models import WorkshopBooking


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.avatar_url', read_only=True)

    class Meta:
        model = Review
        fields = [
            'review_id',
            'user',
            'user_name',
            'user_avatar',
            'product',
            'booking',
            'rating',
            'title',
            'content',
            'status',
            'created_at',
        ]
        read_only_fields = ['user', 'status', 'created_at']


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
        if product and Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("Bạn đã đánh giá sản phẩm này rồi.")
        if booking and Review.objects.filter(user=user, booking=booking).exists():
            raise serializers.ValidationError("Bạn đã đánh giá workshop này rồi.")

        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = Review.ReviewStatus.VISIBLE
        return super().create(validated_data)
