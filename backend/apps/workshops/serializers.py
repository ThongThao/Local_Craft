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
    artisan_name = serializers.CharField(source='artisan.display_name', read_only=True)
    village_name = serializers.CharField(source='artisan.village.village_name', read_only=True, default='')
    category_name = serializers.CharField(source='category.category_name', read_only=True, default='')

    class Meta:
        model = Workshop
        fields = [
            'workshop_id',
            'artisan',
            'artisan_name',
            'village_name',
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


class WorkshopDetailSerializer(WorkshopSerializer):
    sessions = WorkshopSessionSerializer(many=True, read_only=True)

    class Meta(WorkshopSerializer.Meta):
        fields = WorkshopSerializer.Meta.fields + ['sessions']
