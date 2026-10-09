from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    """
    Table 25: chat_sessions
    Conversational sessions between visitors/users and AI craft assistant.
    """

    class SessionStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Đang hoạt động'
        CLOSED = 'CLOSED', 'Đã kết thúc'

    chat_session_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chat_sessions',
        db_column='user_id',
    )
    session_title = models.CharField(max_length=200, null=True, blank=True)
    session_key = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        verbose_name = 'Phiên trò chuyện AI'
        verbose_name_plural = 'Phiên trò chuyện AI'

    def __str__(self):
        return f'ChatSession {self.chat_session_id} - {self.session_title or "Không tên"}'


class ChatMessage(models.Model):
    """
    Table 26: chat_messages
    Individual messages within an AI conversation session.
    """

    class SenderType(models.TextChoices):
        USER = 'USER', 'Người dùng'
        ASSISTANT = 'ASSISTANT', 'Trợ lý AI'
        SYSTEM = 'SYSTEM', 'Hệ thống'

    chat_message_id = models.BigAutoField(primary_key=True)
    chat_session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        db_column='chat_session_id',
    )
    sender_type = models.CharField(max_length=20, choices=SenderType.choices)
    message_content = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        verbose_name = 'Tin nhắn chat'
        verbose_name_plural = 'Tin nhắn chat'
        indexes = [
            models.Index(
                fields=['chat_session', 'created_at'],
                name='idx_chat_msg_sess_time',
            ),
        ]

    def __str__(self):
        return f'{self.sender_type}: {self.message_content[:40]}...'


class KnowledgeSource(models.Model):
    """
    Table 27: knowledge_sources
    Approved cultural craft source materials for Retrieval-Augmented Generation (RAG).
    """

    class KnowledgeStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ duyệt'
        APPROVED = 'APPROVED', 'Đã duyệt'
        REJECTED = 'REJECTED', 'Từ chối'
        ARCHIVED = 'ARCHIVED', 'Lưu trữ'

    knowledge_source_id = models.BigAutoField(primary_key=True)
    source_title = models.CharField(max_length=250)
    source_type = models.CharField(max_length=30)
    source_url = models.CharField(max_length=500, null=True, blank=True)
    source_content = models.TextField(null=True, blank=True)
    related_village = models.ForeignKey(
        'villages.CraftVillage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_sources',
        db_column='related_village_id',
    )
    related_story = models.ForeignKey(
        'stories.CraftStory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_sources',
        db_column='related_story_id',
    )
    status = models.CharField(
        max_length=20,
        choices=KnowledgeStatus.choices,
        default=KnowledgeStatus.PENDING,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_knowledge_sources',
        db_column='approved_by',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_sources'
        verbose_name = 'Nguồn tri thức RAG'
        verbose_name_plural = 'Nguồn tri thức RAG'

    def __str__(self):
        return f'{self.source_title} ({self.status})'


class KnowledgeChunk(models.Model):
    """
    Table 28: knowledge_chunks
    Indexed text chunks derived from approved knowledge sources.
    """

    knowledge_chunk_id = models.BigAutoField(primary_key=True)
    knowledge_source = models.ForeignKey(
        KnowledgeSource,
        on_delete=models.CASCADE,
        related_name='chunks',
        db_column='knowledge_source_id',
    )
    chunk_index = models.IntegerField()
    chunk_content = models.TextField()
    embedding_ref = models.CharField(max_length=255, null=True, blank=True)
    token_count = models.IntegerField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_chunks'
        verbose_name = 'Phân đoạn tri thức RAG'
        verbose_name_plural = 'Phân đoạn tri thức RAG'
        constraints = [
            models.UniqueConstraint(
                fields=['knowledge_source', 'chunk_index'],
                name='uq_kchunks_source_index',
            ),
        ]
        indexes = [
            models.Index(
                fields=['knowledge_source', 'chunk_index'],
                name='idx_kchunks_source_index',
            ),
        ]

    def __str__(self):
        return f'{self.knowledge_source.source_title} [Chunk #{self.chunk_index}]'
