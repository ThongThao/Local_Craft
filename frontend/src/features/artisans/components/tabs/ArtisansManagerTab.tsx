import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArtisanProfileItem, VerificationStatus } from '../../types';
import { LocalCraftPagination } from '../LocalCraftPagination';

interface ArtisansManagerTabProps {
  artisans: ArtisanProfileItem[];
  onOpenAddModal: () => void;
  onEditArtisan: (artisan: ArtisanProfileItem) => void;
  onDeleteArtisan?: (artisanId: number) => void;
  showToast?: (message: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export const ArtisansManagerTab: React.FC<ArtisansManagerTabProps> = ({
  artisans,
  onOpenAddModal,
  onEditArtisan,
  onDeleteArtisan,
  isLoading = false,
  errorMessage = null,
  onRetry,
}) => {
  // View mode: 'table' (Bảng chi tiết) | 'card' (Dạng lưới thẻ)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    artisan: ArtisanProfileItem | null;
  }>({
    isOpen: false,
    artisan: null,
  });

  // Quick View Modal State
  const [viewArtisanModal, setViewArtisanModal] = useState<ArtisanProfileItem | null>(null);

  // Debounce search input (280ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // 1. KPI Statistics Calculations (Strictly 3 Verification Statuses)
  const stats = useMemo(() => {
    const total = artisans.length;
    const approvedCount = artisans.filter((a) => a.verificationStatus === 'APPROVED').length;
    const pendingCount = artisans.filter((a) => a.verificationStatus === 'PENDING').length;
    const rejectedCount = artisans.filter((a) => a.verificationStatus === 'REJECTED').length;
    return { total, approvedCount, pendingCount, rejectedCount };
  }, [artisans]);

  // 2. Filtered artisans
  const filteredArtisans = useMemo(() => {
    return artisans.filter((a) => {
      // Status filter
      if (statusFilter !== 'ALL' && a.verificationStatus !== statusFilter) {
        return false;
      }

      // Search keyword filter (display_name, bio)
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase().trim();
        const matchName = a.displayName.toLowerCase().includes(query);
        const matchBio = a.bio ? a.bio.toLowerCase().includes(query) : false;
        if (!matchName && !matchBio) {
          return false;
        }
      }

      return true;
    });
  }, [artisans, statusFilter, debouncedSearch]);

  // 3. Pagination slices
  const totalItems = filteredArtisans.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedArtisans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArtisans.slice(start, start + pageSize);
  }, [filteredArtisans, currentPage, pageSize]);

  // Delete Action Handlers
  const handleOpenDelete = (artisan: ArtisanProfileItem) => {
    setDeleteModal({
      isOpen: true,
      artisan,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.artisan && onDeleteArtisan) {
      onDeleteArtisan(deleteModal.artisan.id);
    }
    setDeleteModal({ isOpen: false, artisan: null });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Helper render status badge with standard VerificationStatus labels
  const renderStatusBadge = (status?: VerificationStatus) => {
    const s = status || 'PENDING';
    switch (s) {
      case 'APPROVED':
        return (
          <span className="v03-badge-status public" title="Hồ sơ nghệ nhân đã được Ban quản trị phê duyệt xác minh">
            <span className="status-dot green" />
            <span>Đã xác minh</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="v03-badge-status pending" title="Hồ sơ đang chờ Ban quản trị kiểm duyệt thông tin">
            <span className="status-dot amber" />
            <span>Chờ xác minh</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="v03-badge-status closed" title="Hồ sơ bị từ chối thẩm định. Vui lòng xem lý do và cập nhật">
            <span className="status-dot red" />
            <span>Bị từ chối</span>
          </span>
        );
      default:
        return (
          <span className="v03-badge-status pending">
            <span className="status-dot amber" />
            <span>Chờ xác minh</span>
          </span>
        );
    }
  };

  return (
    <div className="artisan-tab-pane artisans-manager-pane">
      {/* 1. Header Toolbar */}
      <div className="v03-header-card">
        <div className="v03-header-left">
          <h2 className="v03-header-title">Hồ sơ nghệ nhân</h2>
          <p className="v03-header-subtitle">
            Quản lý đội ngũ nghệ nhân thuộc làng nghề. Thêm mới, chỉnh sửa thông tin và theo dõi tình trạng xác minh hồ sơ.
          </p>
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-add-artisan"
            onClick={onOpenAddModal}
            title="Thêm nghệ nhân mới vào làng nghề"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm nghệ nhân</span>
          </button>
        </div>
      </div>

      {/* 2. Mini KPI Quick Statistics (4 cards: Tổng, Đã duyệt, Chờ duyệt, Từ chối) */}
      <div className="v03-kpi-grid">
        {/* Total */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon total">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng nghệ nhân</span>
            <div className="v03-kpi-value">{stats.total}</div>
            <span className="v03-kpi-sub">Trực thuộc làng nghề</span>
          </div>
        </div>

        {/* Approved */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon public">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đã xác minh</span>
            <div className="v03-kpi-value public-val">{stats.approvedCount}</div>
            <span className="v03-kpi-sub">Được công khai sản phẩm/workshop</span>
          </div>
        </div>

        {/* Pending */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon pending">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Chờ xác minh</span>
            <div className="v03-kpi-value pending-val">{stats.pendingCount}</div>
            <span className="v03-kpi-sub">Ban quản trị đang thẩm định</span>
          </div>
        </div>

        {/* Rejected */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon closed" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Bị từ chối</span>
            <div className="v03-kpi-value" style={{ color: '#dc2626' }}>{stats.rejectedCount}</div>
            <span className="v03-kpi-sub">Cần cập nhật lại thông tin</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="v03-filter-card">
        <div className="v03-search-wrapper">
          <svg className="v03-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm kiếm nghệ nhân theo tên, tiểu sử..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="v03-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="v03-filter-controls">
          {/* Status Filter Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tất cả </option>
              <option value="APPROVED">Đã xác minh </option>
              <option value="PENDING">Chờ xác minh</option>
              <option value="REJECTED">Bị từ chối </option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc về mặc định"
            >
              <span>Đặt lại</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="v03-view-mode-toggle" role="group" aria-label="Chế độ hiển thị danh sách">
            <button
              type="button"
              className={`v03-toggle-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem danh sách dạng bảng chi tiết"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`v03-toggle-view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Xem danh sách dạng thẻ nghệ nhân"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error state banner */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="v03-table-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <div className="v04-spinner" style={{ margin: '0 auto 12px', borderColor: 'rgba(152, 70, 40, 0.2)', borderTopColor: '#984628' }} />
          <p>Đang tải danh sách hồ sơ nghệ nhân...</p>
        </div>
      ) : (
        /* 4. Artisans Table / Card View */
        <div className="v03-table-card">
          {filteredArtisans.length === 0 ? (
            <div className="v03-empty-state">
              <div className="v03-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              {artisans.length === 0 ? (
                <>
                  <h3 className="v03-empty-title">Chưa có hồ sơ nghệ nhân</h3>
                  <p className="v03-empty-desc">
                    Thêm hồ sơ nghệ nhân đầu tiên để bảo tồn và giới thiệu tinh hoa tay nghề của làng nghề tới du khách.
                  </p>
                  <button
                    type="button"
                    className="v03-btn-add-artisan empty-btn"
                    onClick={onOpenAddModal}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Thêm nghệ nhân đầu tiên</span>
                  </button>
                </>
              ) : (
                <>
                  <h3 className="v03-empty-title">Không tìm thấy nghệ nhân phù hợp</h3>
                  <p className="v03-empty-desc">
                    Không có hồ sơ nào khớp với từ khóa tìm kiếm hoặc bộ lọc trạng thái hiện tại.
                  </p>
                  <button
                    type="button"
                    className="v03-btn-reset-filters"
                    onClick={handleResetFilters}
                  >
                    Xóa bộ lọc & Xem tất cả
                  </button>
                </>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* VIEW MODE 1: DETAIL / TABLE VIEW */
            <div className="v03-table-container">
              <table className="v03-artisans-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%', minWidth: '190px' }}>NGHỆ NHÂN</th>
                    <th style={{ width: '36%', minWidth: '260px' }}>TIỂU SỬ & CÂU CHUYỆN</th>
                    <th style={{ width: '11%', minWidth: '100px' }}>THÂM NIÊN</th>
                    <th style={{ width: '11%', minWidth: '110px' }}>HOẠT ĐỘNG</th>
                    <th style={{ width: '10%', minWidth: '120px' }}>XÁC MINH</th>
                    <th style={{ width: '10%', minWidth: '100px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArtisans.map((artisan) => {
                    const bioText = (artisan.bio || '').trim();
                    const hasBio = bioText.length > 0;
                    // In table view, column width is wide (~300-450px). Bio is long if > 150 chars or >= 3 linebreaks
                    const isBioLong = hasBio && (bioText.length > 150 || (bioText.match(/\n/g) || []).length >= 3);

                    return (
                      <tr key={artisan.id} className="v03-table-row">
                        {/* Cột 1: Nghệ nhân (Avatar + Tên + ID) */}
                        <td className="v03-artisan-col-cell">
                          <div className="v03-artisan-cell">
                            <div
                              className="v03-artisan-avatar-wrap"
                              onClick={() => setViewArtisanModal(artisan)}
                              title={`Bấm xem chi tiết hồ sơ nghệ nhân ${artisan.displayName}`}
                            >
                              {artisan.avatarUrl ? (
                                <img
                                  src={artisan.avatarUrl}
                                  alt={artisan.displayName}
                                  className="v03-artisan-avatar"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div className="v03-artisan-avatar-fallback">
                                {artisan.displayName ? artisan.displayName.slice(0, 1).toUpperCase() : 'N'}
                              </div>
                            </div>
                            <div className="v03-artisan-info">
                              <div className="v03-artisan-name-line">
                                <button
                                  type="button"
                                  className="v03-artisan-name-btn"
                                  onClick={() => setViewArtisanModal(artisan)}
                                  title={artisan.displayName}
                                >
                                  {artisan.displayName}
                                </button>
                              </div>
                              <span className="v03-artisan-code" title={`Mã nghệ nhân: #${artisan.id}`}>
                                Mã: #{artisan.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: TIỂU SỬ & CÂU CHUYỆN (Line-clamped 4 lines, no row stretch) */}
                        <td className="v03-bio-cell">
                          <div
                            className={`v03-table-bio ${isBioLong ? 'has-long-bio' : ''}`}
                            onClick={() => {
                              if (isBioLong) setViewArtisanModal(artisan);
                            }}
                            title={isBioLong ? 'Nhấn để xem toàn bộ tiểu sử và câu chuyện nghệ nhân' : undefined}
                          >
                            {hasBio ? (
                              <div className="v03-table-bio-text">{bioText}</div>
                            ) : (
                              <div className="v03-table-bio-empty">Chưa có thông tin tiểu sử.</div>
                            )}

                            {isBioLong && (
                              <button
                                type="button"
                                className="v03-table-bio-more"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewArtisanModal(artisan);
                                }}
                                title="Xem toàn bộ tiểu sử và câu chuyện nghệ nhân"
                                aria-label="Xem thêm tiểu sử nghệ nhân"
                              >
                                ... Xem thêm
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: THÂM NIÊN KINH NGHIỆM */}
                        <td>
                          <div className="v03-exp-cell">
                            <span className="v03-exp-number">{artisan.experienceYears ?? 0} năm</span>
                          </div>
                        </td>

                        {/* Cột 4: HOẠT ĐỘNG (Sản phẩm & Workshop) */}
                        <td>
                          <div className="v03-activity-cell">
                            <div className="v03-activity-line">
                              <strong className="v03-activity-count">{artisan.productCount ?? 0}</strong>
                              <span className="v03-activity-label"> sản phẩm</span>
                            </div>
                            <div className="v03-activity-line">
                              <strong className="v03-activity-count">{artisan.workshopCount ?? 0}</strong>
                              <span className="v03-activity-label"> workshop</span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 5: TRẠNG THÁI XÁC MINH */}
                        <td>
                          {renderStatusBadge(artisan.verificationStatus)}
                        </td>

                        {/* Cột 6: THAO TÁC (Xem, Sửa, Xóa) */}
                        <td>
                          <div className="v03-table-actions-group">
                            <button
                              type="button"
                              className="v03-icon-action-btn view"
                              onClick={() => setViewArtisanModal(artisan)}
                              title="Xem chi tiết hồ sơ"
                              aria-label="Xem chi tiết hồ sơ"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="v03-icon-action-btn edit"
                              onClick={() => onEditArtisan(artisan)}
                              title="Chỉnh sửa thông tin hồ sơ"
                              aria-label="Chỉnh sửa hồ sơ"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="v03-icon-action-btn delete"
                              onClick={() => handleOpenDelete(artisan)}
                              title="Xóa hồ sơ nghệ nhân"
                              aria-label="Xóa hồ sơ nghệ nhân"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VIEW MODE 2: CARD / GRID VIEW */
            <div className="v03-cards-grid">
                {paginatedArtisans.map((artisan) => {
                  const bioText = (artisan.bio || '').trim();
                  const hasBio = bioText.length > 0;
                  // Bio is considered long if it exceeds ~130 chars or has multiple linebreaks
                  const isBioLong = hasBio && (bioText.length > 130 || (bioText.match(/\n/g) || []).length >= 3);

                  return (
                    <div key={artisan.id} className="v03-artisan-card">
                      {/* 1. Header: Avatar & Info */}
                      <div className="v03-card-top-row">
                        <div
                          className="v03-card-avatar-wrap"
                          onClick={() => setViewArtisanModal(artisan)}
                          title={`Xem chi tiết hồ sơ nghệ nhân ${artisan.displayName}`}
                        >
                          {artisan.avatarUrl ? (
                            <img
                              src={artisan.avatarUrl}
                              alt={artisan.displayName}
                              className="v03-card-avatar"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className="v03-card-avatar-fallback">
                            {artisan.displayName ? artisan.displayName.slice(0, 1).toUpperCase() : 'N'}
                          </div>
                        </div>

                        <div className="v03-card-info-col">
                          <div className="v03-card-title-row">
                            <button
                              type="button"
                              className="v03-card-name-btn"
                              onClick={() => setViewArtisanModal(artisan)}
                              title={artisan.displayName}
                            >
                              {artisan.displayName}
                            </button>
                            <span className="v03-card-code" title={`Mã nghệ nhân: #${artisan.id}`}>
                              #{artisan.id}
                            </span>
                          </div>

                          <div className="v03-card-badge-container">
                            {renderStatusBadge(artisan.verificationStatus)}
                          </div>
                        </div>
                      </div>

                      {/* 2. Kinh nghiệm làm nghề */}
                      <div className="v03-card-experience">
                        <span className="v03-card-experience-lbl">THÂM NIÊN LÀM NGHỀ</span>
                        <span className="v03-card-experience-val">
                          <strong>{artisan.experienceYears ?? 0}</strong> năm
                        </span>
                      </div>

                      {/* 3. Tiểu sử & Câu chuyện (Fixed Height & Line Clamped) */}
                      <div className="v03-card-bio-section">
                        <span className="v03-card-bio-lbl">TIỂU SỬ & CÂU CHUYỆN</span>
                        <div
                          className={`v03-card-bio-container ${isBioLong ? 'has-long-bio' : ''}`}
                          onClick={() => {
                            if (isBioLong) setViewArtisanModal(artisan);
                          }}
                          title={isBioLong ? 'Nhấn để xem toàn bộ tiểu sử và câu chuyện nghệ nhân' : undefined}
                        >
                          {hasBio ? (
                            <p className="v03-card-bio-text">{bioText}</p>
                          ) : (
                            <p className="v03-card-bio-empty">Chưa có thông tin tiểu sử.</p>
                          )}

                          {isBioLong && (
                            <button
                              type="button"
                              className="v03-card-read-more"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewArtisanModal(artisan);
                              }}
                              title="Xem toàn bộ tiểu sử và câu chuyện nghệ nhân"
                              aria-label="Xem thêm tiểu sử nghệ nhân"
                            >
                              ... Xem thêm
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4. Làng nghề & Thống kê sản phẩm / workshop */}
                      <div className="v03-card-meta-line">
                        <span className="v03-card-village-badge" title={artisan.villageName || 'Làng nghề'}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{artisan.villageName || 'Làng nghề truyền thống'}</span>
                        </span>

                        <div className="v03-card-activity-chips">
                          <span className="v03-act-chip" title="Số lượng sản phẩm liên kết">
                            <strong>{artisan.productCount ?? 0}</strong> sp
                          </span>
                          <span className="v03-act-chip" title="Số lượng workshop tham gia">
                            <strong>{artisan.workshopCount ?? 0}</strong> ws
                          </span>
                        </div>
                      </div>

                      {/* 5. Footer Actions: Pinned to Bottom */}
                      <div className="v03-card-footer-box">
                        <span className="v03-card-heritage-code">
                          ID: #{artisan.id}
                        </span>

                        <div className="v03-card-actions-wrapper">
                          <button
                            type="button"
                            className="v03-icon-action-btn view"
                            onClick={() => setViewArtisanModal(artisan)}
                            title="Xem chi tiết hồ sơ"
                            aria-label="Xem chi tiết hồ sơ"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="v03-icon-action-btn edit"
                            onClick={() => onEditArtisan(artisan)}
                            title="Chỉnh sửa thông tin hồ sơ"
                            aria-label="Chỉnh sửa hồ sơ"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="v03-icon-action-btn delete"
                            onClick={() => handleOpenDelete(artisan)}
                            title="Xóa hồ sơ nghệ nhân"
                            aria-label="Xóa hồ sơ nghệ nhân"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          )}

          {/* Unified LocalCraft Pagination */}
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(pg) => setCurrentPage(pg)}
            itemLabel="nghệ nhân"
            totalUnfiltered={artisans.length}
          />
        </div>
      )}

      {/* 6. Modal Xác nhận Xóa Hồ Sơ Nghệ Nhân */}
      {deleteModal.isOpen && deleteModal.artisan && createPortal(
        <div className="v03-modal-backdrop" onClick={() => setDeleteModal({ isOpen: false, artisan: null })}>
          <div className="v03-confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="v03-confirm-icon-wrap" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>

            <div className="v03-confirm-content">
              <h3 className="v03-confirm-title">Xóa hồ sơ nghệ nhân?</h3>
              <p className="v03-confirm-desc">
                Bạn có chắc chắn muốn xóa hồ sơ nghệ nhân <strong>{deleteModal.artisan.displayName}</strong> (Mã #{deleteModal.artisan.id})?
              </p>
              <div className="v03-confirm-notice">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  <strong>Lưu ý:</strong> Thao tác này sẽ xóa hồ sơ nghệ nhân khỏi cơ sở dữ liệu. Các sản phẩm và workshop liên kết sẽ được ngắt liên kết an toàn.
                </span>
              </div>
            </div>

            <div className="v03-confirm-actions">
              <button
                type="button"
                className="v03-confirm-btn cancel"
                onClick={() => setDeleteModal({ isOpen: false, artisan: null })}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="v03-confirm-btn submit"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
                onClick={handleConfirmDelete}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 7. Modal Xem Chi Tiết Hồ Sơ Nghệ Nhân (V04 Quick View Detail) */}
      {viewArtisanModal && createPortal(
        <div className="v03-modal-backdrop" onClick={() => setViewArtisanModal(null)} role="dialog" aria-modal="true">
          <div className="v03-detail-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="v03-detail-modal-header">
              <div className="v03-detail-header-left">
                <div className="v03-detail-tag-row">
                  <span className="v03-detail-tag-pill">HỒ SƠ NGHỆ NHÂN LÀNG NGHỀ</span>
                  <span className="v03-detail-heritage-code">MÃ SỐ: #{viewArtisanModal.id}</span>
                </div>
                <h3 className="v03-detail-modal-title">Hồ sơ nghệ nhân</h3>
                <p className="v03-detail-modal-sub">
                  Làng nghề trực thuộc: <strong>{viewArtisanModal.villageName || 'Chưa gán làng nghề'}</strong>
                  {viewArtisanModal.villageProvince && ` (${viewArtisanModal.villageProvince})`}
                </p>
              </div>
              <button
                type="button"
                className="v03-detail-close-btn"
                onClick={() => setViewArtisanModal(null)}
                aria-label="Đóng cửa sổ xem hồ sơ"
                title="Đóng modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="v03-detail-modal-body">
              <div className="v03-detail-two-col">
                {/* Cột trái (35-40%): Ảnh chân dung & Thâm niên */}
                <div className="v03-detail-col-left">
                  <div className="v03-detail-image-wrapper">
                    {viewArtisanModal.avatarUrl ? (
                      <img
                        src={viewArtisanModal.avatarUrl}
                        alt={viewArtisanModal.displayName}
                        className="v03-detail-image"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="v04-empty-preview" style={{ height: '240px' }}>
                        <span className="v04-empty-preview-icon">👤</span>
                        <span>Chưa có ảnh chân dung</span>
                      </div>
                    )}
                  </div>

                  {/* Left Side Quick Info Cards */}
                  <div className="v03-detail-left-meta-card">
                    <div className="v03-meta-highlight-box">
                      <span className="v03-meta-exp-num">{viewArtisanModal.experienceYears} Năm</span>
                      <span className="v03-meta-exp-lbl">Thâm niên gắn bó làng nghề</span>
                    </div>

                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                        Tình trạng xác minh hồ sơ
                      </span>
                      {renderStatusBadge(viewArtisanModal.verificationStatus)}
                    </div>
                  </div>
                </div>

                {/* Cột phải (60-65%): Thông tin hồ sơ & Câu chuyện */}
                <div className="v03-detail-col-right">
                  {/* Name */}
                  <div className="v03-detail-title-section">
                    <h2 className="v03-detail-artisan-name">{viewArtisanModal.displayName}</h2>
                    {/* <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      Mã định danh trong hệ thống: <strong>#{viewArtisanModal.id}</strong>
                    </div> */}
                  </div>

                  {/* Rejection Note Warning if any */}
                  {viewArtisanModal.verificationStatus === 'REJECTED' && viewArtisanModal.verificationNote && (
                    <div
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                      }}
                    >
                      <strong style={{ color: '#991b1b', fontSize: '13px' }}>Lý do từ chối thẩm định:</strong>
                      <p style={{ color: '#b91c1c', fontSize: '12px', margin: '4px 0 0' }}>
                        {viewArtisanModal.verificationNote}
                      </p>
                    </div>
                  )}

                  {/* Bio & Story */}
                  <div className="v03-detail-section-card">
                    <h4 className="v03-detail-card-head">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span>Tiểu sử & Câu chuyện nghề</span>
                    </h4>
                    <p className="v03-detail-bio-text">
                      {viewArtisanModal.bio || 'Chưa cập nhật câu chuyện tiểu sử cho nghệ nhân này.'}
                    </p>
                  </div>

                  {/* Activity Stats */}
                  <div className="v03-detail-stats-grid">
                    <div className="v03-stat-tile">
                      <span className="stat-tile-val">{viewArtisanModal.productCount ?? 0}</span>
                      <span className="stat-tile-lbl">Sản phẩm liên kết</span>
                    </div>
                    <div className="v03-stat-tile">
                      <span className="stat-tile-val">{viewArtisanModal.workshopCount ?? 0}</span>
                      <span className="stat-tile-lbl">Workshop hướng dẫn</span>
                    </div>
                  </div>

                  {/* Timestamp info */}
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af', display: 'flex', gap: '16px' }}>
                    <span>Ngày lập: {new Date(viewArtisanModal.createdAt).toLocaleDateString('vi-VN')}</span>
                    {viewArtisanModal.updatedAt && (
                      <span>Cập nhật: {new Date(viewArtisanModal.updatedAt).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="v03-detail-modal-footer">
              <button
                type="button"
                className="v03-detail-btn-cancel"
                onClick={() => setViewArtisanModal(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="v03-detail-btn-edit"
                onClick={() => {
                  const target = viewArtisanModal;
                  setViewArtisanModal(null);
                  onEditArtisan(target);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Chỉnh sửa</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ArtisansManagerTab;
