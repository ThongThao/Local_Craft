from django.core.exceptions import ValidationError
from django.db import transaction
from apps.products.models import Inventory
from .models import Order, VendorOrder


def rollback_vendor_order_inventory(vendor_order: VendorOrder) -> int:
    """
    Rollback inventory for all items in a VendorOrder when it is CANCELLED.
    Must be called inside transaction.atomic().
    Returns the number of variant inventories rolled back.
    Idempotent: if vendor_order is already CANCELLED, returns 0.
    """
    if vendor_order.status == VendorOrder.VendorOrderStatus.CANCELLED:
        return 0

    rolled_back_count = 0
    items = vendor_order.items.select_related('variant').order_by('variant_id')
    for item in items:
        # Lock inventory row to prevent concurrent race conditions
        inv = Inventory.objects.select_for_update().filter(variant=item.variant).first()
        if inv:
            inv.quantity = inv.quantity + item.quantity
            inv.save(update_fields=['quantity', 'updated_at'])
            rolled_back_count += 1

    return rolled_back_count


def cancel_vendor_order(vendor_order: VendorOrder) -> VendorOrder:
    """
    Cancel a single vendor order atomically and rollback its inventory exactly once.
    """
    if vendor_order.status == VendorOrder.VendorOrderStatus.CANCELLED:
        raise ValidationError("Đơn hàng làng nghề này đã ở trạng thái đã hủy trước đó.")

    if vendor_order.status in [
        VendorOrder.VendorOrderStatus.SHIPPED,
        VendorOrder.VendorOrderStatus.DELIVERED,
        VendorOrder.VendorOrderStatus.COMPLETED,
    ]:
        raise ValidationError("Không thể hủy đơn hàng đang giao hoặc đã hoàn tất.")

    with transaction.atomic():
        # Lock vendor_order row
        vo = VendorOrder.objects.select_for_update().get(pk=vendor_order.pk)
        if vo.status == VendorOrder.VendorOrderStatus.CANCELLED:
            raise ValidationError("Đơn hàng làng nghề này đã ở trạng thái đã hủy trước đó.")

        rollback_vendor_order_inventory(vo)
        vo.status = VendorOrder.VendorOrderStatus.CANCELLED
        vo.save(update_fields=['status', 'updated_at'])

        # Synchronize rollup status to parent order
        sync_parent_order_status(vo.order)
        return vo


def cancel_parent_order(order: Order, user=None) -> Order:
    """
    Cancel an entire parent order atomically and rollback inventories of all child vendor orders.
    Idempotent: Rejects if order is already CANCELLED.
    """
    if order.status == Order.OrderStatus.CANCELLED:
        raise ValidationError("Đơn hàng này đã ở trạng thái đã hủy trước đó.")

    if order.status in [
        Order.OrderStatus.SHIPPED,
        Order.OrderStatus.DELIVERED,
        Order.OrderStatus.COMPLETED,
    ]:
        raise ValidationError("Không thể hủy đơn hàng đang giao hoặc đã hoàn tất.")

    with transaction.atomic():
        parent = Order.objects.select_for_update().get(pk=order.pk)
        if parent.status == Order.OrderStatus.CANCELLED:
            raise ValidationError("Đơn hàng này đã ở trạng thái đã hủy trước đó.")

        # Cancel child vendor orders that are not already cancelled
        child_vendor_orders = parent.vendor_orders.select_for_update().all()
        for vo in child_vendor_orders:
            if vo.status != VendorOrder.VendorOrderStatus.CANCELLED:
                rollback_vendor_order_inventory(vo)
                vo.status = VendorOrder.VendorOrderStatus.CANCELLED
                vo.save(update_fields=['status', 'updated_at'])

        # Fallback for any order items not tied to a vendor_order
        loose_items = parent.items.filter(vendor_order__isnull=True).select_related('variant').order_by('variant_id')
        for it in loose_items:
            inv = Inventory.objects.select_for_update().filter(variant=it.variant).first()
            if inv:
                inv.quantity = inv.quantity + it.quantity
                inv.save(update_fields=['quantity', 'updated_at'])

        parent.status = Order.OrderStatus.CANCELLED
        parent.save(update_fields=['status', 'updated_at'])
        return parent


def sync_parent_order_status(order: Order) -> Order:
    """
    Derive and update parent Order status from its child VendorOrders.
    Rules:
    - If ALL child orders are CANCELLED: parent order becomes CANCELLED.
    - If ALL non-cancelled child orders are COMPLETED: parent order becomes COMPLETED.
    - If ALL non-cancelled child orders are DELIVERED (or higher): parent becomes DELIVERED.
    - If ALL non-cancelled child orders are SHIPPED (or higher): parent becomes SHIPPED.
    - If ANY child order is PROCESSING (or shipped/delivered): parent becomes PROCESSING.
    - If ALL non-cancelled child orders are CONFIRMED: parent becomes CONFIRMED.
    - Otherwise: parent remains PENDING.
    """
    vendor_orders = list(order.vendor_orders.all())
    if not vendor_orders:
        return order

    statuses = [vo.status for vo in vendor_orders]

    # All cancelled
    if all(s == VendorOrder.VendorOrderStatus.CANCELLED for s in statuses):
        order.status = Order.OrderStatus.CANCELLED
    else:
        active_statuses = [s for s in statuses if s != VendorOrder.VendorOrderStatus.CANCELLED]
        if all(s == VendorOrder.VendorOrderStatus.COMPLETED for s in active_statuses):
            order.status = Order.OrderStatus.COMPLETED
        elif all(s in [VendorOrder.VendorOrderStatus.DELIVERED, VendorOrder.VendorOrderStatus.COMPLETED] for s in active_statuses):
            order.status = Order.OrderStatus.DELIVERED
        elif all(s in [VendorOrder.VendorOrderStatus.SHIPPED, VendorOrder.VendorOrderStatus.DELIVERED, VendorOrder.VendorOrderStatus.COMPLETED] for s in active_statuses):
            order.status = Order.OrderStatus.SHIPPED
        elif any(s in [VendorOrder.VendorOrderStatus.PROCESSING, VendorOrder.VendorOrderStatus.SHIPPED, VendorOrder.VendorOrderStatus.DELIVERED] for s in active_statuses):
            order.status = Order.OrderStatus.PROCESSING
        elif all(s == VendorOrder.VendorOrderStatus.CONFIRMED for s in active_statuses):
            order.status = Order.OrderStatus.CONFIRMED
        else:
            order.status = Order.OrderStatus.PENDING

    # Check payment status consistency
    payment_statuses = [vo.payment_status for vo in vendor_orders if vo.status != VendorOrder.VendorOrderStatus.CANCELLED]
    if payment_statuses and all(ps == Order.PaymentStatus.PAID for ps in payment_statuses):
        order.payment_status = Order.PaymentStatus.PAID

    order.save(update_fields=['status', 'payment_status', 'updated_at'])
    return order
