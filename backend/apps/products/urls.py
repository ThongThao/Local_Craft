from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    ProductSummaryView,
    ProductVariantListCreateView,
    ProductVariantDetailUpdateView,
    VariantInventoryUpdateView,
)

urlpatterns = [
    path('', ProductListView.as_view(), name='product-list'),
    path('summary/', ProductSummaryView.as_view(), name='product-summary'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('<int:product_id>/variants/', ProductVariantListCreateView.as_view(), name='product-variant-list-create'),
    path('variants/<int:pk>/', ProductVariantDetailUpdateView.as_view(), name='product-variant-detail-update'),
    path('variants/<int:pk>/inventory/', VariantInventoryUpdateView.as_view(), name='variant-inventory-update'),
]
