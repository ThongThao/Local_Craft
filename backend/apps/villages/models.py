from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CraftVillage(models.Model):
    """
    Table 5: craft_villages
    Craft village information, location, and designated manager account.
    """

    class VillageStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Hoạt động'
        INACTIVE = 'INACTIVE', 'Tạm dừng'

    village_id = models.BigAutoField(primary_key=True)
    manager_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='managed_village',
        db_column='manager_user_id',
        verbose_name='Tài khoản quản lý làng nghề',
    )
    village_name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(null=True, blank=True)
    province = models.CharField(max_length=100)
    district = models.CharField(max_length=100, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    cover_image_url = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=VillageStatus.choices,
        default=VillageStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'craft_villages'
        verbose_name = 'Làng nghề'
        verbose_name_plural = 'Làng nghề'

    def clean(self):
        super().clean()
        if self.manager_user:
            # Check manager role: must have CRAFT_VILLAGE role only
            is_village_manager = self.manager_user.user_roles.filter(role__role_code='CRAFT_VILLAGE').exists()
            if not is_village_manager:
                raise ValidationError({
                    'manager_user': 'Tài khoản quản lý làng nghề phải có vai trò CRAFT_VILLAGE.'
                })

    def __str__(self):
        return f'{self.village_name} ({self.province})'
