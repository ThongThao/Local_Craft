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
  product_id?: number;
  product_image?: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  sku_snapshot: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface PaymentBriefDto {
  payment_id: number;
  payment_code: string;
  payment_method: string;
  amount: string;
  currency: string;
  status: string;
  provider_transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

export interface RefundBriefDto {
  refund_id: number;
  refund_code: string;
  payment_id: number;
  amount_requested: string;
  amount_approved?: string;
  reason: string;
  admin_note?: string;
  status: string;
  requested_by_email?: string;
  requested_at: string;
  processed_at?: string;
}

export interface VendorOrderDto {
  vendor_order_id: number;
  vendor_order_code: string;
  order: number;
  order_id?: number;
  order_code?: string;
  village: number;
  village_name: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  parent_order_status?: string;
  parent_payment_status?: string;
  parent_subtotal?: string;
  parent_shipping_fee?: string;
  parent_discount_amount?: string;
  parent_total_amount?: string;
  order_placed_at?: string;
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
  payments?: PaymentBriefDto[];
  refunds?: RefundBriefDto[];
}

export interface VendorOrdersSummaryDto {
  total_orders: number;
  total_vendor_orders: number;
  total_parent_orders: number;
  total_items_quantity: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_subtotal: number;
  total_shipping_fee: number;
  total_discount_amount: number;
  total_order_amount: number;
  total_paid_amount: number;
  total_refunded_amount: number;
  net_realized_revenue: number;
  total_village_revenue: number;
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

export interface VendorOrderQueryParams {
  status?: string;
  payment_status?: string;
  search?: string;
  order_code?: string;
  from_date?: string;
  to_date?: string;
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

  getVendorOrders: async (params?: VendorOrderQueryParams): Promise<ApiResponse<VendorOrderDto[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.payment_status && params.payment_status !== 'ALL') searchParams.append('payment_status', params.payment_status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.order_code) searchParams.append('order_code', params.order_code);
    if (params?.from_date) searchParams.append('from_date', params.from_date);
    if (params?.to_date) searchParams.append('to_date', params.to_date);

    const qs = searchParams.toString();
    return apiClient(`/vendor-orders/${qs ? `?${qs}` : ''}`, { requiresAuth: true });
  },

  getVendorOrdersSummary: async (): Promise<ApiResponse<VendorOrdersSummaryDto>> => {
    return apiClient('/vendor-orders/summary/', { requiresAuth: true });
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
