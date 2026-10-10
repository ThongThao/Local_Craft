import uuid
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import WorkshopBooking
# pyrefly: ignore [missing-import]
from apps.workshops.models import WorkshopSession


class WorkshopBookingSerializer(serializers.ModelSerializer):
    workshop_name = serializers.CharField(source='session.workshop.workshop_name', read_only=True)
    workshop_image = serializers.CharField(source='session.workshop.cover_image_url', read_only=True)
    start_at = serializers.DateTimeField(source='session.start_at', read_only=True)
    end_at = serializers.DateTimeField(source='session.end_at', read_only=True)
    location_address = serializers.CharField(source='session.workshop.location_address', read_only=True)
    artisan_name = serializers.CharField(source='session.workshop.artisan.display_name', read_only=True)

    class Meta:
        model = WorkshopBooking
        fields = [
            'booking_id',
            'booking_code',
            'session',
            'workshop_name',
            'workshop_image',
            'artisan_name',
            'start_at',
            'end_at',
            'location_address',
            'participant_count',
            'unit_price',
            'total_amount',
            'status',
            'special_request',
            'cancelled_at',
            'created_at',
        ]
        read_only_fields = ['booking_code', 'unit_price', 'total_amount', 'status', 'cancelled_at', 'created_at']


class CreateBookingSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(required=False, allow_null=True)
    workshop_id = serializers.IntegerField(required=False, allow_null=True)
    participant_count = serializers.IntegerField(min_value=1, default=1)
    special_request = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        session_id = attrs.get('session_id')
        workshop_id = attrs.get('workshop_id')
        participants = attrs.get('participant_count', 1)

        session = None
        if session_id:
            try:
                session = WorkshopSession.objects.select_for_update().get(pk=session_id)
            except WorkshopSession.DoesNotExist:
                raise serializers.ValidationError({"session_id": "Phiên trải nghiệm không tồn tại."})
        elif workshop_id:
            # Pick the earliest available session for this workshop
            session = WorkshopSession.objects.select_for_update().filter(
                workshop_id=workshop_id,
                status=WorkshopSession.SessionStatus.OPEN
            ).order_by('start_at').first()

            if not session:
                raise serializers.ValidationError({"workshop_id": "Hiện chưa có phiên trải nghiệm mở cho workshop này."})
        else:
            raise serializers.ValidationError("Cần cung cấp session_id hoặc workshop_id.")

        if session.status != WorkshopSession.SessionStatus.OPEN:
            raise serializers.ValidationError("Phiên trải nghiệm hiện không nhận đăng ký.")

        if session.booked_participants + participants > session.capacity:
            raise serializers.ValidationError(
                f"Không đủ chỗ trống. Chỉ còn {session.remaining_seats} chỗ."
            )

        attrs['session_obj'] = session
        return attrs

    def create(self, validated_data):
        session = validated_data['session_obj']
        participants = validated_data['participant_count']
        user = self.context['request'].user

        unit_price = session.price_per_person
        total_amount = unit_price * Decimal(participants)
        code = f"LC-{uuid.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            booking = WorkshopBooking.objects.create(
                booking_code=code,
                user=user,
                session=session,
                participant_count=participants,
                unit_price=unit_price,
                total_amount=total_amount,
                status=WorkshopBooking.BookingStatus.CONFIRMED,
                special_request=validated_data.get('special_request', ''),
            )

            session.booked_participants += participants
            if session.booked_participants >= session.capacity:
                session.status = WorkshopSession.SessionStatus.FULL
            session.save(update_fields=['booked_participants', 'status', 'updated_at'])

        return booking
