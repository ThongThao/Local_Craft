import { apiClient, ApiResponse } from './client';

export type StoryStatusType = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface HeritageStoryDto {
  story_id: number;
  village: number;
  village_name: string;
  artisan?: number | null;
  artisan_name?: string | null;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  cover_image_url?: string | null;
  status: StoryStatusType;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryQueryParams {
  village_id?: number;
  artisan_id?: number;
  status?: string;
  search?: string;
}

export interface StoryPayload {
  title: string;
  content: string;
  summary?: string | null;
  cover_image_url?: string | null;
  artisan?: number | null;
  status?: StoryStatusType;
}

export interface CraftStorySummaryDto {
  total_stories: number;
  draft_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  hidden_count: number;
}

export const storiesApi = {
  getAll: async (params?: StoryQueryParams): Promise<ApiResponse<HeritageStoryDto[]>> => {
    const q = new URLSearchParams();
    if (params?.village_id) q.append('village_id', String(params.village_id));
    if (params?.artisan_id) q.append('artisan_id', String(params.artisan_id));
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.search && params.search.trim()) q.append('search', params.search.trim());

    const qs = q.toString() ? `?${q.toString()}` : '';
    // Send requiresAuth: true so Village Manager context is authenticated
    return apiClient(`/stories/${qs}`, { requiresAuth: true });
  },

  getDetail: async (id: number): Promise<ApiResponse<HeritageStoryDto>> => {
    return apiClient(`/stories/${id}/`, { requiresAuth: true });
  },

  create: async (payload: StoryPayload): Promise<ApiResponse<HeritageStoryDto>> => {
    return apiClient('/stories/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  update: async (id: number, payload: Partial<StoryPayload>): Promise<ApiResponse<HeritageStoryDto>> => {
    return apiClient(`/stories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    return apiClient(`/stories/${id}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  submit: async (id: number): Promise<ApiResponse<HeritageStoryDto>> => {
    return apiClient(`/stories/${id}/submit/`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  getSummary: async (villageId?: number): Promise<ApiResponse<CraftStorySummaryDto>> => {
    const qs = villageId ? `?village_id=${villageId}` : '';
    return apiClient(`/stories/summary/${qs}`, { requiresAuth: true });
  },
};
