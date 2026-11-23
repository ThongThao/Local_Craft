import React from 'react';
import { NotificationDto } from '@/services/api/notifications';

export type TouristNotifFilter = 'all' | 'unread';

interface TouristNotificationDropdownProps {
  notifications: NotificationDto[];
  unreadCount: number;
  totalCount: number;
  filter: TouristNotifFilter;
  isLoading: boolean;
  isUpdating: boolean;
  onFilterChange: (filter: TouristNotifFilter) => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onNavigate: (targetType: string | null | undefined, targetId: number | null | undefined) => void;
  onClose: () => void;
}

// Relative time formatting in Vietnamese
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

function getVisualProps(notif: NotificationDto) {
  const t = notif.notification_type || '';
  const target = notif.target_type || '';

  if (target === 'BOOKING' || t.includes('BOOKING') || t.includes('REMINDER') || t.includes('WORKSHOP')) {
    return {
      category: t.includes('REMINDER') ? 'Nhắc lịch' : 'Workshop',
      bgClass: 'tourist-notif-cat-booking',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    };
  }

  if (target === 'ORDER' || target === 'VENDOR_ORDER' || t.includes('ORDER')) {
    return {
      category: 'Đơn hàng',
      bgClass: 'tourist-notif-cat-order',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    };
  }

  if (t.includes('PAYMENT')) {
    return {
      category: 'Thanh toán',
      bgClass: 'tourist-notif-cat-payment',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    };
  }

  if (target === 'REVIEW' || t.includes('REVIEW')) {
    return {
      category: 'Đánh giá',
      bgClass: 'tourist-notif-cat-review',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    };
  }

  return {
    category: 'LocalCraft',
    bgClass: 'tourist-notif-cat-system',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };
}

export const TouristNotificationDropdown: React.FC<TouristNotificationDropdownProps> = ({
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
  onNavigate,
  onClose,
}) => {
  const handleClick = (notif: NotificationDto) => {
    if (!notif.is_read) {
      onMarkAsRead(notif.notification_id);
    }
    onNavigate(notif.target_type, notif.target_id);
    onClose();
  };

  return (
    <div
      className="navbar-notification-popover tourist-notif-dropdown"
      role="region"
      aria-label="Danh sách thông báo di sản"
    >
      {/* 1. Header */}
      <div className="tourist-notif-header">
        <div className="tourist-notif-header-top">
          <div className="tourist-notif-title-wrap">
            <span className="tourist-notif-title">Thông báo di sản</span>
            {unreadCount > 0 ? (
              <span className="tourist-notif-badge-pill">{unreadCount} mới</span>
            ) : (
              <span className="tourist-notif-badge-pill neutral">{totalCount} tin</span>
            )}
          </div>
          <button
            type="button"
            className="tourist-notif-btn-readall"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0 || isUpdating}
            title="Đánh dấu tất cả là đã đọc"
          >
            Đọc tất cả
          </button>
        </div>

        {/* 2. Filter Tabs */}
        <div className="tourist-notif-tabs">
          <button
            type="button"
            className={`tourist-notif-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`tourist-notif-tab-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => onFilterChange('unread')}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* 3. Notification List */}
      <div className="tourist-notif-list">
        {isLoading && notifications.length === 0 ? (
          <div className="tourist-notif-empty">
            <div className="tourist-notif-spinner" />
            <p>Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="tourist-notif-empty">
            <div className="tourist-notif-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <strong>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo mới'}</strong>
            <p>Các cập nhật về đơn hàng và workshop của bạn sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="tourist-notif-items">
            {notifications.map((notif) => {
              const visual = getVisualProps(notif);
              return (
                <div
                  key={notif.notification_id}
                  className={`tourist-notif-card ${!notif.is_read ? 'unread' : 'read'}`}
                  onClick={() => handleClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(notif);
                    }
                  }}
                >
                  <div className={`tourist-notif-icon-box ${visual.bgClass}`}>
                    {visual.icon}
                  </div>

                  <div className="tourist-notif-content">
                    <div className="tourist-notif-meta">
                      <span className="tourist-notif-category">{visual.category}</span>
                      <span className="tourist-notif-time">{formatRelativeTime(notif.created_at)}</span>
                    </div>
                    <div className="tourist-notif-item-title">{notif.title}</div>
                    <div className="tourist-notif-item-message">{notif.message}</div>
                  </div>

                  <div className="tourist-notif-actions" onClick={(e) => e.stopPropagation()}>
                    {!notif.is_read && (
                      <button
                        type="button"
                        className="tourist-notif-action-btn read"
                        title="Đánh dấu đã đọc"
                        onClick={() => onMarkAsRead(notif.notification_id)}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="tourist-notif-action-btn delete"
                      title="Xóa thông báo"
                      onClick={() => onDelete(notif.notification_id)}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    {!notif.is_read && <span className="tourist-notif-unread-dot" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Footer */}
      <div className="tourist-notif-footer">
        <span className="tourist-notif-sync-badge">
          <span className="tourist-notif-pulse-dot" />
          Tự động đồng bộ thời gian thực
        </span>
      </div>
    </div>
  );
};

export default TouristNotificationDropdown;

