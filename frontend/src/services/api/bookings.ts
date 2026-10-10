import { apiClient, ApiResponse } from './client';

export interface BookingDto {
  booking_id: number;
  booking_code: string;
  session: number;
  workshop_name: string;
  workshop_image?: string;
  artisan_name: string;
  start_at: string;
  end_at: string;
  location_address: string;
  participant_count: number;
  unit_price: string;
  total_amount: string;
  status: string;
  special_request?: string;
  cancelled_at?: string;
  created_at: string;
}

export interface CreateBookingPayload {
  workshop_id?: number;
  session_id?: number;
  participant_count: number;
  special_request?: string;
}

export const bookingsApi = {
  createBooking: async (payload: CreateBookingPayload): Promise<ApiResponse<BookingDto>> => {
    return apiClient('/bookings/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  getMyBookings: async (): Promise<ApiResponse<BookingDto[]>> => {
    return apiClient('/bookings/', {
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
};
