import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AppIcon from '@/components/ui/AppIcon';
import {
  analyticsApi,
  VillageActivityDashboardDto,
  AnalyticsTimeRange,
  ChartPointDto,
  TopProductDto,
  TopWorkshopDto,
} from '@/services/api/analytics';

interface ActivityStatisticsTabProps {
  villageId?: number;
  villageName?: string;
  onNavigateToOrders?: () => void;
  onNavigateToWorkshops?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToBookings?: () => void;
}

const PRESET_OPTIONS: { key: AnalyticsTimeRange; label: string }[] = [
  { key: 'TODAY', label: 'Hôm nay' },
  { key: '7_DAYS', label: '7 ngày qua' },
  { key: '30_DAYS', label: '30 ngày qua' },
  { key: 'THIS_MONTH', label: 'Tháng này' },
  { key: 'LAST_MONTH', label: 'Tháng trước' },
  { key: 'THIS_YEAR', label: 'Năm nay' },
  { key: 'CUSTOM', label: 'Tùy chỉnh' },
];

export const ActivityStatisticsTab: React.FC<ActivityStatisticsTabProps> = ({
  villageId,
  villageName,
  onNavigateToOrders,
  onNavigateToWorkshops,
  onNavigateToProducts,
  onNavigateToBookings,
}) => {
  // Filters & State
  const [selectedRange, setSelectedRange] = useState<AnalyticsTimeRange>('30_DAYS');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Data & Status
  const [data, setData] = useState<VillageActivityDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart interactivity
  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPointDto | null>(null);

  // Helper formatting
  const formatCurrency = (val: number | undefined | null): string => {
    return `${Number(val || 0).toLocaleString('vi-VN')} ₫`;
  };

  const formatNumber = (val: number | undefined | null): string => {
    return Number(val || 0).toLocaleString('vi-VN');
  };

  // Fetch Dashboard API
  const fetchDashboard = useCallback(
    async (range: AnalyticsTimeRange, fromDate?: string, toDate?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await analyticsApi.getVillageActivityDashboard({
          time_range: range,
          from_date: range === 'CUSTOM' ? fromDate : undefined,
          to_date: range === 'CUSTOM' ? toDate : undefined,
          village_id: villageId,
        });

        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message || 'Không thể tải dữ liệu thống kê làng nghề.');
        }
      } catch (err: any) {
        setError(err.message || 'Đã có lỗi xảy ra khi kết nối máy chủ.');
      } finally {
        setIsLoading(false);
      }
    },
    [villageId]
  );

  const IconRefresh: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  // Initial load
  useEffect(() => {
    fetchDashboard(selectedRange, customFrom, customTo);
  }, [fetchDashboard, selectedRange]);

  // Close Custom Date Range modal on Escape key
  useEffect(() => {
    if (!showCustomModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCustomModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCustomModal]);

  // Quick range presets inside custom modal
  const setQuickRange = useCallback((type: '7d' | '14d' | '30d' | '90d' | 'this_month' | 'last_month') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === '7d') {
      start.setDate(today.getDate() - 6);
    } else if (type === '14d') {
      start.setDate(today.getDate() - 13);
    } else if (type === '30d') {
      start.setDate(today.getDate() - 29);
    } else if (type === '90d') {
      start.setDate(today.getDate() - 89);
    } else if (type === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setCustomFrom(fmt(start));
    setCustomTo(fmt(end));
    setCustomError(null);
  }, []);

  // Duration calculation in days
  const customDurationDays = useMemo(() => {
    if (!customFrom || !customTo) return null;
    const f = new Date(customFrom);
    const t = new Date(customTo);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return null;
    const diffTime = t.getTime() - f.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [customFrom, customTo]);

  const formatVNDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Handle Preset Selection
  const handleSelectPreset = (range: AnalyticsTimeRange) => {
    if (range === 'CUSTOM') {
      if (!customFrom || !customTo) {
        setQuickRange('30d');
      }
      setCustomError(null);
      setShowCustomModal(true);
    } else {
      setSelectedRange(range);
    }
  };

  // Apply Custom Range
  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      setCustomError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (new Date(customFrom) > new Date(customTo)) {
      setCustomError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    setCustomError(null);
    setShowCustomModal(false);
    setSelectedRange('CUSTOM');
    fetchDashboard('CUSTOM', customFrom, customTo);
  };

  // Peak Highlight from Chart Points
  const peakPoint = useMemo(() => {
    if (!data?.chart_data || data.chart_data.length === 0) return null;
    return [...data.chart_data].reduce((max, p) => (p.total_revenue > max.total_revenue ? p : max), data.chart_data[0]);
  }, [data]);

  // Max value for Chart scaling with clean nice steps
  const isCurrency = chartMetric === 'revenue';
  const maxChartValue = useMemo(() => {
    if (!data?.chart_data || data.chart_data.length === 0) {
      return isCurrency ? 1000000 : 10;
    }
    if (isCurrency) {
      const maxVal = Math.max(...data.chart_data.map((d) => d.total_revenue));
      if (maxVal <= 0) return 1000000;
      const power = Math.pow(10, Math.floor(Math.log10(maxVal)));
      const fraction = maxVal / power;
      let niceFraction = 10;
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 1.25) niceFraction = 1.25;
      else if (fraction <= 1.5) niceFraction = 1.5;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 2.5) niceFraction = 2.5;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
      return niceFraction * power;
    } else {
      const maxVal = Math.max(...data.chart_data.map((d) => d.orders_count + d.bookings_count));
      if (maxVal <= 0) return 10;
      if (maxVal <= 4) return 4;
      if (maxVal <= 5) return 5;
      if (maxVal <= 10) return 10;
      const power = Math.pow(10, Math.floor(Math.log10(maxVal)));
      const fraction = maxVal / power;
      let niceFraction = 10;
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      return Math.ceil(niceFraction * power);
    }
  }, [data, isCurrency]);

  const formatYAxisTick = (val: number): string => {
    if (isCurrency) {
      if (val === 0) return '0 ₫';
      if (val >= 1000000) {
        const tr = val / 1000000;
        return `${Number.isInteger(tr) ? tr : tr.toFixed(1)} tr ₫`;
      }
      if (val >= 1000) {
        return `${Math.round(val / 1000)} k ₫`;
      }
      return `${val} ₫`;
    } else {
      return `${Math.round(val)}`;
    }
  };

  // Growth Pill renderer with SVG trending icons
  const renderGrowthPill = (growthVal: number | null | undefined) => {
    if (growthVal === null || growthVal === undefined) {
      return <span className="v17-growth-pill neutral">— Kỳ mới</span>;
    }
    const isPositive = growthVal >= 0;
    return (
      <span className={`v17-growth-pill ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </svg>
        )}
        <span>{isPositive ? `+${growthVal}%` : `${growthVal}%`}</span>
      </span>
    );
  };

  return (
    <div className="v17-activity-pane">
      {/* =========================================================================
          SECTION 1: HEADER & TIME FILTER BAR (2-TIER CLEAN LAYOUT)
          ========================================================================= */}
      <div className="v17-toolbar-card">
        {/* Row 1: Title & Village Metadata + Refresh Action */}
        <div className="v17-toolbar-header-row">
          <div className="v17-toolbar-title-wrap">
            
            <h2 className="v17-title">
              Thống Kê &amp; Hiệu Quả Hoạt Động {villageName ? `— ${villageName}` : ''}
            </h2>
            <p className="v17-description">
              Theo dõi dòng tiền thực nhận, tiến độ giao hàng thủ công, đón tiếp du khách workshop và chỉ số tăng trưởng kinh doanh.
            </p>
          </div>
          <button
            type="button"
            className="v17-btn-refresh-header"
            onClick={() => fetchDashboard(selectedRange, customFrom, customTo)}
            disabled={isLoading}
            title="Làm mới toàn bộ số liệu"
          >
            <IconRefresh size={14} className={isLoading ? 'v03-spin' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          
        </div>

        {/* Row 2: Time Filter Presets & Period Range */}
        <div className="v17-toolbar-filter-row">
          <div className="v17-filter-left">
            <span className="v17-filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Khoảng thời gian:</span>
            </span>

            <div className="v17-preset-pills">
              {PRESET_OPTIONS.map((opt) => {
                const active = selectedRange === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectPreset(opt.key)}
                    className={`v17-preset-btn ${active ? 'active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {data?.filter && (
            <div className="v17-filter-right">
              <span className="v17-period-tag">
                Kỳ thống kê: <strong>{data.filter.from_date}</strong>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="v17-inline-arrow">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                <strong>{data.filter.to_date}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Date Modal Dialog (Portaled to document.body) */}
      {showCustomModal && createPortal(
        <div
          className="v17-modal-overlay"
          onClick={() => setShowCustomModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="v17-custom-date-title"
        >
          <div
            className="v17-custom-date-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Modal Header */}
            <div className="v06-modal-header">
              <div className="v06-header-left">
                <div className="v06-tag-row">
                  <span className="v06-tag-pill">BỘ LỌC KỲ BÁO CÁO</span>
                </div>
                <h3 id="v17-custom-date-title" className="v06-modal-title">
                  Tùy Chỉnh Khoảng Ngày Thống Kê
                </h3>
                <p className="v06-modal-sub">
                  Làng nghề: {villageName}                  </p>
              </div>

              <div className="v06-header-actions">
                <button
                  type="button"
                  className="v06-close-btn"
                  onClick={() => setShowCustomModal(false)}
                  aria-label="Đóng cửa sổ"
                  title="Đóng (ESC)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. Modal Body */}
            <div className="v17-custom-date-body">
              {/* Quick Range Presets */}
              <div className="v17-quick-presets-section">
                <div className="v17-quick-presets-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Chọn Nhanh Khoảng Thời Gian:</span>
                </div>
                <div className="v17-quick-chips-row">
                  <button
                    type="button"
                    className={`v17-quick-chip-btn ${customDurationDays === 7 ? 'active' : ''}`}
                    onClick={() => setQuickRange('7d')}
                  >
                    7 ngày gần nhất
                  </button>
                  <button
                    type="button"
                    className={`v17-quick-chip-btn ${customDurationDays === 14 ? 'active' : ''}`}
                    onClick={() => setQuickRange('14d')}
                  >
                    14 ngày qua
                  </button>
                  <button
                    type="button"
                    className={`v17-quick-chip-btn ${customDurationDays === 30 ? 'active' : ''}`}
                    onClick={() => setQuickRange('30d')}
                  >
                    30 ngày qua
                  </button>
                  <button
                    type="button"
                    className="v17-quick-chip-btn"
                    onClick={() => setQuickRange('this_month')}
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    className="v17-quick-chip-btn"
                    onClick={() => setQuickRange('last_month')}
                  >
                    Tháng trước
                  </button>
                  <button
                    type="button"
                    className={`v17-quick-chip-btn ${customDurationDays === 90 ? 'active' : ''}`}
                    onClick={() => setQuickRange('90d')}
                  >
                    90 ngày qua
                  </button>
                </div>
              </div>

              {/* Date Range Inputs Grid */}
              <div className="v17-custom-date-grid">
                <div className="v17-date-field-group">
                  <label className="v17-date-field-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Từ ngày 
                  </label>
                  <div className="v17-date-input-wrap">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => {
                        setCustomFrom(e.target.value);
                        setCustomError(null);
                      }}
                      max={customTo || undefined}
                      className="v17-date-native-input"
                    />
                  </div>
                </div>

                <div className="v17-date-field-group">
                  <label className="v17-date-field-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Đến ngày 
                  </label>
                  <div className="v17-date-input-wrap">
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => {
                        setCustomTo(e.target.value);
                        setCustomError(null);
                      }}
                      min={customFrom || undefined}
                      className="v17-date-native-input"
                    />
                  </div>
                </div>
              </div>

              {/* Validation Error Banner */}
              {customError && (
                <div className="v17-modal-error-banner" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v17-modal-error-icon">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{customError}</span>
                </div>
              )}

              {/* Duration Summary Banner */}
              {!customError && customDurationDays !== null && customDurationDays > 0 && (
                <div className="v17-modal-summary-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v17-modal-summary-icon">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <div>
                      Chu kỳ báo cáo: <strong>{customDurationDays} ngày</strong> (từ{' '}
                      <strong>{formatVNDate(customFrom)}</strong> đến{' '}
                      <strong>{formatVNDate(customTo)}</strong>)
                    </div>
                    {customDurationDays > 90 && (
                      <div className="v17-summary-note">
                        Phạm vi thời gian dài hơn 3 tháng có thể cần vài giây để hệ thống tổng hợp mọi giao dịch phát sinh.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Modal Footer */}
            <div className="v17-custom-date-footer">
              <button
                type="button"
                className="v17-btn-reset-dates"
                onClick={() => setQuickRange('30d')}
                title="Đặt lại về chu kỳ 30 ngày qua"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Mặc định (30 ngày)</span>
              </button>

              <div className="v17-footer-right-actions">
                <button
                  type="button"
                  className="v06-btn-cancel"
                  onClick={() => setShowCustomModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="artisan-primary-btn"
                  onClick={handleApplyCustom}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Áp Dụng</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error State Banner */}
      {error && !isLoading && (
        <div className="v17-error-banner">
          <div className="v17-error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard(selectedRange, customFrom, customTo)}
            className="v17-btn-retry"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: 4 MASTER KPI CARDS
          ========================================================================= */}
      <div className="v17-kpis-grid">
        {/* Card 1: Doanh Thu Thuần */}
        <div className="v17-kpi-card">
          <div>
            <div className="v17-kpi-top-row">
              <div className="v17-kpi-header-info">
                <span className="v17-kpi-badge-icon green">
                  <AppIcon name="medal" size={14} />
                </span>
                <span className="v17-kpi-label">
                  DOANH THU THUẦN
                </span>
              </div>
              {renderGrowthPill(data?.kpis.growth.revenue_growth)}
            </div>
            <div className="v17-kpi-value">
              {isLoading ? '...' : formatCurrency(data?.kpis.net_revenue)}
            </div>
          </div>
          <div className="v17-kpi-breakdown">
            <div className="v17-kpi-breakdown-row">
              <span>• Tác phẩm mỹ nghệ:</span>
              <strong>{formatCurrency(data?.revenue_breakdown.net_product_revenue)}</strong>
            </div>
            <div className="v17-kpi-breakdown-row">
              <span>• Lớp học workshop:</span>
              <strong>{formatCurrency(data?.revenue_breakdown.net_workshop_revenue)}</strong>
            </div>
            {data?.revenue_breakdown.total_refunds ? (
              <div className="v17-kpi-breakdown-row danger">
                <span>• Đã bồi hoàn:</span>
                <strong>-{formatCurrency(data.revenue_breakdown.total_refunds)}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Card 2: Đơn Hàng Sản Phẩm */}
        <div
          onClick={onNavigateToOrders}
          role="button"
          tabIndex={0}
          className={`v17-kpi-card ${onNavigateToOrders ? 'interactive' : ''}`}
        >
          <div>
            <div className="v17-kpi-top-row">
              <div className="v17-kpi-header-info">
                <span className="v17-kpi-badge-icon blue">
                  <AppIcon name="craft" size={14} />
                </span>
                <span className="v17-kpi-label">
                  ĐƠN HÀNG SẢN PHẨM
                </span>
              </div>
              {renderGrowthPill(data?.kpis.growth.orders_growth)}
            </div>
            <div className="v17-kpi-value">
              {isLoading ? '...' : `${formatNumber(data?.kpis.total_orders)} đơn`}
            </div>
          </div>
          <div className="v17-kpi-breakdown">
            <div className="v17-kpi-breakdown-row">
              <span>• Xuất xưởng:</span>
              <strong>{formatNumber(data?.kpis.total_items_sold)} sản phẩm</strong>
            </div>
            <div className="v17-kpi-breakdown-row success">
              <span>• Giao thành công:</span>
              <strong>{formatNumber(data?.orders_summary.completed)} đơn</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Lượt Đặt Workshop */}
        <div
          onClick={onNavigateToBookings}
          role="button"
          tabIndex={0}
          className={`v17-kpi-card ${onNavigateToBookings ? 'interactive' : ''}`}
        >
          <div>
            <div className="v17-kpi-top-row">
              <div className="v17-kpi-header-info">
                <span className="v17-kpi-badge-icon amber">
                  <AppIcon name="clock" size={14} />
                </span>
                <span className="v17-kpi-label">
                  ĐĂNG KÝ WORKSHOP
                </span>
              </div>
              {renderGrowthPill(data?.kpis.growth.bookings_growth)}
            </div>
            <div className="v17-kpi-value">
              {isLoading ? '...' : `${formatNumber(data?.kpis.total_bookings)} lượt`}
            </div>
          </div>
          <div className="v17-kpi-breakdown">
            <div className="v17-kpi-breakdown-row success">
              <span>• Tỷ lệ hoàn thành:</span>
              <strong>{data?.kpis.completion_rate || 0}%</strong>
            </div>
            <div className="v17-kpi-breakdown-row">
              <span>• Đã hoàn thành:</span>
              <strong>{formatNumber(data?.bookings_summary.completed)} lượt</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Du Khách Trải Nghiệm */}
        <div
          onClick={onNavigateToWorkshops}
          role="button"
          tabIndex={0}
          className={`v17-kpi-card ${onNavigateToWorkshops ? 'interactive' : ''}`}
        >
          <div>
            <div className="v17-kpi-top-row">
              <div className="v17-kpi-header-info">
                <span className="v17-kpi-badge-icon purple">
                  <AppIcon name="user" size={14} />
                </span>
                <span className="v17-kpi-label">
                  DU KHÁCH THỰC TẾ
                </span>
              </div>
              {renderGrowthPill(data?.kpis.growth.participants_growth)}
            </div>
            <div className="v17-kpi-value">
              {isLoading ? '...' : `${formatNumber(data?.kpis.attended_participants)} khách`}
            </div>
          </div>
          <div className="v17-kpi-breakdown">
            <div className="v17-kpi-breakdown-row success">
              <span>• Tỷ lệ điểm danh:</span>
              <strong>{data?.kpis.attendance_rate || 0}%</strong>
            </div>
            <div className="v17-kpi-breakdown-row">
              <span>• Tổng đăng ký:</span>
              <strong>{formatNumber(data?.kpis.total_registered_participants)} người</strong>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: INTERACTIVE HISTOGRAM GROWTH CHART
          ========================================================================= */}
      <div className="v17-chart-card">
        <div className="v17-chart-top-bar">
          <div>
            <div className="v17-chart-pretag">
              BIỂU ĐỒ DIỄN BIẾN THEO THỜI GIAN
            </div>
            <h3 className="v17-chart-heading">
              {chartMetric === 'revenue' ? 'Doanh Thu Sản Phẩm & Workshop Theo Kỳ' : 'Số Lượng Đơn Hàng & Lượt Booking Theo Kỳ'}
            </h3>
          </div>

          <div className="v17-chart-controls">
            {/* View toggle button group */}
            <div className="v17-chart-toggle-wrap">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`v17-chart-toggle-btn ${chartMetric === 'revenue' ? 'active' : ''}`}
              >
                Doanh thu (₫)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('volume')}
                className={`v17-chart-toggle-btn ${chartMetric === 'volume' ? 'active' : ''}`}
              >
                Giao dịch (Đơn/Vé)
              </button>
            </div>

            {/* Peak highlight pill */}
            {peakPoint && peakPoint.total_revenue > 0 && (
              <span className="v17-peak-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#047857" stroke="#047857" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Đỉnh điểm ({peakPoint.label}): {formatCurrency(peakPoint.total_revenue)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Chart Canvas Area */}
        {isLoading ? (
          <div className="v17-chart-placeholder">
            Đang tổng hợp dữ liệu chuỗi thời gian...
          </div>
        ) : !data?.chart_data || data.chart_data.length === 0 ? (
          <div className="v17-chart-placeholder">
            Chưa có giao dịch phát sinh trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <div className="v17-chart-canvas-box">
            {/* Hover Tooltip Box */}
            {hoveredPoint && (
              <div className="v17-chart-hover-bubble">
                <div className="v17-chart-hover-title">
                  Mốc: {hoveredPoint.label} ({hoveredPoint.period})
                </div>
                {chartMetric === 'revenue' ? (
                  <>
                    <div>• Sản phẩm: <strong>{formatCurrency(hoveredPoint.product_revenue)}</strong></div>
                    <div>• Workshop: <strong>{formatCurrency(hoveredPoint.workshop_revenue)}</strong></div>
                    <div className="v17-chart-hover-divider">
                      Tổng ngày: <strong>{formatCurrency(hoveredPoint.total_revenue)}</strong>
                    </div>
                    {hoveredPoint.total_revenue === 0 && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                        (Không phát sinh doanh thu)
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>• Đơn hàng: <strong>{hoveredPoint.orders_count} đơn</strong></div>
                    <div>• Đăng ký workshop: <strong>{hoveredPoint.bookings_count} lượt</strong></div>
                    <div className="v17-chart-hover-divider">
                      Tổng giao dịch: <strong>{hoveredPoint.orders_count + hoveredPoint.bookings_count}</strong>
                    </div>
                    {(hoveredPoint.orders_count + hoveredPoint.bookings_count) === 0 && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                        (Không phát sinh giao dịch)
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Layout with Y-Axis scale & Plot area */}
            <div className="v17-chart-wrapper">
              {/* Y-axis labels */}
              <div className="v17-chart-yaxis">
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <span key={ratio} className="v17-chart-yaxis-tick">
                    {formatYAxisTick(maxChartValue * ratio)}
                  </span>
                ))}
              </div>

              {/* Plot area with gridlines & columns */}
              <div className="v17-chart-plot-container">
                {/* Horizontal reference lines */}
                <div className="v17-chart-gridlines">
                  {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                    <div
                      key={ratio}
                      className={`v17-grid-line ${ratio === 0 ? 'baseline' : ''}`}
                      style={{ bottom: `${ratio * 100}%` }}
                    />
                  ))}
                </div>

                {/* Histogram track */}
                <div className="v17-histogram-track">
                  {data.chart_data.map((pt, idx) => {
                    const productVal = isCurrency ? pt.product_revenue : pt.orders_count;
                    const workshopVal = isCurrency ? pt.workshop_revenue : pt.bookings_count;
                    const totalVal = isCurrency ? pt.total_revenue : (pt.orders_count + pt.bookings_count);
                    const isZero = totalVal === 0;

                    const totalHPercent = isZero
                      ? 0
                      : Math.max(6, Math.min(100, Math.round((totalVal / maxChartValue) * 100)));

                    const pRatio = isZero ? 0 : (productVal / totalVal);
                    const isHovered = hoveredPoint?.period === pt.period;
                    const isLabelHidden = data.chart_data.length > 20 && idx % 3 !== 0 && !isHovered;

                    return (
                      <div
                        key={pt.period || idx}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="v17-histogram-col"
                      >
                        {/* The Bar Slot */}
                        <div className="v17-col-bar-slot">
                          {isZero ? (
                            <div className={`v17-histogram-bar-body zero ${isHovered ? 'hovered' : ''}`} />
                          ) : (
                            <div
                              className={`v17-histogram-bar-body ${isHovered ? 'hovered' : ''}`}
                              style={{ height: `${totalHPercent}%` }}
                            >
                              {/* Only product revenue */}
                              {productVal > 0 && workshopVal === 0 && (
                                <div
                                  className="v17-bar-segment-product"
                                  style={{ height: '100%', borderRadius: '4px 4px 0 0' }}
                                />
                              )}
                              {/* Only workshop revenue */}
                              {workshopVal > 0 && productVal === 0 && (
                                <div
                                  className="v17-bar-segment-workshop"
                                  style={{ height: '100%', borderRadius: '4px 4px 0 0' }}
                                />
                              )}
                              {/* Stacked both product and workshop */}
                              {productVal > 0 && workshopVal > 0 && (
                                <>
                                  <div
                                    className="v17-bar-segment-product"
                                    style={{ height: `${Math.round(pRatio * 100)}%` }}
                                  />
                                  <div
                                    className="v17-bar-segment-workshop"
                                    style={{
                                      height: `${100 - Math.round(pRatio * 100)}%`,
                                      borderRadius: '4px 4px 0 0',
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* X-axis Label */}
                        <div className={`v17-histogram-col-label ${isHovered ? 'hovered' : ''}`}>
                          {!isLabelHidden ? pt.label : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend Row */}
            <div className="v17-chart-legends-row">
              <div className="v17-legend-indicator">
                <span className="v17-legend-color-box product" />
                <span>{chartMetric === 'revenue' ? 'Doanh thu sản phẩm' : 'Đơn hàng sản phẩm'}</span>
              </div>
              <div className="v17-legend-indicator">
                <span className="v17-legend-color-box workshop" />
                <span>{chartMetric === 'revenue' ? 'Doanh thu workshop' : 'Lượt đặt workshop'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 4: OPERATIONAL BREAKDOWN (2 Columns)
          ========================================================================= */}
      <div className="v17-dual-section-grid">
        {/* Left Column: Product Inventory Snapshot */}
        <div className="v17-subpanel-card">
          <div className="v17-subpanel-header">
            <div>
              <h4 className="v17-subpanel-title">
                Cơ Cấu Danh Mục Sản Phẩm (Hiện Tại)
              </h4>
              <span className="v17-subpanel-sub">
                Snapshot trạng thái kinh doanh &amp; tồn kho kho hàng
              </span>
            </div>
            {onNavigateToProducts && (
              <button
                type="button"
                onClick={onNavigateToProducts}
                className="v17-subpanel-action-link"
              >
                <span>Quản lý kho</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>

          {/* Metrics List */}
          <div className="v17-status-list">
            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <span className="v17-status-circle green" />
                <span className="v17-status-text">Đang kinh doanh:</span>
              </div>
              <strong className="v17-status-val green">{data?.products_snapshot.selling || 0} sản phẩm</strong>
            </div>

            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <span className="v17-status-circle red" />
                <span className="v17-status-text">Hết hàng khả dụng:</span>
              </div>
              <strong className="v17-status-val red">{data?.products_snapshot.out_of_stock || 0} sản phẩm</strong>
            </div>

            <div className="v17-status-row-item warning">
              <div className="v17-status-row-content">
                <span className="v17-status-circle amber" />
                <span className="v17-status-text warning">Cảnh báo tồn kho thấp (≤ 5):</span>
              </div>
              <strong className="v17-status-val amber">{data?.products_snapshot.low_stock || 0} sản phẩm</strong>
            </div>

            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <span className="v17-status-circle blue" />
                <span className="v17-status-text">Chờ Admin phê duyệt:</span>
              </div>
              <strong className="v17-status-val blue">{data?.products_snapshot.pending || 0} sản phẩm</strong>
            </div>

            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <span className="v17-status-circle slate" />
                <span className="v17-status-text">Bản nháp / Chưa nộp duyệt:</span>
              </div>
              <strong className="v17-status-val slate">{data?.products_snapshot.draft || 0} sản phẩm</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Order Pipeline in Period */}
        <div className="v17-subpanel-card">
          <div className="v17-subpanel-header">
            <div>
              <h4 className="v17-subpanel-title">
                Tiến Độ Xử Lý Đơn Hàng Trong Kỳ
              </h4>
              <span className="v17-subpanel-sub">
                Tổng số: {data?.orders_summary.total_orders || 0} đơn hàng phát sinh
              </span>
            </div>
            {onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="v17-subpanel-action-link"
              >
                <span>Xem đơn hàng</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>

          {/* Orders Pipeline Breakdown */}
          <div className="v17-status-list">
            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="v17-status-text">Chờ xử lý:</span>
              </div>
              <strong className="v17-status-val amber">{data?.orders_summary.pending || 0} đơn</strong>
            </div>

            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span className="v17-status-text">Đang đóng gói / Chế tác:</span>
              </div>
              <strong className="v17-status-val blue">{data?.orders_summary.processing || 0} đơn</strong>
            </div>

            <div className="v17-status-row-item">
              <div className="v17-status-row-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span className="v17-status-text">Đang vận chuyển:</span>
              </div>
              <strong className="v17-status-val purple">{data?.orders_summary.shipped || 0} đơn</strong>
            </div>

            <div className="v17-status-row-item success">
              <div className="v17-status-row-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="v17-status-text success">Giao hàng thành công:</span>
              </div>
              <strong className="v17-status-val green">{data?.orders_summary.completed || 0} đơn</strong>
            </div>

            <div className="v17-status-row-item danger">
              <div className="v17-status-row-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="v17-status-text danger">Đơn bị hủy:</span>
              </div>
              <strong className="v17-status-val red">{data?.orders_summary.cancelled || 0} đơn</strong>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: TOP PERFORMERS LEADERBOARDS (2 Columns)
          ========================================================================= */}
      <div className="v17-dual-section-grid">
        {/* Top 5 Products */}
        <div className="v17-subpanel-card">
          <div className="v17-subpanel-title-with-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b78628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
            </svg>
            <h4 className="v17-subpanel-title">Top 5 Tác Phẩm Bán Chạy Trong Kỳ</h4>
          </div>

          {isLoading ? (
            <div className="v17-empty-hint">Đang tải danh sách...</div>
          ) : !data?.top_products || data.top_products.length === 0 ? (
            <div className="v17-empty-hint">
              Chưa ghi nhận sản phẩm bán ra trong kỳ này.
            </div>
          ) : (
            <div className="v17-leaderboard-list">
              {data.top_products.map((p: TopProductDto) => (
                <div key={p.product_id} className="v17-leaderboard-row">
                  <span className={`v17-rank-badge ${p.rank === 1 ? 'rank-top1' : ''}`}>
                    #{p.rank}
                  </span>

                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={p.product_name}
                      className="v17-performer-thumb"
                    />
                  ) : (
                    <div className="v17-performer-placeholder">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002720" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3h8M9 3v2a3 3 0 0 1-1 2.24C6.4 8.5 5 11 5 14a7 7 0 0 0 14 0c0-3-1.4-5.5-3-6.76A3 3 0 0 1 15 5V3" />
                        <path d="M7 14h10" />
                      </svg>
                    </div>
                  )}

                  <div className="v17-performer-info">
                    <div className="v17-performer-name">
                      {p.product_name}
                    </div>
                    <div className="v17-performer-meta">{p.category_name}</div>
                  </div>

                  <div className="v17-performer-stats">
                    <div className="v17-stat-primary-text product">
                      {formatNumber(p.total_sold)} cái
                    </div>
                    <div className="v17-stat-secondary-text">{formatCurrency(p.total_revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Workshops */}
        <div className="v17-subpanel-card">
          <div className="v17-subpanel-title-with-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b78628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h4 className="v17-subpanel-title">Top Workshop Trải Nghiệm Thu Hút Nhất</h4>
          </div>

          {isLoading ? (
            <div className="v17-empty-hint">Đang tải danh sách...</div>
          ) : !data?.top_workshops || data.top_workshops.length === 0 ? (
            <div className="v17-empty-hint">
              Chưa có lượt đặt workshop trong kỳ này.
            </div>
          ) : (
            <div className="v17-leaderboard-list">
              {data.top_workshops.map((w: TopWorkshopDto) => (
                <div key={w.workshop_id} className="v17-leaderboard-row">
                  <span className={`v17-rank-badge ${w.rank === 1 ? 'rank-top1' : ''}`}>
                    #{w.rank}
                  </span>

                  {w.cover_image_url ? (
                    <img
                      src={w.cover_image_url}
                      alt={w.workshop_name}
                      className="v17-performer-thumb"
                    />
                  ) : (
                    <div className="v17-performer-placeholder">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c88d38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
                        <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
                        <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
                        <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z" />
                      </svg>
                    </div>
                  )}

                  <div className="v17-performer-info">
                    <div className="v17-performer-name">
                      {w.workshop_name}
                    </div>
                    <div className="v17-performer-meta">Hướng dẫn: {w.artisan_name}</div>
                  </div>

                  <div className="v17-performer-stats">
                    <div className="v17-stat-primary-text workshop">
                      {formatNumber(w.total_bookings)} lượt ({w.total_participants} khách)
                    </div>
                    <div className="v17-stat-secondary-text">{formatCurrency(w.total_revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityStatisticsTab;
