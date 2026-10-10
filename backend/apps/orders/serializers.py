import uuid
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem
from apps.products.models import ProductVariant, Inventory


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
            'variant',
            'product_name_snapshot',
            'variant_name_snapshot',
            'sku_snapshot',
            'unit_price',
            'quantity',
            'line_total',
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

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
            'created_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=150)
    recipient_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField(max_length=500)
    shipping_note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user
        cart = Cart.objects.filter(user=user).prefetch_related('items__variant__inventory').first()
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
        cart_items = list(cart.items.all())

        subtotal = sum(item.variant.price * item.quantity for item in cart_items)
        shipping_fee = Decimal('30000.00')  # 30,000 VND standard
        total_amount = subtotal + shipping_fee
        order_code = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            order = Order.objects.create(
                order_code=order_code,
                user=user,
                subtotal=subtotal,
                shipping_fee=shipping_fee,
                discount_amount=Decimal('0.00'),
                total_amount=total_amount,
                recipient_name=validated_data['recipient_name'],
                recipient_phone=validated_data['recipient_phone'],
                shipping_address=validated_data['shipping_address'],
                shipping_note=validated_data.get('shipping_note', ''),
                status=Order.OrderStatus.PENDING,
                payment_status=Order.PaymentStatus.UNPAID,
            )

            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    variant=item.variant,
                    product_name_snapshot=item.variant.product.product_name,
                    variant_name_snapshot=item.variant.variant_name,
                    sku_snapshot=item.variant.sku,
                    unit_price=item.variant.price,
                    quantity=item.quantity,
                    line_total=item.variant.price * item.quantity,
                )

                # Deduct inventory
                inv = item.variant.inventory
                inv.quantity = max(0, inv.quantity - item.quantity)
                inv.save(update_fields=['quantity', 'updated_at'])

            # Clear cart items
            cart.items.all().delete()

        return order
