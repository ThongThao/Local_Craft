import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { bookingsApi, BookingDto, BookingStatus } from '@/services/api/bookings';
import { workshopsApi, WorkshopItemDto, WorkshopSummaryDto } from '@/services/api/workshops';
import { LocalCraftPagination } from '../LocalCraftPagination';
import { BookingDetailModal } from '../modals/BookingDetailModal';

export interface WorkshopBookingsTabProps {
  initialWorkshopId?: number | null;
  onBackToWorkshops?: () => void;
  onNavigateToSchedules?: (workshopId?: number) => void;
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

const IconEye: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconRefresh: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconCalendar: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconUsers: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTicket: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="12" x2="6.01" y2="12" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <line x1="18" y1="12" x2="18.01" y2="12" />
  </svg>
);

const IconCheck: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconUserX: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="18" y1="8" x2="23" y2="13" />
    <line x1="23" y1="8" x2="18" y2="13" />
  </svg>
);


export const WorkshopBookingsTab: React.FC<WorkshopBookingsTabProps> = ({
  initialWorkshopId,
  onBackToWorkshops: _onBackToWorkshops,
  onNavigateToSchedules: _onNavigateToSchedules,
  showToast,
  villageId,
}) => {
  // Data state
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [allVillageBookings, setAllVillageBookings] = useState<BookingDto[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
    initialWorkshopId ? String(initialWorkshopId) : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // V12 Modal state
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // F05.11 Time Filter & Summary State from Database API
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [summaryData, setSummaryData] = useState<WorkshopSummaryDto | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);

  // Sync initialWorkshopId prop if it changes
  useEffect(() => {
    if (initialWorkshopId) {
      setSelectedWorkshopId(String(initialWorkshopId));
      setCurrentPage(1);
    }
  }, [initialWorkshopId]);

  // Load workshops list for the workshop filter dropdown
  useEffect(() => {
    let isMounted = true;
    const fetchWorkshopsList = async () => {
      try {
        const res = await workshopsApi.getAll();
        if (isMounted && res.data) {
          setWorkshops(res.data);
        }
      } catch (err: unknown) {
        console.warn('Could not load workshops for filter dropdown:', err);
      }
    };
    fetchWorkshopsList();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch bookings from backend API
  const requestIdRef = useRef<number>(0);
  const fetchBookings = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const isFiltered = statusFilter !== 'ALL' || selectedWorkshopId !== 'ALL' || Boolean(searchTerm.trim());

      const res = await bookingsApi.getBookings({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        workshop_id: selectedWorkshopId !== 'ALL' ? selectedWorkshopId : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (reqId !== requestIdRef.current) return;

      if (res.success && Array.isArray(res.data)) {
        setBookings(res.data);
        // If query was unfiltered, save full baseline for KPI cards fallback
        if (!isFiltered) {
          setAllVillageBookings(res.data);
        }
      } else {
        setError(res.message || 'Không thể tải danh sách lượt đặt.');
      }
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Lỗi kết nối khi tải danh sách lượt đặt.';
      setError(message);
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [statusFilter, selectedWorkshopId, searchTerm]);

  // F05.11: Fetch real backend database summary KPIs
  const fetchWorkshopSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await workshopsApi.getSummary({
        time_range: timeRange,
        from_date: timeRange === 'CUSTOM' && customFromDate ? customFromDate : undefined,
        to_date: timeRange === 'CUSTOM' && customToDate ? customToDate : undefined,
        workshop_id: selectedWorkshopId !== 'ALL' ? Number(selectedWorkshopId) : undefined,
        village_id: villageId,
      });
      if (res.success && res.data) {
        setSummaryData(res.data);
      }
    } catch (err: unknown) {
      console.warn('Could not load workshop summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [timeRange, customFromDate, customToDate, selectedWorkshopId, villageId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchWorkshopSummary();
  }, [fetchWorkshopSummary]);

  // Handle filter changes
  const handleWorkshopChange = (val: string) => {
    setSelectedWorkshopId(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedWorkshopId('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const [actionBookingId, setActionBookingId] = useState<number | null>(null);

  const handleTriggerAttendance = async (b: BookingDto, targetStatus: 'COMPLETED' | 'NO_SHOW') => {
    const promptMsg =
      targetStatus === 'COMPLETED'
        ? `XÁC NHẬN KHÁCH THAM DỰ WORKSHOP\n\n` +
          `• Khách hàng: ${b.customer_name || 'Khách đặt trực tuyến'}\n` +
          `• Mã booking: ${b.booking_code}\n` +
          `• Số người: ${b.participant_count} người\n` +
          `• Buổi workshop: ${b.workshop_name}\n\n` +
          `Bạn có chắc chắn muốn xác nhận khách hàng đã đến tham dự buổi workshop này không?`
        : `XÁC NHẬN KHÁCH VẮNG MẶT (NO-SHOW)\n\n` +
          `• Khách hàng: ${b.customer_name || 'Khách đặt trực tuyến'}\n` +
          `• Mã booking: ${b.booking_code}\n` +
          `• Số người: ${b.participant_count} người\n` +
          `• Buổi workshop: ${b.workshop_name}\n\n` +
          `Lưu ý: Chỉ ghi nhận vắng mặt khi buổi workshop đã bắt đầu và khách không đến. Bạn có chắc chắn muốn tiếp tục?`;

    const confirmed = window.confirm(promptMsg);
    if (!confirmed) return;

    setActionBookingId(b.booking_id);
    try {
      const res = await bookingsApi.updateAttendance(b.booking_id, targetStatus);
      if (res.success && res.data) {
        showToast?.(
          targetStatus === 'COMPLETED'
            ? `Đã điểm danh xác nhận khách ${b.customer_name || ''} tham dự thành công!`
            : `Đã ghi nhận khách ${b.customer_name || ''} vắng mặt (No-show).`
        );
        fetchBookings();
        fetchWorkshopSummary();
      } else {
        alert(res.message || 'Cập nhật điểm danh thất bại.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối khi cập nhật điểm danh.';
      alert(message);
    } finally {
      setActionBookingId(null);
    }
  };

  const formatCurrency = (val?: number | string | null): string => {
    if (val === undefined || val === null) return '0 ₫';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // KPI Calculations backed by real backend summary API (F05.11)
  const kpis = useMemo(() => {
    if (summaryData) {
      return {
        total: summaryData.bookings.total_bookings,
        totalParticipants: summaryData.bookings.total_participants,
        confirmedCount: summaryData.bookings.confirmed,
        pendingCount: summaryData.bookings.pending,
        cancelledCount: summaryData.bookings.cancelled,
        noShowCount: summaryData.bookings.no_show,
        expiredCount: 0,
        cancelledOrNoShowTotal: summaryData.bookings.cancelled + summaryData.bookings.no_show,
        attendanceRate: summaryData.attendance.attendance_rate,
        attendedParticipants: summaryData.attendance.attended_participants,
        noShowParticipants: summaryData.attendance.no_show_participants,
        totalBookingValue: summaryData.revenue.total_booking_value,
        successfulPayments: summaryData.revenue.successful_payments_amount,
        successfulRefunds: summaryData.revenue.successful_refunds_amount,
        netRevenue: summaryData.revenue.net_realized_revenue,
      };
    }
    const sourceList = allVillageBookings.length > 0 ? allVillageBookings : bookings;
    const total = sourceList.length;
    let totalParticipants = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    let expiredCount = 0;

    sourceList.forEach((b) => {
      if (b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.status === 'PENDING') {
        totalParticipants += b.participant_count || 0;
      }
      if (b.status === 'CONFIRMED') confirmedCount++;
      else if (b.status === 'PENDING') pendingCount++;
      else if (b.status === 'CANCELLED') cancelledCount++;
      else if (b.status === 'NO_SHOW') noShowCount++;
      else if (b.status === 'EXPIRED') expiredCount++;
    });

    return {
      total,
      totalParticipants,
      confirmedCount,
      pendingCount,
      cancelledCount,
      noShowCount,
      expiredCount,
      cancelledOrNoShowTotal: cancelledCount + noShowCount + expiredCount,
      attendanceRate: 0,
      attendedParticipants: 0,
      noShowParticipants: 0,
      totalBookingValue: 0,
      successfulPayments: 0,
      successfulRefunds: 0,
      netRevenue: 0,
    };
  }, [summaryData, allVillageBookings, bookings]);

  // Client pagination on current filtered results
  const totalPages = Math.ceil(bookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return bookings.slice(startIndex, startIndex + pageSize);
  }, [bookings, currentPage, pageSize]);

  // Status Badge Rendering unified with v08-status-badge
  const renderStatusBadge = (status: BookingStatus | string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="v08-status-badge approved" title="Đã xác nhận và giữ chỗ">
            <span className="v08-status-dot approved" />
            Đã xác nhận
          </span>
        );
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Đang chờ xác nhận / thanh toán">
            <span className="v08-status-dot pending" />
            Chờ xác nhận
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="v08-status-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} title="Khách đã tham gia buổi trải nghiệm">
            <span className="v08-status-dot" style={{ background: '#10b981' }} />
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="v08-status-badge rejected" title="Lượt đặt đã hủy">
            <span className="v08-status-dot rejected" />
            Đã hủy
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="v08-status-badge draft" title="Khách không đến tham gia">
            <span className="v08-status-dot draft" />
            Vắng mặt
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="v08-status-badge draft" title="Hết hạn giữ chỗ">
            <span className="v08-status-dot draft" />
            Hết hạn
          </span>
        );
      default:
        return (
          <span className="v08-status-badge draft">
            <span className="v08-status-dot draft" />
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenDetail = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleBookingCancelled = () => {
    fetchBookings();
    fetchWorkshopSummary();
    showToast?.('Đã cập nhật trạng thái đơn đặt.');
  };

  const handleRefresh = () => {
    fetchBookings();
    fetchWorkshopSummary();
  };

  return (
    <div className="artisan-tab-pane artisans-manager-pane v11-bookings-pane">
      {/* 1. Header Toolbar (V03/V08 Standard Header Card) */}
      <div className="v03-header-card">
        <div className="v03-header-left">
          <h2 className="v03-header-title">Quản lý lượt đặt & Thống kê Workshop</h2>
          <p className="v03-header-subtitle">
            Theo dõi danh sách khách hàng, kết quả điểm danh tham gia và doanh thu thực tế từ workshop của làng nghề.
          </p>
        </div>

        <div className="v03-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* F05.11 Time Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#5C6F68', fontWeight: 500 }}>Kỳ thống kê:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="v03-filter-select"
              style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #ECE7DE', background: '#FFF' }}
              title="Chọn khoảng thời gian thống kê KPI"
            >
              <option value="ALL">Toàn thời gian</option>
              <option value="TODAY">Hôm nay</option>
              <option value="7_DAYS">7 ngày qua</option>
              <option value="30_DAYS">30 ngày qua</option>
              <option value="THIS_MONTH">Tháng này</option>
              <option value="LAST_MONTH">Tháng trước</option>
              <option value="CUSTOM">Tùy chỉnh khoảng ngày</option>
            </select>
          </div>

          {timeRange === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                style={{ padding: '5px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #ECE7DE' }}
                title="Từ ngày"
              />
              <span style={{ fontSize: '12px', color: '#717A76' }}>-</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                style={{ padding: '5px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #ECE7DE' }}
                title="Đến ngày"
              />
            </div>
          )}

          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={handleRefresh}
            disabled={isLoading || isLoadingSummary}
            title="Tải lại danh sách lượt đặt và thống kê"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
          >
            <IconRefresh size={14} className={isLoading || isLoadingSummary ? 'v03-spin' : ''} />
            <span>{isLoading || isLoadingSummary ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Quick Statistics (5 cards theo chuẩn v03-kpi-grid) */}
      <div className="v03-kpi-grid">
        {/* Card 1: Tổng lượt đặt */}
        <div className="v03-kpi-card" title="Tổng số lượt đặt vé đăng ký trải nghiệm trong kỳ">
          <div className="v03-kpi-icon total">
            <IconTicket size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Tổng lượt đặt">Tổng lượt đặt</span>
            <div className="v03-kpi-value">{isLoadingSummary ? '...' : kpis.total}</div>
            <span className="v03-kpi-sub" title="Vé đăng ký trải nghiệm">Vé đăng ký trải nghiệm</span>
          </div>
        </div>

        {/* Card 2: Khách giữ chỗ */}
        <div className="v03-kpi-card" title="Tổng số khách đăng ký giữ chỗ (participant_count)">
          <div className="v03-kpi-icon public">
            <IconUsers size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Khách giữ chỗ">Khách giữ chỗ</span>
            <div className="v03-kpi-value public-val">{isLoadingSummary ? '...' : kpis.totalParticipants}</div>
            <span className="v03-kpi-sub" title="Tổng số người đăng ký">Tổng số người đăng ký</span>
          </div>
        </div>

        {/* Card 3: Tỷ lệ tham gia thực tế (F05.09) */}
        <div className="v03-kpi-card" title="Tỷ lệ tham gia thực tế = Khách đã đến / (Khách đến + Khách vắng) x 100%">
          <div className="v03-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Tỷ lệ tham gia">Tỷ lệ tham gia</span>
            <div className="v03-kpi-value" style={{ color: '#059669' }}>
              {isLoadingSummary ? '...' : `${kpis.attendanceRate}%`}
            </div>
            <span className="v03-kpi-sub" title={`${kpis.attendedParticipants} có mặt / ${kpis.attendedParticipants + kpis.noShowParticipants} khách`}>
              {kpis.attendedParticipants} có mặt • {kpis.noShowParticipants} vắng
            </span>
          </div>
        </div>

        {/* Card 4: Doanh thu thực thu ròng */}
        <div className="v03-kpi-card" title="Doanh thu thực thu ròng = Tiền thanh toán thành công - Tiền hoàn trả">
          <div className="v03-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Doanh thu thực thu">Doanh thu thực thu</span>
            <div className="v03-kpi-value" style={{ color: '#1e40af', fontSize: '18px' }}>
              {isLoadingSummary ? '...' : formatCurrency(kpis.netRevenue)}
            </div>
            <span className="v03-kpi-sub" title="Thực thu sau hoàn tiền">Thực thu sau hoàn tiền</span>
          </div>
        </div>

        {/* Card 5: Trạng thái đơn đặt */}
        <div
          className="v03-kpi-card"
          title={`Chi tiết: ${kpis.confirmedCount} đã xác nhận, ${kpis.pendingCount} chờ duyệt, ${kpis.cancelledCount} đã hủy`}
        >
          <div className="v03-kpi-icon pending">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label" title="Trạng thái lượt đặt">Trạng thái lượt đặt</span>
            <div className="v03-kpi-value pending-val">
              {isLoadingSummary ? '...' : `${kpis.confirmedCount} xác nhận`}
            </div>
            <span className="v03-kpi-sub" title={`${kpis.pendingCount} chờ duyệt • ${kpis.cancelledCount} đã hủy`}>
              {kpis.pendingCount} chờ duyệt • {kpis.cancelledCount} hủy
            </span>
          </div>
        </div>
      </div>

      {/* 2.1. Thanh chi tiết Tài chính & Điểm danh (F05.11 Detailed Financial & Attendance Ribbon) */}
      <div
        style={{
          background: '#FAFAF7',
          border: '1px solid #ECE7DE',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12.5px',
          color: '#5C6F68',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#1C3B32' }}>Giá trị đơn đặt:</span>
          <span style={{ fontWeight: 700, color: '#0A1E18' }}>{formatCurrency(kpis.totalBookingValue)}</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: '#D6D0C4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#1C3B32' }}>Tiền đã thu (Cổng/Tiền mặt):</span>
          <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(kpis.successfulPayments)}</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: '#D6D0C4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#1C3B32' }}>Tiền hoàn trả:</span>
          <span style={{ fontWeight: 700, color: '#DC2626' }}>{formatCurrency(kpis.successfulRefunds)}</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: '#D6D0C4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#1C3B32' }}>Đã hoàn thành điểm danh:</span>
          <span style={{ fontWeight: 700, color: '#047857' }}>{summaryData?.attendance.completed_bookings ?? 0} đơn ({kpis.attendedParticipants} người)</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: '#D6D0C4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#1C3B32' }}>Vắng mặt (No-show):</span>
          <span style={{ fontWeight: 700, color: '#B45309' }}>{summaryData?.attendance.no_show_bookings ?? 0} đơn ({kpis.noShowParticipants} người)</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar (Chuẩn v03-filter-card) */}
      <div className="v03-filter-card">
        {/* Search Input */}
        <div className="v03-search-wrapper">
          <IconSearch size={16} className="v03-search-icon" />
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm theo mã booking, tên khách hàng, workshop..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button
              type="button"
              className="v03-search-clear"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              title="Xóa tìm kiếm"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="v03-filter-controls">
          {/* Workshop select */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Workshop:</label>
            <select
              className="v03-select-box"
              value={selectedWorkshopId}
              onChange={(e) => handleWorkshopChange(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="ALL">Tất cả workshop</option>
              {workshops.map((ws) => (
                <option key={ws.workshop_id} value={ws.workshop_id}>
                  {ws.workshop_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status select */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="ALL">Tất cả </option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PENDING">Chờ xác nhận</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="NO_SHOW">Vắng mặt</option>
              <option value="EXPIRED">Hết hạn</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {(selectedWorkshopId !== 'ALL' || statusFilter !== 'ALL' || searchTerm.trim()) && (
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={handleResetFilters}
              title="Đặt lại toàn bộ bộ lọc"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 4. Table Content / State Handling (Chuẩn v03-table-card) */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #ECE7DE' }}>
          <div className="v03-spinner" style={{ margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: '13.5px', color: '#717A76', fontWeight: 500 }}>
            Đang tải danh sách lượt đặt workshop...
          </p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FEE2E2' }}>
          <p style={{ margin: '0 0 12px', color: '#991B1B', fontWeight: 600 }}>{error}</p>
          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={fetchBookings}
            style={{ padding: '8px 18px', background: '#FFFFFF', cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #ECE7DE' }}>
          <div style={{ color: '#D5CEBF', marginBottom: '14px' }}>
            <IconTicket size={44} />
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1C1C18', fontWeight: 700 }}>
            Không tìm thấy lượt đặt workshop nào
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#717A76' }}>
            {searchTerm || statusFilter !== 'ALL' || selectedWorkshopId !== 'ALL'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc.'
              : 'Hiện chưa có khách hàng nào đăng ký tham gia workshop của làng nghề.'}
          </p>
        </div>
      ) : (
        <div className="v03-table-card">
          <table className="v03-artisans-table v08-table">
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '140px' }}>Mã Đặt Chỗ</th>
                <th style={{ minWidth: '160px' }}>Khách Hàng</th>
                <th style={{ minWidth: '220px' }}>Workshop & Nghệ Nhân</th>
                <th style={{ minWidth: '170px' }}>Lịch Tham Gia</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Số Người</th>
                <th style={{ width: '120px' }}>Tổng Tiền</th>
                <th style={{ textAlign: 'center', width: '150px' }}>Trạng Thái</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((b, index) => {
                const rowStt = (currentPage - 1) * pageSize + index + 1;
                return (
                  <tr key={b.booking_id} className="v03-table-row">
                    {/* STT */}
                    <td style={{ textAlign: 'center', color: '#717A76', fontSize: '12.5px', fontWeight: 600 }}>
                      #{rowStt}
                    </td>

                    {/* Mã đặt chỗ & Ngày đặt */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#1C3B32', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.4px' }}>
                        {b.booking_code}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {formatDateTime(b.created_at)}
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
                        {b.customer_name || 'Khách đặt chỗ'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                        {b.user_id ? `Mã KH: #${b.user_id}` : 'Đặt trực tuyến'}
                      </div>
                    </td>

                    {/* Workshop & Nghệ nhân */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1C3B32', fontSize: '13px' }}>
                        {b.workshop_name}
                      </div>
                      {b.artisan_name && (
                        <div style={{ fontSize: '11.5px', color: '#8D7B68', marginTop: '2px' }}>
                          Nghệ nhân: <strong>{b.artisan_name}</strong>
                        </div>
                      )}
                    </td>

                    {/* Lịch tham gia */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#B45309', background: '#FFFBEB', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', border: '1px solid #FDE68A' }}>
                        <IconCalendar size={12} />
                        <span>{formatDateTime(b.start_at)}</span>
                      </div>
                    </td>

                    {/* Số người */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                        {b.participant_count}
                      </span>
                      <span style={{ fontSize: '11px', color: '#717A76', marginLeft: '3px' }}>
                        khách
                      </span>
                    </td>

                    {/* Tổng tiền */}
                    <td>
                      <span style={{ fontWeight: 700, color: '#065F46', fontSize: '13.5px' }}>
                        {Number(b.total_amount).toLocaleString('vi-VN')} ₫
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ textAlign: 'center' }}>
                      {renderStatusBadge(b.status)}
                    </td>

                    {/* Thao tác (Đồng bộ với v08-table-action-btn) */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="v08-table-actions-row">
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              className="v08-table-action-btn checkin"
                              onClick={() => handleTriggerAttendance(b, 'COMPLETED')}
                              title="Xác nhận khách tham gia (Check-in)"
                              aria-label="Xác nhận tham gia"
                              disabled={actionBookingId === b.booking_id}
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              className="v08-table-action-btn noshow"
                              onClick={() => handleTriggerAttendance(b, 'NO_SHOW')}
                              title="Báo khách vắng mặt (No-show)"
                              aria-label="Báo vắng mặt"
                              disabled={actionBookingId === b.booking_id}
                            >
                              <IconUserX size={14} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="v08-table-action-btn view"
                          onClick={() => handleOpenDetail(b.booking_id)}
                          title="Xem chi tiết lượt đặt (V12)"
                          aria-label="Xem chi tiết"
                        >
                          <IconEye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Unified Pagination */}
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={bookings.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="lượt đặt workshop"
            totalUnfiltered={allVillageBookings.length > 0 ? allVillageBookings.length : bookings.length}
          />
        </div>
      )}

      {/* 5. V12 Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        bookingId={selectedBookingId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBookingId(null);
        }}
        onBookingCancelled={handleBookingCancelled}
        onBookingUpdated={() => {
          fetchBookings();
          fetchWorkshopSummary();
        }}
        showToast={showToast}
      />
    </div>

  );
};

export default WorkshopBookingsTab;
