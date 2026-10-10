from django.urls import path
from .views import FavoriteListToggleView, UserPreferenceView, AIRecommendationView

urlpatterns = [
    path('favorites/', FavoriteListToggleView.as_view(), name='favorites'),
    path('preferences/', UserPreferenceView.as_view(), name='preferences'),
    path('query/', AIRecommendationView.as_view(), name='recommendation-query'),
]
