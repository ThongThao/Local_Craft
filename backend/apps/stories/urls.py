from django.urls import path
from .views import (
    CraftStoryListView,
    CraftStoryDetailView,
    CraftStorySubmitView,
    CraftStorySummaryView,
)

urlpatterns = [
    path('', CraftStoryListView.as_view(), name='story-list'),
    path('summary/', CraftStorySummaryView.as_view(), name='story-summary'),
    path('<int:pk>/', CraftStoryDetailView.as_view(), name='story-detail'),
    path('<int:pk>/submit/', CraftStorySubmitView.as_view(), name='story-submit'),
]
