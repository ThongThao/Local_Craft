from rest_framework import serializers
from .models import CraftVillage


class CraftVillageSerializer(serializers.ModelSerializer):
    artisan_count = serializers.SerializerMethodField()
    story_count = serializers.SerializerMethodField()
    manager_email = serializers.CharField(source='manager_user.email', read_only=True, default='')
    manager_name = serializers.CharField(source='manager_user.full_name', read_only=True, default='')

    class Meta:
        model = CraftVillage
        fields = [
            'village_id',
            'manager_user',
            'manager_name',
            'manager_email',
            'village_name',
            'slug',
            'description',
            'province',
            'district',
            'address',
            'latitude',
            'longitude',
            'cover_image_url',
            'status',
            'artisan_count',
            'story_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_artisan_count(self, obj):
        return obj.artisans.filter(verification_status='APPROVED').count()

    def get_story_count(self, obj):
        return obj.stories.filter(status='APPROVED').count()
