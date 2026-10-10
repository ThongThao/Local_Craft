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
    sellable_quantity = serializers.IntegerField(source='inventory.sellable_quantity', read_only=True, default=0)

    class Meta:
        model = ProductVariant
        fields = [
            'variant_id',
            'sku',
            'variant_name',
            'color',
            'size',
            'attributes',
            'price',
            'weight_gram',
            'is_active',
            'sellable_quantity',
        ]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan_name = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'product_id',
            'village',
            'village_name',
            'artisan',
            'artisan_name',
            'category',
            'category_name',
            'product_name',
            'slug',
            'description',
            'base_price',
            'cover_image_url',
            'status',
            'images',
            'published_at',
            'created_at',
        ]
        read_only_fields = ['created_at']

    def get_artisan_name(self, obj):
        return obj.artisan.display_name if obj.artisan else ''

    def validate(self, attrs):
        village = attrs.get('village') or (self.instance.village if self.instance else None)
        artisan = attrs.get('artisan') or (self.instance.artisan if self.instance else None)
        if artisan and village and artisan.village_id != village.village_id:
            raise serializers.ValidationError({
                'artisan': 'Nghệ nhân được chỉ định phải thuộc về làng nghề này.'
            })
        return attrs


class ProductDetailSerializer(ProductSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['variants']
