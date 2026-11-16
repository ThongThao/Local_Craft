import uuid
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from apps.products.models import Inventory
from .models import Cart, CartItem, Order, OrderItem, VendorOrder


class CartItemSerializer(serializers.ModelSerializer):
    variant_name = serializers.CharField(source='variant.variant_name', read_only=True)
    product_name = serializers.CharField(source='variant.product.product_name', read_only=True)
    product_image = serializers.CharField(source='variant.product.cover_image_url', read_only=True)
    price = serializers.DecimalField(source='variant.price', max_digits=12, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'cart_item_id',
            'variant',
            'variant_name',
            'product_name',
            'product_image',
            'price',
            'quantity',
            'line_total',
            'updated_at',
        ]

    def get_line_total(self, obj):
        return obj.variant.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'cart_id',
            'items',
            'total_items',
            'total_amount',
            'updated_at',
        ]

    def get_total_amount(self, obj):
        return sum(item.variant.price * item.quantity for item in obj.items.all())

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())


from apps.payments.models import Payment, Refund


class PaymentBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'payment_id',
            'payment_code',
            'payment_method',
            'amount',
            'currency',
            'status',
            'provider_transaction_id',
            'paid_at',
            'created_at',
        ]


class RefundBriefSerializer(serializers.ModelSerializer):
    requested_by_email = serializers.CharField(source='requested_by.email', read_only=True, default='')

    class Meta:
        model = Refund
        fields = [
            'refund_id',
            'refund_code',
            'payment_id',
            'amount_requested',
            'amount_approved',
            'reason',
            'admin_note',
            'status',
            'requested_by_email',
            'requested_at',
            'processed_at',
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.CharField(source='variant.product.cover_image_url', read_only=True, default='')
    product_id = serializers.IntegerField(source='variant.product.product_id', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'order_item_id',
            'order',
            'vendor_order',
            'variant',
            'product_id',
            'product_image',
            'product_name_snapshot',
            'variant_name_snapshot',
            'sku_snapshot',
            'unit_price',
            'quantity',
            'line_total',
            'created_at',
        ]


class VendorOrderSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    order_id = serializers.IntegerField(source='order.order_id', read_only=True)
    order_code = serializers.CharField(source='order.order_code', read_only=True)
    parent_order_status = serializers.CharField(source='order.status', read_only=True)
    parent_payment_status = serializers.CharField(source='order.payment_status', read_only=True)
    parent_subtotal = serializers.DecimalField(source='order.subtotal', max_digits=12, decimal_places=2, read_only=True)
    parent_shipping_fee = serializers.DecimalField(source='order.shipping_fee', max_digits=12, decimal_places=2, read_only=True)
    parent_discount_amount = serializers.DecimalField(source='order.discount_amount', max_digits=12, decimal_places=2, read_only=True)
    parent_total_amount = serializers.DecimalField(source='order.total_amount', max_digits=12, decimal_places=2, read_only=True)
    order_placed_at = serializers.DateTimeField(source='order.placed_at', read_only=True)
    customer_id = serializers.IntegerField(source='order.user_id', read_only=True)
    customer_email = serializers.CharField(source='order.user.email', read_only=True, default='')
    customer_name = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentBriefSerializer(source='order.payments', many=True, read_only=True)
    refunds = RefundBriefSerializer(many=True, read_only=True)

    class Meta:
        model = VendorOrder
        fields = [
            'vendor_order_id',
            'vendor_order_code',
            'order',
            'order_id',
            'order_code',
            'village',
            'village_name',
            'customer_id',
            'customer_name',
            'customer_email',
            'parent_order_status',
            'parent_payment_status',
            'parent_subtotal',
            'parent_shipping_fee',
            'parent_discount_amount',
            'parent_total_amount',
            'order_placed_at',
            'subtotal',
            'shipping_fee',
            'discount_amount',
            'total_amount',
            'status',
            'payment_status',
            'recipient_name',
            'recipient_phone',
            'shipping_address',
            'shipping_note',
            'tracking_code',
            'shipped_at',
            'delivered_at',
            'items',
            'payments',
            'refunds',
            'created_at',
            'updated_at',
        ]

    def get_customer_name(self, obj):
        if not obj.order or not obj.order.user:
            return obj.recipient_name
        full_name = (getattr(obj.order.user, 'full_name', '') or '').strip()
        return full_name if full_name else (obj.order.user.email or obj.recipient_name)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    vendor_orders = VendorOrderSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'order_id',
            'order_code',
            'subtotal',
            'shipping_fee',
            'discount_amount',
            'total_amount',
            'recipient_name',
            'recipient_phone',
            'shipping_address',
            'shipping_note',
            'status',
            'payment_status',
            'items',
            'vendor_orders',
            'created_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=150)
    recipient_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField(max_length=500)
    shipping_note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user
        cart = Cart.objects.filter(user=user).prefetch_related('items__variant__inventory', 'items__variant__product__village').first()
        if not cart or not cart.items.exists():
            raise serializers.ValidationError("Giỏ hàng của bạn đang trống.")

        for item in cart.items.all():
            inv = getattr(item.variant, 'inventory', None)
            if not inv or inv.sellable_quantity < item.quantity:
                raise serializers.ValidationError(
                    f"Sản phẩm {item.variant.variant_name} không đủ số lượng tồn kho."
                )

        attrs['cart'] = cart
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        cart = validated_data['cart']
        cart_items = list(cart.items.select_related('variant__product__village', 'variant__inventory'))

        # Group items by village
        items_by_village = {}
        for item in cart_items:
            village = item.variant.product.village
            if village not in items_by_village:
                items_by_village[village] = []
            items_by_village[village].append(item)

        standard_shipping_per_vendor = Decimal('30000.00')

        with transaction.atomic():
            order_code = f"ORD-{uuid.uuid4().hex[:8].upper()}"
            parent_order = Order.objects.create(
                order_code=order_code,
                user=user,
                subtotal=Decimal('0.00'),
                shipping_fee=Decimal('0.00'),
                discount_amount=Decimal('0.00'),
                total_amount=Decimal('0.00'),
                recipient_name=validated_data['recipient_name'],
                recipient_phone=validated_data['recipient_phone'],
                shipping_address=validated_data['shipping_address'],
                shipping_note=validated_data.get('shipping_note', ''),
                status=Order.OrderStatus.PENDING,
                payment_status=Order.PaymentStatus.UNPAID,
            )

            parent_subtotal = Decimal('0.00')
            parent_shipping = Decimal('0.00')
            parent_discount = Decimal('0.00')

            for village, v_items in items_by_village.items():
                v_subtotal = sum(it.variant.price * it.quantity for it in v_items)
                v_shipping = standard_shipping_per_vendor
                v_discount = Decimal('0.00')
                v_total = v_subtotal + v_shipping - v_discount

                vendor_order_code = f"VORD-{village.village_id}-{uuid.uuid4().hex[:6].upper()}"
                vendor_order = VendorOrder.objects.create(
                    vendor_order_code=vendor_order_code,
                    order=parent_order,
                    village=village,
                    subtotal=v_subtotal,
                    shipping_fee=v_shipping,
                    discount_amount=v_discount,
                    total_amount=v_total,
                    status=VendorOrder.VendorOrderStatus.PENDING,
                    payment_status=Order.PaymentStatus.UNPAID,
                    recipient_name=validated_data['recipient_name'],
                    recipient_phone=validated_data['recipient_phone'],
                    shipping_address=validated_data['shipping_address'],
                    shipping_note=validated_data.get('shipping_note', ''),
                )

                for item in v_items:
                    OrderItem.objects.create(
                        order=parent_order,
                        vendor_order=vendor_order,
                        variant=item.variant,
                        product_name_snapshot=item.variant.product.product_name,
                        variant_name_snapshot=item.variant.variant_name,
                        sku_snapshot=item.variant.sku,
                        unit_price=item.variant.price,
                        quantity=item.quantity,
                        line_total=item.variant.price * item.quantity,
                    )

                    # Lock and deduct inventory atomically to prevent race conditions & overselling
                    inv, _ = Inventory.objects.select_for_update().get_or_create(
                        variant=item.variant,
                        defaults={'quantity': 0, 'reserved_quantity': 0}
                    )
                    if inv.sellable_quantity < item.quantity:
                        raise serializers.ValidationError(
                            f"Sản phẩm {item.variant.variant_name} không đủ số lượng tồn kho khả dụng ({inv.sellable_quantity} còn lại)."
                        )

                    inv.quantity = inv.quantity - item.quantity
                    inv.save(update_fields=['quantity', 'updated_at'])

                parent_subtotal += v_subtotal
                parent_shipping += v_shipping
                parent_discount += v_discount

            parent_order.subtotal = parent_subtotal
            parent_order.shipping_fee = parent_shipping
            parent_order.discount_amount = parent_discount
            parent_order.total_amount = parent_subtotal + parent_shipping - parent_discount
            parent_order.save(update_fields=['subtotal', 'shipping_fee', 'discount_amount', 'total_amount', 'updated_at'])

            # Clear cart items
            cart.items.all().delete()

        return parent_order
