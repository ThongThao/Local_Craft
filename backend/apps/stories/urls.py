from django.urls import path
from .views import CraftStoryListView, CraftStoryDetailView

urlpatterns = [
    path('', CraftStoryListView.as_view(), name='story-list'),
    path('<int:pk>/', CraftStoryDetailView.as_view(), name='story-detail'),
]
