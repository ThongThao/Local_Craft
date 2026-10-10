from rest_framework import serializers
from .models import Workshop, WorkshopSession


class WorkshopSessionSerializer(serializers.ModelSerializer):
    remaining_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkshopSession
        fields = [
            'session_id',
            'workshop',
            'start_at',
            'end_at',
            'capacity',
            'booked_participants',
            'price_per_person',
            'status',
            'remaining_seats',
        ]


class WorkshopSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.category_name', read_only=True, default='')

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
            'created_at',
        ]
        read_only_fields = ['created_at']

    def get_artisan_name(self, obj):
        return obj.artisan.display_name if obj.artisan else ''

    def validate(self, attrs):
        village = attrs.get('village') or (self.instance.village if self.instance else None)
        artisan = attrs.get('artisan') or (self.instance.artisan if self.instance else None)
        if artisan and village and artisan.village_id != village.village_id:
            raise serializers.ValidationError({
                'artisan': 'Nghệ nhân hướng dẫn phải thuộc về làng nghề tổ chức workshop.'
            })
        return attrs


class WorkshopDetailSerializer(WorkshopSerializer):
    sessions = WorkshopSessionSerializer(many=True, read_only=True)

    class Meta(WorkshopSerializer.Meta):
        fields = WorkshopSerializer.Meta.fields + ['sessions']
