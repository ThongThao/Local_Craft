import React, { useState, useRef, useEffect } from 'react';

export interface ArtisanTopHeaderProps {
  onBackToHome?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onToggleMobileSidebar?: () => void;
  villageName?: string;
}

type ActivePopover = 'notifications' | 'profile' | null;

export const ArtisanTopHeader: React.FC<ArtisanTopHeaderProps> = ({
  onNavigateToProfile,
  onLogout,
  userName = 'Quản lý làng nghề',
  userRole = 'Quản lý làng nghề',
  userAvatar,
  onToggleMobileSidebar,
  villageName,
}) => {
  // Single active popover management
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const avatarChar = (userName || 'Q').trim()[0]?.toUpperCase() || 'Q';

  // Click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        profileRef.current &&
        !profileRef.current.contains(target) &&
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setActivePopover(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const togglePopover = (popover: ActivePopover) => {
    setActivePopover((prev) => (prev === popover ? null : popover));
  };

  return (
    <header className="artisan-v2-topbar" role="banner">
      {/* Left Area: Hamburger toggle for mobile/tablet & brand pill */}
      <div className="artisan-v2-topbar-left">
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="artisan-v2-mobile-toggle-btn"
            onClick={onToggleMobileSidebar}
            title="Mở menu quản lý làng nghề"
            aria-label="Mở menu điều hướng"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div className="artisan-v2-topbar-mobile-brand">
          <span className="brand-dot" />
          <span className="brand-name">{villageName || 'LocalCraft'}</span>
        </div>
      </div>

      {/* Right Controls: Notifications, Help, Profile */}
      <div className="artisan-v2-topbar-right">
        {/* Notifications Icon Button */}
        <div className="artisan-v2-icon-wrap" ref={notifRef}>
          <button
            type="button"
            className={`artisan-v2-circle-btn ${activePopover === 'notifications' ? 'active' : ''}`}
            title="Thông báo hệ thống"
            aria-label="Thông báo hệ thống"
            aria-expanded={activePopover === 'notifications'}
            onClick={() => togglePopover('notifications')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="artisan-v2-notif-dot" />
          </button>

          {activePopover === 'notifications' && (
            <div className="artisan-v2-notif-dropdown" role="region" aria-label="Danh sách thông báo">
              <div className="notif-header">
                <strong>Thông báo làng nghề</strong>
                <span className="notif-badge">Hệ thống</span>
              </div>
              <div className="notif-item">
                <div className="notif-dot" />
                <div>
                  <div className="notif-title">Kết nối đồng bộ thời gian thực</div>
                  <div className="notif-sub">Số liệu sản phẩm, đơn hàng và workshop đã cập nhật</div>
                </div>
              </div>
              <div className="notif-item">
                <div className="notif-dot" />
                <div>
                  <div className="notif-title">Bảo tồn di sản OCOP</div>
                  <div className="notif-sub">Hệ thống quản lý làng nghề LocalCraft sẵn sàng vận hành</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Circle Button */}
        <button
          type="button"
          className="artisan-v2-circle-btn"
          title="Trợ giúp & Hướng dẫn"
          aria-label="Trợ giúp và hướng dẫn sử dụng"
          onClick={() => window.open('https://localcraft.vn/help', '_blank')}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }} aria-hidden="true">?</span>
        </button>

        {/* User Profile Pill */}
        <div className="artisan-v2-user-wrap" ref={profileRef}>
          <div
            className={`artisan-v2-user-pill ${activePopover === 'profile' ? 'active' : ''}`}
            onClick={() => togglePopover('profile')}
            role="button"
            tabIndex={0}
            aria-expanded={activePopover === 'profile'}
            aria-haspopup="true"
            aria-label="Tài khoản cá nhân"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePopover('profile');
              }
            }}
          >
            <div className="artisan-v2-user-texts">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <div className="artisan-v2-user-avatar">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span>{avatarChar}</span>
              )}
            </div>
          </div>

          {activePopover === 'profile' && (
            <div className="artisan-v2-user-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className="user-dropdown-item"
                onClick={() => {
                  setActivePopover(null);
                  onNavigateToProfile?.();
                }}
              >
                Hồ sơ làng nghề (V02)
              </button>
              <button
                type="button"
                role="menuitem"
                className="user-dropdown-item logout"
                onClick={() => {
                  setActivePopover(null);
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
