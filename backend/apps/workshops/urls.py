from django.urls import path
from .views import WorkshopListView, WorkshopDetailView, WorkshopSessionsView

urlpatterns = [
    path('', WorkshopListView.as_view(), name='workshop-list'),
    path('<int:pk>/', WorkshopDetailView.as_view(), name='workshop-detail'),
    path('<int:pk>/sessions/', WorkshopSessionsView.as_view(), name='workshop-sessions'),
]
