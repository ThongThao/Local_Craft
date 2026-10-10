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


class IsCraftVillage(BasePermission):
    """Requires user to be authenticated with CRAFT_VILLAGE role."""

    def has_permission(self, request, view):
        return user_has_role(request.user, 'CRAFT_VILLAGE') or user_has_role(request.user, 'ADMIN')


class IsAdmin(BasePermission):
    """Requires user to be authenticated with ADMIN role."""

    def has_permission(self, request, view):
        return user_has_role(request.user, 'ADMIN')


class IsVillageManager(BasePermission):
    """
    Ensures the user manages the craft village owning the resource.
    Admins are granted full access.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if user_has_role(request.user, 'ADMIN'):
            return True
        if not user_has_role(request.user, 'CRAFT_VILLAGE'):
            return False
        return hasattr(request.user, 'managed_village') and request.user.managed_village is not None

    def has_object_permission(self, request, view, obj):
        if user_has_role(request.user, 'ADMIN'):
            return True
        if not hasattr(request.user, 'managed_village') or not request.user.managed_village:
            return False

        managed_village_id = request.user.managed_village.village_id

        # If obj is CraftVillage itself
        if hasattr(obj, 'village_id') and type(obj).__name__ == 'CraftVillage':
            return obj.village_id == managed_village_id

        # If obj has village_id attribute
        if hasattr(obj, 'village_id'):
            return obj.village_id == managed_village_id

        # If obj has village foreign key
        if hasattr(obj, 'village') and obj.village:
            return obj.village.village_id == managed_village_id

        return False


class IsReadOnly(BasePermission):
    """Allow read-only safe methods (GET, HEAD, OPTIONS)."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
