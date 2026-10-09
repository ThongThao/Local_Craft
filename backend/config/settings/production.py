"""
Django production settings for LocalCraft project.
Optimized for security and performance in production environments.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

# Ensure strict hosts in production
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',')
    if host.strip()
]

# Security enhancements
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# HTTPS configuration (enable when SSL certificate is active)
if os.getenv('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1'):
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
