import { apiClient, ApiResponse } from './client';

export interface ReviewDto {
  review_id: number;
  user: number;
  user_name: string;
  user_avatar?: string;
  user_email?: string;
  target_type: 'PRODUCT' | 'WORKSHOP';
  product?: number | null;
  product_name?: string | null;
  product_image?: string | null;
  booking?: number | null;
  booking_code?: string | null;
  workshop_id?: number | null;
  workshop_name?: string | null;
  workshop_image?: string | null;
  session_id?: number | null;
  session_start_at?: string | null;
  session_end_at?: string | null;
  rating: number;
  title?: string;
  content?: string;
  status: 'VISIBLE' | 'HIDDEN' | string;
  reply_content?: string | null;
  replied_by?: number | null;
  replied_by_name?: string | null;
  replied_at?: string | null;
  reply_updated_at?: string | null;
  is_replied?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ReviewDetailDto extends ReviewDto {
  village_id?: number | null;
  village_name?: string | null;
}

export interface ReviewSummaryDto {
  total_reviews: number;
  average_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
  product_reviews_count: number;
  workshop_reviews_count: number;
  visible_reviews_count: number;
  hidden_reviews_count: number;
  positive_percentage: number;
  replied_count: number;
  unreplied_count: number;
  has_reply_support: boolean;
}

export interface ReviewQueryParams {
  product_id?: number;
  booking_id?: number;
  village_id?: number;
  target_type?: 'PRODUCT' | 'WORKSHOP' | 'ALL';
  rating?: number | string;
  status?: 'VISIBLE' | 'HIDDEN' | 'ALL';
  reply_status?: 'REPLIED' | 'UNREPLIED' | 'ALL';
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedReviewsDto {
  items: ReviewDto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const reviewsApi = {
  /**
   * Get reviews list with filters.
   * Village managers will automatically receive reviews scoped to their managed village.
   */
  getAll: async (params?: ReviewQueryParams): Promise<ApiResponse<ReviewDto[]>> => {
    const q = new URLSearchParams();
    if (params?.product_id) q.append('product_id', String(params.product_id));
    if (params?.booking_id) q.append('booking_id', String(params.booking_id));
    if (params?.village_id) q.append('village_id', String(params.village_id));
    if (params?.target_type && params.target_type !== 'ALL') q.append('target_type', params.target_type);
    if (params?.rating && params.rating !== 'ALL') q.append('rating', String(params.rating));
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.reply_status && params.reply_status !== 'ALL') q.append('reply_status', params.reply_status);
    if (params?.search?.trim()) q.append('search', params.search.trim());
    if (params?.from_date) q.append('from_date', params.from_date);
    if (params?.to_date) q.append('to_date', params.to_date);

    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient(`/reviews/${qs}`, { requiresAuth: true });
  },

  /**
   * Get KPI summary of reviews for the managed village (database-aggregated).
   */
  getSummary: async (villageId?: number): Promise<ApiResponse<ReviewSummaryDto>> => {
    const qs = villageId ? `?village_id=${villageId}` : '';
    return apiClient(`/reviews/summary/${qs}`, { requiresAuth: true });
  },

  /**
   * Get single review detail with ownership verification.
   */
  getDetail: async (reviewId: number): Promise<ApiResponse<ReviewDetailDto>> => {
    return apiClient(`/reviews/${reviewId}/`, { requiresAuth: true });
  },

  /**
   * Send official craft village reply to a customer review.
   */
  reply: async (reviewId: number, content: string): Promise<ApiResponse<ReviewDetailDto>> => {
    return apiClient(`/reviews/${reviewId}/reply/`, {
      method: 'POST',
      body: JSON.stringify({ reply_content: content }),
      requiresAuth: true,
    });
  },

  /**
   * Create review for product or workshop booking.
   */
  create: async (payload: {
    product?: number;
    booking?: number;
    rating: number;
    title?: string;
    content?: string;
  }): Promise<ApiResponse<ReviewDto>> => {
    return apiClient('/reviews/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};
