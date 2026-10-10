from django.db import models


class Workshop(models.Model):
    """
    Table 12: workshops
    Artisan-led workshop experience listings.
    """

    class WorkshopStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Bản nháp'
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'
        HIDDEN = 'HIDDEN', 'Ẩn'

    workshop_id = models.BigAutoField(primary_key=True)
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.CASCADE,
        related_name='workshops',
        db_column='village_id',
    )
    artisan = models.ForeignKey(
        'artisans.ArtisanProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workshops',
        db_column='artisan_id',
    )
    category = models.ForeignKey(
        'products.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workshops',
        db_column='category_id',
    )
    workshop_name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField()
    duration_minutes = models.IntegerField()
    price_per_person = models.DecimalField(max_digits=12, decimal_places=2)
    min_participants = models.SmallIntegerField(default=1)
    location_address = models.CharField(max_length=255)
    cover_image_url = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=WorkshopStatus.choices,
        default=WorkshopStatus.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workshops'
        verbose_name = 'Workshop'
        verbose_name_plural = 'Workshop'
        indexes = [
            models.Index(fields=['village'], name='idx_workshops_village'),
            models.Index(fields=['artisan'], name='idx_workshops_artisan'),
            models.Index(fields=['status'], name='idx_workshops_status'),
        ]

    def clean(self):
        super().clean()
        if self.artisan and self.village:
            if self.artisan.village_id != self.village_id:
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'artisan': 'Nghệ nhân hướng dẫn phải thuộc về làng nghề tổ chức workshop.'
                })

    def __str__(self):
        return self.workshop_name


class WorkshopSession(models.Model):
    """
    Table 13: workshop_sessions
    Scheduled instances/time slots of workshops.
    """

    class SessionStatus(models.TextChoices):
        OPEN = 'OPEN', 'Mở đăng ký'
        FULL = 'FULL', 'Đã đầy'
        CANCELLED = 'CANCELLED', 'Hủy'
        COMPLETED = 'COMPLETED', 'Đã kết thúc'

    session_id = models.BigAutoField(primary_key=True)
    workshop = models.ForeignKey(
        Workshop,
        on_delete=models.CASCADE,
        related_name='sessions',
        db_column='workshop_id',
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    capacity = models.SmallIntegerField()
    booked_participants = models.IntegerField(default=0)
    price_per_person = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workshop_sessions'
        verbose_name = 'Phiên Workshop'
        verbose_name_plural = 'Phiên Workshop'
        indexes = [
            models.Index(fields=['workshop', 'start_at'], name='idx_sessions_wk_start'),
            models.Index(fields=['status'], name='idx_sessions_status'),
        ]

    def __str__(self):
        return f'{self.workshop.workshop_name} ({self.start_at.strftime("%d/%m/%Y %H:%M")})'

    @property
    def remaining_seats(self):
        return max(0, self.capacity - self.booked_participants)
