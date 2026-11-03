from rest_framework import serializers
from .models import Category, Product, ProductImage, ProductVariant, Inventory


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'category_id',
            'parent_category',
            'category_name',
            'slug',
            'description',
            'status',
            'created_at',
        ]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = [
            'product_image_id',
            'image_url',
            'alt_text',
            'display_order',
            'is_primary',
        ]


class ProductVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.product_id', read_only=True)
    quantity = serializers.SerializerMethodField()
    reserved_quantity = serializers.SerializerMethodField()
    sellable_quantity = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'variant_id',
            'product_id',
            'sku',
            'variant_name',
            'color',
            'size',
            'attributes',
            'price',
            'weight_gram',
            'is_active',
            'quantity',
            'reserved_quantity',
            'sellable_quantity',
            'created_at',
            'updated_at',
        ]

    def get_quantity(self, obj):
        return getattr(obj, 'inventory', None).quantity if hasattr(obj, 'inventory') and obj.inventory else 0

    def get_reserved_quantity(self, obj):
        return getattr(obj, 'inventory', None).reserved_quantity if hasattr(obj, 'inventory') and obj.inventory else 0

    def get_sellable_quantity(self, obj):
        if hasattr(obj, 'inventory') and obj.inventory:
            return obj.inventory.sellable_quantity
        return 0


class ProductVariantCreateUpdateSerializer(serializers.ModelSerializer):
    initial_quantity = serializers.IntegerField(write_only=True, required=False, default=0, min_value=0)

    class Meta:
        model = ProductVariant
        fields = [
            'sku',
            'variant_name',
            'color',
            'size',
            'attributes',
            'price',
            'weight_gram',
            'is_active',
            'initial_quantity',
        ]
        extra_kwargs = {
            'sku': {
                'error_messages': {
                    'unique': 'Mã SKU này đã tồn tại trong hệ thống. Vui lòng chọn mã SKU khác.'
                }
            }
        }

    def validate_variant_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Tên biến thể không được để trống.")
        return val

    def validate_sku(self, value):
        val = value.strip().upper()
        if not val:
            raise serializers.ValidationError("Mã SKU không được để trống.")
        instance = getattr(self, 'instance', None)
        qs = ProductVariant.objects.filter(sku=val)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Mã SKU này đã tồn tại trong hệ thống. Vui lòng chọn mã SKU khác.")
        return val

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Giá bán của biến thể phải lớn hơn hoặc bằng 0.")
        return value

    def validate_weight_gram(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Khối lượng (gram) nếu nhập phải lớn hơn 0.")
        return value


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan_name = serializers.SerializerMethodField()
    artisan_avatar_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    business_state = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'product_id',
            'village',
            'village_name',
            'artisan',
            'artisan_name',
            'artisan_avatar_url',
            'category',
            'category_name',
            'product_name',
            'slug',
            'description',
            'base_price',
            'cover_image_url',
            'status',
            'business_state',
            'moderation_note',
            'images',
            'published_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'business_state']

    def get_artisan_name(self, obj):
        return obj.artisan.display_name if obj.artisan else ''

    def get_artisan_avatar_url(self, obj):
        return obj.artisan.avatar_url if obj.artisan else None

    def get_business_state(self, obj):
        """
        Derived business status based on:
        - Product.status
        - Artisan verification_status (must be APPROVED)
        - Active variants
        - Sellable inventory (quantity - reserved_quantity > 0)
        """
        if obj.status == Product.ProductStatus.HIDDEN:
            return 'HIDDEN'
        if obj.status != Product.ProductStatus.APPROVED:
            return 'NOT_READY'
        if obj.artisan and obj.artisan.verification_status != 'APPROVED':
            return 'NOT_READY'

        # Check active variants
        variants = [v for v in obj.variants.all() if v.is_active]
        if not variants:
            return 'NOT_READY'

        total_sellable = 0
        has_inventory = False
        for v in variants:
            inv = getattr(v, 'inventory', None)
            if inv:
                has_inventory = True
                sellable = max(0, inv.quantity - inv.reserved_quantity)
                total_sellable += sellable

        if not has_inventory:
            return 'NOT_READY'

        return 'SELLING' if total_sellable > 0 else 'OUT_OF_STOCK'

    def validate(self, attrs):
        village = attrs.get('village') or (self.instance.village if self.instance else None)
        artisan = attrs.get('artisan') or (self.instance.artisan if self.instance else None)
        if artisan and village and artisan.village_id != village.village_id:
            raise serializers.ValidationError({
                'artisan': 'Nghệ nhân được chỉ định phải thuộc về làng nghề này.'
            })
        product_status = attrs.get('status') or (self.instance.status if self.instance else None)
        if artisan and product_status == 'APPROVED' and artisan.verification_status != 'APPROVED':
            raise serializers.ValidationError({
                'artisan': 'Chỉ nghệ nhân có hồ sơ đã được duyệt (APPROVED) mới được phép gắn với sản phẩm công khai.'
            })
        return attrs


class ProductDetailSerializer(ProductSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['variants']
