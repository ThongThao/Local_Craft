import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ordersApi, VendorOrderDto, VendorOrdersSummaryDto } from '@/services/api/orders';
import { LocalCraftPagination } from '../LocalCraftPagination';
import { OrderDetailModal } from '../modals/OrderDetailModal';

export interface VillageOrdersTabProps {
  showToast?: (message: string) => void;
  villageId?: number;
}

/* --- SVG Icons --- */
const IconSearch: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconClose: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRefresh: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconBox: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconHammer: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconTruck: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconCheckCircle: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconBan: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconEye: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const VillageOrdersTab: React.FC<VillageOrdersTabProps> = ({
  showToast,
  villageId,
}) => {
  const [orders, setOrders] = useState<VendorOrderDto[]>([]);
  const [summary, setSummary] = useState<VendorOrdersSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // V14 Detail Modal
  const [selectedVendorOrderId, setSelectedVendorOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Load KPI Summary from Backend
  const loadSummary = useCallback(async () => {
    try {
      const res = await ordersApi.getVendorOrdersSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch orders summary KPI:', err);
    }
  }, []);

  // Load Orders from Backend
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getVendorOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        payment_status: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        search: searchQuery.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
        if (!res.success) {
          setError(res.message || 'Không thể tải danh sách đơn hàng làng nghề.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi tải danh sách đơn hàng.';
      setError(msg);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, paymentStatusFilter, searchQuery, fromDate, toDate]);

  useEffect(() => {
    loadOrders();
    loadSummary();
  }, [loadOrders, loadSummary, villageId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleOpenDetail = (vendorOrderId: number) => {
    setSelectedVendorOrderId(vendorOrderId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedVendorOrderId(null);
  };

  const handleOrderStatusUpdated = () => {
    loadOrders();
    loadSummary();
  };

  const handleRefresh = () => {
    loadOrders();
    loadSummary();
    showToast?.('Đã làm mới dữ liệu đơn hàng');
  };

  // Paginated client slice
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage, pageSize]);

  const formatVND = (val?: string | number) => {
    if (val === undefined || val === null || val === '') return '0 ₫';
    const num = Number(val);
    return isNaN(num) ? '0 ₫' : num.toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Đơn hàng mới chờ làng nghề duyệt">
            <span className="v08-status-dot pending" />
            Chờ xác nhận
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="v08-status-badge approved" title="Làng nghề đã xác nhận tiếp nhận đơn">
            <span className="v08-status-dot approved" />
            Đã xác nhận
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="v08-status-badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }} title="Nghệ nhân đang chế tác tác phẩm thủ công">
            <span className="v08-status-dot" style={{ background: '#0284c7' }} />
            Đang chế tác
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="v08-status-badge" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }} title="Tác phẩm đã bàn giao cho bưu cục vận chuyển">
            <span className="v08-status-dot" style={{ background: '#d97706' }} />
            Đang giao hàng
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="v08-status-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }} title="Khách hàng đã nhận được tác phẩm">
            <span className="v08-status-dot" style={{ background: '#10b981' }} />
            Đã giao hàng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="v08-status-badge approved" title="Đơn hàng hoàn tất trọn vẹn">
            <span className="v08-status-dot approved" />
            Đã hoàn tất
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="v08-status-badge rejected" title="Đơn hàng đã hủy & hoàn kho an toàn">
            <span className="v08-status-dot rejected" />
            Đã hủy
          </span>
        );
      default:
        return <span className="v08-status-badge draft">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="v08-status-badge approved" title="Khách đã thanh toán qua cổng điện tử">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 2 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã thanh toán
          </span>
        );
      case 'UNPAID':
        return (
          <span className="v08-status-badge rejected" title="Chưa thanh toán (hoặc thanh toán COD khi nhận hàng)">
            <span className="v08-status-dot rejected" />
            Chưa thanh toán
          </span>
        );
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Giao dịch thanh toán đang được xử lý">
            <span className="v08-status-dot pending" />
            Chờ xử lý TT
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="v08-status-badge" style={{ background: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' }} title="Tiền đơn hàng đã được hoàn trả lại cho khách">
            Đã hoàn tiền
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="v08-status-badge" style={{ background: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' }} title="Đã hoàn lại một phần tiền đơn hàng">
            Hoàn 1 phần
          </span>
        );
      case 'FAILED':
        return (
          <span className="v08-status-badge rejected" title="Thanh toán không thành công">
            TT thất bại
          </span>
        );
      default:
        return <span className="v08-status-badge draft">{status}</span>;
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    paymentStatusFilter !== 'ALL' ||
    fromDate ||
    toDate
  );

  return (
    <div className="artisan-tab-pane artisans-manager-pane v13-orders-pane">
      {/* 1. Header Toolbar (Chuẩn v03-header-card phong cách LocalCraft) */}
      <div className="v03-header-card">
        <div className="v03-header-left">

          <h2 className="v03-header-title">Quản lý đơn hàng làng nghề</h2>
          <p className="v03-header-subtitle">
            Theo dõi, xử lý tiếp nhận và điều phối vận chuyển các tác phẩm thủ công thuộc làng nghề của bạn.
          </p>
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Làm mới danh sách và thống kê KPI"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
          >
            <IconRefresh size={14} className={isLoading ? 'v03-spin' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Quick Statistics (6 thẻ KPI chuẩn v03-kpi-grid & v13-kpi-grid) */}
      <div className="v03-kpi-grid v13-kpi-grid">
        {/* Card 1: Tổng đơn hàng làng nghề */}
        <div className="v03-kpi-card" title="Tổng đơn hàng làng nghề được phân bổ">
          <div className="v03-kpi-icon total">
            <IconBox size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Tổng đơn làng nghề">Tổng đơn hàng</span>
            <div className="v03-kpi-value">
              {isLoading ? '...' : (summary?.total_vendor_orders ?? summary?.total_orders ?? orders.length)}
            </div>
            <span className="v03-kpi-sub" title={summary?.total_parent_orders ? `${summary.total_vendor_orders} đơn (${summary.total_parent_orders} đơn cha)` : 'Đơn thuộc làng nghề'}>
              {summary?.total_parent_orders ? `${summary.total_vendor_orders} đơn (${summary.total_parent_orders} đơn gốc)` : 'Đơn thuộc làng nghề'}
            </span>
          </div>
        </div>

        {/* Card 2: Chờ xác nhận */}
        <div className="v03-kpi-card" title="Đơn hàng mới chờ làng nghề tiếp nhận">
          <div className="v03-kpi-icon pending">
            <IconClock size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Chờ xác nhận">Chờ xác nhận</span>
            <div className="v03-kpi-value pending-val">
              {isLoading ? '...' : (summary?.pending_orders ?? 0)}
            </div>
            <span className="v03-kpi-sub" title="Cần làng nghề duyệt">Cần làng nghề duyệt</span>
          </div>
        </div>

        {/* Card 3: Đang chế tác */}
        <div className="v03-kpi-card" title="Nghệ nhân đang hoàn thiện và đóng gói">
          <div className="v03-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <IconHammer size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Đang chế tác">Đang chế tác</span>
            <div className="v03-kpi-value" style={{ color: '#0284c7' }}>
              {isLoading ? '...' : ((summary?.confirmed_orders ?? 0) + (summary?.processing_orders ?? 0))}
            </div>
            <span className="v03-kpi-sub" title="Chuẩn bị tác phẩm">Chuẩn bị tác phẩm</span>
          </div>
        </div>

        {/* Card 4: Đang giao hàng */}
        <div className="v03-kpi-card" title="Đã bàn giao đơn vị vận chuyển">
          <div className="v03-kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <IconTruck size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Đang giao hàng">Đang giao hàng</span>
            <div className="v03-kpi-value" style={{ color: '#b45309' }}>
              {isLoading ? '...' : (summary?.shipped_orders ?? 0)}
            </div>
            <span className="v03-kpi-sub" title="Đang trên đường giao">Đang trên đường giao</span>
          </div>
        </div>

        {/* Card 5: Đã hoàn tất */}
        <div className="v03-kpi-card" title="Khách đã nhận hàng và hoàn tất">
          <div className="v03-kpi-icon public">
            <IconCheckCircle size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Đã hoàn tất">Đã hoàn tất</span>
            <div className="v03-kpi-value public-val">
              {isLoading ? '...' : ((summary?.delivered_orders ?? 0) + (summary?.completed_orders ?? 0))}
            </div>
            <span className="v03-kpi-sub" title="Giao thành công">Giao thành công</span>
          </div>
        </div>

        {/* Card 6: Đã hủy */}
        <div className="v03-kpi-card" title="Đơn đã hủy & hoàn trả kho">
          <div className="v03-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <IconBan size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Đã hủy">Đã hủy</span>
            <div className="v03-kpi-value" style={{ color: '#dc2626' }}>
              {isLoading ? '...' : (summary?.cancelled_orders ?? 0)}
            </div>
            <span className="v03-kpi-sub" title="Đã hoàn lại kho">Đã hoàn lại kho</span>
          </div>
        </div>
      </div>

      {/* 3. Financial Overview Card (Thiết kế Bento cao cấp & minh bạch) */}
      {summary && (
        <div className="v13-finance-card">
          {/* Header hàng trên: Tiêu đề + Các chỉ số quy mô đơn hàng */}
          <div className="v13-finance-header">
            <div className="v13-finance-title-group">
              <div>
                <h4 className="v13-finance-title">Tổng quan tài chính & Doanh thu</h4>
                <p className="v13-finance-subtitle">Thống kê dòng tiền thực nhận và giá trị giao dịch của làng nghề</p>
              </div>
            </div>

            <div className="v13-finance-pills">
              <span className="v13-scope-badge" title="Số đơn hàng phân bổ riêng cho làng nghề của bạn">
                <IconBox size={13} />
                <span><strong>{summary.total_vendor_orders}</strong> đơn làng nghề</span>
              </span>
              <span className="v13-scope-badge" title="Số đơn hàng tổng do khách hàng tạo ra">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span><strong>{summary.total_parent_orders}</strong> đơn gốc</span>
              </span>
              <span className="v13-scope-badge highlight" title="Tổng số lượng tác phẩm thủ công được đặt">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span><strong>{summary.total_items_quantity}</strong> tác phẩm đã bán</span>
              </span>
            </div>
          </div>

          {/* Lưới 5 ô số liệu tài chính cân xứng 100% */}
          <div className="v13-finance-grid">
            {/* Tile 1: Tiền hàng sản phẩm */}
            <div className="v13-finance-tile" title="Tổng giá trị sản phẩm theo đơn vị làng nghề">
              <span className="v13-tile-label">Tiền hàng sản phẩm</span>
              <span className="v13-tile-value">{formatVND(summary.total_subtotal)}</span>
              <span className="v13-tile-sub">Giá trị thuần tác phẩm</span>
            </div>

            {/* Tile 2: Tổng giá trị đơn */}
            <div className="v13-finance-tile" title="Tổng giá trị đơn gồm tiền hàng, phí ship và giảm giá">
              <span className="v13-tile-label">Tổng giá trị đơn</span>
              <span className="v13-tile-value">{formatVND(summary.total_order_amount)}</span>
              <span className="v13-tile-sub">Bao gồm ship & giảm giá</span>
            </div>

            {/* Tile 3: Đã thanh toán */}
            <div className="v13-finance-tile" title="Tổng số tiền khách đã thanh toán qua cổng điện tử hoặc COD">
              <span className="v13-tile-label">Đã thanh toán</span>
              <span className="v13-tile-value paid">{formatVND(summary.total_paid_amount)}</span>
              <span className="v13-tile-sub">Giao dịch đã xác nhận</span>
            </div>

            {/* Tile 4: Đã hoàn tiền */}
            <div className="v13-finance-tile" title="Tổng số tiền đã hoàn trả cho các đơn hủy hoặc khiếu nại thành công">
              <span className="v13-tile-label">Tiền đã hoàn lại</span>
              <span className={`v13-tile-value ${summary.total_refunded_amount > 0 ? 'refunded' : ''}`}>
                {summary.total_refunded_amount > 0 ? `-${formatVND(summary.total_refunded_amount)}` : '0 ₫'}
              </span>
              <span className="v13-tile-sub">Đơn hủy & khiếu nại</span>
            </div>

            {/* Tile 5 (Hero): Doanh thu thực nhận */}
            <div className="v13-finance-tile hero" title="Doanh thu thực nhận ròng = Đã thanh toán - Tiền đã hoàn lại">
              <div className="v13-hero-top">
                <span className="v13-tile-label hero-label">Doanh thu thực nhận</span>
              </div>
              <span className="v13-tile-value hero-val">{formatVND(summary.net_realized_revenue)}</span>
              <span className="v13-tile-sub hero-sub">Thực thu sau hoàn tiền</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Search and Filters Toolbar (Chuẩn v03-filter-card) */}
      <div className="v03-filter-card">
        {/* Search Input Wrapper */}
        <div className="v03-search-wrapper">
          <IconSearch size={16} className="v03-search-icon" />
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm mã đơn làng nghề, đơn tổng, khách hàng, SĐT..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="v03-search-clear"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              title="Xóa tìm kiếm"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>

        {/* Filter Controls: Date range + Status select + Payment select + Reset */}
        <div className="v03-filter-controls">
          {/* Date Range Group */}
          <div className="v13-date-range-group">
            <span className="v13-date-label">Từ ngày:</span>
            <input
              type="date"
              className="v13-date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
            />
            <span className="v13-date-label">Đến:</span>
            <input
              type="date"
              className="v13-date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Order Status Select Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '160px' }}
              title="Lọc theo trạng thái đơn hàng"
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ xác nhận</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PROCESSING">Đang chế tác</option>
              <option value="SHIPPED">Đang giao hàng</option>
              <option value="DELIVERED">Đã giao hàng</option>
              <option value="COMPLETED">Đã hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Payment Filter Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: '160px' }}
              title="Lọc theo trạng thái thanh toán"
            >
              <option value="ALL">Tất cả</option>
              <option value="PAID">Đã thanh toán </option>
              <option value="UNPAID">Chưa thanh toán </option>
              <option value="PENDING">Chờ xử lý </option>
              <option value="REFUNDED">Đã hoàn tiền </option>
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={handleResetFilters}
              title="Đặt lại toàn bộ bộ lọc"
            >
              ✕ Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 5. Orders Data Table Card (Chuẩn v03-table-card) */}
      <div className="v03-table-card">
        {isLoading ? (
          <div className="v10-loading-state">
            <div className="v10-spinner" />
            <p>Đang tải danh sách đơn hàng tác phẩm thủ công...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FEF2F2', borderBottom: '1px solid #FEE2E2' }}>
            <p style={{ margin: '0 0 12px', color: '#991B1B', fontWeight: 600 }}>{error}</p>
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={loadOrders}
              style={{ padding: '8px 18px', background: '#FFFFFF', cursor: 'pointer' }}
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="v10-empty-state">
            <div className="v10-empty-icon">
              <IconBox size={44} />
            </div>
            <h4>Không tìm thấy đơn hàng nào</h4>
            <p>
              {hasActiveFilters
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc ngày / trạng thái.'
                : 'Hiện chưa có khách hàng nào đặt mua tác phẩm của làng nghề.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="v03-btn-reset-filters"
                onClick={handleResetFilters}
                style={{ marginTop: '8px' }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="v03-table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="v03-artisans-table v13-order-table">
              <thead>
                <tr>
                  <th style={{ width: '170px' }}>Mã Đơn Hàng</th>
                  <th style={{ width: '200px' }}>Khách Hàng </th>
                  <th style={{ width: '200px' }}>Tác Phẩm Thủ Công</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Giá Trị Đơn</th>
                  <th style={{ width: '160px' }}>Trạng Thái Đơn</th>
                  <th style={{ width: '160px' }}>Thanh Toán</th>
                  <th style={{ textAlign: 'right', width: '90px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((o) => {
                  const totalItemsCount = o.items ? o.items.reduce((sum, it) => sum + it.quantity, 0) : 0;
                  const firstItem = o.items && o.items.length > 0 ? o.items[0] : null;

                  return (
                    <tr key={o.vendor_order_id} className="v03-table-row">
                      {/* Cột 1: Mã đơn */}
                      <td>
                        <div className="v13-code-block">
                          <span className="v13-vendor-code" title={o.vendor_order_code}>
                            {o.vendor_order_code}
                          </span>
                          <span className="v13-parent-code">
                            Đơn gốc: {o.order_code || `ORD-${o.order}`}
                          </span>
                          <span className="v13-order-date">
                            {formatDate(o.order_placed_at || o.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Khách hàng & Giao nhận */}
                      <td>
                        <div className="v13-customer-block">
                          <span className="v13-customer-name" title={o.recipient_name}>
                            {o.recipient_name}
                          </span>
                          <span className="v13-customer-phone">
                            {o.recipient_phone}
                          </span>
                          {/* <span className="v13-customer-address" title={o.shipping_address}>
                            {o.shipping_address}
                          </span> */}
                        </div>
                      </td>

                      {/* Cột 3: Tác phẩm snapshot */}
                      <td>
                        {firstItem ? (
                          <div className="v13-item-cell">
                            {firstItem.product_image ? (
                              <img
                                src={firstItem.product_image}
                                alt={firstItem.product_name_snapshot}
                                className="v13-item-thumb"
                              />
                            ) : (
                              <div className="v13-item-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                                <IconBox size={20} />
                              </div>
                            )}
                            <div className="v13-item-info">
                              <span className="v13-item-title" title={firstItem.product_name_snapshot}>
                                {firstItem.product_name_snapshot}
                              </span>
                              <span className="v13-item-variant">
                                {firstItem.variant_name_snapshot || 'Quy cách chuẩn'} • SL: <strong>{firstItem.quantity}</strong>
                              </span>
                              {o.items && o.items.length > 1 && (
                                <span className="v13-item-more">
                                  + thêm {o.items.length - 1} phân loại ({totalItemsCount} món)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Chưa có chi tiết sản phẩm</span>
                        )}
                      </td>

                      {/* Cột 4: Giá trị hàng */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="v13-price-block">
                          <span className="v13-price-val">
                            {formatVND(o.subtotal)}
                          </span>
                          <span className="v13-price-sub">
                            Ship: +{formatVND(o.shipping_fee)}
                          </span>
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái đơn */}
                      <td>
                        {getOrderStatusBadge(o.status)}
                      </td>

                      {/* Cột 6: Thanh toán */}
                      <td>
                        {getPaymentStatusBadge(o.payment_status)}
                      </td>

                      {/* Cột 7: Thao tác mở V14 */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="v13-btn-detail"
                          onClick={() => handleOpenDetail(o.vendor_order_id)}
                          title="Xem chi tiết đơn hàng & xử lý"
                        >
                          <IconEye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Footer */}
        {!isLoading && !error && orders.length > pageSize && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid #ECE7DE', background: '#FFFFFF' }}>
            <LocalCraftPagination
              currentPage={currentPage}
              totalPages={Math.ceil(orders.length / pageSize)}
              totalItems={orders.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* 7. V14 Order Detail Modal */}
      <OrderDetailModal
        isOpen={isDetailModalOpen}
        vendorOrderId={selectedVendorOrderId}
        onClose={handleCloseDetail}
        onOrderStatusUpdated={handleOrderStatusUpdated}
        showToast={showToast}
      />
    </div>
  );
};

export default VillageOrdersTab;
