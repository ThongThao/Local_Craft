from django.urls import path
from .views import ChatbotQueryView, ChatSessionListView

urlpatterns = [
    path('query/', ChatbotQueryView.as_view(), name='chatbot-query'),
    path('sessions/', ChatSessionListView.as_view(), name='chatbot-sessions'),
]
