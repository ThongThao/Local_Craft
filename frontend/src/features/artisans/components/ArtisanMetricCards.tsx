import React from 'react';

interface ArtisanMetricCardsProps {
  onSelectMetricTab?: (tab: 'revenue' | 'orders' | 'workshops' | 'products' | 'reviews') => void;
}

export const ArtisanMetricCards: React.FC<ArtisanMetricCardsProps> = ({
  onSelectMetricTab,
}) => {
  return (
    <div className="artisan-v2-metrics-section">
      {/* Secondary Badge: Đánh giá khách hàng (Đặt ở vị trí phụ, không làm lu mờ 5 KPI chính) */}
      <div className="metrics-header-meta">
        <span className="metrics-section-title">THỐNG KÊ</span>
        <div
          className="metrics-rating-pill"
          title="Bấm để xem màn hình V15 – Đánh giá và phản hồi"
          onClick={() => onSelectMetricTab?.('reviews')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <span className="rating-star-icon">★</span>
          <span className="rating-score">4.95 / 5.0</span>
          <span className="rating-count-sep">·</span>
          <span className="rating-text">248 đánh giá khách hàng (98.2% hài lòng)</span>
        </div>
      </div>

      {/* 5 Thẻ KPI cốt lõi */}
      <div className="artisan-v2-metrics-row">
        {/* 1. DOANH THU */}
        <div
          className="artisan-v2-metric-card"
          onClick={() => onSelectMetricTab?.('revenue')}
          title="Chuyển tới màn hình V17 – Thống kê hoạt động & Doanh thu"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header-row">
            <span className="metric-label">DOANH THU</span>
            <div className="metric-icon-box dark-green">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>

          <div className="metric-value">148.650.000 ₫</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ +12,5%
            </span>
            <span className="metric-trend-text">so với kỳ trước</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Workshop: <strong>65%</strong> · Sản phẩm: <strong>35%</strong>
          </div>
        </div>

        {/* 2. ĐƠN HÀNG */}
        <div
          className="artisan-v2-metric-card"
          onClick={() => onSelectMetricTab?.('orders')}
          title="Chuyển tới màn hình V13 – Quản lý đơn hàng làng nghề"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header-row">
            <span className="metric-label">ĐƠN HÀNG</span>
            <div className="metric-icon-box peach">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>

          <div className="metric-value">186 đơn</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ +8,2%
            </span>
            <span className="metric-trend-text">so với kỳ trước</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            <strong>154</strong> nội địa · <strong>32</strong> quốc tế
          </div>
        </div>

        {/* 3. WORKSHOP */}
        <div
          className="artisan-v2-metric-card"
          onClick={() => onSelectMetricTab?.('workshops')}
          title="Chuyển tới màn hình V08 – Quản lý workshop"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header-row">
            <span className="metric-label">WORKSHOP</span>
            <div className="metric-icon-box dark-green">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>

          <div className="metric-value">32 workshop</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ +4,1%
            </span>
            <span className="metric-trend-text">so với kỳ trước</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            <strong>8</strong> ca mở · <strong>4</strong> ca kín chỗ
          </div>
        </div>

        {/* 4. LƯỢT ĐẶT */}
        <div
          className="artisan-v2-metric-card"
          onClick={() => onSelectMetricTab?.('orders')}
          title="Chuyển tới màn hình V11 – Quản lý lượt đặt workshop"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header-row">
            <span className="metric-label">LƯỢT ĐẶT</span>
            <div className="metric-icon-box peach">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>

          <div className="metric-value">342 lượt</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ +15,6%
            </span>
            <span className="metric-trend-text">so với kỳ trước</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Đặt trước <strong>82%</strong> qua trực tuyến
          </div>
        </div>

        {/* 5. SẢN PHẨM */}
        <div
          className="artisan-v2-metric-card"
          onClick={() => onSelectMetricTab?.('products')}
          title="Chuyển tới màn hình V05 – Quản lý sản phẩm"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-header-row">
            <span className="metric-label">SẢN PHẨM</span>
            <div className="metric-icon-box gray">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>

          <div className="metric-value">48 sản phẩm</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ +6 sản phẩm
            </span>
            <span className="metric-trend-text">so với kỳ trước</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            <strong>6</strong> độc bản · <strong>42</strong> tiêu chuẩn
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtisanMetricCards;
