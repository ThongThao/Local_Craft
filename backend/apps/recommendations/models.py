from django.conf import settings
from django.db import models


class UserPreference(models.Model):
    """
    Table 23: user_preferences
    User personalization preferences for recommendation engine.
    """

    preference_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preferences',
        db_column='user_id',
    )
    preferred_categories = models.JSONField(null=True, blank=True)
    preferred_activities = models.JSONField(null=True, blank=True)
    preferred_provinces = models.JSONField(null=True, blank=True)
    min_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    preferred_language = models.CharField(max_length=10, default='vi')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'
        verbose_name = 'Sở thích người dùng'
        verbose_name_plural = 'Sở thích người dùng'

    def __str__(self):
        return f'Sở thích của {self.user.email}'


class UserInteraction(models.Model):
    """
    Table 24: user_interactions
    Activity log used for recommendation scoring and collaborative filtering.
    """

    class TargetType(models.TextChoices):
        PRODUCT = 'PRODUCT', 'Sản phẩm'
        WORKSHOP = 'WORKSHOP', 'Workshop'
        VILLAGE = 'VILLAGE', 'Làng nghề'
        STORY = 'STORY', 'Câu chuyện'

    class ActionType(models.TextChoices):
        VIEW = 'VIEW', 'Xem'
        SEARCH = 'SEARCH', 'Tìm kiếm'
        CLICK = 'CLICK', 'Nhấp'
        FAVORITE = 'FAVORITE', 'Yêu thích'
        ADD_TO_CART = 'ADD_TO_CART', 'Thêm vào giỏ'
        BOOKING = 'BOOKING', 'Đặt chỗ'
        PURCHASE = 'PURCHASE', 'Mua hàng'

    interaction_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='interactions',
        db_column='user_id',
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.BigIntegerField()
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    metadata = models.JSONField(null=True, blank=True)
    session_key = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_interactions'
        verbose_name = 'Tương tác người dùng'
        verbose_name_plural = 'Tương tác người dùng'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_interact_user_time'),
            models.Index(fields=['target_type', 'target_id'], name='idx_interact_target'),
        ]

    def __str__(self):
        user_repr = self.user.email if self.user else f'Anon ({self.session_key})'
        return f'{user_repr} -> {self.action_type} on {self.target_type}:{self.target_id}'


class Favorite(models.Model):
    """
    Table 29: favorites
    Saved bookmarks across products, workshops, craft villages, and stories.
    """

    class TargetType(models.TextChoices):
        PRODUCT = 'PRODUCT', 'Sản phẩm'
        WORKSHOP = 'WORKSHOP', 'Workshop'
        VILLAGE = 'VILLAGE', 'Làng nghề'
        STORY = 'STORY', 'Câu chuyện'

    favorite_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites',
        db_column='user_id',
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorites'
        verbose_name = 'Yêu thích'
        verbose_name_plural = 'Yêu thích'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'target_type', 'target_id'],
                name='uq_favorites_user_target',
            )
        ]

    def __str__(self):
        return f'{self.user.email} yêu thích {self.target_type}:{self.target_id}'
