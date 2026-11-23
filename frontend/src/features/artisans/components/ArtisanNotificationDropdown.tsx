import React from 'react';
import { NotificationDto } from '@/services/api/notifications';
import { NotificationFilterType } from '../hooks/useArtisanNotifications';
import { SidebarTabKey } from './ArtisanSidebar';

interface ArtisanNotificationDropdownProps {
  notifications: NotificationDto[];
  unreadCount: number;
  totalCount: number;
  filter: NotificationFilterType;
  isLoading: boolean;
  isUpdating: boolean;
  onFilterChange: (filter: NotificationFilterType) => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onNavigateTab?: (tab: SidebarTabKey, targetId?: number) => void;
  onClose: () => void;
}

// Relative time formatter in Vietnamese
function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;

    return past.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Map target_type / notification_type to category icon & color theme
function getNotificationVisuals(notif: NotificationDto) {
  const type = notif.notification_type || '';
  const target = notif.target_type || '';

  if (target === 'VENDOR_ORDER' || type.includes('ORDER')) {
    return {
      category: 'Đơn hàng',
      bgClass: 'notif-cat-order',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      tab: 'orders' as SidebarTabKey,
    };
  }

  if (target === 'BOOKING' || type.includes('BOOKING') || type.includes('WORKSHOP')) {
    return {
      category: 'Workshop',
      bgClass: 'notif-cat-booking',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      tab: 'bookings' as SidebarTabKey,
    };
  }

  if (target === 'REVIEW' || type.includes('REVIEW')) {
    return {
      category: 'Đánh giá',
      bgClass: 'notif-cat-review',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      tab: 'reviews' as SidebarTabKey,
    };
  }

  if (target === 'INVENTORY' || type.includes('STOCK')) {
    return {
      category: 'Tồn kho',
      bgClass: 'notif-cat-inventory',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      tab: 'variants' as SidebarTabKey,
    };
  }

  if (target === 'ARTISAN' || type.includes('ARTISAN')) {
    return {
      category: 'Nghệ nhân',
      bgClass: 'notif-cat-artisan',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      tab: 'artisans' as SidebarTabKey,
    };
  }

  if (target === 'PRODUCT' || type.includes('PRODUCT')) {
    return {
      category: 'Sản phẩm',
      bgClass: 'notif-cat-product',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      tab: 'products' as SidebarTabKey,
    };
  }

  if (target === 'STORY' || type.includes('STORY')) {
    return {
      category: 'Ký sự',
      bgClass: 'notif-cat-story',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
      tab: 'stories' as SidebarTabKey,
    };
  }

  return {
    category: 'Hệ thống',
    bgClass: 'notif-cat-system',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    tab: 'overview' as SidebarTabKey,
  };
}

export const ArtisanNotificationDropdown: React.FC<ArtisanNotificationDropdownProps> = ({
  notifications,
  unreadCount,
  totalCount,
  filter,
  isLoading,
  isUpdating,
  onFilterChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNavigateTab,
  onClose,
}) => {
  const handleItemClick = (notif: NotificationDto) => {
    if (!notif.is_read) {
      onMarkAsRead(notif.notification_id);
    }
    const visual = getNotificationVisuals(notif);
    if (onNavigateTab) {
      onNavigateTab(visual.tab, notif.target_id ?? undefined);
    }
    onClose();
  };

  return (
    <div
      className="artisan-v2-notif-dropdown artisan-notif-enhanced"
      role="region"
      aria-label="Danh sách thông báo làng nghề"
    >
      {/* 1. Header */}
      <div className="artisan-notif-header">
        <div className="artisan-notif-title-row">
          <div className="artisan-notif-title-wrap">
            <span className="artisan-notif-main-title">Thông báo</span>
            {unreadCount > 0 ? (
              <span className="artisan-notif-badge-pill">{unreadCount} mới</span>
            ) : (
              <span className="artisan-notif-badge-pill neutral">{totalCount} tin</span>
            )}
          </div>
          <button
            type="button"
            className="artisan-notif-btn-readall"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0 || isUpdating}
            title="Đánh dấu tất cả thông báo là đã đọc"
          >
            Đọc tất cả
          </button>
        </div>

        {/* 2. Filter Tabs */}
        <div className="artisan-notif-filter-tabs">
          <button
            type="button"
            className={`artisan-notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`artisan-notif-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => onFilterChange('unread')}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* 3. Notification List */}
      <div className="artisan-notif-list-container">
        {isLoading && notifications.length === 0 ? (
          <div className="artisan-notif-empty-state">
            <div className="artisan-notif-spinner" />
            <p>Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="artisan-notif-empty-state">
            <div className="artisan-notif-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="artisan-notif-empty-title">
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </p>
            <p className="artisan-notif-empty-desc">
              Các cập nhật về đơn hàng, workshop và đánh giá của làng nghề sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="artisan-notif-items-wrap">
            {notifications.map((notif) => {
              const visual = getNotificationVisuals(notif);
              return (
                <div
                  key={notif.notification_id}
                  className={`artisan-notif-card ${!notif.is_read ? 'unread' : 'read'}`}
                  onClick={() => handleItemClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(notif);
                    }
                  }}
                >
                  {/* Category Visual Icon */}
                  <div className={`artisan-notif-icon-box ${visual.bgClass}`}>
                    {visual.icon}
                  </div>

                  {/* Body Content */}
                  <div className="artisan-notif-body">
                    <div className="artisan-notif-top">
                      <span className="artisan-notif-category">{visual.category}</span>
                      <span className="artisan-notif-time">{formatRelativeTime(notif.created_at)}</span>
                    </div>
                    <div className="artisan-notif-title">{notif.title}</div>
                    <div className="artisan-notif-message">{notif.message}</div>
                  </div>

                  {/* Right Actions & Unread Indicator */}
                  <div className="artisan-notif-actions" onClick={(e) => e.stopPropagation()}>
                    {!notif.is_read && (
                      <button
                        type="button"
                        className="artisan-notif-action-btn read"
                        title="Đánh dấu đã đọc"
                        onClick={() => onMarkAsRead(notif.notification_id)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="artisan-notif-action-btn delete"
                      title="Xóa thông báo này"
                      onClick={() => onDelete(notif.notification_id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    {!notif.is_read && <span className="artisan-notif-unread-dot" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Footer */}
      <div className="artisan-notif-footer">
        <span className="artisan-notif-sync-badge">
          <span className="artisan-notif-pulse-dot" />
          Tự động đồng bộ thời gian thực
        </span>
      </div>
    </div>
  );
};

export default ArtisanNotificationDropdown;

