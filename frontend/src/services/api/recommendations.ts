import { apiClient, ApiResponse } from './client';

export interface FavoriteItemDto {
  favorite_id: number;
  target_type: 'PRODUCT' | 'WORKSHOP' | 'VILLAGE' | 'STORY';
  target_id: number;
  target_data?: {
    title: string;
    image?: string;
    price?: string;
    province?: string;
  };
  created_at: string;
}

export interface RecommendationMatch {
  id: number;
  type: string;
  title: string;
  artisan: string;
  village: string;
  location: string;
  price: number;
  formatted_price: string;
  image: string;
  match_score: number;
  match_label: string;
  reason: string;
}

export interface RecommendationResponse {
  query: string;
  matches: RecommendationMatch[];
  total_matches: number;
}

export interface UserPreferencesDto {
  preference_id?: number;
  preferred_categories?: string[];
  preferred_activities?: string[];
  preferred_provinces?: string[];
  min_budget?: string;
  max_budget?: string;
  preferred_language?: string;
}

export const recommendationsApi = {
  getFavorites: async (targetType?: string): Promise<ApiResponse<FavoriteItemDto[]>> => {
    const query = targetType ? `?target_type=${targetType}` : '';
    return apiClient(`/favorites/${query}`, { requiresAuth: true });
  },

  toggleFavorite: async (targetType: string, targetId: number): Promise<ApiResponse<{ is_favorite: boolean; favorite_id?: number }>> => {
    return apiClient('/favorites/', {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
      requiresAuth: true,
    });
  },

  queryRecommendations: async (payload: {
    query: string;
    min_budget?: number;
    max_budget?: number;
    location?: string;
  }): Promise<ApiResponse<RecommendationResponse>> => {
    return apiClient('/query/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  getUserPreferences: async (): Promise<ApiResponse<UserPreferencesDto>> => {
    return apiClient('/preferences/', { requiresAuth: true });
  },

  updateUserPreferences: async (payload: Partial<UserPreferencesDto>): Promise<ApiResponse<UserPreferencesDto>> => {
    return apiClient('/preferences/', {
      method: 'PUT',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};
