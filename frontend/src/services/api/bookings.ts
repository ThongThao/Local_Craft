import { apiClient, ApiResponse } from './client';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'EXPIRED';

export interface BookingPaymentDto {
  payment_id: number;
  payment_code: string;
  payment_method: string;
  amount: string;
  currency: string;
  status: string;
  provider_transaction_id?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface BookingDto {
  booking_id: number;
  booking_code: string;
  session: number;
  session_id?: number;
  session_capacity?: number;
  session_booked_participants?: number;
  session_remaining_seats?: number;
  session_status?: string;
  workshop_id?: number;
  workshop_name: string;
  workshop_image?: string;
  workshop_description?: string;
  workshop_duration_minutes?: number;
  village_id?: number;
  village_name?: string;
  artisan_name: string;
  start_at: string;
  end_at: string;
  location_address: string;
  user_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  participant_count: number;
  unit_price: string;
  total_amount: string;
  status: BookingStatus | string;
  special_request?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
  payment_info?: BookingPaymentDto | null;
}

export interface CreateBookingPayload {
  workshop_id?: number;
  session_id?: number;
  participant_count: number;
  special_request?: string;
}

export interface GetBookingsParams {
  status?: string;
  workshop_id?: number | string;
  search?: string;
  village_id?: number | string;
}

export const bookingsApi = {
  createBooking: async (payload: CreateBookingPayload): Promise<ApiResponse<BookingDto>> => {
    return apiClient('/bookings/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  getBookings: async (params?: GetBookingsParams): Promise<ApiResponse<BookingDto[]>> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.workshop_id && params.workshop_id !== 'ALL') query.append('workshop_id', String(params.workshop_id));
    if (params?.search?.trim()) query.append('search', params.search.trim());
    if (params?.village_id) query.append('village_id', String(params.village_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient(`/bookings/${qs}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  getMyBookings: async (params?: GetBookingsParams): Promise<ApiResponse<BookingDto[]>> => {
    return bookingsApi.getBookings(params);
  },

  getBookingDetail: async (id: number): Promise<ApiResponse<BookingDto>> => {
    return apiClient(`/bookings/${id}/`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  cancelBooking: async (id: number): Promise<ApiResponse<BookingDto>> => {
    return apiClient(`/bookings/${id}/cancel/`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  updateAttendance: async (
    id: number,
    status: 'COMPLETED' | 'NO_SHOW'
  ): Promise<ApiResponse<BookingDto>> => {
    return apiClient(`/bookings/${id}/attendance/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
      requiresAuth: true,
    });
  },
};


