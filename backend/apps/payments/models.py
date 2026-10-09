from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Payment(models.Model):
    """
    Table 20: payments
    Transactions for product orders or workshop reservations.
    """

    class PaymentRecordStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ thanh toán'
        SUCCESS = 'SUCCESS', 'Thành công'
        FAILED = 'FAILED', 'Thất bại'
        CANCELLED = 'CANCELLED', 'Hủy'
        REFUNDED = 'REFUNDED', 'Đã hoàn tiền'
        PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', 'Hoàn tiền một phần'

    payment_id = models.BigAutoField(primary_key=True)
    payment_code = models.CharField(max_length=50, unique=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        db_column='order_id',
    )
    booking = models.ForeignKey(
        'bookings.WorkshopBooking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        db_column='booking_id',
    )
    payment_method = models.CharField(max_length=30)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='VND')
    status = models.CharField(
        max_length=20,
        choices=PaymentRecordStatus.choices,
        default=PaymentRecordStatus.PENDING,
    )
    provider_transaction_id = models.CharField(max_length=150, null=True, blank=True)
    idempotency_key = models.CharField(max_length=100, null=True, blank=True, unique=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        verbose_name = 'Giao dịch thanh toán'
        verbose_name_plural = 'Giao dịch thanh toán'
        indexes = [
            models.Index(fields=['order', 'status'], name='idx_payments_order_status'),
            models.Index(fields=['booking', 'status'], name='idx_payments_book_status'),
        ]

    def clean(self):
        super().clean()
        if (self.order is None and self.booking is None) or (self.order is not None and self.booking is not None):
            raise ValidationError('Thanh toán phải thuộc về chính xác một đơn hàng hoặc một đơn booking.')

    def __str__(self):
        return f'{self.payment_code} - {self.amount:,.0f} {self.currency} ({self.status})'


class RefundPolicy(models.Model):
    """
    Table 21: refund_policies
    Refund percentage and time window rules.
    """

    class AppliesTo(models.TextChoices):
        PRODUCT = 'PRODUCT', 'Sản phẩm'
        WORKSHOP = 'WORKSHOP', 'Workshop'
        ALL = 'ALL', 'Tất cả'

    refund_policy_id = models.BigAutoField(primary_key=True)
    policy_name = models.CharField(max_length=200)
    applies_to = models.CharField(max_length=20, choices=AppliesTo.choices)
    hours_before_start = models.IntegerField(null=True, blank=True)
    refund_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    fixed_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField(null=True, blank=True)
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'refund_policies'
        verbose_name = 'Chính sách hoàn tiền'
        verbose_name_plural = 'Chính sách hoàn tiền'

    def __str__(self):
        return f'{self.policy_name} ({self.refund_percentage}%)'


class Refund(models.Model):
    """
    Table 22: refunds
    Refund requests and resolution processing.
    """

    class RefundStatus(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Yêu cầu'
        APPROVED = 'APPROVED', 'Chấp nhận'
        REJECTED = 'REJECTED', 'Từ chối'
        PROCESSING = 'PROCESSING', 'Đang xử lý'
        COMPLETED = 'COMPLETED', 'Đã hoàn tất'
        FAILED = 'FAILED', 'Thất bại'

    refund_id = models.BigAutoField(primary_key=True)
    refund_code = models.CharField(max_length=50, unique=True)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds',
        db_column='payment_id',
    )
    refund_policy = models.ForeignKey(
        RefundPolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='refunds',
        db_column='refund_policy_id',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='refund_requests',
        db_column='requested_by',
    )
    amount_requested = models.DecimalField(max_digits=12, decimal_places=2)
    amount_approved = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    reason = models.TextField()
    admin_note = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        default=RefundStatus.REQUESTED,
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    provider_refund_id = models.CharField(max_length=150, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'refunds'
        verbose_name = 'Yêu cầu hoàn tiền'
        verbose_name_plural = 'Yêu cầu hoàn tiền'
        indexes = [
            models.Index(fields=['payment', 'status'], name='idx_refunds_pay_status'),
            models.Index(fields=['requested_by', 'requested_at'], name='idx_refunds_user_req'),
        ]

    def __str__(self):
        return f'{self.refund_code} - {self.amount_requested:,.0f} VND ({self.status})'
