from django.conf import settings
from django.db import models


class Cart(models.Model):
    """
    Table 16: carts
    Active shopping cart per user.
    """

    cart_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        db_column='user_id',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'
        verbose_name = 'Giỏ hàng'
        verbose_name_plural = 'Giỏ hàng'

    def __str__(self):
        return f'Giỏ hàng của {self.user.email}'


class CartItem(models.Model):
    """
    Table 17: cart_items
    Variants placed in a user shopping cart.
    """

    cart_item_id = models.BigAutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='cart_id',
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.CASCADE,
        related_name='cart_items',
        db_column='variant_id',
    )
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart_items'
        verbose_name = 'Mục giỏ hàng'
        verbose_name_plural = 'Mục giỏ hàng'
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'variant'],
                name='uq_cart_items_cart_variant',
            )
        ]

    def __str__(self):
        return f'{self.cart.user.email} - {self.variant.variant_name} x {self.quantity}'


class Order(models.Model):
    """
    Table 18: orders
    Product purchase orders with shipping snapshots.
    """

    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ xử lý'
        CONFIRMED = 'CONFIRMED', 'Đã xác nhận'
        PROCESSING = 'PROCESSING', 'Đang xử lý'
        SHIPPED = 'SHIPPED', 'Đang giao'
        DELIVERED = 'DELIVERED', 'Đã giao'
        CANCELLED = 'CANCELLED', 'Đã hủy'
        COMPLETED = 'COMPLETED', 'Đã hoàn tất'

    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Chưa thanh toán'
        PENDING = 'PENDING', 'Chờ xác nhận thanh toán'
        PAID = 'PAID', 'Đã thanh toán'
        PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', 'Hoàn tiền một phần'
        REFUNDED = 'REFUNDED', 'Đã hoàn tiền'
        FAILED = 'FAILED', 'Thanh toán thất bại'

    order_id = models.BigAutoField(primary_key=True)
    order_code = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        db_column='user_id',
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    recipient_name = models.CharField(max_length=150)
    recipient_phone = models.CharField(max_length=20)
    shipping_address = models.CharField(max_length=500)
    shipping_note = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )
    placed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        verbose_name = 'Đơn hàng'
        verbose_name_plural = 'Đơn hàng'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_orders_user_created'),
            models.Index(fields=['status'], name='idx_orders_status'),
        ]

    def __str__(self):
        return f'{self.order_code} - {self.recipient_name} ({self.total_amount:,.0f} VND)'


class VendorOrder(models.Model):
    """
    Child vendor order partitioned by craft village.
    Represents the portion of a parent order handled by one craft village.
    """

    class VendorOrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ xử lý'
        CONFIRMED = 'CONFIRMED', 'Đã xác nhận'
        PROCESSING = 'PROCESSING', 'Đang xử lý'
        SHIPPED = 'SHIPPED', 'Đang giao'
        DELIVERED = 'DELIVERED', 'Đã giao'
        COMPLETED = 'COMPLETED', 'Đã hoàn tất'
        CANCELLED = 'CANCELLED', 'Đã hủy'

    vendor_order_id = models.BigAutoField(primary_key=True)
    vendor_order_code = models.CharField(max_length=60, unique=True, db_index=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='vendor_orders',
        db_column='order_id',
    )
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.CASCADE,
        related_name='vendor_orders',
        db_column='village_id',
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=VendorOrderStatus.choices,
        default=VendorOrderStatus.PENDING,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=Order.PaymentStatus.choices,
        default=Order.PaymentStatus.UNPAID,
    )
    recipient_name = models.CharField(max_length=150)
    recipient_phone = models.CharField(max_length=20)
    shipping_address = models.CharField(max_length=500)
    shipping_note = models.CharField(max_length=500, null=True, blank=True)
    tracking_code = models.CharField(max_length=100, null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vendor_orders'
        verbose_name = 'Đơn hàng làng nghề'
        verbose_name_plural = 'Đơn hàng làng nghề'
        indexes = [
            models.Index(fields=['order', 'village'], name='idx_vorders_order_village'),
            models.Index(fields=['village', 'status'], name='idx_vorders_village_status'),
            models.Index(fields=['status'], name='idx_vorders_status'),
        ]

    def __str__(self):
        return f'{self.vendor_order_code} - {self.village.village_name} ({self.total_amount:,.0f} VND)'


class OrderItem(models.Model):
    """
    Table 19: order_items
    Order line items with product and price snapshot details.
    """

    order_item_id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='order_id',
    )
    vendor_order = models.ForeignKey(
        VendorOrder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='items',
        db_column='vendor_order_id',
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.PROTECT,
        related_name='order_items',
        db_column='variant_id',
    )
    product_name_snapshot = models.CharField(max_length=200)
    variant_name_snapshot = models.CharField(max_length=150)
    sku_snapshot = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.IntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_items'
        verbose_name = 'Mục đơn hàng'
        verbose_name_plural = 'Mục đơn hàng'

    def clean(self):
        super().clean()
        if self.vendor_order and self.order:
            if self.vendor_order.order_id != self.order_id:
                from django.core.exceptions import ValidationError
                raise ValidationError('Đơn hàng nhà cung cấp phải thuộc về cùng một đơn hàng cha.')

    def __str__(self):
        return f'{self.order.order_code}: {self.product_name_snapshot} x {self.quantity}'
