from django.urls import path
from .views import CraftVillageListView, CraftVillageDetailView

urlpatterns = [
    path('', CraftVillageListView.as_view(), name='village-list'),
    path('<int:pk>/', CraftVillageDetailView.as_view(), name='village-detail'),
    path('slug/<slug:slug>/', CraftVillageDetailView.as_view(lookup_field='slug'), name='village-detail-slug'),
]
