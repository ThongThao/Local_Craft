import React from 'react';

export interface RecentActivityItem {
  id: string;
  type: 'order' | 'booking' | 'review' | 'workshop' | 'product';
  content: string;
  targetName?: string;
  timestamp: string;
}

interface ArtisanRecentActivitiesProps {
  onViewActivityDetail?: (activityId: string) => void;
}

export const ArtisanRecentActivities: React.FC<ArtisanRecentActivitiesProps> = ({
  onViewActivityDetail,
}) => {
  // Dữ liệu hoạt động gần đây theo nghiệp vụ V01
  const activities: RecentActivityItem[] = [
    {
      id: 'act-01',
      type: 'order',
      content: 'Đơn hàng #DH1024 đã được xác nhận đóng gói giao tới du khách Pháp',
      targetName: 'Bình gốm Men Rạn Hoa Sen',
      timestamp: '5 phút trước',
    },
    {
      id: 'act-02',
      type: 'booking',
      content: 'Khách hàng Nguyễn Văn A vừa đặt 04 chỗ ca trải nghiệm làm gốm cuối tuần',
      targetName: 'Vuốt gốm men rạn Bát Tràng',
      timestamp: '22 phút trước',
    },
    {
      id: 'act-03',
      type: 'review',
      content: 'Sản phẩm "Bộ ấm chén Mộc Sa" nhận đánh giá mới 5 sao từ du khách Nhật Bản',
      targetName: 'Đánh giá di sản OCOP',
      timestamp: '1 giờ trước',
    },
    {
      id: 'act-04',
      type: 'workshop',
      content: 'Workshop "Nghệ thuật chấm men lam" ca chiều Thứ Bảy vừa đủ chỗ học viên',
      targetName: '12/12 học viên kín chỗ',
      timestamp: 'Hôm nay, 08:30',
    },
    {
      id: 'act-05',
      type: 'product',
      content: 'Tác phẩm độc bản mới "Lọ hoa vuốt tay Men Lam" đã được kiểm duyệt xuất xưởng',
      targetName: 'NNƯT. Phạm Văn Vạn',
      timestamp: 'Hôm qua, 16:45',
    },
  ];

  const getIconForType = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'order':
        return (
          <span className="activity-icon-badge order" title="Đơn hàng">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
        );
      case 'booking':
        return (
          <span className="activity-icon-badge booking" title="Lượt đặt workshop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
        );
      case 'review':
        return (
          <span className="activity-icon-badge review" title="Đánh giá mới">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#984628" stroke="#984628" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
        );
      case 'workshop':
        return (
          <span className="activity-icon-badge workshop" title="Workshop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
        );
      case 'product':
        return (
          <span className="activity-icon-badge product" title="Tác phẩm mới">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className="artisan-v2-activity-card">
      <div className="activity-header-row">
        <div>
          <div className="activity-title-wrap">
            <span className="activity-live-pulse" />
            <h3 className="activity-card-title">Hoạt động gần đây</h3>
          </div>
          <p className="activity-card-subtitle">
            Cập nhật diễn biến đơn hàng, lịch workshop và tương tác của khách
          </p>
        </div>
        <span className="activity-count-badge">5 mới nhất</span>
      </div>

      <div className="activity-timeline-list">
        {activities.map((act) => (
          <div
            key={act.id}
            className="activity-item-row"
            onClick={() => onViewActivityDetail?.(act.id)}
            role="button"
            tabIndex={0}
          >
            <div className="activity-icon-col">
              {getIconForType(act.type)}
              <span className="activity-connector-line" />
            </div>

            <div className="activity-content-col">
              <div className="activity-text">{act.content}</div>
              <div className="activity-meta-row">
                {act.targetName && (
                  <span className="activity-target-tag">{act.targetName}</span>
                )}
                <span className="activity-time-text">{act.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtisanRecentActivities;
