import React from 'react';

interface ArtisanTodayScheduleProps {
  onCheckInGuests?: () => void;
  onViewWorkshopMap?: () => void;
}

export const ArtisanTodaySchedule: React.FC<ArtisanTodayScheduleProps> = ({
  onCheckInGuests,
  onViewWorkshopMap,
}) => {
  return (
    <div className="artisan-v2-schedule-card">
      {/* Header */}
      <div className="schedule-header-row">
        <div className="schedule-title-wrap">
          <div className="schedule-title-main">
            <span className="schedule-live-dot" />
            <h3 className="schedule-title">Lịch đón khách hôm nay</h3>
          </div>
          <p className="schedule-subtitle">
            Sơ đồ quản lý lên xoay đất & chuẩn bị nguyên liệu men nung
          </p>
        </div>

        <span className="schedule-date-badge">Hôm nay, 30/11</span>
      </div>

      {/* Schedule Items List */}
      <div className="schedule-items-list">
        {/* Item 1 */}
        <div className="schedule-item-card">
          <div className="schedule-item-top">
            <div className="schedule-time-pill dark">09:00 - 11:30</div>
            <div className="schedule-item-title-box">
              <h4 className="schedule-item-title">Vuốt gốm men rạn Bát Tràng cổ truyền</h4>
            </div>
            <span className="schedule-status-pill confirmed">Đã xác nhận</span>
          </div>

          <div className="schedule-item-meta">
            <span>Hướng dẫn: <strong>Nghệ nhân Phạm Văn Vạn</strong></span>
            <span className="meta-sep">|</span>
            <span>Xưởng số 1: <strong>Bàn xoay 1 & 2</strong></span>
          </div>

          <div className="schedule-item-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="footer-highlight">06 khách quốc tế (Pháp: 4, Đức: 2)</span>
            <span className="meta-sep">|</span>
            <span>Khách đoàn Tour Bát Tràng Heritage</span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="schedule-item-card">
          <div className="schedule-item-top">
            <div className="schedule-time-pill muted">14:30 - 17:00</div>
            <div className="schedule-item-title-box">
              <h4 className="schedule-item-title">Nghệ thuật chấm men lam & men rạn</h4>
            </div>
            <span className="schedule-status-pill upcoming">Sắp diễn ra (còn 2h)</span>
          </div>

          <div className="schedule-item-meta">
            <span>Hướng dẫn: <strong>Thợ gốm Phạm Mai Lan</strong></span>
            <span className="meta-sep">|</span>
            <span>Xưởng số 2: <strong>Bàn xoay 3</strong></span>
          </div>

          <div className="schedule-item-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            <span className="schedule-item-footer-desc">Bao gồm mứt & trà sen sương sớm Bát Tràng - <strong>Thực đơn 4 món bánh</strong></span>
            <span className="footer-link">Thực đơn bánh khách</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="schedule-actions-row">
        <button
          type="button"
          className="schedule-btn-primary"
          onClick={onCheckInGuests}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
          </svg>
          <span>Điểm danh du khách</span>
        </button>

        <button
          type="button"
          className="schedule-btn-outline"
          onClick={onViewWorkshopMap}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span>Sơ đồ bàn xoay</span>
        </button>
      </div>
    </div>
  );
};

export default ArtisanTodaySchedule;
