"""
Order services for multi-vendor marketplace status transitions and rollup calculations.
"""

from .models import Order, VendorOrder


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
