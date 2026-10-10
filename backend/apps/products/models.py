from django.db import models


class Category(models.Model):
    """
    Table 6: categories
    Hierarchical categories for products and craft domains.
    """

    class CategoryStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Hoạt động'
        INACTIVE = 'INACTIVE', 'Tạm khóa'

    category_id = models.BigAutoField(primary_key=True)
    parent_category = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subcategories',
        db_column='parent_category_id',
    )
    category_name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=150, unique=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=CategoryStatus.choices,
        default=CategoryStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Danh mục'
        verbose_name_plural = 'Danh mục'

    def __str__(self):
        return self.category_name


class Product(models.Model):
    """
    Table 8: products
    Handicraft product information.
    """

    class ProductStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Bản nháp'
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'
        HIDDEN = 'HIDDEN', 'Ẩn'

    product_id = models.BigAutoField(primary_key=True)
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.CASCADE,
        related_name='products',
        db_column='village_id',
    )
    artisan = models.ForeignKey(
        'artisans.ArtisanProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        db_column='artisan_id',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='products',
        db_column='category_id',
    )
    product_name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    cover_image_url = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
    )
    moderation_note = models.TextField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        verbose_name = 'Sản phẩm'
        verbose_name_plural = 'Sản phẩm'
        indexes = [
            models.Index(fields=['village'], name='idx_products_village'),
            models.Index(fields=['artisan'], name='idx_products_artisan'),
            models.Index(fields=['category'], name='idx_products_category'),
            models.Index(fields=['status'], name='idx_products_status'),
            models.Index(fields=['published_at'], name='idx_products_published_at'),
        ]

    def clean(self):
        super().clean()
        if self.artisan and self.village:
            if self.artisan.village_id != self.village_id:
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'artisan': 'Nghệ nhân được gán phải thuộc về làng nghề sở hữu sản phẩm.'
                })

    def __str__(self):
        return self.product_name


class ProductImage(models.Model):
    """
    Table 9: product_images
    Product gallery images.
    """

    product_image_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        db_column='product_id',
    )
    image_url = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=255, null=True, blank=True)
    display_order = models.SmallIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_images'
        verbose_name = 'Ảnh sản phẩm'
        verbose_name_plural = 'Ảnh sản phẩm'
        ordering = ['display_order', 'product_image_id']

    def __str__(self):
        return f'Ảnh {self.product_id} - {self.product_image_id}'


class ProductVariant(models.Model):
    """
    Table 10: product_variants
    Product options such as color, size, and material.
    """

    variant_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        db_column='product_id',
    )
    sku = models.CharField(max_length=100, unique=True)
    variant_name = models.CharField(max_length=150)
    color = models.CharField(max_length=80, null=True, blank=True)
    size = models.CharField(max_length=80, null=True, blank=True)
    attributes = models.JSONField(null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    weight_gram = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_variants'
        verbose_name = 'Biến thể sản phẩm'
        verbose_name_plural = 'Biến thể sản phẩm'
        indexes = [
            models.Index(fields=['product'], name='idx_variants_product'),
        ]

    def __str__(self):
        return f'{self.product.product_name} - {self.variant_name} ({self.sku})'


class Inventory(models.Model):
    """
    Table 11: inventory
    Stock tracking per variant.
    """

    inventory_id = models.BigAutoField(primary_key=True)
    variant = models.OneToOneField(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='inventory',
        db_column='variant_id',
    )
    quantity = models.IntegerField(default=0)
    reserved_quantity = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory'
        verbose_name = 'Tồn kho'
        verbose_name_plural = 'Tồn kho'

    def __str__(self):
        return f'Tồn kho SKU {self.variant.sku}: {self.sellable_quantity}/{self.quantity}'

    @property
    def sellable_quantity(self):
        return max(0, self.quantity - self.reserved_quantity)
