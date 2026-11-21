import React from 'react';
import AppIcon from '@/components/ui/AppIcon';

export type SidebarTabKey =
  | 'overview'
  | 'products'
  | 'variants'
  | 'workshops'
  | 'schedules'
  | 'bookings'
  | 'orders'
  | 'revenue'
  | 'artisans'
  | 'reviews'
  | 'stories'
  | 'settings';

export interface SidebarNavCounts {
  artisans?: number;
  products?: number;
  workshops?: number;
  bookings?: number;
  orders?: number;
  reviews?: number;
  stories?: number;
}

interface ArtisanSidebarProps {
  activeTab: SidebarTabKey;
  onSelectTab: (tab: SidebarTabKey) => void;
  onBackToHome?: () => void;
  counts?: SidebarNavCounts;
  villageName?: string;
  villageSubtitle?: string;
  villageId?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuGroup {
  groupTitle: string;
  items: {
    id: SidebarTabKey;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export const ArtisanSidebar: React.FC<ArtisanSidebarProps> = ({
  activeTab,
  onSelectTab,
  onBackToHome,
  counts,
  villageName,
  villageSubtitle,
  villageId,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Tổ chức nhóm chức năng theo tài khoản Quản lý Làng nghề (V01-V17)
  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'TỔNG QUAN',
      items: [
        {
          id: 'overview',
          label: 'Dashboard làng nghề',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'LÀNG NGHỀ',
      items: [
        {
          id: 'settings',
          label: 'Hồ sơ làng nghề',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
        },
        {
          id: 'artisans',
          label: 'Hồ sơ nghệ nhân',
          badge: counts?.artisans !== undefined ? String(counts.artisans) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'SẢN PHẨM',
      items: [
        {
          id: 'products',
          label: 'Quản lý sản phẩm',
          badge: counts?.products !== undefined ? String(counts.products) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          ),
        },
        {
          id: 'variants',
          label: 'Quản lý biến thể & tồn kho',
          badge: counts?.products !== undefined ? String(counts.products) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'WORKSHOP',
      items: [
        {
          id: 'workshops',
          label: 'Quản lý workshop',
          badge: counts?.workshops !== undefined ? String(counts.workshops) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ),
        },
        {
          id: 'schedules',
          label: 'Lịch tổ chức workshop',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        },
        {
          id: 'bookings',
          label: 'Lượt đặt workshop',
          badge: counts?.bookings !== undefined ? String(counts.bookings) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'ĐƠN HÀNG',
      items: [
        {
          id: 'orders',
          label: 'Quản lý đơn hàng',
          badge: counts?.orders !== undefined ? String(counts.orders) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'NỘI DUNG',
      items: [
        {
          id: 'reviews',
          label: 'Đánh giá & phản hồi',
          badge: counts?.reviews !== undefined ? String(counts.reviews) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ),
        },
        {
          id: 'stories',
          label: 'Câu chuyện làng nghề',
          badge: counts?.stories !== undefined ? String(counts.stories) : undefined,
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      groupTitle: 'BÁO CÁO',
      items: [
        {
          id: 'revenue',
          label: 'Thống kê hoạt động',
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <aside className={`artisan-v2-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="artisan-v2-sidebar-brand-row">
        <div className="artisan-v2-sidebar-brand" onClick={onBackToHome} role="button" tabIndex={0}>
          <div className="artisan-v2-brand-emblem">
            <AppIcon name="pottery" size={20} />
          </div>
          <div className="artisan-v2-brand-texts">
            <span className="artisan-v2-brand-title">LocalCraft</span>
            <span className="artisan-v2-brand-tagline">TINH HOA DI SẢN</span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            className="artisan-v2-sidebar-close-btn"
            onClick={onCloseMobile}
            title="Đóng menu"
            aria-label="Đóng menu quản lý"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Unit Management Badge Card */}
      <div className="artisan-v2-unit-card">
        <div className="artisan-v2-unit-label">ĐƠN VỊ LÀNG NGHỀ</div>
        <div className="artisan-v2-unit-title">{villageName || 'Làng nghề di sản'}</div>
        <div className="artisan-v2-unit-meta">
          <span className="artisan-v2-unit-dot" />
          <span className="artisan-v2-unit-sub">{villageSubtitle || 'OCOP 5 Sao Quốc Gia'}</span>
        </div>
      </div>

      {/* Navigation Menu Grouped Clearly */}
      <nav className="artisan-v2-nav-menu">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="sidebar-group-block">
            <div className="sidebar-group-title">{group.groupTitle}</div>
            <div className="sidebar-group-items">
              {group.items.map((item, iIdx) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`${item.id}-${iIdx}`}
                    type="button"
                    className={`artisan-v2-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTab(item.id)}
                  >
                    <span className="artisan-v2-nav-icon">{item.icon}</span>
                    <span className="artisan-v2-nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Heritage Card */}
      <div className="artisan-v2-sidebar-footer">
        <div className="artisan-v2-heritage-pill">
          <div className="artisan-v2-heritage-icon">
            <AppIcon name="pottery" size={14} />
          </div>
          <div className="artisan-v2-heritage-text">
            <span className="title">{villageName || 'Di sản làng nghề'}</span>
            <span className="sub">Cơ sở làng nghề #{String(villageId || 1).padStart(3, '0')}</span>
          </div>
          <button type="button" className="artisan-v2-heritage-info-btn" title="Thông tin cơ sở di sản">
            ⓘ
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ArtisanSidebar;
