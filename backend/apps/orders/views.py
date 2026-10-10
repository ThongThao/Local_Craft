from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from apps.products.models import ProductVariant
from .models import Cart, CartItem, Order
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    CreateOrderSerializer,
)


class CartView(generics.GenericAPIView):
    """
    GET /api/v1/cart/
    Retrieve current user's shopping cart.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return api_success(data=serializer.data, message="Lấy giỏ hàng thành công")


class CartItemAddView(generics.GenericAPIView):
    """
    POST /api/v1/cart/items/
    Add item to cart or increment quantity.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        variant_id = request.data.get('variant_id')
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if quantity <= 0:
            return api_error(message="Số lượng phải lớn hơn 0")

        cart, _ = Cart.objects.get_or_create(user=request.user)

        variant = None
        if variant_id:
            try:
                variant = ProductVariant.objects.get(pk=variant_id, is_active=True)
            except ProductVariant.DoesNotExist:
                return api_error(message="Biến thể không tồn tại", status_code=404)
        elif product_id:
            variant = ProductVariant.objects.filter(product_id=product_id, is_active=True).first()
            if not variant:
                return api_error(message="Sản phẩm chưa có biến thể hoạt động", status_code=404)
        else:
            return api_error(message="Cần cung cấp variant_id hoặc product_id")

        inv = getattr(variant, 'inventory', None)
        if inv and inv.sellable_quantity < quantity:
            return api_error(message=f"Số lượng tồn kho chỉ còn {inv.sellable_quantity}")

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save(update_fields=['quantity', 'updated_at'])

        return api_success(
            data=CartSerializer(cart).data,
            message="Đã thêm sản phẩm vào giỏ hàng",
            status_code=status.HTTP_201_CREATED
        )


class CartItemUpdateDeleteView(generics.GenericAPIView):
    """
    PUT, DELETE /api/v1/cart/items/<id>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            cart_item = CartItem.objects.get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return api_error(message="Mục trong giỏ không tồn tại", status_code=404)

        quantity = int(request.data.get('quantity', 1))
        if quantity <= 0:
            cart_item.delete()
        else:
            inv = getattr(cart_item.variant, 'inventory', None)
            if inv and inv.sellable_quantity < quantity:
                return api_error(message=f"Số lượng tồn kho chỉ còn {inv.sellable_quantity}")
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity', 'updated_at'])

        cart = Cart.objects.get(user=request.user)
        return api_success(data=CartSerializer(cart).data, message="Cập nhật giỏ hàng thành công")

    def delete(self, request, pk):
        try:
            cart_item = CartItem.objects.get(pk=pk, cart__user=request.user)
            cart_item.delete()
        except CartItem.DoesNotExist:
            return api_error(message="Mục trong giỏ không tồn tại", status_code=404)

        cart = Cart.objects.get(user=request.user)
        return api_success(data=CartSerializer(cart).data, message="Đã xóa mục khỏi giỏ hàng")


class OrderListCreateView(generics.GenericAPIView):
    """
    GET, POST /api/v1/orders/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items').order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đơn hàng thành công")

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return api_success(
            data=OrderSerializer(order).data,
            message="Đặt hàng thành công!",
            status_code=status.HTTP_201_CREATED
        )


class OrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/orders/<id>/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết đơn hàng thành công")
