from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    """
    Table 15: reviews
    Reviews and ratings for handicraft products and workshop sessions.
    """

    class ReviewStatus(models.TextChoices):
        VISIBLE = 'VISIBLE', 'Hiển thị'
        HIDDEN = 'HIDDEN', 'Ẩn'

    review_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_column='user_id',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        db_column='product_id',
    )
    booking = models.ForeignKey(
        'bookings.WorkshopBooking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        db_column='booking_id',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=200, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.VISIBLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews'
        verbose_name = 'Đánh giá'
        verbose_name_plural = 'Đánh giá'
        indexes = [
            models.Index(fields=['product', 'status'], name='idx_reviews_prod_status'),
            models.Index(fields=['booking', 'status'], name='idx_reviews_book_status'),
        ]

    def clean(self):
        super().clean()
        if (self.product is None and self.booking is None) or (self.product is not None and self.booking is not None):
            raise ValidationError('Đánh giá phải thuộc về chính xác một sản phẩm hoặc một đơn đặt workshop.')

    def __str__(self):
        target = f'Sản phẩm {self.product_id}' if self.product_id else f'Booking {self.booking_id}'
        return f'{self.user.email} - {target}: {self.rating}*'
