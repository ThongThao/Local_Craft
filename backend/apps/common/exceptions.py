"""
Custom exception handler to format all DRF errors into LocalCraft standard JSON contract:
{
  "success": false,
  "message": "...",
  "errors": { ... }
}
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Transform DRF default exceptions into LocalCraft standard error contract."""
    response = exception_handler(exc, context)

    if response is not None:
        message = 'Dữ liệu không hợp lệ hoặc đã có lỗi xảy ra'
        errors = response.data

        # Determine a human-readable message if detail exists
        if isinstance(errors, dict):
            if 'detail' in errors:
                message = str(errors['detail'])
            elif 'non_field_errors' in errors and len(errors['non_field_errors']) > 0:
                message = str(errors['non_field_errors'][0])
        elif isinstance(errors, list) and len(errors) > 0:
            message = str(errors[0])

        custom_data = {
            'success': False,
            'message': message,
            'errors': errors
        }
        response.data = custom_data

    return response
