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

    def validate_experience_years(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Số năm kinh nghiệm không được âm (>= 0).")
        return value

    def validate_display_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Tên nghệ nhân không được để trống.")
        val = value.strip()
        if len(val) > 150:
            raise serializers.ValidationError("Tên nghệ nhân không được vượt quá 150 ký tự.")
        return val

    def validate_verification_status(self, value):
        valid_statuses = [choice[0] for choice in ArtisanProfile.VerificationStatus.choices]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(valid_statuses)}."
            )
        return value


class ArtisanProfileDetailSerializer(ArtisanProfileSerializer):
    village = CraftVillageSerializer(read_only=True)
