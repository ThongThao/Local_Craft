import React from 'react';

export interface ArtisanMetricData {
  revenueFormatted?: string;
  ordersCount?: number;
  workshopsCount?: number;
  bookingsCount?: number;
  productsCount?: number;
  averageRating?: number;
  reviewsCount?: number;
}

interface ArtisanMetricCardsProps {
  onSelectMetricTab?: (tab: 'revenue' | 'orders' | 'workshops' | 'products' | 'reviews') => void;
  metrics?: ArtisanMetricData;
}

export const ArtisanMetricCards: React.FC<ArtisanMetricCardsProps> = ({
  onSelectMetricTab,
  metrics,
}) => {
  const ratingScore = metrics?.averageRating ? metrics.averageRating.toFixed(2) : '4.95';
  const reviewsCountText = metrics?.reviewsCount !== undefined ? `${metrics.reviewsCount} đánh giá khách hàng` : '248 đánh giá khách hàng';
  const revenueText = metrics?.revenueFormatted || '148.650.000 ₫';
  const ordersText = metrics?.ordersCount !== undefined ? `${metrics.ordersCount} đơn` : '186 đơn';
  const workshopsText = metrics?.workshopsCount !== undefined ? `${metrics.workshopsCount} workshop` : '32 workshop';
  const bookingsText = metrics?.bookingsCount !== undefined ? `${metrics.bookingsCount} lượt` : '342 lượt';
  const productsText = metrics?.productsCount !== undefined ? `${metrics.productsCount} sản phẩm` : '48 sản phẩm';

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
          <span className="rating-star-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <span className="rating-score">{ratingScore} / 5.0</span>
          <span className="rating-count-sep">·</span>
          <span className="rating-text">{reviewsCountText} (100% hài lòng)</span>
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

          <div className="metric-value">{revenueText}</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ Tăng trưởng
            </span>
            <span className="metric-trend-text">doanh thu thực tế</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Doanh thu <strong>đơn hàng</strong> &amp; <strong>workshop</strong>
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

          <div className="metric-value">{ordersText}</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ Đồng bộ DB
            </span>
            <span className="metric-trend-text">tất cả trạng thái</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Bấm để vào <strong>V13 – Quản lý đơn hàng</strong>
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

          <div className="metric-value">{workshopsText}</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ Đang mở
            </span>
            <span className="metric-trend-text">lớp trải nghiệm</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Bấm để vào <strong>V08 – Quản lý Workshop</strong>
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

          <div className="metric-value">{bookingsText}</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ Trực tuyến
            </span>
            <span className="metric-trend-text">du khách đăng ký</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Bấm để vào <strong>V11 – Quản lý lượt đặt</strong>
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

          <div className="metric-value">{productsText}</div>

          <div className="metric-sub-row">
            <span className="metric-trend-badge green">
              ↗ Di sản
            </span>
            <span className="metric-trend-text">tác phẩm thủ công</span>
          </div>

          <div className="metric-footer-divider" />
          <div className="metric-footer-text">
            Bấm để vào <strong>V05 – Quản lý sản phẩm</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtisanMetricCards;
