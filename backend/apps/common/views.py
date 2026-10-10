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


import os
import uuid
import cloudinary
import cloudinary.uploader
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser


class CloudinaryUploadView(APIView):
    """
    POST /api/v1/upload/
    Uploads image to Cloudinary (or fallback local media storage) and returns secure URL.
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

        if cloud_name and api_key and api_secret:
            try:
                upload_result = cloudinary.uploader.upload(
                    file_obj,
                    folder=folder,
                    resource_type='image',
                    overwrite=True,
                )

                response_data = {
                    'url': upload_result.get('secure_url') or upload_result.get('url'),
                    'secure_url': upload_result.get('secure_url'),
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
                # Log and fallback to local media storage
                pass

        # Fallback local media storage
        ext = os.path.splitext(file_obj.name)[1] or '.jpg'
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        relative_path = os.path.join(folder, unique_filename).replace('\\', '/')
        saved_path = default_storage.save(relative_path, ContentFile(file_obj.read()))
        local_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        return api_success(
            data={
                'url': local_url,
                'secure_url': local_url,
                'public_id': saved_path,
                'storage': 'local_fallback',
            },
            message='Tải ảnh lên thành công (lưu trữ cục bộ). Cấu hình CLOUDINARY_CLOUD_NAME trong .env để đồng bộ Cloudinary CDN.'
        )
