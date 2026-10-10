from django.urls import path
from .views import HealthCheckView, CloudinaryUploadView

app_name = 'common'

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('upload/', CloudinaryUploadView.as_view(), name='cloudinary-upload'),
]
