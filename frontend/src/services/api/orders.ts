import { apiClient, ApiResponse } from './client';

export interface CartItemDto {
  cart_item_id: number;
  variant: number;
  variant_name: string;
  product_name: string;
  product_image?: string;
  price: string;
  quantity: number;
  line_total: string;
  updated_at: string;
}

export interface CartDto {
  cart_id: number;
  items: CartItemDto[];
  total_items: number;
  total_amount: string;
  updated_at: string;
}

export interface OrderItemDto {
  order_item_id: number;
  variant: number;
  vendor_order_id?: number;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  sku_snapshot: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface VendorOrderDto {
  vendor_order_id: number;
  vendor_order_code: string;
  order: number;
  village: number;
  village_name: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  status: string;
  payment_status: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_note?: string;
  tracking_code?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItemDto[];
}

export interface OrderDto {
  order_id: number;
  order_code: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_note?: string;
  status: string;
  payment_status: string;
  items: OrderItemDto[];
  vendor_orders?: VendorOrderDto[];
  created_at: string;
}

export interface CreateOrderPayload {
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_note?: string;
}

export const ordersApi = {
  getCart: async (): Promise<ApiResponse<CartDto>> => {
    return apiClient('/cart/', { requiresAuth: true });
  },

  addToCart: async (payload: { variant_id?: number; product_id?: number; quantity?: number }): Promise<ApiResponse<CartDto>> => {
    return apiClient('/cart/items/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  updateCartItem: async (itemId: number, quantity: number): Promise<ApiResponse<CartDto>> => {
    return apiClient(`/cart/items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
      requiresAuth: true,
    });
  },

  removeCartItem: async (itemId: number): Promise<ApiResponse<CartDto>> => {
    return apiClient(`/cart/items/${itemId}/`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  createOrder: async (payload: CreateOrderPayload): Promise<ApiResponse<OrderDto>> => {
    return apiClient('/orders/', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },

  getMyOrders: async (): Promise<ApiResponse<OrderDto[]>> => {
    return apiClient('/orders/', { requiresAuth: true });
  },

  getOrderDetail: async (id: number): Promise<ApiResponse<OrderDto>> => {
    return apiClient(`/orders/${id}/`, { requiresAuth: true });
  },

  getVendorOrders: async (params?: { status?: string }): Promise<ApiResponse<VendorOrderDto[]>> => {
    const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return apiClient(`/vendor-orders/${qs}`, { requiresAuth: true });
  },

  getVendorOrderDetail: async (id: number): Promise<ApiResponse<VendorOrderDto>> => {
    return apiClient(`/vendor-orders/${id}/`, { requiresAuth: true });
  },

  updateVendorOrderStatus: async (id: number, payload: { status: string; tracking_code?: string }): Promise<ApiResponse<VendorOrderDto>> => {
    return apiClient(`/vendor-orders/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      requiresAuth: true,
    });
  },
};
