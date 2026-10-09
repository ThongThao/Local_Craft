from django.conf import settings
from django.db import models


class WorkshopBooking(models.Model):
    """
    Table 14: workshop_bookings
    Reservations for workshop sessions.
    """

    class BookingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ xác nhận'
        CONFIRMED = 'CONFIRMED', 'Đã xác nhận'
        CANCELLED = 'CANCELLED', 'Đã hủy'
        COMPLETED = 'COMPLETED', 'Đã hoàn thành'
        NO_SHOW = 'NO_SHOW', 'Vắng mặt'
        EXPIRED = 'EXPIRED', 'Hết hạn'

    booking_id = models.BigAutoField(primary_key=True)
    booking_code = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        db_column='user_id',
    )
    session = models.ForeignKey(
        'workshops.WorkshopSession',
        on_delete=models.CASCADE,
        related_name='bookings',
        db_column='session_id',
    )
    participant_count = models.SmallIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
    special_request = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workshop_bookings'
        verbose_name = 'Đăng ký Workshop'
        verbose_name_plural = 'Đăng ký Workshop'
        indexes = [
            models.Index(fields=['user', 'created_at'], name='idx_bookings_user_created'),
            models.Index(fields=['session', 'status'], name='idx_bookings_sess_status'),
        ]

    def __str__(self):
        return f'{self.booking_code} - {self.user.email} ({self.status})'
