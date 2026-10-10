from django.utils import timezone
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsCraftVillage, IsVillageManager, user_has_role
# pyrefly: ignore [missing-import]
from apps.products.models import ProductVariant
from .models import Cart, CartItem, Order, VendorOrder
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    VendorOrderSerializer,
)
from .services import sync_parent_order_status


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
        orders = Order.objects.filter(user=request.user).prefetch_related(
            'items',
            'vendor_orders__items',
            'vendor_orders__village',
        ).order_by('-created_at')
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
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items',
            'vendor_orders__items',
            'vendor_orders__village',
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết đơn hàng thành công")


class VendorOrderListView(generics.ListAPIView):
    """
    GET /api/v1/vendor-orders/
    List vendor orders partitioned by craft village.
    Village managers can only see their own village's orders.
    Admin can see all vendor orders.
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]
    serializer_class = VendorOrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = VendorOrder.objects.select_related('village', 'order').prefetch_related('items')

        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return VendorOrder.objects.none()
            qs = qs.filter(village=user.managed_village)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đơn hàng làng nghề thành công")


class VendorOrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/vendor-orders/<id>/
    Retrieve vendor order details.
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]
    serializer_class = VendorOrderSerializer
    queryset = VendorOrder.objects.select_related('village', 'order').prefetch_related('items')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết đơn hàng làng nghề thành công")


class VendorOrderStatusUpdateView(generics.GenericAPIView):
    """
    PATCH /api/v1/vendor-orders/<id>/status/
    Update status of vendor order.
    Triggers automatic aggregation rollup of parent order status.
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]

    VALID_TRANSITIONS = {
        VendorOrder.VendorOrderStatus.PENDING: [
            VendorOrder.VendorOrderStatus.CONFIRMED,
            VendorOrder.VendorOrderStatus.CANCELLED,
        ],
        VendorOrder.VendorOrderStatus.CONFIRMED: [
            VendorOrder.VendorOrderStatus.PROCESSING,
            VendorOrder.VendorOrderStatus.CANCELLED,
        ],
        VendorOrder.VendorOrderStatus.PROCESSING: [
            VendorOrder.VendorOrderStatus.SHIPPED,
            VendorOrder.VendorOrderStatus.CANCELLED,
        ],
        VendorOrder.VendorOrderStatus.SHIPPED: [
            VendorOrder.VendorOrderStatus.DELIVERED,
        ],
        VendorOrder.VendorOrderStatus.DELIVERED: [
            VendorOrder.VendorOrderStatus.COMPLETED,
        ],
        VendorOrder.VendorOrderStatus.COMPLETED: [],
        VendorOrder.VendorOrderStatus.CANCELLED: [],
    }

    def patch(self, request, pk):
        try:
            vendor_order = VendorOrder.objects.select_related('order', 'village').get(pk=pk)
        except VendorOrder.DoesNotExist:
            return api_error(message="Đơn hàng làng nghề không tồn tại", status_code=404)

        self.check_object_permissions(request, vendor_order)

        new_status = request.data.get('status')
        if not new_status or new_status not in VendorOrder.VendorOrderStatus.values:
            return api_error(message="Trạng thái không hợp lệ", status_code=400)

        # Transition validation for non-admin
        if not user_has_role(request.user, 'ADMIN'):
            allowed = self.VALID_TRANSITIONS.get(vendor_order.status, [])
            if new_status not in allowed:
                return api_error(
                    message=f"Không thể chuyển trạng thái từ {vendor_order.status} sang {new_status}",
                    status_code=400
                )

        vendor_order.status = new_status

        # Timestamps and tracking snapshots
        if new_status == VendorOrder.VendorOrderStatus.SHIPPED:
            if not vendor_order.shipped_at:
                vendor_order.shipped_at = timezone.now()
            if 'tracking_code' in request.data:
                vendor_order.tracking_code = request.data.get('tracking_code')

        elif new_status == VendorOrder.VendorOrderStatus.DELIVERED:
            if not vendor_order.delivered_at:
                vendor_order.delivered_at = timezone.now()

        vendor_order.save(update_fields=['status', 'tracking_code', 'shipped_at', 'delivered_at', 'updated_at'])

        # Aggregate and rollup parent order status
        sync_parent_order_status(vendor_order.order)

        return api_success(
            data=VendorOrderSerializer(vendor_order).data,
            message="Cập nhật trạng thái đơn hàng làng nghề thành công!"
        )
