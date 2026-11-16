import { apiClient, ApiResponse } from './client';

export type WorkshopStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
export type SessionStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';

export interface SessionBookingDto {
  booking_id: number;
  booking_code: string;
  user: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  participant_count: number;
  unit_price: string;
  total_amount: string;
  status: string;
  special_request?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

export interface WorkshopSessionDto {
  session_id: number;
  workshop: number;
  workshop_name?: string;
  artisan_name?: string;
  village_id?: number;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_participants: number;
  price_per_person: string;
  status: SessionStatus | string;
  remaining_seats?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkshopSessionDetailDto extends WorkshopSessionDto {
  bookings: SessionBookingDto[];
}

export interface CreateSessionPayload {
  start_at: string;
  end_at: string;
  capacity: number;
  price_per_person?: number | string;
  status?: SessionStatus;
}

export type UpdateSessionPayload = Partial<CreateSessionPayload>;

export interface WorkshopItemDto {
  workshop_id: number;
  village: number;
  village_name: string;
  artisan?: number | null;
  artisan_name?: string | null;
  category?: number | null;
  category_name?: string;
  workshop_name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  price_per_person: string;
  min_participants: number;
  location_address: string;
  cover_image_url?: string | null;
  status: WorkshopStatus;
  sessions_count?: number;
  next_session_date?: string | null;
  total_booked_participants?: number;
  sessions?: WorkshopSessionDto[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkshopPayload {

  workshop_name: string;
  category?: number | null;
  artisan?: number | null;
  description: string;
  duration_minutes: number;
  price_per_person: number | string;
  min_participants: number;
  location_address: string;
  cover_image_url?: string | null;
  status?: WorkshopStatus;
  slug?: string;
}

export type UpdateWorkshopPayload = Partial<CreateWorkshopPayload>;

export interface WorkshopFilterParams {
  search?: string;
  status?: string;
  artisan_id?: number;
  min_price?: number;
  max_price?: number;
}

export interface CancelSessionResponseData {
  session_id: number;
  status: SessionStatus;
  affected_bookings: number;
  released_seats: number;
  notifications_created: number;
}

export interface RescheduleSessionPayload {
  new_start_at: string;
  new_end_at: string;
  reason?: string;
}

export interface RescheduleSessionResponseData {
  session_id: number;
  workshop_name: string;
  old_start_at: string;
  old_end_at: string;
  new_start_at: string;
  new_end_at: string;
  booked_participants: number;
  affected_bookings_count: number;
  notifications_created: number;
}

export interface WorkshopSummaryDto {
  overview: {
    total_workshops: number;
    active_workshops: number;
    total_sessions: number;
    upcoming_sessions: number;
    completed_sessions: number;
    cancelled_sessions: number;
  };
  bookings: {
    total_bookings: number;
    total_participants: number;
    pending: number;
    confirmed: number;
    completed: number;
    no_show: number;
    cancelled: number;
  };
  attendance: {
    completed_bookings: number;
    no_show_bookings: number;
    attended_participants: number;
    no_show_participants: number;
    attendance_rate: number;
    booking_completion_rate: number;
  };
  revenue: {
    total_booking_value: number;
    successful_payments_amount: number;
    successful_refunds_amount: number;
    net_realized_revenue: number;
  };
  filter: {
    time_range: string;
    from_date?: string | null;
    to_date?: string | null;
    workshop_id?: number | null;
  };
}

export const workshopsApi = {
  /**
   * F05.11: Lấy thống kê và KPI tổng hợp hoạt động workshop từ database
   */
  getSummary: async (params?: {
    time_range?: string;
    from_date?: string;
    to_date?: string;
    workshop_id?: number;
    village_id?: number;
  }): Promise<ApiResponse<WorkshopSummaryDto>> => {
    const query = new URLSearchParams();
    if (params?.time_range) query.append('time_range', params.time_range);
    if (params?.from_date) query.append('from_date', params.from_date);
    if (params?.to_date) query.append('to_date', params.to_date);
    if (params?.workshop_id) query.append('workshop_id', String(params.workshop_id));
    if (params?.village_id) query.append('village_id', String(params.village_id));

    const qs = query.toString();
    return apiClient(`/workshops/summary/${qs ? `?${qs}` : ''}`, { requiresAuth: true });
  },
  /**
   * Lấy danh sách workshop (kèm JWT để backend tự scope theo làng nghề của Manager)
   */
  getAll: async (params?: WorkshopFilterParams): Promise<ApiResponse<WorkshopItemDto[]>> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.artisan_id) query.append('artisan_id', String(params.artisan_id));
    if (params?.min_price) query.append('min_price', String(params.min_price));
    if (params?.max_price) query.append('max_price', String(params.max_price));

    const qs = query.toString();
    return apiClient(`/workshops/${qs ? `?${qs}` : ''}`, { requiresAuth: true });
  },

  /**
   * Chi tiết workshop
   */
  getDetail: async (id: number): Promise<ApiResponse<WorkshopItemDto>> => {
    return apiClient(`/workshops/${id}/`, { requiresAuth: true });
  },

  /**
   * Tạo workshop mới (V09)
   */
  create: async (
    data: CreateWorkshopPayload | Partial<WorkshopItemDto>
  ): Promise<ApiResponse<WorkshopItemDto>> => {
    return apiClient('/workshops/', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * Cập nhật workshop (V09)
   */
  update: async (
    id: number,
    data: UpdateWorkshopPayload | Partial<WorkshopItemDto>
  ): Promise<ApiResponse<WorkshopItemDto>> => {
    return apiClient(`/workshops/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * Xóa workshop (nếu backend hỗ trợ)
   */
  delete: async (id: number): Promise<ApiResponse<{ message?: string }>> => {
    return apiClient(`/workshops/${id}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * V10: Lấy danh sách phiên workshop (sessions)
   */
  getSessions: async (
    workshopId: number,
    status?: string
  ): Promise<ApiResponse<WorkshopSessionDto[]>> => {
    const qs = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient(`/workshops/${workshopId}/sessions/${qs}`, { requiresAuth: true });
  },

  /**
   * V10: Lấy chi tiết buổi workshop kèm danh sách booking
   */
  getSessionDetail: async (
    sessionId: number
  ): Promise<ApiResponse<WorkshopSessionDetailDto>> => {
    return apiClient(`/workshops/sessions/${sessionId}/`, { requiresAuth: true });
  },

  /**
   * V10: Tạo phiên workshop mới
   */
  createSession: async (
    workshopId: number,
    data: CreateSessionPayload
  ): Promise<ApiResponse<WorkshopSessionDto>> => {
    return apiClient(`/workshops/${workshopId}/sessions/`, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * V10: Cập nhật phiên workshop (ngày giờ, sức chứa, giá vé, trạng thái)
   */
  updateSession: async (
    sessionId: number,
    data: UpdateSessionPayload
  ): Promise<ApiResponse<WorkshopSessionDto>> => {
    return apiClient(`/workshops/sessions/${sessionId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * V10 / F05.10: Hủy phiên workshop, giải phóng chỗ và gửi thông báo khách hàng
   */
  cancelSession: async (
    sessionId: number
  ): Promise<ApiResponse<CancelSessionResponseData>> => {
    return apiClient(`/workshops/sessions/${sessionId}/cancel/`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * F05.12: Đổi lịch phiên workshop, bảo toàn booking và gửi thông báo du khách
   */
  rescheduleSession: async (
    sessionId: number,
    data: RescheduleSessionPayload
  ): Promise<ApiResponse<RescheduleSessionResponseData>> => {
    return apiClient(`/workshops/sessions/${sessionId}/reschedule/`, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  /**
   * V10: Xóa phiên workshop (chỉ khi chưa có booking)
   */
  deleteSession: async (
    sessionId: number
  ): Promise<ApiResponse<{ message?: string }>> => {
    return apiClient(`/workshops/sessions/${sessionId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

