import uuid
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import WorkshopBooking
# pyrefly: ignore [missing-import]
from apps.workshops.models import WorkshopSession


class WorkshopBookingListSerializer(serializers.ModelSerializer):
    """
    List serializer with PII minimization (omits phone and email from bulk list).
    """
    workshop_id = serializers.IntegerField(source='session.workshop.workshop_id', read_only=True)
    workshop_name = serializers.CharField(source='session.workshop.workshop_name', read_only=True)
    workshop_image = serializers.CharField(source='session.workshop.cover_image_url', read_only=True)
    village_id = serializers.IntegerField(source='session.workshop.village.village_id', read_only=True)
    village_name = serializers.CharField(source='session.workshop.village.village_name', read_only=True, default='')
    artisan_name = serializers.SerializerMethodField()
    start_at = serializers.DateTimeField(source='session.start_at', read_only=True)
    end_at = serializers.DateTimeField(source='session.end_at', read_only=True)
    location_address = serializers.CharField(source='session.workshop.location_address', read_only=True)
    user_id = serializers.IntegerField(source='user.user_id', read_only=True)
    customer_name = serializers.CharField(source='user.full_name', read_only=True, default='')
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='')

    class Meta:
        model = WorkshopBooking
        fields = [
            'booking_id',
            'booking_code',
            'session',
            'workshop_id',
            'workshop_name',
            'workshop_image',
            'village_id',
            'village_name',
            'artisan_name',
            'start_at',
            'end_at',
            'location_address',
            'user_id',
            'customer_name',
            'user_name',
            'participant_count',
            'unit_price',
            'total_amount',
            'status',
            'created_at',
        ]
        read_only_fields = ['booking_code', 'unit_price', 'total_amount', 'status', 'created_at']

    def get_artisan_name(self, obj):
        workshop = getattr(obj.session, 'workshop', None)
        if workshop and workshop.artisan:
            return workshop.artisan.display_name
        return ''


class WorkshopBookingDetailSerializer(WorkshopBookingListSerializer):
    """
    Full detail serializer for V12 (authorized view with contact, session, and payment details).
    """
    customer_email = serializers.CharField(source='user.email', read_only=True, default='')
    customer_phone = serializers.CharField(source='user.phone', read_only=True, default='')
    user_email = serializers.CharField(source='user.email', read_only=True, default='')
    user_phone = serializers.CharField(source='user.phone', read_only=True, default='')
    session_id = serializers.IntegerField(source='session.session_id', read_only=True)
    session_capacity = serializers.IntegerField(source='session.capacity', read_only=True)
    session_booked_participants = serializers.IntegerField(source='session.booked_participants', read_only=True)
    session_remaining_seats = serializers.IntegerField(source='session.remaining_seats', read_only=True)
    session_status = serializers.CharField(source='session.status', read_only=True)
    workshop_description = serializers.CharField(source='session.workshop.description', read_only=True, default='')
    workshop_duration_minutes = serializers.IntegerField(source='session.workshop.duration_minutes', read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    payment_info = serializers.SerializerMethodField()
    refundable_amount = serializers.SerializerMethodField()

    class Meta(WorkshopBookingListSerializer.Meta):
        fields = WorkshopBookingListSerializer.Meta.fields + [
            'customer_email',
            'customer_phone',
            'user_email',
            'user_phone',
            'special_request',
            'cancelled_at',
            'session_id',
            'session_capacity',
            'session_booked_participants',
            'session_remaining_seats',
            'session_status',
            'workshop_description',
            'workshop_duration_minutes',
            'updated_at',
            'payment_info',
            'refundable_amount',
        ]
        read_only_fields = WorkshopBookingListSerializer.Meta.read_only_fields + ['cancelled_at', 'updated_at']

    def get_payment_info(self, obj):
        try:
            payment = obj.payments.order_by('-created_at').first()
            if not payment:
                return None
            return {
                'payment_id': payment.payment_id,
                'payment_code': payment.payment_code,
                'payment_method': payment.payment_method,
                'amount': str(payment.amount),
                'currency': payment.currency,
                'status': payment.status,
                'provider_transaction_id': payment.provider_transaction_id,
                'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
                'created_at': payment.created_at.isoformat() if payment.created_at else None,
            }
        except Exception:
            return None

    def get_refundable_amount(self, obj):
        try:
            from apps.payments.models import Payment, Refund
            from django.db.models import Sum
            paid_agg = Payment.objects.filter(
                booking=obj,
                status=Payment.PaymentRecordStatus.SUCCESS
            ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

            refund_agg = Refund.objects.filter(
                payment__booking=obj,
                status__in=[Refund.RefundStatus.COMPLETED, Refund.RefundStatus.APPROVED, Refund.RefundStatus.PROCESSING]
            ).aggregate(t=Sum('amount_approved'))['t'] or Decimal('0.00')

            refundable = max(Decimal('0.00'), paid_agg - refund_agg)
            return float(refundable)
        except Exception:
            return 0.0


# Backward-compatible alias
WorkshopBookingSerializer = WorkshopBookingDetailSerializer



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
                session = WorkshopSession.objects.get(pk=session_id)
            except WorkshopSession.DoesNotExist:
                raise serializers.ValidationError({"session_id": "Phiên trải nghiệm không tồn tại."})
        elif workshop_id:
            # Pick the earliest available session for this workshop
            session = WorkshopSession.objects.filter(
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
        session_obj = validated_data['session_obj']
        participants = validated_data['participant_count']
        user = self.context['request'].user

        unit_price = session_obj.price_per_person
        total_amount = unit_price * Decimal(participants)
        code = f"LC-{uuid.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            # Concurrency row-level lock on the session record
            session = WorkshopSession.objects.select_for_update().get(pk=session_obj.pk)

            if session.status != WorkshopSession.SessionStatus.OPEN:
                raise serializers.ValidationError("Phiên trải nghiệm hiện không nhận đăng ký.")

            if session.booked_participants + participants > session.capacity:
                raise serializers.ValidationError(
                    f"Không đủ chỗ trống. Chỉ còn {session.remaining_seats} chỗ."
                )

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


class BookingAttendanceSerializer(serializers.Serializer):
    """
    Serializer for F05.09 attendance check-in / no-show operations.
    Accepts only COMPLETED (Đã tham gia) or NO_SHOW (Vắng mặt).
    """
    status = serializers.ChoiceField(
        choices=[
            (WorkshopBooking.BookingStatus.COMPLETED, 'Đã tham gia (COMPLETED)'),
            (WorkshopBooking.BookingStatus.NO_SHOW, 'Vắng mặt (NO_SHOW)'),
        ],
        error_messages={
            'required': 'Trạng thái điểm danh là bắt buộc.',
            'invalid_choice': 'Trạng thái điểm danh không hợp lệ. Chỉ chấp nhận COMPLETED hoặc NO_SHOW.',
        }
    )

