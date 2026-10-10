from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from apps.villages.models import CraftVillage
from apps.workshops.models import Workshop
from apps.products.models import Product
from .models import ChatSession, ChatMessage, KnowledgeSource, KnowledgeChunk
from .serializers import ChatSessionSerializer, ChatMessageSerializer, ChatbotQuerySerializer


class ChatbotQueryView(generics.GenericAPIView):
    """
    POST /api/v1/chatbot/query/
    RAG-grounded craft assistant answering questions on craft villages, workshops, and products.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChatbotQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data['message'].strip()
        session_id = serializer.validated_data.get('session_id')

        # Get or create chat session
        chat_session = None
        user = request.user if request.user.is_authenticated else None
        if session_id:
            chat_session = ChatSession.objects.filter(pk=session_id).first()

        if not chat_session:
            title = user_message[:40] + ('...' if len(user_message) > 40 else '')
            chat_session = ChatSession.objects.create(
                user=user,
                session_title=title,
                status=ChatSession.SessionStatus.ACTIVE
            )

        # Record user message
        ChatMessage.objects.create(
            chat_session=chat_session,
            sender_type=ChatMessage.SenderType.USER,
            message_content=user_message,
        )

        # Retrieval-Augmented Grounding: search KnowledgeChunk
        keywords = [k.lower() for k in user_message.split() if len(k) > 2]
        relevant_chunks = []
        for kw in keywords:
            chunks = KnowledgeChunk.objects.filter(
                chunk_content__icontains=kw,
                knowledge_source__status=KnowledgeSource.KnowledgeStatus.APPROVED
            ).select_related('knowledge_source')[:2]
            for c in chunks:
                if c not in relevant_chunks:
                    relevant_chunks.append(c)

        # Also search CraftVillages / Workshops / Products
        matched_villages = CraftVillage.objects.filter(
            village_name__icontains=user_message[:20]
        )[:2] if len(user_message) >= 4 else []

        # Generate response grounded in retrieved data
        sources_used = []
        if relevant_chunks:
            chunk_texts = [f"- {c.knowledge_source.source_title}: {c.chunk_content[:200]}" for c in relevant_chunks[:2]]
            sources_used = [c.knowledge_source.source_title for c in relevant_chunks[:2]]
            bot_reply = (
                f"Dựa trên tư liệu văn hóa làng nghề của LocalCraft:\n\n"
                f"{relevant_chunks[0].chunk_content}\n\n"
                f"Bạn có muốn khám phá thêm sản phẩm hoặc đặt workshop trải nghiệm tại làng nghề này không?"
            )
        else:
            # Fallback search villages/workshops
            workshops = Workshop.objects.filter(status=Workshop.WorkshopStatus.APPROVED)[:2]
            bot_reply = (
                f"Chào bạn, tôi là trợ lý di sản LocalCraft. Bạn đang tìm hiểu về '{user_message}'. "
                f"Hiện tại LocalCraft đang kết nối các làng nghề truyền thống như Bát Tràng (Hà Nội), "
                f"Làng Hương Thủy Xuân (Huế), Làng Lụa Vạn Phúc (Hà Đông). "
                f"Bạn có thể tự tay tham gia các workshop thủ công do nghệ nhân gạo cội hướng dẫn!"
            )

        # Save assistant message
        bot_msg = ChatMessage.objects.create(
            chat_session=chat_session,
            sender_type=ChatMessage.SenderType.ASSISTANT,
            message_content=bot_reply,
            metadata={'sources': sources_used} if sources_used else None,
        )

        return api_success(
            data={
                'session_id': chat_session.chat_session_id,
                'message': bot_reply,
                'sources': sources_used,
            },
            message="Phản hồi trợ lý AI thành công"
        )


class ChatSessionListView(generics.ListAPIView):
    """
    GET /api/v1/chatbot/sessions/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user).order_by('-updated_at')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return api_success(data=serializer.data, message="Lấy lịch sử hội thoại thành công")
