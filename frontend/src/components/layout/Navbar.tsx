import React, { useState, useEffect, useRef } from 'react';
import AppIcon from '../ui/AppIcon';
import Button from '../ui/Button';
import { authApi, UserProfile, getAccessToken } from '@/services/api';

export interface NavbarProps {
  onOpenSearch?: () => void;
  onOpenLogin?: () => void;
  onOpenExplore?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onBackToHome?: () => void;
  isLoggedIn?: boolean;
  currentUser?: {
    email?: string;
    fullName?: string;
    full_name?: string;
    avatarUrl?: string;
    avatar_url?: string;
    roles?: string[];
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenLogin,
  onOpenExplore,
  onOpenProfile,
  onLogout,
  onBackToHome,
  isLoggedIn = false,
  currentUser = null,
}) => {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch real user data from database when logged in
  useEffect(() => {
    const token = getAccessToken();
    if (token || isLoggedIn) {
      authApi.getMe()
        .then((res) => {
          if (res.success && res.data) {
            setDbUser(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isLoggedIn]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Khám phá', href: '#kham-pha' },
    { label: 'Làng nghề', href: '#lang-nghe' },
    { label: 'Sản phẩm', href: '#san-pham' },
    { label: 'Trải nghiệm', href: '#trai-nghiem' },
  ];

  // User display info (Dynamic from DB)
  const displayName =
    currentUser?.fullName ||
    currentUser?.full_name ||
    dbUser?.full_name ||
    'Nguyễn Hoàng Minh';

  const userEmail = currentUser?.email || dbUser?.email || '';
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url || dbUser?.avatar_url;

  return (
    <header className={`app-navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo & Tagline */}
        <a
          href="#"
          onClick={handleBrandClick}
          className="navbar-brand"
          title="Về trang chủ LocalCraft"
        >
          {/* Brand Emblem */}
          <div className="navbar-brand-emblem">
            <AppIcon name="pottery" size={20} />
          </div>

          <div className="navbar-brand-texts">
            <span className="navbar-brand-title">LocalCraft</span>
            <span className="navbar-brand-tagline">TINH HOA DI SẢN</span>
          </div>
        </a>

        {/* Desktop Nav Items */}
        <nav className="navbar-desktop-links">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href} className="navbar-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            /* Logged-in Header Controls (Synced from DB) */
            <div
              className="navbar-user-controls"
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 8,
                display: 'inline-flex',
              }}
            >
              {/* 1. Action / Search Trigger Button: 40x40 circle */}
              <div
                onClick={onOpenSearch}
                role="button"
                tabIndex={0}
                title="Tìm kiếm di sản & sản phẩm"
                className="navbar-icon-button"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'flex',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    display: 'inline-flex',
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#414846"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>

              {/* 2. Notification Button: 40x40 circle with Badge */}
              <div
                ref={notifRef}
                style={{
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  display: 'inline-flex',
                  position: 'relative',
                }}
              >
                <div
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  role="button"
                  tabIndex={0}
                  title="Thông báo"
                  className="navbar-icon-button"
                  style={{
                    width: 40,
                    height: 40,
                    position: 'relative',
                    borderRadius: 9999,
                    justifyContent: 'center',
                    alignItems: 'center',
                    display: 'inline-flex',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      display: 'inline-flex',
                    }}
                  >
                    <svg
                      width="13.33"
                      height="16.67"
                      viewBox="0 0 14 17"
                      fill="none"
                      stroke="#414846"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11.67 6.67A4.67 4.67 0 0 0 2.33 6.67c0 4.66-2 6-2 6h13.34s-2-1.34-2-6" />
                      <path d="M5.53 14.67a1.67 1.67 0 0 0 2.94 0" />
                    </svg>
                  </div>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      left: 24,
                      top: 8,
                      position: 'absolute',
                      background: '#984628',
                      borderRadius: 9999,
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-end',
                      display: 'inline-flex',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        background: 'rgba(255, 255, 255, 0)',
                        boxShadow: '0px 0px 0px 2px #FCF9F3',
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                </div>

                {/* Notifications Dropdown Popover */}
                {notificationsOpen && (
                  <div className="navbar-notification-popover">
                    <div className="navbar-notification-header">
                      <span>Thông báo di sản</span>
                      <span className="navbar-notification-badge">Mới</span>
                    </div>
                    <div className="navbar-notification-list">
                      <div className="navbar-notification-item">
                        <span className="navbar-notification-item-dot" />
                        <div>
                          <strong>Chào mừng đến với LocalCraft!</strong>
                          <p style={{ margin: '2px 0 0', color: '#717A76' }}>
                            Tài khoản {userEmail || displayName} đã được đồng bộ với hệ thống di sản.
                          </p>
                        </div>
                      </div>
                      <div className="navbar-notification-item">
                        <span className="navbar-notification-item-dot" />
                        <div>
                          <strong>Trải nghiệm làm gốm Bát Tràng</strong>
                          <p style={{ margin: '2px 0 0', color: '#717A76' }}>
                            Suất trải nghiệm nghệ nhân cuối tuần đang mở đăng ký.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Vertical Divider Line: 9x24 */}
              <div
                style={{
                  width: 9,
                  height: 24,
                  paddingLeft: 4,
                  paddingRight: 4,
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  display: 'inline-flex',
                }}
              >
                <div style={{ width: 1, height: 24, background: '#E6D8C5' }} />
              </div>

              {/* 4. User Profile Pill Button (with Name from DB) */}
              <div ref={dropdownRef} className="navbar-user-pill-wrapper">
                <div
                  className="navbar-user-pill"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  role="button"
                  tabIndex={0}
                  title="Tài khoản cá nhân"
                  style={{
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingLeft: 4,
                    paddingRight: 16,
                    background: '#F6F3ED',
                    borderRadius: 9999,
                    outline: '1px #E6D8C5 solid',
                    outlineOffset: '-1px',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: 8,
                    display: 'flex',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {/* User Avatar Circle: 32x32 */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: '#002720',
                      borderRadius: 9999,
                      justifyContent: 'center',
                      alignItems: 'center',
                      display: 'flex',
                      overflow: 'hidden',
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          display: 'inline-flex',
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Dynamic User Name from DB */}
                  <div
                    style={{
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      display: 'inline-flex',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'center',
                        justifyContent: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#1C1C18',
                        fontSize: 14,
                        fontFamily: 'Manrope',
                        fontWeight: '600',
                        lineHeight: '20px',
                        letterSpacing: 0.14,
                        wordWrap: 'break-word',
                        maxWidth: 160,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {displayName}
                    </div>
                  </div>

                  {/* Dropdown Chevron Icon: 9 x 5.55 */}
                  <div
                    style={{
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      display: 'inline-flex',
                      transform: userDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <svg
                      width="9"
                      height="5.55"
                      viewBox="0 0 9 6"
                      fill="none"
                      stroke="#414846"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 1.25L4.5 4.75L8 1.25" />
                    </svg>
                  </div>
                </div>

                {/* User Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="navbar-user-dropdown-menu">
                    <div className="navbar-dropdown-header">
                      <div className="navbar-dropdown-header-name">{displayName}</div>
                      <div className="navbar-dropdown-header-email">{userEmail || 'Thành viên LocalCraft'}</div>
                    </div>
                    <button
                      type="button"
                      className="navbar-dropdown-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile?.();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Hồ sơ cá nhân
                    </button>
                    <button
                      type="button"
                      className="navbar-dropdown-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenExplore?.();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                      </svg>
                      Khám phá trải nghiệm
                    </button>
                    <button
                      type="button"
                      className="navbar-dropdown-item logout"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout?.();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged-out Controls */
            <>
              {/* Search Trigger */}
              <button
                onClick={onOpenSearch}
                aria-label="Tìm kiếm trải nghiệm hoặc sản phẩm"
                className="navbar-btn-icon"
              >
                <AppIcon name="search" size={18} />
              </button>

              {/* Login Button */}
              <button onClick={onOpenLogin} className="navbar-btn-login">
                Đăng nhập
              </button>

              {/* Primary CTA button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenExplore}
                className="navbar-btn-cta"
              >
                Khám phá ngay
              </Button>

              {/* User Profile Avatar Icon */}
              <button
                onClick={onOpenLogin}
                aria-label="Tài khoản cá nhân"
                className="navbar-btn-avatar"
              >
                <AppIcon name="user" size={14} />
              </button>
            </>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar-mobile-toggle"
            aria-label="Menu"
          >
            <span className="navbar-mobile-toggle-bar" />
            <span className="navbar-mobile-toggle-bar" />
            <span className="navbar-mobile-toggle-bar" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          {/* User info if logged in */}
          {isLoggedIn && (
            <div className="navbar-mobile-user-card">
              <div className="navbar-mobile-user-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="navbar-mobile-user-info">
                <span className="navbar-mobile-user-name">{displayName}</span>
                <span className="navbar-mobile-user-email">{userEmail}</span>
              </div>
            </div>
          )}

          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="navbar-mobile-link"
            >
              {item.label}
            </a>
          ))}

          <div className="navbar-mobile-actions">
            {isLoggedIn ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfile?.();
                  }}
                >
                  Hồ sơ cá nhân
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout?.();
                  }}
                >
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin?.();
                  }}
                >
                  Đăng nhập
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenExplore?.();
                  }}
                >
                  Khám phá ngay
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
