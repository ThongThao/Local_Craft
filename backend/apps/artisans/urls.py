from django.urls import path
from .views import ArtisanListView, ArtisanDetailView, ArtisanMeView

urlpatterns = [
    path('', ArtisanListView.as_view(), name='artisan-list'),
    path('me/', ArtisanMeView.as_view(), name='artisan-me'),
    path('<int:pk>/', ArtisanDetailView.as_view(), name='artisan-detail'),
]
