from django.apps import AppConfig
from django.db.models.signals import post_migrate


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.common'

    def ready(self):
        # Disconnect default auth/contenttypes post_migrate signals
        # so Django does not try to populate deleted default tables.
        try:
            from django.contrib.contenttypes.management import create_contenttypes
            post_migrate.disconnect(dispatch_uid='django.contrib.auth.management.create_permissions')
            post_migrate.disconnect(create_contenttypes)
        except Exception:
            pass
