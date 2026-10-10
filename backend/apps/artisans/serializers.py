from rest_framework import serializers
from .models import ArtisanProfile
# pyrefly: ignore [missing-import]
from apps.villages.serializers import CraftVillageSerializer


class ArtisanProfileSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_avatar_url = serializers.CharField(source='user.avatar_url', read_only=True)
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    village_province = serializers.CharField(source='village.province', read_only=True)
    product_count = serializers.SerializerMethodField()
    workshop_count = serializers.SerializerMethodField()

    class Meta:
        model = ArtisanProfile
        fields = [
            'artisan_id',
            'user',
            'user_full_name',
            'user_email',
            'user_avatar_url',
            'village',
            'village_name',
            'village_province',
            'display_name',
            'bio',
            'experience_years',
            'verification_status',
            'product_count',
            'workshop_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'verification_status', 'created_at', 'updated_at']

    def get_product_count(self, obj):
        return obj.products.filter(status='APPROVED').count()

    def get_workshop_count(self, obj):
        return obj.workshops.filter(status='APPROVED').count()


class ArtisanProfileDetailSerializer(ArtisanProfileSerializer):
    village = CraftVillageSerializer(read_only=True)
