import React, { useState } from 'react';

type MetricFilter = 'revenue' | 'orders' | 'workshops';
type TimeRangeFilter = '7d' | '30d' | '6m' | '1y';

interface ChartDataPoint {
  label: string;
  subLabel: string;
  primaryValue: number; // percentage for svg y coordinate
  secondaryValue?: number;
  highlightText: string;
}

export const ArtisanGrowthChart: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricFilter>('revenue');
  const [selectedRange, setSelectedRange] = useState<TimeRangeFilter>('6m');

  // TODO [API]: Khi backend triển khai endpoint thống kê, hãy thay thế mockData bằng:
  // discoveryApi.getPerformanceAnalytics({ metric: selectedMetric, range: selectedRange })
  // Endpoint dự kiến: GET /api/v1/analytics/activity-chart?metric=...&range=...

  // Cấu hình nhãn & giá trị thống kê tóm tắt theo metric
  const metricConfigs = {
    revenue: {
      title: 'Doanh thu theo thời gian',
      unit: '₫',
      totalFormatted: '842.500.000 ₫',
      growthBadge: '↗ +12,5%',
      subText: 'So sánh Doanh thu Lớp trải nghiệm gốm và Bán sản phẩm độc bản',
      primaryLegend: 'Workshop trải nghiệm',
      secondaryLegend: 'Tác phẩm xuất xưởng',
      tooltip: 'Đỉnh điểm tháng 11: 148.650.000 ₫ (Toàn bộ 32 ca workshop đạt công suất 95%)',
    },
    orders: {
      title: 'Đơn hàng theo thời gian',
      unit: 'đơn',
      totalFormatted: '1.120 đơn',
      growthBadge: '↗ +8,2%',
      subText: 'Theo dõi lượng đơn hàng xuất kho nội địa và đơn hàng du khách quốc tế',
      primaryLegend: 'Đơn hàng nội địa',
      secondaryLegend: 'Đơn xuất khẩu/quốc tế',
      tooltip: 'Tháng 11 đạt 186 đơn (Tăng 14 đơn so với tháng 10 nhờ mùa lễ hội làng nghề)',
    },
    workshops: {
      title: 'Lượt đặt workshop theo thời gian',
      unit: 'lượt',
      totalFormatted: '2.040 lượt',
      growthBadge: '↗ +15,6%',
      subText: 'Thống kê lượng du khách tham gia các ca trải nghiệm làm gốm cùng nghệ nhân',
      primaryLegend: 'Khách đoàn & Tour',
      secondaryLegend: 'Khách lẻ trải nghiệm',
      tooltip: 'Tháng 11 ghi nhận 342 lượt khách đặt chỗ (82% đặt trước qua cổng trực tuyến)',
    },
  };

  // Cấu hình mốc thời gian hiển thị trục hoành X theo TimeRange
  const timeRangePoints: Record<TimeRangeFilter, ChartDataPoint[]> = {
    '7d': [
      { label: 'Thứ 2', subLabel: '24/11', primaryValue: 160, highlightText: '18 đơn' },
      { label: 'Thứ 3', subLabel: '25/11', primaryValue: 140, highlightText: '24 đơn' },
      { label: 'Thứ 4', subLabel: '26/11', primaryValue: 150, highlightText: '21 đơn' },
      { label: 'Thứ 5', subLabel: '27/11', primaryValue: 110, highlightText: '35 đơn' },
      { label: 'Thứ 6', subLabel: '28/11', primaryValue: 90, highlightText: '42 đơn' },
      { label: 'Thứ 7', subLabel: '29/11', primaryValue: 65, highlightText: '58 đơn - Kín chỗ' },
      { label: 'Chủ Nhật', subLabel: '30/11', primaryValue: 75, highlightText: '54 đơn' },
    ],
    '30d': [
      { label: 'Tuần 1', subLabel: '01 - 07/11', primaryValue: 170, highlightText: '36.000.000 đ' },
      { label: 'Tuần 2', subLabel: '08 - 14/11', primaryValue: 125, highlightText: '50.000.000 đ' },
      { label: 'Tuần 3', subLabel: '15 - 21/11', primaryValue: 65, highlightText: 'Cao điểm lễ hội' },
      { label: 'Tuần 4', subLabel: '22 - 28/11', primaryValue: 90, highlightText: '76.000.000 đ' },
      { label: 'Hiện tại', subLabel: '29 - 30/11', primaryValue: 110, highlightText: '66.000.000 đ' },
    ],
    '6m': [
      { label: 'Tháng 6', subLabel: '06/2024', primaryValue: 175, highlightText: '112.000.000 đ' },
      { label: 'Tháng 7', subLabel: '07/2024', primaryValue: 155, highlightText: '124.000.000 đ' },
      { label: 'Tháng 8', subLabel: '08/2024', primaryValue: 140, highlightText: '135.000.000 đ' },
      { label: 'Tháng 9', subLabel: '09/2024', primaryValue: 120, highlightText: '142.000.000 đ' },
      { label: 'Tháng 10', subLabel: '10/2024', primaryValue: 95, highlightText: '132.000.000 đ' },
      { label: 'Tháng 11', subLabel: '11/2024', primaryValue: 65, highlightText: '148.650.000 đ' },
    ],
    '1y': [
      { label: 'Quý 1', subLabel: 'T1 - T3', primaryValue: 165, highlightText: '320.000.000 đ' },
      { label: 'Quý 2', subLabel: 'T4 - T6', primaryValue: 135, highlightText: '390.000.000 đ' },
      { label: 'Quý 3', subLabel: 'T7 - T9', primaryValue: 100, highlightText: '460.000.000 đ' },
      { label: 'Quý 4 (Dự kiến)', subLabel: 'T10 - T12', primaryValue: 65, highlightText: '580.000.000 đ' },
    ],
  };

  const currentPoints = timeRangePoints[selectedRange];
  const activeConfig = metricConfigs[selectedMetric];

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
          <p className="chart-subtitle">
            {activeConfig.subText}
          </p>
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
            {(['7d', '30d', '6m', '1y'] as TimeRangeFilter[]).map((rangeKey) => {
              const labels: Record<TimeRangeFilter, string> = {
                '7d': '7 ngày',
                '30d': '30 ngày',
                '6m': '6 tháng',
                '1y': '1 năm',
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
          {activeConfig.title} ({selectedRange === '7d' ? '7 ngày' : selectedRange === '30d' ? '30 ngày' : selectedRange === '6m' ? '6 tháng gần nhất' : '1 năm'})
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
        <svg
          viewBox="0 0 680 240"
          className="chart-svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Teal Gradient for Primary Curve */}
            <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1C4B3E" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#1C4B3E" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1C4B3E" stopOpacity="0.0" />
            </linearGradient>

            {/* Clay Terracotta Gradient for Secondary Curve */}
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

          {/* Area 1: Primary Stream (Higher curve) */}
          <path
            d="M 60 160 C 130 150, 180 120, 230 110 C 290 100, 340 60, 420 55 C 490 50, 540 85, 590 75 C 610 72, 630 80, 640 85 L 640 185 L 60 185 Z"
            fill="url(#primaryAreaGrad)"
          />

          {/* Area 2: Secondary Stream (Lower curve) */}
          <path
            d="M 60 175 C 130 170, 180 148, 230 140 C 290 135, 340 115, 420 110 C 490 105, 540 120, 590 115 C 610 112, 630 122, 640 125 L 640 185 L 60 185 Z"
            fill="url(#secondaryAreaGrad)"
          />

          {/* Stroke Line 1: Primary (Teal) */}
          <path
            d="M 60 160 C 130 150, 180 120, 230 110 C 290 100, 340 60, 420 55 C 490 50, 540 85, 590 75 C 610 72, 630 80, 640 85"
            fill="none"
            stroke="#1C4B3E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Stroke Line 2: Secondary (Terracotta) */}
          <path
            d="M 60 175 C 130 170, 180 148, 230 140 C 290 135, 340 115, 420 110 C 490 105, 540 120, 590 115 C 610 112, 630 122, 640 125"
            fill="none"
            stroke="#984628"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Peak Indicator on Current Period (x=420, y=55) */}
          <line x1="420" y1="55" x2="420" y2="185" stroke="#984628" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="420" cy="55" r="5" fill="#984628" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="420" cy="110" r="4" fill="#1C4B3E" stroke="#FFFFFF" strokeWidth="2" />
        </svg>

        {/* Floating Tooltip Box Pinned to Peak */}
        <div className="chart-tooltip-bubble">
          <span className="tooltip-dot-bullet">•</span>
          <span className="tooltip-highlight">{activeConfig.tooltip}</span>
        </div>

        {/* X-Axis Dynamic Timeline Labels */}
        <div className="chart-xaxis-labels">
          {currentPoints.map((pt, idx) => (
            <div key={idx} className={`xaxis-col ${idx === currentPoints.length - 2 ? 'peak' : ''}`}>
              <span className="col-week">{pt.label}</span>
              <span className="col-date">{pt.subLabel}</span>
            </div>
          ))}
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
          <strong>Dự báo quý tới:</strong> Nhu cầu du lịch trải nghiệm làng nghề và đơn hàng quà tặng Tết dự kiến tăng <strong>+35%</strong>
        </div>
        <span className="forecast-note">
          Cơ sở: 08 bàn xoay xưởng số 1 & 2 đã sẵn sàng phục vụ
        </span>
      </div>
    </div>
  );
};

export default ArtisanGrowthChart;
