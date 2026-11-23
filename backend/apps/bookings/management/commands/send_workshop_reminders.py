from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone
from apps.bookings.models import WorkshopBooking
from apps.workshops.models import WorkshopSession
from apps.notifications.services import NotificationService


class Command(BaseCommand):
    help = "Send scheduled 24-hour and 2-hour workshop reminders to tourists (F11.06)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate reminder scan without creating actual notifications',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()
        self.stdout.write(self.style.NOTICE(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Starting workshop reminder check..."))

        # ----------------------------------------------------------------------
        # 1. 24-Hour Reminder Window (23.5h <= start_at <= 24.5h)
        # ----------------------------------------------------------------------
        window_24h_start = now + timedelta(hours=23, minutes=30)
        window_24h_end = now + timedelta(hours=24, minutes=30)

        bookings_24h = WorkshopBooking.objects.filter(
            status=WorkshopBooking.BookingStatus.CONFIRMED,
            session__status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL],
            session__start_at__range=(window_24h_start, window_24h_end),
        ).select_related('user', 'session', 'session__workshop', 'session__workshop__artisan')

        sent_24h = 0
        for b in bookings_24h:
            if dry_run:
                self.stdout.write(f"[DRY-RUN 24H] Would send reminder to {b.user.email} for booking {b.booking_code}")
                sent_24h += 1
            else:
                notif = NotificationService.notify_tourist_workshop_reminder(b, reminder_type='24H')
                if notif:
                    sent_24h += 1

        # ----------------------------------------------------------------------
        # 2. 2-Hour Reminder Window (1.75h <= start_at <= 2.25h)
        # ----------------------------------------------------------------------
        window_2h_start = now + timedelta(hours=1, minutes=45)
        window_2h_end = now + timedelta(hours=2, minutes=15)

        bookings_2h = WorkshopBooking.objects.filter(
            status=WorkshopBooking.BookingStatus.CONFIRMED,
            session__status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL],
            session__start_at__range=(window_2h_start, window_2h_end),
        ).select_related('user', 'session', 'session__workshop', 'session__workshop__artisan')

        sent_2h = 0
        for b in bookings_2h:
            if dry_run:
                self.stdout.write(f"[DRY-RUN 2H] Would send reminder to {b.user.email} for booking {b.booking_code}")
                sent_2h += 1
            else:
                notif = NotificationService.notify_tourist_workshop_reminder(b, reminder_type='2H')
                if notif:
                    sent_2h += 1

        msg = f"Reminder scan completed: {sent_24h} 24h-reminders sent, {sent_2h} 2h-reminders sent."
        if dry_run:
            msg = f"[DRY-RUN] {msg}"
        self.stdout.write(self.style.SUCCESS(msg))

