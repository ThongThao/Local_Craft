import React from 'react';

export interface OperationBookingItem {
  id: string;
  customerName: string;
  customerCountry: string;
  customerAvatarBg?: string;
  customerInitials?: string;
  workshopName: string;
  workshopNote?: string;
  scheduleTime: string;
  participantsCount: string;
  totalAmountFormatted: string;
  status: string;
  statusLabel: string;
}

interface ArtisanOperationsTableProps {
  onViewAll?: () => void;
  onViewBookingDetail?: (bookingId: string) => void;
  onPrintReceipt?: (bookingId: string) => void;
  bookings?: OperationBookingItem[];
}

export const ArtisanOperationsTable: React.FC<ArtisanOperationsTableProps> = ({
  onViewAll,
  onViewBookingDetail,
  onPrintReceipt,
  bookings: dynamicBookings,
}) => {
  const recentBookings = dynamicBookings !== undefined ? dynamicBookings : [];

  return (
    <div className="artisan-v2-operations-card">
      {/* Table Header Row with Title & "Xem tất cả" Link to V11 */}
      <div className="operations-header-bar">
        <div>
          <div className="operations-title-flex">
            <h3 className="operations-card-title">Lượt đặt workshop gần đây</h3>
            <span className="operations-count-pill">
              {recentBookings.length > 0 ? `${String(recentBookings.length).padStart(2, '0')} lượt mới nhất` : '0 lượt'}
            </span>
          </div>
          <p className="operations-card-subtitle">
            Danh sách du khách đăng ký tham gia lớp học làm gốm tại xưởng làng nghề
          </p>
        </div>

        {/* Nút Xem tất cả dẫn tới màn hình V11 - Quản lý lượt đặt workshop */}
        <button
          type="button"
          className="operations-view-all-btn"
          onClick={onViewAll}
          title="Chuyển tới màn hình V11 – Quản lý lượt đặt workshop"
        >
          <span>Xem tất cả</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Table Container: 7 Cột rõ ràng, chuẩn phong cách di sản */}
      <div className="operations-table-wrap">
        <table className="operations-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>KHÁCH HÀNG</th>
              <th style={{ width: '28%' }}>WORKSHOP</th>
              <th style={{ width: '16%' }}>THỜI GIAN</th>
              <th style={{ width: '10%' }}>SỐ LƯỢNG</th>
              <th style={{ width: '12%' }}>TỔNG TIỀN</th>
              <th style={{ width: '12%' }}>TRẠNG THÁI</th>
              <th style={{ width: '8%', textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Chưa có lượt đặt workshop nào phát sinh</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Các lượt du khách đăng ký tham gia workshop sẽ hiển thị tại đây</span>
                  </div>
                </td>
              </tr>
            ) : (
              recentBookings.map((row) => (
              <tr
                key={row.id}
                onClick={() => onViewBookingDetail?.(row.id)}
                className="clickable-table-row"
                title="Bấm để xem chi tiết lượt đặt (V12)"
              >
                {/* 1. Khách hàng */}
                <td>
                  <div className="guest-info-cell">
                    <div
                      className="guest-avatar-circle"
                      style={{ backgroundColor: row.customerAvatarBg }}
                    >
                      {row.customerInitials}
                    </div>
                    <div className="guest-texts">
                      <div className="guest-name-row">
                        <strong className="guest-name">{row.customerName}</strong>
                        <span className="guest-country-tag">{row.customerCountry}</span>
                      </div>
                      <div className="guest-code">{row.id}</div>
                    </div>
                  </div>
                </td>

                {/* 2. Workshop */}
                <td>
                  <div className="workshop-info-cell">
                    <strong className="workshop-name">{row.workshopName}</strong>
                    <div className="workshop-note">{row.workshopNote}</div>
                  </div>
                </td>

                {/* 3. Thời gian */}
                <td>
                  <div className="time-cell">{row.scheduleTime}</div>
                </td>

                {/* 4. Số lượng người */}
                <td>
                  <div className="quantity-cell">{row.participantsCount}</div>
                </td>

                {/* 5. Tổng tiền */}
                <td>
                  <div className="total-amount-cell">{row.totalAmountFormatted}</div>
                </td>

                {/* 6. Trạng thái */}
                <td>
                  {row.status === 'CHECKED_IN' && (
                    <span className="status-badge-v2 checked-in">
                      {row.statusLabel}
                    </span>
                  )}
                  {row.status === 'PENDING' && (
                    <span className="status-badge-v2 pending">
                      {row.statusLabel}
                    </span>
                  )}
                  {row.status === 'DEPOSIT_CONFIRMED' && (
                    <span className="status-badge-v2 deposit">
                      <span className="dot" />
                      {row.statusLabel}
                    </span>
                  )}
                </td>

                {/* 7. Thao tác */}
                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <div className="action-buttons-cell">
                    <button
                      type="button"
                      className="table-action-icon-btn"
                      title="Xem chi tiết lượt đặt (V12)"
                      onClick={() => onViewBookingDetail?.(row.id)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="table-action-icon-btn"
                      title="In phiếu đón tiếp"
                      onClick={() => onPrintReceipt?.(row.id)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Helper */}
      <div className="operations-simple-footer">
        <span className="operations-footer-note">
          Hiển thị 4 lượt đặt gần nhất · Bấm vào từng lượt đặt để xem chi tiết (V12)
        </span>
      </div>
    </div>
  );
};

export default ArtisanOperationsTable;
