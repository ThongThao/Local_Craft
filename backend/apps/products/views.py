from django.db import transaction
from rest_framework import generics, permissions, status
# pyrefly: ignore [missing-import]
from apps.common.responses import api_success, api_error
# pyrefly: ignore [missing-import]
from apps.common.permissions import IsVillageManager, IsCraftVillage, user_has_role
from apps.notifications.services import VillageNotificationService
from .models import Category, Product, ProductVariant, Inventory
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductDetailSerializer,
    ProductVariantSerializer,
    ProductVariantCreateUpdateSerializer,
)


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
    # GET /api/v1/products/ - Filter by category, search, village, artisan, status, business_state.
    # POST /api/v1/products/ - Create product (Village Manager for own village, or Admin).
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsCraftVillage()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Product.objects.select_related('category', 'village', 'artisan').prefetch_related(
            'images',
            'variants__inventory'
        )

        user = self.request.user
        is_admin = user and user.is_authenticated and user_has_role(user, 'ADMIN')
        is_village_manager = user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE')

        if is_admin:
            village_id = self.request.query_params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)
        elif is_village_manager:
            # CRAFT_VILLAGE: Strictly scope to the user's managed village
            if hasattr(user, 'managed_village') and user.managed_village:
                qs = qs.filter(village=user.managed_village)
            else:
                qs = qs.none()
        else:
            # Tourist or anonymous: only show APPROVED and visible products
            qs = qs.filter(status=Product.ProductStatus.APPROVED)
            village_id = self.request.query_params.get('village_id')
            if village_id:
                qs = qs.filter(village_id=village_id)

        # 1. Approval status filter (DRAFT, PENDING, APPROVED, REJECTED, HIDDEN)
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            if is_admin or is_village_manager:
                qs = qs.filter(status=status_param)
            elif status_param == Product.ProductStatus.APPROVED:
                qs = qs.filter(status=Product.ProductStatus.APPROVED)
            else:
                qs = qs.none()

        # 2. Category filter
        category = self.request.query_params.get('category')
        if category and category != 'ALL':
            if category.isdigit():
                qs = qs.filter(category_id=int(category))
            else:
                from django.db.models import Q
                qs = qs.filter(Q(category__slug=category) | Q(category__category_name__icontains=category))

        category_id = self.request.query_params.get('category_id')
        if category_id and category_id.isdigit():
            qs = qs.filter(category_id=int(category_id))

        # 3. Search query (product_name, description)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(product_name__icontains=search) | Q(description__icontains=search))

        # 4. Artisan filter
        artisan_id = self.request.query_params.get('artisan_id')
        if artisan_id and artisan_id != 'ALL' and artisan_id.isdigit():
            qs = qs.filter(artisan_id=int(artisan_id))

        # 5. Price range
        min_price = self.request.query_params.get('min_price')
        if min_price:
            qs = qs.filter(base_price__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            qs = qs.filter(base_price__lte=max_price)

        # 6. Sorting
        sort_by = self.request.query_params.get('sort', '-created_at')
        if sort_by in ['base_price', '-base_price', 'created_at', '-created_at', 'product_name', '-product_name']:
            qs = qs.order_by(sort_by)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Filter by business_state if requested
        business_state_param = request.query_params.get('business_state')
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        if business_state_param and business_state_param != 'ALL':
            data = [p for p in data if p.get('business_state') == business_state_param]

        return api_success(data=data, message="Lấy danh sách sản phẩm thành công")

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


class ProductSummaryView(generics.GenericAPIView):
    # GET /api/v1/products/summary/
    # Return summary counts of products for the current user village.
    permission_classes = [permissions.IsAuthenticated, IsCraftVillage]

    def get(self, request, *args, **kwargs):
        user = request.user
        if not hasattr(user, 'managed_village') or not user.managed_village:
            return api_error(message="Tài khoản chưa quản lý làng nghề nào.", status_code=403)

        products = Product.objects.filter(village=user.managed_village).prefetch_related('variants__inventory', 'artisan')
        serializer = ProductSerializer(products, many=True)

        data = serializer.data
        total = len(data)
        selling = sum(1 for p in data if p.get('business_state') == 'SELLING')
        out_of_stock = sum(1 for p in data if p.get('business_state') == 'OUT_OF_STOCK')
        not_ready = sum(1 for p in data if p.get('business_state') == 'NOT_READY')
        pending = sum(1 for p in data if p.get('status') == 'PENDING')
        rejected = sum(1 for p in data if p.get('status') == 'REJECTED')
        draft = sum(1 for p in data if p.get('status') == 'DRAFT')
        hidden = sum(1 for p in data if p.get('status') == 'HIDDEN')
        approved = sum(1 for p in data if p.get('status') == 'APPROVED')

        return api_success(
            data={
                'total': total,
                'selling': selling,
                'out_of_stock': out_of_stock,
                'not_ready': not_ready,
                'pending': pending,
                'rejected': rejected,
                'draft': draft,
                'hidden': hidden,
                'approved': approved,
            },
            message="Lấy dữ liệu thống kê sản phẩm thành công"
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    # GET /api/v1/products/<id>/
    # PUT/PATCH /api/v1/products/<id>/ - Update product (Village Manager or Admin)
    # DELETE /api/v1/products/<id>/ - Delete product (Village Manager or Admin)
    serializer_class = ProductDetailSerializer
    queryset = Product.objects.select_related('category', 'village', 'artisan').prefetch_related('images', 'variants__inventory')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Object-level permission check: if Village Manager, must manage this village
        if user and user.is_authenticated and user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if not hasattr(user, 'managed_village') or not user.managed_village or instance.village_id != user.managed_village.village_id:
                return api_error(message="Bạn không có quyền xem sản phẩm của làng nghề khác.", status_code=403)
        elif not (user and user.is_authenticated and user_has_role(user, 'ADMIN')):
            if instance.status != Product.ProductStatus.APPROVED:
                return api_error(message="Sản phẩm không khả dụng hoặc chưa được duyệt.", status_code=404)

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

        old_status = instance.status
        serializer = ProductSerializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        if user_has_role(request.user, 'ADMIN') and old_status != instance.status:
            try:
                if instance.status == Product.ProductStatus.APPROVED:
                    VillageNotificationService.notify_product_status(instance.village, instance, is_approved=True)
                elif instance.status == Product.ProductStatus.REJECTED:
                    VillageNotificationService.notify_product_status(instance.village, instance, is_approved=False)
            except Exception:
                pass
        return api_success(data=serializer.data, message="Cập nhật sản phẩm thành công!")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)

        # Safe archive check: If product is referenced in order items, set status = HIDDEN
        has_orders = False
        for v in instance.variants.all():
            if hasattr(v, 'order_items') and v.order_items.exists():
                has_orders = True
                break

        if has_orders:
            instance.status = Product.ProductStatus.HIDDEN
            instance.save(update_fields=['status'])
            return api_success(
                data={'product_id': instance.product_id, 'status': instance.status},
                message="Sản phẩm đã có lịch sử đơn hàng nên được chuyển sang trạng thái Ẩn thay vì xóa vĩnh viễn."
            )

        self.perform_destroy(instance)
        return api_success(data=None, message="Xóa sản phẩm thành công!")


class ProductVariantListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/products/<int:product_id>/variants/
    POST /api/v1/products/<int:product_id>/variants/
    Manage variants of a specific product with strict village manager ownership.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsVillageManager()]

    def get_product(self, product_id):
        try:
            return Product.objects.select_related('village', 'artisan', 'category').get(pk=product_id)
        except Product.DoesNotExist:
            return None

    def get(self, request, product_id):
        product = self.get_product(product_id)
        if not product:
            return api_error(message="Sản phẩm không tồn tại.", status_code=404)

        user = request.user
        # Object-level ownership check: Village Manager can only view variants of products in their managed active village
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền quản lý biến thể của sản phẩm thuộc làng nghề khác hoặc làng nghề chưa kích hoạt.", status_code=403)

        variants = ProductVariant.objects.filter(product=product).select_related('inventory').order_by('variant_id')
        serializer = ProductVariantSerializer(variants, many=True)
        return api_success(data=serializer.data, message="Lấy danh sách biến thể thành công")

    def post(self, request, product_id):
        product = self.get_product(product_id)
        if not product:
            return api_error(message="Sản phẩm không tồn tại.", status_code=404)

        user = request.user
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền thêm biến thể cho sản phẩm của làng nghề khác hoặc làng nghề chưa kích hoạt.", status_code=403)

        serializer = ProductVariantCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            msg = next(iter(errors.values()))[0] if errors else "Dữ liệu biến thể không hợp lệ."
            return api_error(message=str(msg), status_code=400, errors=errors)

        validated_data = serializer.validated_data
        initial_qty = validated_data.pop('initial_quantity', 0)

        with transaction.atomic():
            variant = ProductVariant.objects.create(product=product, **validated_data)
            Inventory.objects.create(variant=variant, quantity=initial_qty, reserved_quantity=0)

        out_serializer = ProductVariantSerializer(variant)
        return api_success(
            data=out_serializer.data,
            message="Thêm biến thể mới thành công!",
            status_code=status.HTTP_201_CREATED
        )


class ProductVariantDetailUpdateView(generics.GenericAPIView):
    """
    GET /api/v1/products/variants/<int:pk>/
    PATCH /api/v1/products/variants/<int:pk>/
    DELETE /api/v1/products/variants/<int:pk>/
    View, update, or safely delete specific variant details.
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]

    def get_variant(self, pk):
        try:
            return ProductVariant.objects.select_related('product__village', 'inventory').get(pk=pk)
        except ProductVariant.DoesNotExist:
            return None

    def get(self, request, pk):
        variant = self.get_variant(pk)
        if not variant:
            return api_error(message="Biến thể không tồn tại.", status_code=404)

        user = request.user
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or variant.product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền xem biến thể này.", status_code=403)

        return api_success(data=ProductVariantSerializer(variant).data, message="Lấy chi tiết biến thể thành công")

    def patch(self, request, pk):
        variant = self.get_variant(pk)
        if not variant:
            return api_error(message="Biến thể không tồn tại.", status_code=404)

        user = request.user
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or variant.product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền chỉnh sửa biến thể này.", status_code=403)

        serializer = ProductVariantCreateUpdateSerializer(variant, data=request.data, partial=True)
        if not serializer.is_valid():
            errors = serializer.errors
            msg = next(iter(errors.values()))[0] if errors else "Dữ liệu biến thể không hợp lệ."
            return api_error(message=str(msg), status_code=400, errors=errors)

        validated_data = serializer.validated_data
        validated_data.pop('initial_quantity', None)
        for attr, val in validated_data.items():
            setattr(variant, attr, val)
        variant.save()

        return api_success(data=ProductVariantSerializer(variant).data, message="Cập nhật biến thể thành công!")

    def delete(self, request, pk):
        variant = self.get_variant(pk)
        if not variant:
            return api_error(message="Biến thể không tồn tại.", status_code=404)

        user = request.user
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or variant.product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền xóa biến thể này.", status_code=403)

        # Check if variant is referenced in order items: if so, de-activate (soft delete) to preserve integrity
        if variant.order_items.exists():
            variant.is_active = False
            variant.save(update_fields=['is_active'])
            return api_success(
                data={'variant_id': variant.variant_id, 'is_active': False},
                message="Biến thể đã có trong lịch sử đơn hàng nên được chuyển sang trạng thái Ngừng kinh doanh thay vì xóa vĩnh viễn."
            )

        variant.delete()
        return api_success(data=None, message="Xóa biến thể thành công!")


class VariantInventoryUpdateView(generics.GenericAPIView):
    """
    PATCH /api/v1/products/variants/<int:pk>/inventory/
    Update physical stock quantity for a specific variant with row locks & transaction safety.
    """
    permission_classes = [permissions.IsAuthenticated, IsVillageManager]

    def patch(self, request, pk):
        try:
            variant = ProductVariant.objects.select_related('product__village', 'inventory').get(pk=pk)
        except ProductVariant.DoesNotExist:
            return api_error(message="Biến thể không tồn tại.", status_code=404)

        user = request.user
        if user_has_role(user, 'CRAFT_VILLAGE') and not user_has_role(user, 'ADMIN'):
            if (
                not hasattr(user, 'managed_village')
                or not user.managed_village
                or getattr(user.managed_village, 'status', None) != 'ACTIVE'
                or variant.product.village_id != user.managed_village.village_id
            ):
                return api_error(message="Bạn không có quyền cập nhật tồn kho biến thể này.", status_code=403)

        quantity_val = request.data.get('quantity')
        if quantity_val is None:
            return api_error(message="Vui lòng cung cấp số lượng tồn kho (quantity).", status_code=400)

        try:
            qty = int(quantity_val)
        except (ValueError, TypeError):
            return api_error(message="Số lượng tồn kho phải là số nguyên hợp lệ.", status_code=400)

        if qty < 0:
            return api_error(message="Số lượng tồn kho không được nhỏ hơn 0.", status_code=400)

        with transaction.atomic():
            inv, _ = Inventory.objects.select_for_update().get_or_create(
                variant=variant,
                defaults={'quantity': 0, 'reserved_quantity': 0}
            )

            if qty < inv.reserved_quantity:
                return api_error(
                    message=f"Số lượng tồn ({qty}) không thể nhỏ hơn số lượng đang giữ ({inv.reserved_quantity}) trong các đơn hàng chờ giao.",
                    status_code=400
                )

            inv.quantity = qty
            inv.save(update_fields=['quantity', 'updated_at'])

        variant.refresh_from_db()
        return api_success(
            data=ProductVariantSerializer(variant).data,
            message="Cập nhật số lượng tồn kho thành công!"
        )
