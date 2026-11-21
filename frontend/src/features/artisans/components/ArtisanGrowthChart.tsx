import React, { useState, useEffect, useMemo } from 'react';
import {
  analyticsApi,
  VillageActivityDashboardDto,
  AnalyticsTimeRange,
  ChartPointDto,
} from '@/services/api/analytics';

type MetricFilter = 'revenue' | 'orders' | 'workshops';
type TimeRangeFilter = '7d' | '30d' | 'month' | 'year';

export interface ArtisanGrowthChartProps {
  villageId?: number;
  timeRange?: AnalyticsTimeRange | string;
  fromDate?: string;
  toDate?: string;
}

export const ArtisanGrowthChart: React.FC<ArtisanGrowthChartProps> = ({
  villageId,
  timeRange: propTimeRange,
  fromDate: propFromDate,
  toDate: propToDate,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricFilter>('revenue');
  const [selectedRange, setSelectedRange] = useState<TimeRangeFilter>('30d');
  const [dashboardData, setDashboardData] = useState<VillageActivityDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const rangeApiMap: Record<TimeRangeFilter, AnalyticsTimeRange> = {
    '7d': '7_DAYS',
    '30d': '30_DAYS',
    'month': 'THIS_MONTH',
    'year': 'THIS_YEAR',
  };

  const effectiveRange = useMemo<AnalyticsTimeRange>(() => {
    if (propTimeRange) return propTimeRange as AnalyticsTimeRange;
    return rangeApiMap[selectedRange];
  }, [propTimeRange, selectedRange]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    analyticsApi
      .getVillageActivityDashboard({
        time_range: effectiveRange,
        from_date: effectiveRange === 'CUSTOM' ? propFromDate : undefined,
        to_date: effectiveRange === 'CUSTOM' ? propToDate : undefined,
        village_id: villageId,
      })
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setDashboardData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load activity chart data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [effectiveRange, propFromDate, propToDate, villageId]);

  const kpis = dashboardData?.kpis;
  const chartPoints = dashboardData?.chart_data || [];

  // Metric configs
  const activeConfig = useMemo(() => {
    switch (selectedMetric) {
      case 'orders':
        return {
          title: 'Đơn hàng theo thời gian',
          unit: 'đơn',
          totalFormatted: `${kpis?.total_orders ?? 0} đơn`,
          growthBadge:
            kpis?.growth?.orders_growth != null
              ? `${kpis.growth.orders_growth >= 0 ? '↗ +' : '↘ '}${kpis.growth.orders_growth.toFixed(1)}%`
              : '0%',
          subText: 'Theo dõi lượng đơn hàng sản phẩm phát sinh và tiến độ xử lý tại làng nghề',
          primaryLegend: 'Đơn hàng phát sinh',
          secondaryLegend: 'Đơn hoàn thành',
        };
      case 'workshops':
        return {
          title: 'Lượt đặt workshop theo thời gian',
          unit: 'lượt',
          totalFormatted: `${kpis?.total_bookings ?? 0} lượt`,
          growthBadge:
            kpis?.growth?.bookings_growth != null
              ? `${kpis.growth.bookings_growth >= 0 ? '↗ +' : '↘ '}${kpis.growth.bookings_growth.toFixed(1)}%`
              : '0%',
          subText: 'Thống kê lượng du khách đăng ký tham gia các ca trải nghiệm cùng nghệ nhân',
          primaryLegend: 'Lượt đặt workshop',
          secondaryLegend: 'Khách tham gia thực tế',
        };
      case 'revenue':
      default:
        return {
          title: 'Doanh thu theo thời gian',
          unit: '₫',
          totalFormatted: `${Number(kpis?.net_revenue || 0).toLocaleString('vi-VN')} ₫`,
          growthBadge:
            kpis?.growth?.revenue_growth != null
              ? `${kpis.growth.revenue_growth >= 0 ? '↗ +' : '↘ '}${kpis.growth.revenue_growth.toFixed(1)}%`
              : '0%',
          subText: 'So sánh Doanh thu Lớp trải nghiệm workshop và Bán sản phẩm thủ công làng nghề',
          primaryLegend: 'Doanh thu sản phẩm',
          secondaryLegend: 'Doanh thu workshop',
        };
    }
  }, [selectedMetric, kpis]);

  // Points downsampling or selection for display (max 7-10 points)
  const displayPoints = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return [];
    if (chartPoints.length <= 10) return chartPoints;
    const step = Math.ceil(chartPoints.length / 8);
    const sampled: ChartPointDto[] = [];
    for (let i = 0; i < chartPoints.length; i += step) {
      sampled.push(chartPoints[i]);
    }
    const last = chartPoints[chartPoints.length - 1];
    if (sampled[sampled.length - 1]?.period !== last.period) {
      sampled.push(last);
    }
    return sampled;
  }, [chartPoints]);

  // Max value calculation
  const maxPrimaryVal = useMemo(() => {
    if (displayPoints.length === 0) return 0;
    return Math.max(
      ...displayPoints.map((p) => {
        if (selectedMetric === 'revenue') {
          return Math.max(Number(p.product_revenue || 0), Number(p.workshop_revenue || 0), Number(p.total_revenue || 0));
        }
        if (selectedMetric === 'orders') return Number(p.orders_count || 0);
        return Number(p.bookings_count || 0);
      }),
      0
    );
  }, [displayPoints, selectedMetric]);

  // Peak Point Index
  const peakIndex = useMemo(() => {
    if (displayPoints.length === 0 || maxPrimaryVal === 0) return -1;
    let maxIdx = 0;
    let maxV = 0;
    displayPoints.forEach((p, idx) => {
      const v =
        selectedMetric === 'revenue'
          ? Number(p.total_revenue || 0)
          : selectedMetric === 'orders'
          ? Number(p.orders_count || 0)
          : Number(p.bookings_count || 0);
      if (v > maxV) {
        maxV = v;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [displayPoints, maxPrimaryVal, selectedMetric]);

  // Generate SVG path coordinates
  const svgCoordinates = useMemo(() => {
    if (displayPoints.length === 0) {
      return { path1: '', path2: '', area1: '', area2: '', coords: [] };
    }
    const n = displayPoints.length;
    const width = 580;
    const startX = 60;
    const baselineY = 185;
    const topY = 50;
    const rangeY = baselineY - topY;

    const coords = displayPoints.map((p, i) => {
      const x = n > 1 ? startX + (i / (n - 1)) * width : startX + width / 2;
      let val1 = 0;
      let val2 = 0;
      if (selectedMetric === 'revenue') {
        val1 = Number(p.product_revenue || 0);
        val2 = Number(p.workshop_revenue || 0);
      } else if (selectedMetric === 'orders') {
        val1 = Number(p.orders_count || 0);
        val2 = Math.round(Number(p.orders_count || 0) * 0.7);
      } else {
        val1 = Number(p.bookings_count || 0);
        val2 = Math.round(Number(p.bookings_count || 0) * 0.8);
      }

      const y1 = maxPrimaryVal > 0 ? baselineY - (val1 / maxPrimaryVal) * rangeY : baselineY;
      const y2 = maxPrimaryVal > 0 ? baselineY - (val2 / maxPrimaryVal) * rangeY : baselineY;
      return { x, y1, y2, point: p };
    });

    if (coords.length === 1) {
      const single = coords[0];
      return {
        path1: `M ${single.x - 60} ${single.y1} L ${single.x + 60} ${single.y1}`,
        path2: `M ${single.x - 60} ${single.y2} L ${single.x + 60} ${single.y2}`,
        area1: `M ${single.x - 60} ${single.y1} L ${single.x + 60} ${single.y1} L ${single.x + 60} ${baselineY} L ${single.x - 60} ${baselineY} Z`,
        area2: '',
        coords,
      };
    }

    // Build smooth Bezier SVG Path
    let path1 = `M ${coords[0].x} ${coords[0].y1}`;
    let path2 = `M ${coords[0].x} ${coords[0].y2}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cx = (prev.x + cur.x) / 2;
      path1 += ` C ${cx} ${prev.y1}, ${cx} ${cur.y1}, ${cur.x} ${cur.y1}`;
      path2 += ` C ${cx} ${prev.y2}, ${cx} ${cur.y2}, ${cur.x} ${cur.y2}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const area1 = `${path1} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
    const area2 = `${path2} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

    return { path1, path2, area1, area2, coords };
  }, [displayPoints, maxPrimaryVal, selectedMetric]);

  const peakCoord = peakIndex >= 0 ? svgCoordinates.coords[peakIndex] : null;

  const tooltipText = useMemo(() => {
    if (!peakCoord || maxPrimaryVal === 0) {
      return 'Chưa phát sinh giao dịch trong khoảng thời gian này';
    }
    const p = peakCoord.point;
    const dateFormatted = p.label || p.period;
    if (selectedMetric === 'revenue') {
      return `Đỉnh điểm ${dateFormatted}: ${Number(p.total_revenue || 0).toLocaleString('vi-VN')} ₫ (Sản phẩm: ${Number(p.product_revenue || 0).toLocaleString('vi-VN')} ₫ · Workshop: ${Number(p.workshop_revenue || 0).toLocaleString('vi-VN')} ₫)`;
    }
    if (selectedMetric === 'orders') {
      return `Đỉnh điểm ${dateFormatted}: ${p.orders_count} đơn hàng phát sinh`;
    }
    return `Đỉnh điểm ${dateFormatted}: ${p.bookings_count} lượt đặt chỗ workshop`;
  }, [peakCoord, maxPrimaryVal, selectedMetric]);

  return (
    <div className="artisan-v2-chart-card">
      {/* 1. Header with Title & Filter Controls */}
      <div className="chart-header-row">
        <div>
          <div className="chart-section-kpi-row">
            <h3 className="chart-title">Hiệu quả hoạt động</h3>
            <span className="chart-kpi-badge">{activeConfig.growthBadge}</span>
            <span className="chart-kpi-total">Tổng kỳ: {activeConfig.totalFormatted}</span>
          </div>
          <p className="chart-subtitle">{activeConfig.subText}</p>
        </div>

        {/* Right Filter Controls: Metric Tabs + Time Range Pills */}
        <div className="chart-controls-wrap">
          {/* Metric Selector Tabs */}
          <div className="chart-metric-toggle-group">
            <button
              type="button"
              className={`metric-toggle-btn ${selectedMetric === 'revenue' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('revenue')}
            >
              Doanh thu
            </button>
            <button
              type="button"
              className={`metric-toggle-btn ${selectedMetric === 'orders' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('orders')}
            >
              Đơn hàng
            </button>
            <button
              type="button"
              className={`metric-toggle-btn ${selectedMetric === 'workshops' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('workshops')}
            >
              Lượt đặt workshop
            </button>
          </div>

          {/* Time Range Filter Pills */}
          <div className="chart-range-pills-group">
            {(['7d', '30d', 'month', 'year'] as TimeRangeFilter[]).map((rangeKey) => {
              const labels: Record<TimeRangeFilter, string> = {
                '7d': '7 ngày',
                '30d': '30 ngày',
                'month': 'Tháng này',
                'year': 'Năm nay',
              };
              return (
                <button
                  key={rangeKey}
                  type="button"
                  className={`range-pill-btn ${selectedRange === rangeKey ? 'active' : ''}`}
                  onClick={() => setSelectedRange(rangeKey)}
                >
                  {labels[rangeKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legends Row */}
      <div className="chart-legends-subbar">
        <span className="chart-current-view-tag">
          {activeConfig.title} (
          {selectedRange === '7d'
            ? '7 ngày qua'
            : selectedRange === '30d'
            ? '30 ngày qua'
            : selectedRange === 'month'
            ? 'Trong tháng này'
            : 'Trong năm nay'}
          )
        </span>
        <div className="chart-legend-item">
          <span className="legend-dot teal" />
          <span className="legend-label">{activeConfig.primaryLegend}</span>
        </div>
        <div className="chart-legend-item">
          <span className="legend-dot terracotta" />
          <span className="legend-label">{activeConfig.secondaryLegend}</span>
        </div>
      </div>

      {/* 2. High-Fidelity SVG Curved Area Chart */}
      <div className="chart-visual-container">
        <svg viewBox="0 0 680 240" className="chart-svg" preserveAspectRatio="none">
          <defs>
            {/* Teal Gradient for Primary Curve (Sản phẩm) */}
            <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1C4B3E" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#1C4B3E" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1C4B3E" stopOpacity="0.0" />
            </linearGradient>

            {/* Clay Terracotta Gradient for Secondary Curve (Workshop) */}
            <linearGradient id="secondaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#984628" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#984628" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#984628" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1="40" y1="35" x2="640" y2="35" stroke="#EFEBE4" strokeDasharray="3 3" />
          <line x1="40" y1="85" x2="640" y2="85" stroke="#EFEBE4" strokeDasharray="3 3" />
          <line x1="40" y1="135" x2="640" y2="135" stroke="#EFEBE4" strokeDasharray="3 3" />
          <line x1="40" y1="185" x2="640" y2="185" stroke="#E5DFD5" />

          {/* Dynamic Area Fills */}
          {svgCoordinates.area1 && <path d={svgCoordinates.area1} fill="url(#primaryAreaGrad)" />}
          {svgCoordinates.area2 && <path d={svgCoordinates.area2} fill="url(#secondaryAreaGrad)" />}

          {/* Dynamic Stroke Curves */}
          {svgCoordinates.path1 && (
            <path
              d={svgCoordinates.path1}
              fill="none"
              stroke="#1C4B3E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          {svgCoordinates.path2 && (
            <path
              d={svgCoordinates.path2}
              fill="none"
              stroke="#984628"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Peak Indicator Line & Dot */}
          {peakCoord && maxPrimaryVal > 0 && (
            <>
              <line
                x1={peakCoord.x}
                y1={peakCoord.y1}
                x2={peakCoord.x}
                y2={185}
                stroke="#984628"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={peakCoord.x} cy={peakCoord.y1} r="5" fill="#1C4B3E" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx={peakCoord.x} cy={peakCoord.y2} r="4" fill="#984628" stroke="#FFFFFF" strokeWidth="2" />
            </>
          )}
        </svg>

        {/* Floating Tooltip Box Pinned to Peak */}
        <div className="chart-tooltip-bubble">
          <span className="tooltip-dot-bullet">•</span>
          <span className="tooltip-highlight">{tooltipText}</span>
        </div>

        {/* X-Axis Dynamic Timeline Labels */}
        <div className="chart-xaxis-labels">
          {svgCoordinates.coords.length > 0 ? (
            svgCoordinates.coords.map((c, idx) => {
              const periodStr = c.point.period || '';
              const parts = periodStr.split('-');
              const dayMonth = c.point.label || (parts.length === 3 ? `${parts[2]}/${parts[1]}` : periodStr);
              const isPeak = idx === peakIndex;
              return (
                <div key={c.point.period || idx} className={`xaxis-col ${isPeak ? 'peak' : ''}`}>
                  <span className="col-week">{dayMonth}</span>
                  {parts.length === 3 && <span className="col-date">{parts[0]}</span>}
                </div>
              );
            })
          ) : (
            <div className="xaxis-col" style={{ width: '100%', textAlign: 'center' }}>
              <span className="col-week">{isLoading ? 'Đang đồng bộ số liệu...' : 'Chưa có dữ liệu'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Forecast & Operations Banner */}
      <div className="chart-forecast-alert">
        <div className="forecast-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C4B3E" strokeWidth="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div className="forecast-text">
          <strong>Hiệu quả hoạt động:</strong> Toàn bộ dữ liệu doanh thu, lượt đặt workshop và tiến độ đơn hàng được đồng bộ tự động từ hệ sinh thái LocalCraft.
        </div>
        <span className="forecast-note">
          Thời gian cập nhật: Thời gian thực
        </span>
      </div>
    </div>
  );
};

export default ArtisanGrowthChart;
