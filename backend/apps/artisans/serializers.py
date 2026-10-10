from rest_framework import serializers
from .models import ArtisanProfile
# pyrefly: ignore [missing-import]
from apps.villages.serializers import CraftVillageSerializer


class ArtisanProfileSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    village_province = serializers.CharField(source='village.province', read_only=True)
    product_count = serializers.SerializerMethodField()
    workshop_count = serializers.SerializerMethodField()

    class Meta:
        model = ArtisanProfile
        fields = [
            'artisan_id',
            'village',
            'village_name',
            'village_province',
            'display_name',
            'avatar_url',
            'bio',
            'experience_years',
            'verification_status',
            'verification_note',
            'product_count',
            'workshop_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_product_count(self, obj):
        return obj.products.filter(status='APPROVED').count()

    def get_workshop_count(self, obj):
        return obj.workshops.filter(status='APPROVED').count()


class ArtisanProfileDetailSerializer(ArtisanProfileSerializer):
    village = CraftVillageSerializer(read_only=True)
