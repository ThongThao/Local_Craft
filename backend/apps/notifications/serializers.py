from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'notification_type',
            'title',
            'message',
            'target_type',
            'target_id',
            'is_read',
            'read_at',
            'created_at',
        ]
