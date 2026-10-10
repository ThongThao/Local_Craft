from django.urls import path
from .views import BookingListCreateView, BookingDetailCancelView

urlpatterns = [
    path('', BookingListCreateView.as_view(), name='booking-list-create'),
    path('<int:pk>/', BookingDetailCancelView.as_view(), name='booking-detail'),
    path('<int:pk>/cancel/', BookingDetailCancelView.as_view(), name='booking-cancel'),
]
