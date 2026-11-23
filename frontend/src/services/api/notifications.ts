import { apiClient, ApiResponse } from './client';

export interface NotificationDto {
  notification_id: number;
  user: number;
  notification_type: string;
  title: string;
  message: string;
  target_type?: string | null;
  target_id?: number | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationDto[];
  total_count: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface NotificationFilterParams {
  is_read?: boolean;
  limit?: number;
  offset?: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface ReadAllResponse {
  updated_count: number;
}

export const notificationsApi = {
  /**
   * Lấy danh sách thông báo phân trang và lọc theo trạng thái
   * GET /api/v1/notifications/?is_read=false&limit=20&offset=0
   */
  getAll: async (params?: NotificationFilterParams): Promise<ApiResponse<NotificationListResponse>> => {
    const searchParams = new URLSearchParams();
    if (params?.is_read !== undefined) {
      searchParams.set('is_read', String(params.is_read));
    }
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit));
    }
    if (params?.offset !== undefined) {
      searchParams.set('offset', String(params.offset));
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/notifications/?${queryString}` : '/notifications/';

    return apiClient(endpoint, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Lấy nhanh số lượng thông báo chưa đọc cho badge trên Topbar
   * GET /api/v1/notifications/unread-count/
   */
  getUnreadCount: async (): Promise<ApiResponse<UnreadCountResponse>> => {
    return apiClient('/notifications/unread-count/', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   * POST /api/v1/notifications/<id>/read/
   */
  markAsRead: async (notificationId: number): Promise<ApiResponse<NotificationDto>> => {
    return apiClient(`/notifications/${notificationId}/read/`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Đánh dấu tất cả thông báo của người dùng là đã đọc
   * POST /api/v1/notifications/read-all/
   */
  markAllAsRead: async (): Promise<ApiResponse<ReadAllResponse>> => {
    return apiClient('/notifications/read-all/', {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Xóa một thông báo
   * DELETE /api/v1/notifications/<id>/
   */
  delete: async (notificationId: number): Promise<ApiResponse<null>> => {
    return apiClient(`/notifications/${notificationId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
