from django.urls import path
from .views import (
    CartView,
    CartItemAddView,
    CartItemUpdateDeleteView,
    OrderListCreateView,
    OrderDetailView,
    VendorOrderListView,
    VendorOrderDetailView,
    VendorOrderStatusUpdateView,
)

urlpatterns = [
    # Cart
    path('cart/', CartView.as_view(), name='cart-view'),
    path('cart/items/', CartItemAddView.as_view(), name='cart-item-add'),
    path('cart/items/<int:pk>/', CartItemUpdateDeleteView.as_view(), name='cart-item-manage'),

    # Orders (Customer / Admin)
    path('orders/', OrderListCreateView.as_view(), name='order-list-create'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),

    # Vendor Orders (Craft Village Manager / Admin)
    path('vendor-orders/', VendorOrderListView.as_view(), name='vendor-order-list'),
    path('vendor-orders/<int:pk>/', VendorOrderDetailView.as_view(), name='vendor-order-detail'),
    path('vendor-orders/<int:pk>/status/', VendorOrderStatusUpdateView.as_view(), name='vendor-order-status-update'),
]
