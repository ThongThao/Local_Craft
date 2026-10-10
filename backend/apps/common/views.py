"""
Common Views including Health Check Endpoint.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
from .responses import api_success, api_error


class HealthCheckView(APIView):
    """
    Health check endpoint: GET /api/v1/health/
    Verifies database connection, cache status, and application status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        db_status = 'ok'
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1;')
                cursor.fetchone()
        except Exception as e:
            db_status = f'error: {str(e)}'

        cache_status = 'ok'
        try:
            cache.set('health_check_ping', 'pong', timeout=10)
            if cache.get('health_check_ping') != 'pong':
                cache_status = 'degraded'
        except Exception as e:
            cache_status = f'error: {str(e)}'

        health_data = {
            'status': 'healthy' if db_status == 'ok' else 'degraded',
            'service': 'LocalCraft Backend API',
            'version': '1.0.0',
            'database': db_status,
            'cache': cache_status,
        }

        if db_status == 'ok':
            return api_success(data=health_data, message='Hệ thống LocalCraft đang hoạt động bình thường.')
        return api_error(message='Hệ thống gặp sự cố kết nối cơ sở dữ liệu.', errors=health_data, status_code=503)
