from django.db import models


class CraftStory(models.Model):
    """
    Table 7: craft_stories
    Cultural stories of craft villages and artisans.
    """

    class StoryStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Bản nháp'
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'
        HIDDEN = 'HIDDEN', 'Ẩn'

    story_id = models.BigAutoField(primary_key=True)
    village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.CASCADE,
        related_name='stories',
        db_column='village_id',
    )
    artisan = models.ForeignKey(
        'artisans.ArtisanProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stories',
        db_column='artisan_id',
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    summary = models.CharField(max_length=500, null=True, blank=True)
    content = models.TextField()
    cover_image_url = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StoryStatus.choices,
        default=StoryStatus.DRAFT,
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'craft_stories'
        verbose_name = 'Câu chuyện làng nghề'
        verbose_name_plural = 'Câu chuyện làng nghề'

    def __str__(self):
        return self.title
