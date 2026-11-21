"""
Root URL configuration for LocalCraft backend.
"""

from django.urls import path, include
from apps.villages.views import VillageActivityAnalyticsView

urlpatterns = [
    # Health check & system status
    path('api/v1/', include('apps.common.urls')),

    # Authentication & Accounts
    path('api/v1/auth/', include('apps.accounts.urls')),

    # Craft Villages & Artisans & Stories
    path('api/v1/villages/', include('apps.villages.urls')),
    path('api/v1/artisans/', include('apps.artisans.urls')),
    path('api/v1/stories/', include('apps.stories.urls')),

    # Village Activity & Revenue Analytics (Screen V17)
    path('api/v1/analytics/village-activity/', VillageActivityAnalyticsView.as_view(), name='village-activity-analytics'),

    # Products & Workshops
    path('api/v1/products/', include('apps.products.urls')),
    path('api/v1/workshops/', include('apps.workshops.urls')),

    # Bookings & Orders & Cart
    path('api/v1/bookings/', include('apps.bookings.urls')),
    path('api/v1/', include('apps.orders.urls')),

    # Reviews & Favorites & Preferences & Recommendations
    path('api/v1/reviews/', include('apps.reviews.urls')),
    path('api/v1/', include('apps.recommendations.urls')),

    # AI Chatbot RAG
    path('api/v1/chatbot/', include('apps.chatbot.urls')),

    # Payments & Notifications
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
