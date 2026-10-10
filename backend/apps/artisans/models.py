from django.db import models


class ArtisanProfile(models.Model):
    """
    Table 4: artisan_profiles
    Informational artisan profiles belonging to a craft village.
    Artisans are cultural profiles, not independent login accounts.
    """

    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'

    artisan_id = models.BigAutoField(primary_key=True)
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.CASCADE,
        related_name='artisans',
        db_column='village_id',
    )
    display_name = models.CharField(max_length=150)
    avatar_url = models.CharField(max_length=500, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    experience_years = models.SmallIntegerField(default=0)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.APPROVED,
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
        return f'{self.display_name} ({self.village.village_name if self.village else "Chưa gán"})'
