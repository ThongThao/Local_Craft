import { apiClient, ApiResponse } from './client';

export type AnalyticsTimeRange =
  | 'TODAY'
  | '7_DAYS'
  | '30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface GrowthRatesDto {
  revenue_growth: number | null;
  orders_growth: number | null;
  bookings_growth: number | null;
  participants_growth: number | null;
}

export interface ActivityKpisDto {
  net_revenue: number;
  product_gross_revenue: number;
  workshop_gross_revenue: number;
  total_orders: number;
  total_items_sold: number;
  total_bookings: number;
  attended_participants: number;
  total_registered_participants: number;
  attendance_rate: number;
  completion_rate: number;
  growth: GrowthRatesDto;
}

export interface RevenueBreakdownDto {
  net_revenue: number;
  total_gross_revenue: number;
  total_refunds: number;
  product_gross_revenue: number;
  product_subtotal: number;
  product_shipping_fee: number;
  product_discount_amount: number;
  product_refunds: number;
  net_product_revenue: number;
  workshop_gross_revenue: number;
  workshop_refunds: number;
  net_workshop_revenue: number;
}

export interface OrdersSummaryDto {
  total_orders: number;
  total_items_sold: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  completed: number;
  cancelled: number;
}

export interface BookingsSummaryDto {
  total_bookings: number;
  total_registered_participants: number;
  attended_participants: number;
  no_show_participants: number;
  attendance_rate: number;
  completion_rate: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  expired: number;
}

export interface ProductsSnapshotDto {
  total: number;
  selling: number;
  out_of_stock: number;
  low_stock: number;
  not_ready: number;
  approved: number;
  pending: number;
  draft: number;
  rejected: number;
  hidden: number;
}

export interface WorkshopsSnapshotDto {
  total: number;
  active: number;
  pending: number;
  draft: number;
  total_sessions: number;
  upcoming_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
}

export interface TopProductDto {
  rank: number;
  product_id: number;
  product_name: string;
  cover_image_url?: string | null;
  category_name?: string | null;
  total_sold: number;
  total_revenue: number;
}

export interface TopWorkshopDto {
  rank: number;
  workshop_id: number;
  workshop_name: string;
  cover_image_url?: string | null;
  artisan_name?: string | null;
  price_per_person: number;
  total_bookings: number;
  total_participants: number;
  total_revenue: number;
}

export interface ChartPointDto {
  period: string;
  label: string;
  product_revenue: number;
  workshop_revenue: number;
  total_revenue: number;
  orders_count: number;
  bookings_count: number;
}

export interface ActivityFilterDto {
  time_range: AnalyticsTimeRange;
  from_date: string;
  to_date: string;
  comparison_from_date?: string;
  comparison_to_date?: string;
}

export interface VillageActivityDashboardDto {
  village: {
    village_id: number;
    village_name: string;
    province: string;
  };
  filter: ActivityFilterDto;
  kpis: ActivityKpisDto;
  revenue_breakdown: RevenueBreakdownDto;
  orders_summary: OrdersSummaryDto;
  bookings_summary: BookingsSummaryDto;
  products_snapshot: ProductsSnapshotDto;
  workshops_snapshot: WorkshopsSnapshotDto;
  top_products: TopProductDto[];
  top_workshops: TopWorkshopDto[];
  chart_data: ChartPointDto[];
}

export interface GetActivityDashboardParams {
  time_range?: AnalyticsTimeRange | string;
  from_date?: string;
  to_date?: string;
  village_id?: number;
}

export const analyticsApi = {
  /**
   * GET /api/v1/analytics/village-activity/
   * Fetches the complete Screen V17 activity and revenue dashboard for Craft Village Manager.
   */
  getVillageActivityDashboard: async (
    params?: GetActivityDashboardParams
  ): Promise<ApiResponse<VillageActivityDashboardDto>> => {
    const query = new URLSearchParams();
    if (params?.time_range) query.append('time_range', params.time_range);
    if (params?.from_date) query.append('from_date', params.from_date);
    if (params?.to_date) query.append('to_date', params.to_date);
    if (params?.village_id) query.append('village_id', String(params.village_id));

    const qs = query.toString();
    return apiClient(`/analytics/village-activity/${qs ? `?${qs}` : ''}`, {
      requiresAuth: true,
    });
  },
};

