import React, { useState } from 'react';

interface ArtisanTopHeaderProps {
  onBackToHome?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
}

export const ArtisanTopHeader: React.FC<ArtisanTopHeaderProps> = ({
  onNavigateToProfile,
  onLogout,
}) => {
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="artisan-v2-topbar">
      {/* Left Selectors */}
      <div className="artisan-v2-topbar-left">
        {/* Facility Selector */}
        <div className="artisan-v2-selector-wrapper">
          <button
            type="button"
            className="artisan-v2-selector-btn"
            onClick={() => setFacilityOpen(!facilityOpen)}
          >
            <span className="selector-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="selector-text">HTX Gốm Men Rạn Bát Tràng - Nghệ nhân Ưu tú</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="artisan-v2-selector-wrapper">
          <button
            type="button"
            className="artisan-v2-selector-btn"
            onClick={() => setDateRangeOpen(!dateRangeOpen)}
          >
            <span className="selector-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="selector-text">Tháng 10</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="artisan-v2-topbar-right">
        {/* Notifications Icon Button */}
        <div className="artisan-v2-icon-wrap">
          <button
            type="button"
            className="artisan-v2-circle-btn"
            title="Thông báo"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="artisan-v2-notif-dot" />
          </button>

          {notificationsOpen && (
            <div className="artisan-v2-notif-dropdown">
              <div className="notif-header">
                <strong>Thông báo làng nghề</strong>
                <span className="notif-badge">3 mới</span>
              </div>
              <div className="notif-item">
                <div className="notif-dot" />
                <div>
                  <div className="notif-title">Đơn hàng mới #WS-20241130-01</div>
                  <div className="notif-sub">Du khách Jean-Luc Moreau đã đặt 02 chỗ Workshop</div>
                </div>
              </div>
              <div className="notif-item">
                <div className="notif-dot" />
                <div>
                  <div className="notif-title">Nhiệt độ lò nung ổn định</div>
                  <div className="notif-sub">Lò củi số 1 đạt 1280°C - Sẵn sàng cho mẻ gốm men rạn</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Circle Button */}
        <button type="button" className="artisan-v2-circle-btn" title="Trợ giúp & Hướng dẫn">
          <span style={{ fontSize: 13, fontWeight: 700 }}>?</span>
        </button>

        {/* User Profile Pill */}
        <div className="artisan-v2-user-wrap">
          <div
            className="artisan-v2-user-pill"
            onClick={() => setProfileOpen(!profileOpen)}
            role="button"
            tabIndex={0}
          >
            <div className="artisan-v2-user-texts">
              <span className="user-name">Ngô Văn Bảo</span>
              <span className="user-role">Quản lý làng nghề</span>
            </div>
            <div className="artisan-v2-user-avatar">
              <span>B</span>
            </div>
          </div>

          {profileOpen && (
            <div className="artisan-v2-user-dropdown">
              <button
                type="button"
                className="user-dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  onNavigateToProfile?.();
                }}
              >
                Hồ sơ cá nhân
              </button>
              <button
                type="button"
                className="user-dropdown-item logout"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout?.();
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ArtisanTopHeader;
