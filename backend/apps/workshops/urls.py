from django.urls import path
from .views import (
    WorkshopListView,
    WorkshopDetailView,
    WorkshopSessionsListCreateView,
    WorkshopSessionDetailUpdateDeleteView,
    WorkshopSessionCancelView,
    WorkshopSessionRescheduleView,
    WorkshopSummaryView,
)

urlpatterns = [
    path('', WorkshopListView.as_view(), name='workshop-list'),
    path('summary/', WorkshopSummaryView.as_view(), name='workshop-summary'),
    path('<int:pk>/', WorkshopDetailView.as_view(), name='workshop-detail'),
    path('<int:pk>/sessions/', WorkshopSessionsListCreateView.as_view(), name='workshop-sessions'),
    path('sessions/<int:pk>/', WorkshopSessionDetailUpdateDeleteView.as_view(), name='workshop-session-detail'),
    path('sessions/<int:pk>/cancel/', WorkshopSessionCancelView.as_view(), name='workshop-session-cancel'),
    path('sessions/<int:pk>/reschedule/', WorkshopSessionRescheduleView.as_view(), name='workshop-session-reschedule'),
]
