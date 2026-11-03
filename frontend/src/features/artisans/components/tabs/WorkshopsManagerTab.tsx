import React, { useState } from 'react';
import { CraftWorkshopItem } from '../../types';
import { LocalCraftPagination } from '../LocalCraftPagination';

interface WorkshopsManagerTabProps {
  workshops: CraftWorkshopItem[];
  onOpenAddModal: () => void;
  onEditWorkshop: (workshop: CraftWorkshopItem) => void;
  onDeleteWorkshop: (workshopId: number) => void;
}

export const WorkshopsManagerTab: React.FC<WorkshopsManagerTabProps> = ({
  workshops,
  onOpenAddModal,
  onEditWorkshop,
  onDeleteWorkshop,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  const filteredWorkshops = workshops.filter((w) => {
    return (
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.artisanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredWorkshops.length / pageSize) || 1;
  const paginatedWorkshops = filteredWorkshops.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="artisan-tab-pane workshops-manager-pane">
      {/* Top Toolbar */}
      <div className="tab-toolbar-card">
        <div className="toolbar-left">
          <div className="toolbar-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên workshop, nghệ nhân đứng lớp hoặc địa điểm..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="toolbar-search-clear" onClick={() => handleSearchChange('')}>
                ✕
              </button>
            )}
          </div>
          <div className="toolbar-info-badge">
            Tổng cộng: <strong>{workshops.length} lớp trải nghiệm</strong> đang hoạt động
          </div>
        </div>

        <button
          type="button"
          className="artisan-primary-btn"
          onClick={onOpenAddModal}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Mở Ca Workshop Mới
        </button>
      </div>

      {/* Workshop List / Grid */}
      <div className="workshops-manager-grid">
        {paginatedWorkshops.map((w) => {
          const fillRatio = Math.round((w.enrolledCount / w.maxParticipants) * 100);
          const isNearlyFull = fillRatio >= 80;

          return (
            <div key={w.id} className="workshop-manager-card">
              <div className="workshop-card-image-wrap">
                <img src={w.coverImage} alt={w.title} className="workshop-card-img" />
                <span className={`workshop-status-badge ${w.status.toLowerCase()}`}>
                  {w.status === 'OPEN' ? 'Đang Mở Đăng Ký' : w.status === 'FULL' ? 'Đã Hết Ghế' : 'Đã Hoàn Tất'}
                </span>
                <span className="workshop-category-badge">{w.categoryName}</span>
              </div>

              <div className="workshop-card-body">
                <div className="workshop-session-time">
                  <span className="time-icon">⏰</span>
                  <strong>{w.nextSessionDate}</strong> ({w.durationMinutes} phút)
                </div>

                <h4 className="workshop-card-title">{w.title}</h4>

                <div className="workshop-card-guide">
                  Nghệ nhân hướng dẫn: <strong>{w.artisanName}</strong>
                </div>

                <div className="workshop-card-location">
                  <span className="loc-icon">📍</span>
                  <span>{w.location}</span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="workshop-capacity-block">
                  <div className="capacity-labels-row">
                    <span>Số lượng ghế đã giữ:</span>
                    <strong>
                      {w.enrolledCount} / {w.maxParticipants} học viên ({fillRatio}%)
                    </strong>
                  </div>
                  <div className="capacity-bar-track">
                    <div
                      className={`capacity-bar-fill ${isNearlyFull ? 'full' : ''}`}
                      style={{ width: `${fillRatio}%` }}
                    />
                  </div>
                </div>

                <div className="workshop-card-footer">
                  <div className="workshop-price-col">
                    <span className="price-label">Giá vé:</span>
                    <span className="price-val">{w.formattedPrice}</span>
                  </div>

                  <div className="workshop-actions-group">
                    <button
                      type="button"
                      className="btn-action-edit"
                      onClick={() => onEditWorkshop(w)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-action-delete"
                      onClick={() => onDeleteWorkshop(w.id)}
                      title="Hủy lớp"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Pagination */}
      <LocalCraftPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredWorkshops.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="lớp workshop"
        totalUnfiltered={workshops.length}
        className="v03-pagination-card"
      />
    </div>
  );
};
export default WorkshopsManagerTab;
