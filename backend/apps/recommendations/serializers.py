from rest_framework import serializers
from .models import Favorite, UserPreference, UserInteraction
# pyrefly: ignore [missing-import]
from apps.products.models import Product
# pyrefly: ignore [missing-import]
from apps.workshops.models import Workshop
# pyrefly: ignore [missing-import]
from apps.villages.models import CraftVillage


class FavoriteSerializer(serializers.ModelSerializer):
    target_data = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = [
            'favorite_id',
            'user',
            'target_type',
            'target_id',
            'target_data',
            'created_at',
        ]
        read_only_fields = ['user', 'created_at']

    def get_target_data(self, obj):
        if obj.target_type == Favorite.TargetType.PRODUCT:
            p = Product.objects.filter(pk=obj.target_id).first()
            if p:
                return {
                    'title': p.product_name,
                    'image': p.cover_image_url,
                    'price': str(p.base_price),
                }
        elif obj.target_type == Favorite.TargetType.WORKSHOP:
            w = Workshop.objects.filter(pk=obj.target_id).first()
            if w:
                return {
                    'title': w.workshop_name,
                    'image': w.cover_image_url,
                    'price': str(w.price_per_person),
                }
        elif obj.target_type == Favorite.TargetType.VILLAGE:
            v = CraftVillage.objects.filter(pk=obj.target_id).first()
            if v:
                return {
                    'title': v.village_name,
                    'image': v.cover_image_url,
                    'province': v.province,
                }
        return None


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            'preference_id',
            'preferred_categories',
            'preferred_activities',
            'preferred_provinces',
            'min_budget',
            'max_budget',
            'preferred_language',
            'updated_at',
        ]


class AIRecommendationQuerySerializer(serializers.Serializer):
    query = serializers.CharField(max_length=500)
    min_budget = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    max_budget = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
