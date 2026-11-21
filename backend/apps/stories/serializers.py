import uuid
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from apps.artisans.models import ArtisanProfile
from apps.common.permissions import user_has_role
from apps.villages.models import CraftVillage
from .models import CraftStory


class CraftStorySerializer(serializers.ModelSerializer):
    """
    Serializer for CraftStory model (Table 7: craft_stories).
    Strictly adheres to Database schema and role-based permissions.
    """
    story_id = serializers.IntegerField(read_only=True)
    village = serializers.PrimaryKeyRelatedField(
        queryset=CraftVillage.objects.all(),
        required=False,
    )
    village_name = serializers.CharField(source='village.village_name', read_only=True)
    artisan = serializers.PrimaryKeyRelatedField(
        queryset=ArtisanProfile.objects.all(),
        required=False,
        allow_null=True,
    )
    artisan_name = serializers.CharField(source='artisan.display_name', read_only=True, default='')
    title = serializers.CharField(max_length=200, required=True)
    slug = serializers.SlugField(max_length=220, required=False, allow_blank=True)
    summary = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    content = serializers.CharField(required=True)
    cover_image_url = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(
        choices=CraftStory.StoryStatus.choices,
        default=CraftStory.StoryStatus.DRAFT,
    )
    published_at = serializers.DateTimeField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = CraftStory
        fields = [
            'story_id',
            'village',
            'village_name',
            'artisan',
            'artisan_name',
            'title',
            'slug',
            'summary',
            'content',
            'cover_image_url',
            'status',
            'published_at',
            'created_at',
            'updated_at',
        ]

    def validate_title(self, value):
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise serializers.ValidationError('Tiêu đề câu chuyện phải có ít nhất 3 ký tự.')
        return cleaned

    def validate_content(self, value):
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise serializers.ValidationError('Nội dung câu chuyện phải có ít nhất 10 ký tự.')
        return cleaned

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        # 1. Resolve village
        village = attrs.get('village') or (self.instance.village if self.instance else None)

        # 2. Validate artisan village association
        artisan = attrs.get('artisan') or (self.instance.artisan if self.instance else None)
        if artisan and village and artisan.village_id != village.village_id:
            raise serializers.ValidationError({
                'artisan': 'Nghệ nhân được chọn phải thuộc về cùng làng nghề sở hữu câu chuyện.'
            })

        # 3. Role-based status transition restrictions
        if user and user.is_authenticated and not user_has_role(user, 'ADMIN'):
            target_status = attrs.get('status') or (self.instance.status if self.instance else None)
            if attrs.get('status') in [CraftStory.StoryStatus.APPROVED, CraftStory.StoryStatus.REJECTED]:
                raise serializers.ValidationError({
                    'status': 'Quản lý làng nghề không được phép tự duyệt (APPROVED) hoặc từ chối (REJECTED) câu chuyện. Chỉ có Admin mới có thẩm quyền này.'
                })

            if self.instance:
                current_status = self.instance.status
                # If currently PENDING review
                if current_status == CraftStory.StoryStatus.PENDING:
                    # Allow withdrawing to DRAFT only
                    if target_status != CraftStory.StoryStatus.DRAFT:
                        raise serializers.ValidationError({
                            'status': 'Câu chuyện đang chờ Admin duyệt (PENDING). Vui lòng rút về bản nháp (DRAFT) trước khi chỉnh sửa.'
                        })

                # If currently APPROVED, editing content requires re-review (status -> PENDING) unless setting to HIDDEN
                elif current_status == CraftStory.StoryStatus.APPROVED:
                    if target_status == CraftStory.StoryStatus.HIDDEN:
                        pass
                    elif target_status in [CraftStory.StoryStatus.APPROVED, None]:
                        # Check if core fields were modified
                        changed_content = any([
                            attrs.get('title') and attrs.get('title') != self.instance.title,
                            attrs.get('content') and attrs.get('content') != self.instance.content,
                            attrs.get('summary') and attrs.get('summary') != self.instance.summary,
                            attrs.get('cover_image_url') and attrs.get('cover_image_url') != self.instance.cover_image_url,
                            attrs.get('artisan') and attrs.get('artisan') != self.instance.artisan,
                        ])
                        if changed_content:
                            # Automatically move to PENDING so Admin reviews the edited text
                            attrs['status'] = CraftStory.StoryStatus.PENDING

        # 4. Auto-slug generation or validation
        slug = attrs.get('slug')
        title = attrs.get('title') or (self.instance.title if self.instance else '')
        if not slug:
            if not self.instance or (self.instance and not self.instance.slug):
                base_slug = slugify(title) or 'cau-chuyen'
                unique_suffix = uuid.uuid4().hex[:6]
                candidate_slug = f"{base_slug[:190]}-{unique_suffix}"
                while CraftStory.objects.filter(slug=candidate_slug).exists():
                    unique_suffix = uuid.uuid4().hex[:6]
                    candidate_slug = f"{base_slug[:190]}-{unique_suffix}"
                attrs['slug'] = candidate_slug
        else:
            qs = CraftStory.objects.filter(slug=slug)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'slug': 'Đường dẫn (slug) này đã tồn tại, vui lòng chọn đường dẫn khác.'
                })

        # 5. Set published_at if transitioning to APPROVED
        if attrs.get('status') == CraftStory.StoryStatus.APPROVED:
            if not self.instance or not self.instance.published_at:
                attrs['published_at'] = timezone.now()

        return attrs
