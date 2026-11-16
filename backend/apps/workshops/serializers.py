import uuid
from django.utils.text import slugify
from rest_framework import serializers
from apps.common.permissions import user_has_role
from .models import Workshop, WorkshopSession


from apps.bookings.models import WorkshopBooking


class WorkshopSessionSerializer(serializers.ModelSerializer):
    remaining_seats = serializers.IntegerField(read_only=True)
    workshop_name = serializers.CharField(source='workshop.workshop_name', read_only=True)
    artisan_name = serializers.SerializerMethodField()
    village_id = serializers.IntegerField(source='workshop.village_id', read_only=True)

    class Meta:
        model = WorkshopSession
        fields = [
            'session_id',
            'workshop',
            'workshop_name',
            'artisan_name',
            'village_id',
            'start_at',
            'end_at',
            'capacity',
            'booked_participants',
            'price_per_person',
            'status',
            'remaining_seats',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['booked_participants', 'created_at', 'updated_at']

    def get_artisan_name(self, obj):
        if obj.workshop and obj.workshop.artisan:
            return obj.workshop.artisan.display_name
        return ''


class SessionBookingItemSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, default='')

    class Meta:
        model = WorkshopBooking
        fields = [
            'booking_id',
            'booking_code',
            'user',
            'user_name',
            'user_email',
            'user_phone',
            'participant_count',
            'unit_price',
            'total_amount',
            'status',
            'special_request',
            'cancelled_at',
            'created_at',
        ]


class WorkshopSessionDetailSerializer(WorkshopSessionSerializer):
    bookings = SessionBookingItemSerializer(many=True, read_only=True)

    class Meta(WorkshopSessionSerializer.Meta):
        fields = WorkshopSessionSerializer.Meta.fields + ['bookings']


class WorkshopSessionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkshopSession
        fields = [
            'session_id',
            'workshop',
            'start_at',
            'end_at',
            'capacity',
            'price_per_person',
            'status',
        ]
        read_only_fields = ['session_id']
        extra_kwargs = {
            'workshop': {'required': False},
            'price_per_person': {'required': False},
            'status': {'required': False},
        }

    def validate_capacity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Sức chứa buổi workshop phải là số nguyên dương lớn hơn 0.')
        return value

    def validate(self, attrs):
        from django.utils import timezone
        now = timezone.now()

        start_at = attrs.get('start_at') or (self.instance.start_at if self.instance else None)
        end_at = attrs.get('end_at') or (self.instance.end_at if self.instance else None)
        workshop = attrs.get('workshop') or self.context.get('workshop') or (self.instance.workshop if self.instance else None)

        # 1. Block editing if already cancelled or completed
        if self.instance and self.instance.status in [WorkshopSession.SessionStatus.CANCELLED, WorkshopSession.SessionStatus.COMPLETED]:
            raise serializers.ValidationError({
                'status': f"Không thể chỉnh sửa buổi workshop đang ở trạng thái {self.instance.get_status_display()}."
            })

        # 2. Logic check: end_at must be strictly greater than start_at
        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError({
                'end_at': 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.'
            })

        # 3. Check start_at not in the past
        if not self.instance:
            if start_at and start_at < now:
                raise serializers.ValidationError({
                    'start_at': 'Thời gian bắt đầu buổi workshop không được ở trong quá khứ.'
                })
        elif 'start_at' in attrs:
            if attrs['start_at'] < now and self.instance.start_at >= now:
                raise serializers.ValidationError({
                    'start_at': 'Không thể dời thời gian bắt đầu về quá khứ.'
                })

        # 4. Capacity reduction check
        if self.instance and 'capacity' in attrs:
            new_capacity = attrs['capacity']
            if new_capacity < self.instance.booked_participants:
                raise serializers.ValidationError({
                    'capacity': f"Không thể giảm sức chứa xuống {new_capacity} vì đã có {self.instance.booked_participants} người đặt chỗ hợp lệ."
                })

        # 5. Check artisan schedule conflict (Rule: new_start < existing_end AND new_end > existing_start)
        if workshop and workshop.artisan and start_at and end_at:
            artisan = workshop.artisan
            conflict_qs = WorkshopSession.objects.filter(
                workshop__artisan=artisan,
                status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL],
                start_at__lt=end_at,
                end_at__gt=start_at,
            )
            if self.instance:
                conflict_qs = conflict_qs.exclude(pk=self.instance.pk)

            conflict = conflict_qs.select_related('workshop').first()
            if conflict:
                raise serializers.ValidationError({
                    'start_at': f"Nghệ nhân {artisan.display_name} đã có lịch phụ trách buổi khác ({conflict.workshop.workshop_name} từ {conflict.start_at.strftime('%H:%M %d/%m/%Y')} đến {conflict.end_at.strftime('%H:%M %d/%m/%Y')})."
                })

        return attrs

    def create(self, validated_data):
        workshop = validated_data.get('workshop')
        if 'price_per_person' not in validated_data and workshop:
            validated_data['price_per_person'] = workshop.price_per_person
        return super().create(validated_data)

    def update(self, instance, validated_data):
        session = super().update(instance, validated_data)
        if session.status == WorkshopSession.SessionStatus.FULL and session.booked_participants < session.capacity:
            session.status = WorkshopSession.SessionStatus.OPEN
            session.save(update_fields=['status'])
        elif session.status == WorkshopSession.SessionStatus.OPEN and session.booked_participants >= session.capacity:
            session.status = WorkshopSession.SessionStatus.FULL
            session.save(update_fields=['status'])
        return session


class WorkshopSessionRescheduleSerializer(serializers.Serializer):
    """
    F05.12: Serializer for rescheduling an existing workshop session.
    Enforces atomic time validity, attendance checks, and reason requirements when bookings exist.
    """
    new_start_at = serializers.DateTimeField(required=True)
    new_end_at = serializers.DateTimeField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        from django.utils import timezone
        now = timezone.now()

        session = self.context.get('session')
        if not session:
            raise serializers.ValidationError('Không tìm thấy thông tin ca workshop.')

        new_start_at = attrs.get('new_start_at')
        new_end_at = attrs.get('new_end_at')
        reason = (attrs.get('reason') or '').strip()

        # 1. State check of session
        if session.status == WorkshopSession.SessionStatus.CANCELLED:
            raise serializers.ValidationError('Không thể đổi lịch buổi workshop đã bị hủy.')
        if session.status == WorkshopSession.SessionStatus.COMPLETED:
            raise serializers.ValidationError('Không thể đổi lịch buổi workshop đã kết thúc.')
        if session.start_at <= now:
            raise serializers.ValidationError('Không thể đổi lịch buổi workshop đã bắt đầu hoặc đang diễn ra.')

        # 2. Time validity check
        if new_start_at <= now:
            raise serializers.ValidationError({'new_start_at': 'Thời gian bắt đầu mới phải ở tương lai.'})
        if new_end_at <= new_start_at:
            raise serializers.ValidationError({'new_end_at': 'Thời gian kết thúc mới phải diễn ra sau thời gian bắt đầu.'})

        # 3. Attendance check (F05.09 integration)
        from apps.bookings.models import WorkshopBooking
        has_attended_bookings = WorkshopBooking.objects.filter(
            session=session,
            status__in=[WorkshopBooking.BookingStatus.COMPLETED, WorkshopBooking.BookingStatus.NO_SHOW]
        ).exists()
        if has_attended_bookings:
            raise serializers.ValidationError(
                'Không thể đổi lịch buổi workshop đã có dữ liệu điểm danh (khách đã tham gia hoặc vắng mặt).'
            )

        # 4. Active bookings & Reason check
        active_bookings_count = WorkshopBooking.objects.filter(
            session=session,
            status__in=[WorkshopBooking.BookingStatus.CONFIRMED, WorkshopBooking.BookingStatus.PENDING]
        ).count()
        if active_bookings_count > 0 and not reason:
            raise serializers.ValidationError(
                {'reason': 'Vui lòng nhập lý do đổi lịch khi buổi workshop đã có khách đăng ký.'}
            )

        # 5. Artisan schedule conflict check
        workshop = session.workshop
        if workshop and workshop.artisan:
            artisan = workshop.artisan
            conflict = WorkshopSession.objects.filter(
                workshop__artisan=artisan,
                status__in=[WorkshopSession.SessionStatus.OPEN, WorkshopSession.SessionStatus.FULL],
                start_at__lt=new_end_at,
                end_at__gt=new_start_at,
            ).exclude(pk=session.pk).select_related('workshop').first()

            if conflict:
                raise serializers.ValidationError({
                    'new_start_at': (
                        f"Nghệ nhân {artisan.display_name} đã có lịch phụ trách buổi khác "
                        f"({conflict.workshop.workshop_name} từ {conflict.start_at.strftime('%H:%M %d/%m/%Y')} "
                        f"đến {conflict.end_at.strftime('%H:%M %d/%m/%Y')})."
                    )
                })

        attrs['active_bookings_count'] = active_bookings_count
        attrs['reason'] = reason
        return attrs


class WorkshopSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.category_name', read_only=True, default='')
    sessions_count = serializers.SerializerMethodField()
    next_session_date = serializers.SerializerMethodField()
    total_booked_participants = serializers.SerializerMethodField()

    class Meta:
        model = Workshop
        fields = [
            'workshop_id',
            'village',
            'village_name',
            'artisan',
            'artisan_name',
            'category',
            'category_name',
            'workshop_name',
            'slug',
            'description',
            'duration_minutes',
            'price_per_person',
            'min_participants',
            'location_address',
            'cover_image_url',
            'status',
            'sessions_count',
            'next_session_date',
            'total_booked_participants',
            'created_at',
        ]
        read_only_fields = ['created_at']
        extra_kwargs = {
            'slug': {'required': False},
            'workshop_name': {
                'error_messages': {
                    'blank': 'Tên workshop không được để trống.',
                    'required': 'Tên workshop là bắt buộc.',
                }
            },
            'description': {
                'error_messages': {
                    'blank': 'Mô tả chi tiết workshop không được để trống.',
                    'required': 'Mô tả chi tiết workshop là bắt buộc.',
                }
            },
            'duration_minutes': {
                'error_messages': {
                    'required': 'Thời lượng workshop là bắt buộc.',
                    'invalid': 'Thời lượng workshop phải là số nguyên (phút).',
                }
            },
            'price_per_person': {
                'error_messages': {
                    'required': 'Giá vé mỗi người là bắt buộc.',
                    'invalid': 'Giá vé không hợp lệ.',
                }
            },
            'location_address': {
                'error_messages': {
                    'blank': 'Địa chỉ tổ chức không được để trống.',
                    'required': 'Địa chỉ tổ chức là bắt buộc.',
                }
            },
        }

    def get_artisan_name(self, obj):
        return obj.artisan.display_name if obj.artisan else ''

    def get_sessions_count(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'sessions' in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache['sessions'])
        return obj.sessions.count()

    def get_next_session_date(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if hasattr(obj, '_prefetched_objects_cache') and 'sessions' in obj._prefetched_objects_cache:
            sessions = [s for s in obj._prefetched_objects_cache['sessions'] if s.start_at >= now and s.status == 'OPEN']
        else:
            sessions = list(obj.sessions.filter(start_at__gte=now, status='OPEN').order_by('start_at'))
        if sessions:
            sessions.sort(key=lambda s: s.start_at)
            return sessions[0].start_at.strftime('%H:%M - %d/%m/%Y')
        return None

    def get_total_booked_participants(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'sessions' in obj._prefetched_objects_cache:
            return sum(s.booked_participants for s in obj._prefetched_objects_cache['sessions'])
        from django.db.models import Sum
        result = obj.sessions.aggregate(total=Sum('booked_participants'))
        return result['total'] or 0

    def validate_workshop_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('Tên workshop không được để trống.')
        if len(val) > 200:
            raise serializers.ValidationError('Tên workshop không được vượt quá 200 ký tự.')
        return val

    def validate_description(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('Mô tả chi tiết workshop không được để trống.')
        return val

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError('Thời lượng workshop phải lớn hơn 0 phút.')
        if value > 1440:
            raise serializers.ValidationError('Thời lượng workshop không được vượt quá 1440 phút (24 giờ).')
        return value

    def validate_price_per_person(self, value):
        if value < 0:
            raise serializers.ValidationError('Giá vé mỗi người phải lớn hơn hoặc bằng 0.')
        return value

    def validate_min_participants(self, value):
        if value < 1:
            raise serializers.ValidationError('Số người tham gia tối thiểu phải từ 1 người trở lên.')
        return value

    def validate_location_address(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError('Địa chỉ tổ chức không được để trống.')
        if len(val) > 255:
            raise serializers.ValidationError('Địa chỉ tổ chức không được vượt quá 255 ký tự.')
        return val

    def validate(self, attrs):
        village = attrs.get('village') or (self.instance.village if self.instance else None)
        artisan = attrs.get('artisan') or (self.instance.artisan if self.instance else None)

        if artisan and village and artisan.village_id != village.village_id:
            raise serializers.ValidationError({
                'artisan': 'Nghệ nhân hướng dẫn phải thuộc về làng nghề tổ chức workshop.'
            })

        workshop_status = attrs.get('status') or (self.instance.status if self.instance else None)
        if artisan and workshop_status == 'APPROVED' and artisan.verification_status != 'APPROVED':
            raise serializers.ValidationError({
                'artisan': 'Chỉ nghệ nhân có hồ sơ đã được duyệt (APPROVED) mới được phép hướng dẫn workshop công khai.'
            })

        # Role-based status transition restrictions
        request = self.context.get('request')
        user = request.user if request else None
        if user and user.is_authenticated and not user_has_role(user, 'ADMIN'):
            target_status = attrs.get('status')
            if target_status in ['APPROVED', 'REJECTED']:
                raise serializers.ValidationError({
                    'status': 'Quản lý làng nghề chỉ có thể lưu nháp (DRAFT), gửi duyệt (PENDING) hoặc tạm ẩn (HIDDEN).'
                })

        # Auto-slug generation or validation
        slug = attrs.get('slug')
        workshop_name = attrs.get('workshop_name') or (self.instance.workshop_name if self.instance else '')
        if not slug:
            if not self.instance or (self.instance and not self.instance.slug):
                base_slug = slugify(workshop_name) or 'workshop'
                unique_suffix = uuid.uuid4().hex[:6]
                candidate_slug = f"{base_slug[:190]}-{unique_suffix}"
                while Workshop.objects.filter(slug=candidate_slug).exists():
                    unique_suffix = uuid.uuid4().hex[:6]
                    candidate_slug = f"{base_slug[:190]}-{unique_suffix}"
                attrs['slug'] = candidate_slug
        else:
            qs = Workshop.objects.filter(slug=slug)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'slug': 'Đường dẫn định danh (slug) này đã tồn tại, vui lòng chọn đường dẫn khác.'
                })

        return attrs


class WorkshopDetailSerializer(WorkshopSerializer):
    sessions = WorkshopSessionSerializer(many=True, read_only=True)

    class Meta(WorkshopSerializer.Meta):
        fields = WorkshopSerializer.Meta.fields + ['sessions']

