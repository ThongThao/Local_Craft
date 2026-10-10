from rest_framework import generics, permissions
from apps.common.responses import api_success, api_error
from apps.common.permissions import IsArtisan
from .models import Category, Product, ProductVariant
from .serializers import CategorySerializer, ProductSerializer, ProductDetailSerializer


class CategoryListView(generics.ListAPIView):
    """
    GET /api/v1/categories/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(status=Category.CategoryStatus.ACTIVE)

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh mục thành công")


class ProductListView(generics.ListAPIView):
    """
    GET /api/v1/products/
    Filter by category, search, artisan, min/max price.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(
            status=Product.ProductStatus.APPROVED
        ).select_related('category', 'artisan', 'artisan__village').prefetch_related('images')

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category) | qs.filter(category__category_name__icontains=category)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(product_name__icontains=search)

        artisan_id = self.request.query_params.get('artisan_id')
        if artisan_id:
            qs = qs.filter(artisan_id=artisan_id)

        village_id = self.request.query_params.get('village_id')
        if village_id:
            qs = qs.filter(artisan__village_id=village_id)

        min_price = self.request.query_params.get('min_price')
        if min_price:
            qs = qs.filter(base_price__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            qs = qs.filter(base_price__lte=max_price)

        sort_by = self.request.query_params.get('sort', '-created_at')
        if sort_by in ['base_price', '-base_price', 'created_at', '-created_at', 'product_name']:
            qs = qs.order_by(sort_by)

        return qs

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách sản phẩm thành công")


class ProductDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/products/<id>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductDetailSerializer
    queryset = Product.objects.filter(
        status=Product.ProductStatus.APPROVED
    ).select_related('category', 'artisan', 'artisan__village').prefetch_related('images', 'variants__inventory')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết sản phẩm thành công")
