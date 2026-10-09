from django.conf import settings
from django.db import models


class ArtisanProfile(models.Model):
    """
    Table 4: artisan_profiles
    Artisan profiles and verification status.
    """

    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'

    artisan_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='artisan_profile',
        db_column='user_id',
    )
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='artisans',
        db_column='village_id',
    )
    display_name = models.CharField(max_length=150)
    bio = models.TextField(null=True, blank=True)
    experience_years = models.SmallIntegerField(default=0)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
    )
    verification_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'artisan_profiles'
        verbose_name = 'Hồ sơ nghệ nhân'
        verbose_name_plural = 'Hồ sơ nghệ nhân'
        indexes = [
            models.Index(fields=['village'], name='idx_artisans_village'),
            models.Index(fields=['verification_status'], name='idx_artisans_verify_status'),
        ]

    def __str__(self):
        return f'{self.display_name} ({self.verification_status})'
