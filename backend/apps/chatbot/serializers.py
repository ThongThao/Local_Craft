from rest_framework import serializers
from .models import ChatSession, ChatMessage, KnowledgeSource, KnowledgeChunk


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'chat_message_id',
            'sender_type',
            'message_content',
            'metadata',
            'created_at',
        ]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            'chat_session_id',
            'session_title',
            'status',
            'messages',
            'created_at',
            'updated_at',
        ]


class ChatbotQuerySerializer(serializers.Serializer):
    session_id = serializers.IntegerField(required=False, allow_null=True)
    message = serializers.CharField(max_length=2000)
