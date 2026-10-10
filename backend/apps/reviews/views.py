from rest_framework import generics, permissions, status
from apps.common.responses import api_success, api_error
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer


class ReviewListCreateView(generics.GenericAPIView):
    """
    GET /api/v1/reviews/ - List reviews for product or booking
    POST /api/v1/reviews/ - Create review (authenticated)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request):
        qs = Review.objects.filter(status=Review.ReviewStatus.VISIBLE).select_related('user')
        product_id = request.query_params.get('product_id')
        if product_id:
            qs = qs.filter(product_id=product_id)
        booking_id = request.query_params.get('booking_id')
        if booking_id:
            qs = qs.filter(booking_id=booking_id)

        serializer = ReviewSerializer(qs.order_by('-created_at'), many=True)
        return api_success(data=serializer.data, message="Lấy danh sách đánh giá thành công")

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return api_success(
            data=ReviewSerializer(review).data,
            message="Gửi đánh giá thành công!",
            status_code=status.HTTP_201_CREATED
        )
