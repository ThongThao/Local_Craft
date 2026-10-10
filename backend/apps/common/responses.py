"""
Standardized JSON Response helpers for LocalCraft API.
"""

from rest_framework.response import Response
from rest_framework import status


def api_success(data=None, message='Yêu cầu thành công', status_code=status.HTTP_200_OK):
    """Return a standard success response contract."""
    payload = {
        'success': True,
        'message': message,
        'data': data if data is not None else {}
    }
    return Response(payload, status=status_code)


def api_error(message='Yêu cầu không thể hoàn thành', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Return a standard error response contract."""
    payload = {
        'success': False,
        'message': message,
        'errors': errors if errors is not None else {}
    }
    return Response(payload, status=status_code)
