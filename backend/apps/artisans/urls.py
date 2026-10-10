from django.urls import path
from .views import ArtisanListView, ArtisanDetailView

urlpatterns = [
    path('', ArtisanListView.as_view(), name='artisan-list'),
    path('<int:pk>/', ArtisanDetailView.as_view(), name='artisan-detail'),
]
