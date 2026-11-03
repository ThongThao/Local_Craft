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


import logging
import cloudinary
import cloudinary.uploader
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser

logger = logging.getLogger(__name__)


class CloudinaryUploadView(APIView):
    """
    POST /api/v1/upload/
    Uploads image exclusively to Cloudinary and returns secure URL.
    Physical image storage is Cloudinary-only. No local filesystem storage.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file') or request.FILES.get('image')
        if not file_obj:
            return api_error(
                message='Không tìm thấy tệp tải lên. Vui lòng gửi trường "file" trong multipart/form-data.',
                status_code=400
            )

        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024
        if file_obj.size > max_size:
            return api_error(
                message='Kích thước ảnh vượt quá giới hạn 10MB.',
                status_code=400
            )

        # Validate mime type
        valid_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
        content_type = getattr(file_obj, 'content_type', '').lower()
        if content_type and content_type not in valid_types:
            return api_error(
                message=f'Định dạng tệp không được hỗ trợ ({content_type}). Vui lòng tải lên ảnh (JPG, PNG, WEBP, GIF, SVG).',
                status_code=400
            )

        folder = request.data.get('folder', 'localcraft/uploads').strip()

        # Check if Cloudinary is configured
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
        api_key = getattr(settings, 'CLOUDINARY_API_KEY', None)
        api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', None)

        if not (cloud_name and api_key and api_secret):
            logger.error("Cloudinary chưa được cấu hình (thiếu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET).")
            return api_error(
                message="Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống.",
                status_code=503
            )

        # Ensure file pointer is at beginning before upload
        file_obj.seek(0)

        try:
            upload_result = cloudinary.uploader.upload(
                file_obj,
                folder=folder,
                resource_type='image',
                overwrite=True,
            )

            secure_url = upload_result.get('secure_url') or upload_result.get('url')
            if not secure_url or not isinstance(secure_url, str) or not secure_url.startswith(('http://', 'https://')):
                logger.error(f"Cloudinary upload result missing valid secure_url: {upload_result}")
                return api_error(
                    message="Không thể lấy đường dẫn ảnh an toàn từ Cloudinary. Vui lòng thử lại.",
                    status_code=502
                )

            response_data = {
                'url': secure_url,
                'secure_url': secure_url,
                'public_id': upload_result.get('public_id'),
                'format': upload_result.get('format'),
                'width': upload_result.get('width'),
                'height': upload_result.get('height'),
                'bytes': upload_result.get('bytes'),
                'storage': 'cloudinary',
            }
            return api_success(
                data=response_data,
                message='Tải ảnh lên Cloudinary thành công!'
            )
        except Exception as e:
            logger.exception("Cloudinary upload failed")
            return api_error(
                message="Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra kết nối mạng và thử lại sau.",
                status_code=502
            )
