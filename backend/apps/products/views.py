from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from .models import Category, Product, ProductVariant, Inventory
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


class ProductListView(generics.ListCreateAPIView):
    """
    GET /api/v1/products/ - Filter by category, search, village, artisan, min/max price.
    POST /api/v1/products/ - Create product (Village Manager for own village, or Admin).
    """
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Product.objects.select_related('category', 'village', 'artisan').prefetch_related('images')

        user = self.request.user
        is_manager_or_admin = (
            user and user.is_authenticated and
            (user_has_role(user, 'ADMIN') or user_has_role(user, 'CRAFT_VILLAGE'))
        )
        if not is_manager_or_admin:
            qs = qs.filter(status=Product.ProductStatus.APPROVED)

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
            qs = qs.filter(village_id=village_id)

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

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()

        # Enforce village ownership: village managers can only create for their own village
        if not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village:
                return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=403)
            data['village'] = user.managed_village.village_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        # Auto-create default variant & inventory if none exists
        if not product.variants.exists():
            variant = ProductVariant.objects.create(
                product=product,
                sku=f"SKU-{product.product_id}-DEF",
                variant_name="Tiêu chuẩn",
                price=product.base_price,
                is_active=True,
            )
            Inventory.objects.create(variant=variant, quantity=100, reserved_quantity=0)

        return api_success(
            data=serializer.data,
            message="Tạo sản phẩm thành công!",
            status_code=status.HTTP_201_CREATED
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/v1/products/<id>/
    PUT/PATCH /api/v1/products/<id>/ - Update product (Village Manager or Admin)
    DELETE /api/v1/products/<id>/ - Delete product (Village Manager or Admin)
    """
    serializer_class = ProductDetailSerializer
    queryset = Product.objects.select_related('category', 'village', 'artisan').prefetch_related('images', 'variants__inventory')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_success(data=serializer.data, message="Lấy chi tiết sản phẩm thành công")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Prevent changing village for village managers
        data = request.data.copy()
        if not user_has_role(request.user, 'ADMIN') and 'village' in data:
            data['village'] = instance.village_id

        serializer = ProductSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_success(data=serializer.data, message="Cập nhật sản phẩm thành công!")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return api_success(data=None, message="Xóa sản phẩm thành công!")
