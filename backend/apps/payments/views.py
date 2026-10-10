import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.orders.models import Order, VendorOrder
# pyrefly: ignore [missing-import]
from apps.bookings.models import WorkshopBooking
from .models import Payment
from .serializers import PaymentSerializer, CreatePaymentSerializer


class PaymentCreateView(generics.GenericAPIView):
    """
    POST /api/v1/payments/create/
    Initiate payment for an order or workshop booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return api_success(
            data=PaymentSerializer(payment).data,
            message="Tạo yêu cầu thanh toán thành công",
            status_code=status.HTTP_201_CREATED
        )


class PaymentVerifyView(generics.GenericAPIView):
    """
    POST /api/v1/payments/verify/
    Verify gateway callback or developer simulated payment completion.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_code = request.data.get('payment_code')
        if not payment_code:
            return api_error(message="Cần cung cấp payment_code")

        try:
            payment = Payment.objects.select_for_update().get(payment_code=payment_code)
        except Payment.DoesNotExist:
            return api_error(message="Giao dịch không tồn tại", status_code=404)

        if payment.status == Payment.PaymentRecordStatus.SUCCESS:
            return api_success(data=PaymentSerializer(payment).data, message="Giao dịch đã hoàn tất trước đó")

        with transaction.atomic():
            payment.status = Payment.PaymentRecordStatus.SUCCESS
            payment.paid_at = timezone.now()
            payment.provider_transaction_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
            payment.save(update_fields=['status', 'paid_at', 'provider_transaction_id', 'updated_at'])

            if payment.order:
                payment.order.payment_status = Order.PaymentStatus.PAID
                payment.order.status = Order.OrderStatus.CONFIRMED
                payment.order.save(update_fields=['payment_status', 'status', 'updated_at'])

                # Update child vendor orders
                payment.order.vendor_orders.update(
                    payment_status=Order.PaymentStatus.PAID,
                    status=VendorOrder.VendorOrderStatus.CONFIRMED,
                    updated_at=timezone.now(),
                )

            if payment.booking:
                payment.booking.status = WorkshopBooking.BookingStatus.CONFIRMED
                payment.booking.save(update_fields=['status', 'updated_at'])

        return api_success(
            data=PaymentSerializer(payment).data,
            message="Xác nhận thanh toán thành công!"
        )
