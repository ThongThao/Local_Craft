"""
Django development settings for LocalCraft project.
Optimized for local developer experience.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '*']

# CORS settings for development - allow localhost dev server
CORS_ALLOW_ALL_ORIGINS = True
