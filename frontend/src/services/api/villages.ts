import { apiClient, ApiResponse } from './client';
import { VillageDto } from './discovery';

export interface UpdateVillagePayload {
  village_name?: string;
  slug?: string;
  description?: string;
  province?: string;
  district?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  cover_image_url?: string;
  status?: string;
}

export const villagesApi = {
  /**
   * Lấy thông tin làng nghề của tài khoản đang đăng nhập (Vai trò CRAFT_VILLAGE)
   * GET /api/v1/villages/my-village/
   */
  getMyVillage: async (): Promise<ApiResponse<VillageDto>> => {
    return apiClient('/villages/my-village/', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Cập nhật thông tin làng nghề của tài khoản đang đăng nhập
   * PUT /api/v1/villages/my-village/
   */
  updateMyVillage: async (payload: UpdateVillagePayload): Promise<ApiResponse<VillageDto>> => {
    return apiClient('/villages/my-village/', {
      method: 'PUT',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  /**
   * Lấy chi tiết làng nghề theo ID
   * GET /api/v1/villages/<id>/
   */
  getById: async (id: number): Promise<ApiResponse<VillageDto>> => {
    return apiClient(`/villages/${id}/`, {
      method: 'GET',
      requiresAuth: false,
    });
  },

  /**
   * Cập nhật thông tin làng nghề theo ID (Dành cho Quản trị viên hoặc Quản lý được phân quyền)
   * PATCH /api/v1/villages/<id>/
   */
  update: async (id: number, payload: UpdateVillagePayload): Promise<ApiResponse<VillageDto>> => {
    return apiClient(`/villages/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};
