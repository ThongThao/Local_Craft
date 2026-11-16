import React, { useState } from 'react';
import {
  CraftVillageData,
  ArtisanProfileItem,
  CraftProductItem,
  CraftWorkshopItem,
  OrderItemRecord,
  WorkshopBookingRecord,
  MonthlyRevenueData,
} from '../../types';

interface OverviewTabProps {
  village: CraftVillageData;
  artisan: ArtisanProfileItem;
  products: CraftProductItem[];
  workshops: CraftWorkshopItem[];
  orders: OrderItemRecord[];
  bookings: WorkshopBookingRecord[];
  chartData: MonthlyRevenueData[];
  onOpenAddModal: (type: 'artisan' | 'product' | 'workshop') => void;
  onViewAllOrders: () => void;
  onViewAllWorkshops: () => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderItemRecord['status']) => void;
  onCheckInBooking: (bookingId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  village,
  artisan,
  products,
  workshops,
  orders,
  bookings,
  chartData,
  onOpenAddModal,
  onViewAllOrders,
  onViewAllWorkshops,
  onUpdateOrderStatus,
  onCheckInBooking,
}) => {
  const [chartMetric, setChartMetric] = useState<'revenue' | 'visitors'>('revenue');
  const [activeChartBar, setActiveChartBar] = useState<number | null>(5); // default last month

  const maxRevenue = Math.max(...chartData.map((d) => d.productRevenue + d.workshopRevenue));
  const maxVisitors = Math.max(...chartData.map((d) => d.visitors));

  const recentOrders = orders.slice(0, 3);
  const upcomingBookings = bookings.slice(0, 3);

  return (
    <div className="artisan-tab-pane overview-pane">
      {/* Upper Master Grid: Interactive Chart + Heritage Scorecard */}
      <div className="overview-upper-grid">
        {/* Interactive Chart Card */}
        <div className="overview-card chart-card">
          <div className="card-header-row">
            <div>
              <div className="card-badge">BÁO CÁO TĂNG TRƯỞNG</div>
              <h3 className="card-title">Biểu Đồ Doanh Thu & Du Khách 6 Tháng</h3>
              <p className="card-subtitle">
                Theo dõi tiêu thụ {products.length} tác phẩm và lượt trải nghiệm tại {village.name} (Đại diện: {artisan.displayName})
              </p>
            </div>

            <div className="chart-metric-toggle">
              <button
                type="button"
                className={`chart-toggle-btn ${chartMetric === 'revenue' ? 'active' : ''}`}
                onClick={() => setChartMetric('revenue')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="6" x2="12" y2="18" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Doanh thu (Triệu ₫)
              </button>
              <button
                type="button"
                className={`chart-toggle-btn ${chartMetric === 'visitors' ? 'active' : ''}`}
                onClick={() => setChartMetric('visitors')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Du khách (Lượt)
              </button>
            </div>
          </div>

          {/* Chart Display Visual Area */}
          <div className="interactive-chart-container">
            <div className="chart-bars-wrap">
              {chartData.map((d, index) => {
                const totalRev = d.productRevenue + d.workshopRevenue;
                const heightPercent =
                  chartMetric === 'revenue'
                    ? Math.round((totalRev / (maxRevenue * 1.15)) * 100)
                    : Math.round((d.visitors / (maxVisitors * 1.15)) * 100);

                const isSelected = activeChartBar === index;

                return (
                  <div
                    key={d.month}
                    className={`chart-bar-col ${isSelected ? 'selected' : ''}`}
                    onMouseEnter={() => setActiveChartBar(index)}
                  >
                    {/* Floating Tooltip */}
                    {isSelected && (
                      <div className="chart-tooltip">
                        <div className="tooltip-title">{d.month}</div>
                        {chartMetric === 'revenue' ? (
                          <>
                            <div className="tooltip-row">
                              <span className="tooltip-dot prod-dot" />
                              <span>Tác phẩm: <strong>{d.productRevenue} Tr ₫</strong></span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-dot ws-dot" />
                              <span>Workshop: <strong>{d.workshopRevenue} Tr ₫</strong></span>
                            </div>
                            <div className="tooltip-total">
                              Tổng: <strong>{totalRev} Triệu ₫</strong>
                            </div>
                          </>
                        ) : (
                          <div className="tooltip-row">
                            <span className="tooltip-dot vis-dot" />
                            <span>Khách đến xưởng: <strong>{d.visitors.toLocaleString()} lượt</strong></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bar visualization */}
                    <div className="bar-track">
                      {chartMetric === 'revenue' ? (
                        <div className="bar-stacked-fill" style={{ height: `${heightPercent}%` }}>
                          <div
                            className="bar-segment product-seg"
                            style={{ height: `${(d.productRevenue / totalRev) * 100}%` }}
                            title={`Tác phẩm: ${d.productRevenue} Tr`}
                          />
                          <div
                            className="bar-segment workshop-seg"
                            style={{ height: `${(d.workshopRevenue / totalRev) * 100}%` }}
                            title={`Workshop: ${d.workshopRevenue} Tr`}
                          />
                        </div>
                      ) : (
                        <div className="bar-single-fill" style={{ height: `${heightPercent}%` }} />
                      )}
                    </div>

                    <div className="bar-label">{d.month}</div>
                  </div>
                );
              })}
            </div>

            {/* Legend & summary */}
            <div className="chart-legend-row">
              {chartMetric === 'revenue' ? (
                <>
                  <div className="legend-item">
                    <span className="legend-box product-box" />
                    <span>Tác phẩm thủ công (68%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-box workshop-box" />
                    <span>Vé trải nghiệm workshop (32%)</span>
                  </div>
                  <div className="legend-summary">
                    Kỷ lục tháng 10: <strong>270.500.000₫</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="legend-item">
                    <span className="legend-box visitor-box" />
                    <span>Lượt khách ghé xưởng & tham quan làng nghề</span>
                  </div>
                  <div className="legend-summary">
                    Tháng 10 đón: <strong>3.420 du khách</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Digital Heritage Preservation Scorecard */}
        <div className="overview-card heritage-card">
          <div className="card-badge gold">SỐ HÓA DI SẢN</div>
          <h3 className="card-title">Chỉ Số Bảo Tồn & Số Hóa</h3>
          <p className="card-subtitle">Tiến độ tiêu chuẩn di sản làng nghề thông minh</p>

          <div className="preservation-radial-wrapper">
            <div className="preservation-score-circle">
              <svg className="radial-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" className="radial-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="radial-fill"
                  strokeDasharray="264"
                  strokeDashoffset="26.4" // 90%
                />
              </svg>
              <div className="radial-inner-content">
                <span className="radial-score">92%</span>
                <span className="radial-label">Xuất sắc</span>
              </div>
            </div>

            <div className="preservation-checklist">
              <div className="preservation-item done">
                <span className="check-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="item-text">
                  <strong>Mã QR Truy Xuất Nguồn Gốc:</strong>
                  <span>100% tác phẩm được định danh chống hàng giả</span>
                </div>
              </div>
              <div className="preservation-item done">
                <span className="check-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="item-text">
                  <strong>Hồ Sơ Nghệ Nhân Di Sản:</strong>
                  <span>Đã thẩm định 42 hồ sơ nghệ nhân gia tộc</span>
                </div>
              </div>
              <div className="preservation-item done">
                <span className="check-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="item-text">
                  <strong>Video & Ký Ức Làng Nghề:</strong>
                  <span>Số hóa kỹ thuật vuốt tay & canh lửa lò củi</span>
                </div>
              </div>
              <div className="preservation-item progress">
                <span className="check-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <div className="item-text">
                  <strong>Bảo Tồn Bản Quyền Men Cổ:</strong>
                  <span>Đang đăng ký chỉ dẫn địa lý quốc tế</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="card-full-btn"
            onClick={() => onOpenAddModal('artisan')}
          >
            Bổ Sung Hồ Sơ Nghệ Nhân & Bí Quyết Di Sản
          </button>
        </div>
      </div>

      {/* Lower Master Grid: Upcoming Workshop Bookings & Recent Orders */}
      <div className="overview-lower-grid">
        {/* Upcoming Workshop Sessions */}
        <div className="overview-card workshops-preview-card">
          <div className="card-header-row">
            <div>
              <div className="card-badge sage">CA WORKSHOP SẮP DIỄN RA</div>
              <h3 className="card-title">Lịch Đón Du Khách Trải Nghiệm</h3>
            </div>
            <button
              type="button"
              className="text-link-btn"
              onClick={onViewAllWorkshops}
            >
              Xem tất cả ({workshops.length}) →
            </button>
          </div>

          <div className="preview-items-list">
            {upcomingBookings.map((b) => (
              <div key={b.bookingId} className="booking-preview-item">
                <div className="booking-avatar-date">
                  <div className="date-badge">
                    <span className="date-time">14:30</span>
                    <span className="date-sub">18/10</span>
                  </div>
                </div>

                <div className="booking-main-info">
                  <div className="booking-title">{b.workshopTitle}</div>
                  <div className="booking-guest">
                    Du khách: <strong>{b.guestName}</strong> · {b.guestPhone} ({b.guestCount} khách)
                  </div>
                  {b.specialNote && (
                    <div className="booking-note">Ghi chú: {b.specialNote}</div>
                  )}
                </div>

                <div className="booking-action-col">
                  <div className="booking-amount">{b.formattedAmount}</div>
                  {b.status === 'CHECKED_IN' ? (
                    <span className="status-pill checked-in">Đã Check-in</span>
                  ) : (
                    <button
                      type="button"
                      className="checkin-btn"
                      onClick={() => onCheckInBooking(b.bookingId)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Quét QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card-bottom-actions">
            <button
              type="button"
              className="action-link-btn"
              onClick={() => onOpenAddModal('workshop')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Mở Ca Workshop Mới
            </button>
          </div>
        </div>

        {/* Recent Product Orders */}
        <div className="overview-card orders-preview-card">
          <div className="card-header-row">
            <div>
              <div className="card-badge peach">ĐƠN ĐẶT HÀNG MỚI</div>
              <h3 className="card-title">Tác Phẩm Chờ Xử Lý & Đóng Gói</h3>
            </div>
            <button
              type="button"
              className="text-link-btn"
              onClick={onViewAllOrders}
            >
              Xem tất cả ({orders.length}) →
            </button>
          </div>

          <div className="preview-items-list">
            {recentOrders.map((o) => (
              <div key={o.orderId} className="order-preview-item">
                <div className="order-code-badge">
                  <span className="order-code">{o.orderId}</span>
                  <span className="order-time">{o.orderDate}</span>
                </div>

                <div className="order-info-col">
                  <div className="order-prod-title">{o.productTitle}</div>
                  <div className="order-customer">
                    Người mua: <strong>{o.customerName}</strong> · {o.customerLocation}
                  </div>
                  <div className="order-meta-row">
                    <span className="order-qty">Số lượng: {o.quantity}</span>
                    <span className="order-method">Thanh toán: {o.paymentMethod}</span>
                    {o.isCustomOrder && (
                      <span className="custom-order-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Đặt riêng theo yêu cầu
                      </span>
                    )}
                  </div>
                </div>

                <div className="order-action-col">
                  <div className="order-total">{o.formattedAmount}</div>
                  {o.status === 'PENDING' && (
                    <button
                      type="button"
                      className="order-btn-confirm"
                      onClick={() => onUpdateOrderStatus(o.orderId, 'PREPARING')}
                    >
                      Xác nhận đơn
                    </button>
                  )}
                  {o.status === 'PREPARING' && (
                    <button
                      type="button"
                      className="order-btn-ship"
                      onClick={() => onUpdateOrderStatus(o.orderId, 'SHIPPING')}
                    >
                      Bàn giao ship
                    </button>
                  )}
                  {o.status === 'SHIPPING' && (
                    <span className="status-pill shipping">Đang giao hàng</span>
                  )}
                  {o.status === 'COMPLETED' && (
                    <span className="status-pill completed">Hoàn tất</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card-bottom-actions">
            <button
              type="button"
              className="action-link-btn"
              onClick={() => onOpenAddModal('product')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Đăng Tác Phẩm Thủ Công Mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OverviewTab;
