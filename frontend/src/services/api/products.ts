import { apiClient, ApiResponse } from './client';

export type ProductStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
export type BusinessState = 'SELLING' | 'OUT_OF_STOCK' | 'NOT_READY' | 'HIDDEN';

export interface ProductImageDto {
  image_id: number;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariantDto {
  variant_id: number;
  product_id?: number;
  sku: string;
  variant_name: string;
  color?: string;
  size?: string;
  attributes?: Record<string, any>;
  price: number | string;
  weight_gram?: number;
  is_active: boolean;
  quantity?: number;
  reserved_quantity?: number;
  sellable_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVariantPayload {
  sku: string;
  variant_name: string;
  color?: string;
  size?: string;
  attributes?: Record<string, any>;
  price: number | string;
  weight_gram?: number;
  is_active?: boolean;
  initial_quantity?: number;
}

export interface UpdateVariantPayload {
  sku?: string;
  variant_name?: string;
  color?: string;
  size?: string;
  attributes?: Record<string, any>;
  price?: number | string;
  weight_gram?: number;
  is_active?: boolean;
}

export interface VillageProductDto {
  product_id: number;
  village: number;
  village_name?: string;
  artisan?: number | null;
  artisan_name?: string;
  artisan_avatar_url?: string | null;
  category: number;
  category_name?: string;
  product_name: string;
  slug: string;
  description: string;
  base_price: number | string;
  cover_image_url?: string;
  status: ProductStatus;
  business_state: BusinessState;
  moderation_note?: string;
  images?: ProductImageDto[];
  variants?: ProductVariantDto[];
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductDto = VillageProductDto;

export interface ProductSummaryDto {
  total: number;
  selling: number;
  out_of_stock: number;
  not_ready: number;
  pending: number;
  rejected: number;
  draft: number;
  hidden: number;
  approved: number;
}

export interface CategoryDto {
  category_id: number;
  category_name: string;
  slug: string;
  description?: string;
  status: string;
}

export interface ProductFilterParams {
  search?: string;
  status?: string;
  business_state?: string;
  category_id?: number | string;
  artisan_id?: number | string;
  sort?: string;
  min_price?: number | string;
  max_price?: number | string;
}

export const productsApi = {
  // Get all products (scoped automatically on backend by request.user.managed_village)
  getAll: async (params?: ProductFilterParams): Promise<ApiResponse<ProductDto[]>> => {
    const cleanParams: Record<string, string> = {};
    if (params?.search) cleanParams.search = params.search;
    if (params?.status && params.status !== 'ALL') cleanParams.status = params.status;
    if (params?.business_state && params.business_state !== 'ALL') cleanParams.business_state = params.business_state;
    if (params?.category_id && params.category_id !== 'ALL') cleanParams.category_id = String(params.category_id);
    if (params?.artisan_id && params.artisan_id !== 'ALL') cleanParams.artisan_id = String(params.artisan_id);
    if (params?.sort) cleanParams.sort = params.sort;
    if (params?.min_price) cleanParams.min_price = String(params.min_price);
    if (params?.max_price) cleanParams.max_price = String(params.max_price);

    const query = new URLSearchParams(cleanParams).toString();
    return apiClient(`/products/${query ? `?${query}` : ''}`, { requiresAuth: true });
  },

  // Get summary KPI stats
  getSummary: async (): Promise<ApiResponse<ProductSummaryDto>> => {
    return apiClient('/products/summary/', { requiresAuth: true });
  },

  // Get active product categories
  getCategories: async (): Promise<ApiResponse<CategoryDto[]>> => {
    return apiClient('/products/categories/', { requiresAuth: false });
  },

  // Get product detail
  getById: async (id: number): Promise<ApiResponse<ProductDto>> => {
    return apiClient(`/products/${id}/`, { requiresAuth: true });
  },

  // Create new product (requires CRAFT_VILLAGE or ADMIN auth)
  create: async (payload: Partial<ProductDto>): Promise<ApiResponse<ProductDto>> => {
    return apiClient('/products/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Update product (PATCH)
  update: async (id: number, payload: Partial<ProductDto>): Promise<ApiResponse<ProductDto>> => {
    return apiClient(`/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Delete product (archive to HIDDEN if order items exist, or delete)
  delete: async (id: number): Promise<ApiResponse<{ product_id?: number; status?: string } | null>> => {
    return apiClient(`/products/${id}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // Get variants of a product
  getVariants: async (productId: number): Promise<ApiResponse<ProductVariantDto[]>> => {
    return apiClient(`/products/${productId}/variants/`, { requiresAuth: true });
  },

  // Create new variant for a product
  createVariant: async (productId: number, payload: CreateVariantPayload): Promise<ApiResponse<ProductVariantDto>> => {
    return apiClient(`/products/${productId}/variants/`, {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Update variant information
  updateVariant: async (variantId: number, payload: UpdateVariantPayload): Promise<ApiResponse<ProductVariantDto>> => {
    return apiClient(`/products/variants/${variantId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  // Update inventory quantity of a variant
  updateInventory: async (variantId: number, quantity: number): Promise<ApiResponse<ProductVariantDto>> => {
    return apiClient(`/products/variants/${variantId}/inventory/`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
      requiresAuth: true,
    });
  },

  // Delete variant (or deactivate if order history exists)
  deleteVariant: async (variantId: number): Promise<ApiResponse<{ variant_id?: number; is_active?: boolean } | null>> => {
    return apiClient(`/products/variants/${variantId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
