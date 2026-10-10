import { apiClient, ApiResponse } from './client';

export interface VillageDto {
  village_id: number;
  village_name: string;
  slug: string;
  description: string;
  province: string;
  district?: string;
  address?: string;
  cover_image_url?: string;
  status: string;
  artisan_count?: number;
  story_count?: number;
}

export interface ArtisanDto {
  artisan_id: number;
  user: number;
  user_full_name: string;
  user_email: string;
  user_avatar_url?: string;
  village?: number;
  village_name?: string;
  village_province?: string;
  display_name: string;
  bio: string;
  experience_years: number;
  verification_status: string;
  product_count?: number;
  workshop_count?: number;
}

export interface ProductDto {
  product_id: number;
  artisan: number;
  artisan_name: string;
  village_name: string;
  category: number;
  category_name: string;
  product_name: string;
  slug: string;
  description: string;
  base_price: string;
  cover_image_url?: string;
  status: string;
  images?: Array<{ product_image_id: number; image_url: string; is_primary: boolean }>;
  variants?: Array<{
    variant_id: number;
    sku: string;
    variant_name: string;
    price: string;
    sellable_quantity: number;
  }>;
}

export interface WorkshopSessionDto {
  session_id: number;
  workshop: number;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_participants: number;
  price_per_person: string;
  status: string;
  remaining_seats: number;
}

export interface WorkshopDto {
  workshop_id: number;
  artisan: number;
  artisan_name: string;
  village_name: string;
  category_name: string;
  workshop_name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  price_per_person: string;
  min_participants: number;
  location_address: string;
  cover_image_url?: string;
  status: string;
  sessions?: WorkshopSessionDto[];
}

export interface CraftStoryDto {
  story_id: number;
  village: number;
  village_name: string;
  artisan_name: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url?: string;
}

export const discoveryApi = {
  getVillages: async (params?: { province?: string; search?: string }): Promise<ApiResponse<VillageDto[]>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient(`/villages/${query ? `?${query}` : ''}`, { requiresAuth: false });
  },

  getVillageDetail: async (idOrSlug: string | number): Promise<ApiResponse<VillageDto>> => {
    const endpoint = typeof idOrSlug === 'number' || !isNaN(Number(idOrSlug))
      ? `/villages/${idOrSlug}/`
      : `/villages/slug/${idOrSlug}/`;
    return apiClient(endpoint, { requiresAuth: false });
  },

  getArtisans: async (params?: { village_id?: number; search?: string }): Promise<ApiResponse<ArtisanDto[]>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient(`/artisans/${query ? `?${query}` : ''}`, { requiresAuth: false });
  },

  getArtisanDetail: async (id: number): Promise<ApiResponse<ArtisanDto>> => {
    return apiClient(`/artisans/${id}/`, { requiresAuth: false });
  },

  getProducts: async (params?: {
    category?: string;
    search?: string;
    village_id?: number;
    sort?: string;
  }): Promise<ApiResponse<ProductDto[]>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient(`/products/${query ? `?${query}` : ''}`, { requiresAuth: false });
  },

  getProductDetail: async (id: number): Promise<ApiResponse<ProductDto>> => {
    return apiClient(`/products/${id}/`, { requiresAuth: false });
  },

  getWorkshops: async (params?: { search?: string; village_id?: number }): Promise<ApiResponse<WorkshopDto[]>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiClient(`/workshops/${query ? `?${query}` : ''}`, { requiresAuth: false });
  },

  getWorkshopDetail: async (id: number): Promise<ApiResponse<WorkshopDto>> => {
    return apiClient(`/workshops/${id}/`, { requiresAuth: false });
  },

  getWorkshopSessions: async (workshopId: number): Promise<ApiResponse<WorkshopSessionDto[]>> => {
    return apiClient(`/workshops/${workshopId}/sessions/`, { requiresAuth: false });
  },

  getStories: async (): Promise<ApiResponse<CraftStoryDto[]>> => {
    return apiClient('/stories/', { requiresAuth: false });
  },
};
