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

export const notificationsApi = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại
   * GET /api/v1/notifications/
   */
  getAll: async (): Promise<ApiResponse<NotificationDto[]>> => {
    return apiClient('/notifications/', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Đánh dấu thông báo đã đọc
   * POST /api/v1/notifications/<id>/read/
   */
  markAsRead: async (notificationId: number): Promise<ApiResponse<NotificationDto>> => {
    return apiClient(`/notifications/${notificationId}/read/`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

