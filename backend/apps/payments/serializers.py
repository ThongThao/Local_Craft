import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from .models import Payment
# pyrefly: ignore [missing-import]
from apps.orders.models import Order
# pyrefly: ignore [missing-import]
from apps.bookings.models import WorkshopBooking


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'payment_id',
            'payment_code',
            'order',
            'booking',
            'payment_method',
            'amount',
            'currency',
            'status',
            'provider_transaction_id',
            'paid_at',
            'created_at',
        ]
        read_only_fields = ['payment_code', 'status', 'provider_transaction_id', 'paid_at', 'created_at']


class CreatePaymentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=False, allow_null=True)
    booking_id = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.CharField(max_length=30, default='VNPAY_DEV')

    def validate(self, attrs):
        order_id = attrs.get('order_id')
        booking_id = attrs.get('booking_id')
        user = self.context['request'].user

        if not order_id and not booking_id:
            raise serializers.ValidationError("Cần chọn đơn hàng hoặc đơn đăng ký workshop để thanh toán.")
        if order_id and booking_id:
            raise serializers.ValidationError("Chỉ thanh toán cho 1 đơn hàng hoặc 1 đơn workshop tại một thời điểm.")

        if order_id:
            try:
                order = Order.objects.get(pk=order_id, user=user)
                if order.payment_status == Order.PaymentStatus.PAID:
                    raise serializers.ValidationError("Đơn hàng này đã được thanh toán.")
                attrs['order_obj'] = order
                attrs['amount'] = order.total_amount
            except Order.DoesNotExist:
                raise serializers.ValidationError({"order_id": "Đơn hàng không tồn tại."})

        if booking_id:
            try:
                booking = WorkshopBooking.objects.get(pk=booking_id, user=user)
                if booking.status in [WorkshopBooking.BookingStatus.CANCELLED, WorkshopBooking.BookingStatus.COMPLETED]:
                    raise serializers.ValidationError("Đơn booking này không thể thanh toán.")
                attrs['booking_obj'] = booking
                attrs['amount'] = booking.total_amount
            except WorkshopBooking.DoesNotExist:
                raise serializers.ValidationError({"booking_id": "Đơn booking không tồn tại."})

        return attrs

    def create(self, validated_data):
        payment_code = f"PAY-{uuid.uuid4().hex[:8].upper()}"
        return Payment.objects.create(
            payment_code=payment_code,
            order=validated_data.get('order_obj'),
            booking=validated_data.get('booking_obj'),
            payment_method=validated_data.get('payment_method', 'VNPAY_DEV'),
            amount=validated_data['amount'],
            status=Payment.PaymentRecordStatus.PENDING,
        )
