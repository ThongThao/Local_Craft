"""
Reusable Role-Based Permissions for LocalCraft.
Uses `roles` and `user_roles` tables mapped via User.user_roles.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticated(BasePermission):
    """Allows access only to authenticated users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


def user_has_role(user, role_code: str) -> bool:
    """Helper to check if a user has a specific role code."""
    if not user or not user.is_authenticated:
        return False
    return user.user_roles.filter(role__role_code=role_code).exists()


class IsTourist(BasePermission):
    """Requires user to be authenticated with TOURIST role."""

    def has_permission(self, request, view):
        return user_has_role(request.user, 'TOURIST') or user_has_role(request.user, 'ADMIN')


class IsArtisan(BasePermission):
    """Requires user to be authenticated with ARTISAN role."""

    def has_permission(self, request, view):
        return user_has_role(request.user, 'ARTISAN') or user_has_role(request.user, 'ADMIN')


class IsAdmin(BasePermission):
    """Requires user to be authenticated with ADMIN role."""

    def has_permission(self, request, view):
        return user_has_role(request.user, 'ADMIN')


class IsReadOnly(BasePermission):
    """Allow read-only safe methods (GET, HEAD, OPTIONS)."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
