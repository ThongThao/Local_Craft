from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for the User model with email as unique identifier."""

    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError('Email là bắt buộc')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, full_name=full_name, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('status', User.UserStatus.ACTIVE)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser phải có is_staff=True')

        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser):
    """
    Table 1: users
    Custom user model following LocalCraft specification.
    """

    class UserStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Hoạt động'
        INACTIVE = 'INACTIVE', 'Không hoạt động'
        SUSPENDED = 'SUSPENDED', 'Bị khóa'

    user_id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    password = models.CharField(max_length=255, db_column='password_hash')
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, null=True, blank=True, unique=True)
    avatar_url = models.CharField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=UserStatus.choices,
        default=UserStatus.ACTIVE,
        db_index=True,
    )
    email_verified_at = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True, db_column='last_login_at')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Người dùng'
        indexes = [
            models.Index(fields=['status'], name='idx_users_status'),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.email})'

    @property
    def is_active(self):
        return self.status == self.UserStatus.ACTIVE

    @is_active.setter
    def is_active(self, value):
        self.status = self.UserStatus.ACTIVE if value else self.UserStatus.INACTIVE


class Role(models.Model):
    """
    Table 2: roles
    System roles (e.g. TOURIST, ARTISAN, ADMIN).
    """

    class RoleCode(models.TextChoices):
        TOURIST = 'TOURIST', 'Du khách'
        ARTISAN = 'ARTISAN', 'Nghệ nhân'
        ADMIN = 'ADMIN', 'Quản trị viên'

    role_id = models.BigAutoField(primary_key=True)
    role_code = models.CharField(max_length=50, unique=True)
    role_name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Vai trò'
        verbose_name_plural = 'Vai trò'

    def __str__(self):
        return self.role_name


class UserRole(models.Model):
    """
    Table 3: user_roles
    Mapping table between users and roles.
    """

    user_role_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles',
        db_column='user_id',
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='user_roles',
        db_column='role_id',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_roles'
        verbose_name = 'Phân quyền người dùng'
        verbose_name_plural = 'Phân quyền người dùng'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'role'],
                name='uq_user_roles_user_role',
            )
        ]

    def __str__(self):
        return f'{self.user.email} - {self.role.role_code}'
