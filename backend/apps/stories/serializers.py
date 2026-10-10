from rest_framework import serializers
from .models import CraftStory


class CraftStorySerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan_name = serializers.CharField(source='artisan.display_name', read_only=True, default='')

    class Meta:
        model = CraftStory
        fields = [
            'story_id',
            'village',
            'village_name',
            'artisan',
            'artisan_name',
            'title',
            'slug',
            'summary',
            'content',
            'cover_image_url',
            'status',
            'published_at',
            'created_at',
        ]
