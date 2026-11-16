import { apiClient, ApiResponse } from './client';

export interface HeritageStoryDto {
  story_id: number;
  village: number;
  village_name: string;
  artisan?: number | null;
  artisan_name?: string | null;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url?: string;
  status: string;
  published_at?: string;
  created_at: string;
}

export interface StoryQueryParams {
  village_id?: number;
  artisan_id?: number;
}

export const storiesApi = {
  getAll: async (params?: StoryQueryParams): Promise<ApiResponse<HeritageStoryDto[]>> => {
    const q = new URLSearchParams();
    if (params?.village_id) q.append('village_id', String(params.village_id));
    if (params?.artisan_id) q.append('artisan_id', String(params.artisan_id));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient(`/stories/${qs}`, { requiresAuth: false });
  },

  create: async (payload: Partial<HeritageStoryDto>): Promise<ApiResponse<HeritageStoryDto>> => {
    return apiClient('/stories/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};
