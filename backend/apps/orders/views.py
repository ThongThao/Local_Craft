from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsCraftVillage, IsVillageManager, IsTourist, user_has_role
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
from .services import sync_parent_order_status, cancel_vendor_order, cancel_parent_order


class CartView(generics.GenericAPIView):
    """
    GET /api/v1/cart/
    Retrieve current user's shopping cart.
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return api_success(data=serializer.data, message="Lấy giỏ hàng thành công")


class CartItemAddView(generics.GenericAPIView):
    """
    POST /api/v1/cart/items/
    Add item to cart or increment quantity.
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

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
    permission_classes = [permissions.IsAuthenticated, IsTourist]

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
    permission_classes = [permissions.IsAuthenticated, IsTourist]

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
    permission_classes = [permissions.IsAuthenticated, IsTourist]
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

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status == Order.OrderStatus.CANCELLED:
            try:
                cancelled_order = cancel_parent_order(instance, user=request.user)
                return api_success(
                    data=self.get_serializer(cancelled_order).data,
                    message="Hủy đơn hàng và hoàn trả tồn kho thành công!"
                )
            except ValidationError as err:
                msg = err.message if hasattr(err, 'message') else str(err)
                return api_error(message=msg, status_code=400)

        return api_error(message="Cập nhật trạng thái không được hỗ trợ", status_code=400)


class VendorOrderListView(generics.ListAPIView):
    """
    GET /api/v1/vendor-orders/
    List vendor orders partitioned by craft village.
    Village managers can only see their own village's orders.
    Admin can see all vendor orders.
    Supports search, status, payment_status, date range filters.
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]
    serializer_class = VendorOrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = VendorOrder.objects.select_related(
            'village', 'order', 'order__user'
        ).prefetch_related(
            'items__variant__product',
            'order__payments',
            'refunds',
        )

        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return VendorOrder.objects.none()
            qs = qs.filter(village=user.managed_village)

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)

        # Payment status filter
        payment_status_param = self.request.query_params.get('payment_status')
        if payment_status_param and payment_status_param != 'ALL':
            qs = qs.filter(payment_status=payment_status_param)

        # Search by order code, vendor order code, recipient name, phone, customer email/name
        search_param = (self.request.query_params.get('search') or self.request.query_params.get('q') or '').strip()
        if search_param:
            qs = qs.filter(
                models.Q(vendor_order_code__icontains=search_param) |
                models.Q(order__order_code__icontains=search_param) |
                models.Q(recipient_name__icontains=search_param) |
                models.Q(recipient_phone__icontains=search_param) |
                models.Q(order__user__first_name__icontains=search_param) |
                models.Q(order__user__last_name__icontains=search_param) |
                models.Q(order__user__email__icontains=search_param)
            )

        # Order code exact or partial
        order_code_param = (self.request.query_params.get('order_code') or '').strip()
        if order_code_param:
            qs = qs.filter(
                models.Q(order__order_code__icontains=order_code_param) |
                models.Q(vendor_order_code__icontains=order_code_param)
            )

        # Date range filtering
        from_date = self.request.query_params.get('from_date') or self.request.query_params.get('start_date')
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)

        to_date = self.request.query_params.get('to_date') or self.request.query_params.get('end_date')
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đơn hàng làng nghề thành công")


class VendorOrderSummaryView(generics.GenericAPIView):
    """
    GET /api/v1/vendor-orders/summary/
    Return accurate database-level KPI aggregations for craft village orders.
    Counts distinct parent orders (does not double-count items).
    """
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]

    def get(self, request):
        user = request.user
        base_qs = VendorOrder.objects.all()

        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_success(data={
                    'total_orders': 0,
                    'total_vendor_orders': 0,
                    'total_parent_orders': 0,
                    'total_items_quantity': 0,
                    'pending_orders': 0,
                    'confirmed_orders': 0,
                    'processing_orders': 0,
                    'shipped_orders': 0,
                    'delivered_orders': 0,
                    'completed_orders': 0,
                    'cancelled_orders': 0,
                    'total_subtotal': 0.0,
                    'total_shipping_fee': 0.0,
                    'total_discount_amount': 0.0,
                    'total_order_amount': 0.0,
                    'total_paid_amount': 0.0,
                    'total_refunded_amount': 0.0,
                    'net_realized_revenue': 0.0,
                    'total_village_revenue': 0.0,
                }, message="Thống kê đơn hàng")
            base_qs = base_qs.filter(village=user.managed_village)

        # Distinct VendorOrder counts (matching V13 list)
        total_vendor_orders = base_qs.values('vendor_order_id').distinct().count()
        total_parent_orders = base_qs.values('order_id').distinct().count()

        pending_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.PENDING).values('vendor_order_id').distinct().count()
        confirmed_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.CONFIRMED).values('vendor_order_id').distinct().count()
        processing_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.PROCESSING).values('vendor_order_id').distinct().count()
        shipped_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.SHIPPED).values('vendor_order_id').distinct().count()
        delivered_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.DELIVERED).values('vendor_order_id').distinct().count()
        completed_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.COMPLETED).values('vendor_order_id').distinct().count()
        cancelled_orders = base_qs.filter(status=VendorOrder.VendorOrderStatus.CANCELLED).values('vendor_order_id').distinct().count()

        # Item quantities
        from .models import OrderItem
        items_qs = OrderItem.objects.filter(vendor_order__in=base_qs)
        total_items_quantity = items_qs.aggregate(total_qty=models.Sum('quantity'))['total_qty'] or 0

        # Financial metrics (strictly separated)
        from apps.payments.models import Refund
        active_vos = base_qs.exclude(status=VendorOrder.VendorOrderStatus.CANCELLED)
        total_subtotal = float(active_vos.aggregate(t=models.Sum('subtotal'))['t'] or 0)
        total_shipping_fee = float(active_vos.aggregate(t=models.Sum('shipping_fee'))['t'] or 0)
        total_discount_amount = float(active_vos.aggregate(t=models.Sum('discount_amount'))['t'] or 0)
        total_order_amount = float(active_vos.aggregate(t=models.Sum('total_amount'))['t'] or 0)

        # Realized revenue from paid orders
        paid_vos = active_vos.filter(payment_status=Order.PaymentStatus.PAID)
        total_paid_amount = float(paid_vos.aggregate(t=models.Sum('total_amount'))['t'] or 0)

        # Completed refunds for this village
        refunds_agg = Refund.objects.filter(
            vendor_order__in=base_qs,
            status=Refund.RefundStatus.COMPLETED
        ).aggregate(t=models.Sum('amount_approved'))['t'] or 0
        total_refunded_amount = float(refunds_agg)

        net_realized_revenue = max(0.0, total_paid_amount - total_refunded_amount)

        data = {
            'total_orders': total_vendor_orders,  # Primary count for V13 list
            'total_vendor_orders': total_vendor_orders,
            'total_parent_orders': total_parent_orders,
            'total_items_quantity': total_items_quantity,
            'pending_orders': pending_orders,
            'confirmed_orders': confirmed_orders,
            'processing_orders': processing_orders,
            'shipped_orders': shipped_orders,
            'delivered_orders': delivered_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            # Financial breakdown
            'total_subtotal': total_subtotal,
            'total_shipping_fee': total_shipping_fee,
            'total_discount_amount': total_discount_amount,
            'total_order_amount': total_order_amount,
            'total_paid_amount': total_paid_amount,
            'total_refunded_amount': total_refunded_amount,
            'net_realized_revenue': net_realized_revenue,
            'total_village_revenue': total_subtotal,  # Backward compatible
        }
        return api_success(data=data, message="Lấy thống kê đơn hàng làng nghề thành công")


class VendorOrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/vendor-orders/<id>/
    Retrieve vendor order details.
    Strictly scoped to the manager's village for non-admins.
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]
    serializer_class = VendorOrderSerializer

    def get_queryset(self):
        user = self.request.user
        qs = VendorOrder.objects.select_related(
            'village', 'order', 'order__user'
        ).prefetch_related(
            'items__variant__product',
            'order__payments',
            'refunds',
        )
        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return VendorOrder.objects.none()
            qs = qs.filter(village=user.managed_village)
        return qs

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

        if new_status == VendorOrder.VendorOrderStatus.CANCELLED:
            # Handle cancellation with atomic inventory rollback and idempotency
            try:
                cancelled_vo = cancel_vendor_order(vendor_order)
                return api_success(
                    data=VendorOrderSerializer(cancelled_vo).data,
                    message="Hủy đơn hàng làng nghề và hoàn trả tồn kho thành công!"
                )
            except ValidationError as err:
                msg = err.message if hasattr(err, 'message') else str(err)
                return api_error(message=msg, status_code=400)

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


class OrderCancelView(generics.GenericAPIView):
    """
    POST /api/v1/orders/<int:pk>/cancel/
    Cancel parent order and rollback inventories of all child vendor orders.
    Can be cancelled by the tourist owning the order.
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]

    def post(self, request, pk):
        try:
            order = Order.objects.prefetch_related('vendor_orders__items__variant', 'items__variant').get(pk=pk)
        except Order.DoesNotExist:
            return api_error(message="Đơn hàng không tồn tại", status_code=404)

        if not user_has_role(request.user, 'ADMIN') and order.user_id != request.user.user_id:
            return api_error(message="Bạn không có quyền hủy đơn hàng này", status_code=403)

        try:
            cancelled_order = cancel_parent_order(order, user=request.user)
        except ValidationError as err:
            msg = err.message if hasattr(err, 'message') else str(err)
            return api_error(message=msg, status_code=400)

        return api_success(
            data=OrderSerializer(cancelled_order).data,
            message="Hủy đơn hàng và hoàn trả tồn kho thành công!"
        )
