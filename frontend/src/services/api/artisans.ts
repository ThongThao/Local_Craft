import { apiClient, ApiResponse } from './client';
export { type ArtisanDto } from './discovery';
import { ArtisanDto } from './discovery';

export interface CreateArtisanPayload {
  village?: number;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  experience_years: number;
}

export interface UpdateArtisanPayload extends Partial<CreateArtisanPayload> {
  verification_status?: string;
}

export const artisansApi = {
  // Get all artisans with filter
  getAll: async (params?: {
    village_id?: number;
    search?: string;
    verification_status?: string;
  }): Promise<ApiResponse<ArtisanDto[]>> => {
    const cleanParams: Record<string, string> = {};
    if (params?.village_id) cleanParams.village_id = String(params.village_id);
    if (params?.search) cleanParams.search = params.search;
    if (params?.verification_status) cleanParams.verification_status = params.verification_status;
    const query = new URLSearchParams(cleanParams).toString();
    return apiClient(`/artisans/${query ? `?${query}` : ''}`, { requiresAuth: true });
  },

  // Get artisan detail by id
  getById: async (id: number): Promise<ApiResponse<ArtisanDto>> => {
    return apiClient(`/artisans/${id}/`, { requiresAuth: true });
  },

  // Create new artisan (requires CRAFT_VILLAGE or ADMIN auth)
  create: async (payload: CreateArtisanPayload): Promise<ApiResponse<ArtisanDto>> => {
    return apiClient('/artisans/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Update artisan
  update: async (id: number, payload: UpdateArtisanPayload): Promise<ApiResponse<ArtisanDto>> => {
    return apiClient(`/artisans/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Delete artisan
  delete: async (id: number): Promise<ApiResponse<null>> => {
    return apiClient(`/artisans/${id}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
