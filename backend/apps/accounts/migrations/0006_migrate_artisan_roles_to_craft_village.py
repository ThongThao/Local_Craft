from django.db import migrations

def migrate_artisan_to_craft_village(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    UserRole = apps.get_model('accounts', 'UserRole')
    CraftVillage = apps.get_model('villages', 'CraftVillage')

    craft_village_role, _ = Role.objects.get_or_create(
        role_code='CRAFT_VILLAGE',
        defaults={'role_name': 'Quản lý làng nghề'}
    )

    artisan_roles = Role.objects.filter(role_code='ARTISAN')
    if artisan_roles.exists():
        artisan_role = artisan_roles.first()
        for ur in UserRole.objects.filter(role=artisan_role):
            ur.role = craft_village_role
            ur.save(update_fields=['role'])
            # If village without manager exists, map user 2 to bat-trang
            if ur.user_id == 2:
                CraftVillage.objects.filter(slug='bat-trang', manager_user__isnull=True).update(manager_user_id=2)
        
        artisan_roles.delete()

def reverse_migrate(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_remove_userrole_uq_user_roles_user_role_and_more'),
        ('villages', '0002_craftvillage_manager_user'),
    ]

    operations = [
        migrations.RunPython(migrate_artisan_to_craft_village, reverse_migrate),
    ]
