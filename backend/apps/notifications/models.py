from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    Table 30: notifications
    User notifications across orders, bookings, and system messages.
    """

    notification_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='user_id',
    )
    notification_type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    target_type = models.CharField(max_length=30, null=True, blank=True)
    target_id = models.BigIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Thông báo'
        verbose_name_plural = 'Thông báo'
        indexes = [
            models.Index(
                fields=['user', 'is_read', 'created_at'],
                name='idx_notif_user_read_time',
            ),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.title} (Đã đọc: {self.is_read})'
