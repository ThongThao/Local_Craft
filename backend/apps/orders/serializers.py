import uuid
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
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


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'order_item_id',
            'order',
            'vendor_order',
            'variant',
            'product_name_snapshot',
            'variant_name_snapshot',
            'sku_snapshot',
            'unit_price',
            'quantity',
            'line_total',
        ]


class VendorOrderSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = VendorOrder
        fields = [
            'vendor_order_id',
            'vendor_order_code',
            'order',
            'village',
            'village_name',
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
            'created_at',
            'updated_at',
        ]


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

                    # Deduct inventory atomically
                    inv = item.variant.inventory
                    inv.quantity = max(0, inv.quantity - item.quantity)
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
