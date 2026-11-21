import React, { useState, useEffect, useCallback } from 'react';
import {
  storiesApi,
  HeritageStoryDto,
  CraftStorySummaryDto,
  StoryStatusType,
} from '@/services/api/stories';
import StoryFormModal from '../modals/StoryFormModal';
import StoryDetailModal from '../modals/StoryDetailModal';

interface HeritageStoriesTabProps {
  stories?: any[];
  villageId?: number;
  artisans?: Array<{ id: number; displayName?: string; name?: string }>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCreateStory?: () => void;
  onLikeStory?: (storyId: number) => void;
}

export const HeritageStoriesTab: React.FC<HeritageStoriesTabProps> = ({
  stories: _initialStories,
  villageId,
  artisans = [],
  showToast = (msg) => console.log(msg),
  onLikeStory: _onLikeStory,
}) => {
  // State
  const [stories, setStories] = useState<HeritageStoryDto[]>([]);
  const [summary, setSummary] = useState<CraftStorySummaryDto>({
    total_stories: 0,
    draft_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    hidden_count: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedArtisanId, setSelectedArtisanId] = useState<string>('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingStory, setEditingStory] = useState<HeritageStoryDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [viewingStory, setViewingStory] = useState<HeritageStoryDto | null>(null);

  // Action loaders
  const [quickSubmittingId, setQuickSubmittingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hidingId, setHidingId] = useState<number | null>(null);

  // Load KPI Summary
  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await storiesApi.getSummary(villageId);
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn('Could not load stories summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [villageId]);

  // Load Stories List
  const loadStories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await storiesApi.getAll({
        village_id: villageId,
        status: selectedStatus,
        artisan_id: selectedArtisanId ? Number(selectedArtisanId) : undefined,
        search: searchTerm.trim() || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        setStories(res.data);
      } else {
        setError(res.message || 'Không thể tải danh sách câu chuyện.');
      }
    } catch {
      setError('Lỗi kết nối khi tải danh sách câu chuyện.');
    } finally {
      setIsLoading(false);
    }
  }, [villageId, selectedStatus, selectedArtisanId, searchTerm]);

  // Initial load
  useEffect(() => {
    loadSummary();
    loadStories();
  }, [loadSummary, loadStories]);

  // Actions
  const handleOpenCreate = () => {
    setEditingStory(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (story: HeritageStoryDto) => {
    setEditingStory(story);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (story: HeritageStoryDto) => {
    setViewingStory(story);
    setIsDetailOpen(true);
  };

  const handleQuickSubmit = async (story: HeritageStoryDto) => {
    if (story.status === 'PENDING') {
      showToast('Câu chuyện này đang chờ duyệt.', 'info');
      return;
    }
    if (story.status === 'APPROVED') {
      showToast('Câu chuyện này đã được xuất bản.', 'info');
      return;
    }

    setQuickSubmittingId(story.story_id);
    try {
      const res = await storiesApi.submit(story.story_id);
      if (res.success) {
        showToast(`Đã gửi câu chuyện "${story.title}" lên Admin kiểm duyệt!`, 'success');
        loadStories();
        loadSummary();
      } else {
        showToast(res.message || 'Không thể gửi duyệt câu chuyện.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi gửi duyệt.', 'error');
    } finally {
      setQuickSubmittingId(null);
    }
  };

  const handleHideStory = async (story: HeritageStoryDto) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn tạm ẩn câu chuyện: "${story.title}"?\n\n` +
      `Lưu ý: Sau khi ẩn, câu chuyện sẽ không còn hiển thị công khai trên website và trợ lý AI chatbot sẽ không sử dụng dữ liệu này.`
    );
    if (!confirmed) return;

    setHidingId(story.story_id);
    try {
      const res = await storiesApi.update(story.story_id, { status: 'HIDDEN' });
      if (res.success) {
        showToast(`Đã tạm ẩn câu chuyện "${story.title}".`, 'success');
        loadStories();
        loadSummary();
      } else {
        showToast(res.message || 'Không thể tạm ẩn câu chuyện.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tạm ẩn câu chuyện.', 'error');
    } finally {
      setHidingId(null);
    }
  };

  const handleWithdrawPending = async (story: HeritageStoryDto) => {
    const confirmed = window.confirm(`Rút câu chuyện "${story.title}" về bản nháp để tiếp tục chỉnh sửa?`);
    if (!confirmed) return;

    try {
      const res = await storiesApi.update(story.story_id, { status: 'DRAFT' });
      if (res.success) {
        showToast(`Đã rút câu chuyện "${story.title}" về bản nháp thành công!`, 'success');
        loadStories();
        loadSummary();
      } else {
        showToast(res.message || 'Không thể rút câu chuyện về bản nháp.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi rút câu chuyện.', 'error');
    }
  };

  const handleDeleteStory = async (story: HeritageStoryDto) => {
    if (story.status === 'PENDING') {
      showToast('Không thể xóa câu chuyện đang chờ duyệt. Vui lòng rút về bản nháp trước.', 'error');
      return;
    }
    if (story.status === 'APPROVED') {
      showToast('Không thể xóa câu chuyện đã xuất bản. Bạn có thể chuyển sang trạng thái Ẩn.', 'error');
      return;
    }
    if (story.status === 'HIDDEN') {
      showToast('Không thể xóa câu chuyện đang tạm ẩn. Bạn có thể khôi phục hoặc gửi duyệt lại.', 'error');
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn câu chuyện: "${story.title}"?`);
    if (!confirmed) return;

    setDeletingId(story.story_id);
    try {
      const res = await storiesApi.delete(story.story_id);
      if (res.success) {
        showToast(`Đã xóa câu chuyện thành công.`, 'success');
        loadStories();
        loadSummary();
      } else {
        showToast(res.message || 'Không thể xóa câu chuyện.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa câu chuyện.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Format Artisans for form dropdown
  const formattedArtisans = artisans.map((a) => ({
    id: a.id,
    name: a.displayName || a.name || `Nghệ nhân #${a.id}`,
  }));

  // Render Status Badge
  const renderCardStatusBadge = (status: StoryStatusType) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="v16-status-badge approved">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã xuất bản
          </span>
        );
      case 'PENDING':
        return (
          <span className="v16-status-badge pending">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Chờ duyệt
          </span>
        );
      case 'DRAFT':
        return (
          <span className="v16-status-badge draft">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Bản nháp
          </span>
        );
      case 'REJECTED':
        return (
          <span className="v16-status-badge rejected">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Bị từ chối
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="v16-status-badge hidden">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            Tạm ẩn
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const statusTabs = [
    { key: 'ALL', label: 'Tất cả', count: summary.total_stories },
    { key: 'APPROVED', label: 'Đã xuất bản', count: summary.approved_count },
    { key: 'PENDING', label: 'Chờ duyệt', count: summary.pending_count },
    { key: 'DRAFT', label: 'Bản nháp', count: summary.draft_count },
    { key: 'REJECTED', label: 'Bị từ chối', count: summary.rejected_count },
    { key: 'HIDDEN', label: 'Tạm ẩn', count: summary.hidden_count },
  ];

  return (
    <div className="artisan-tab-pane heritage-stories-pane v16-stories-pane">
      {/* 1. Header Toolbar */}
      <div className="tab-toolbar-card v16-toolbar-card">
        <div className="v16-title-group">
          <div className="v16-title-row">
            <h2 className="v16-main-title">
              Quản Lý Câu Chuyện Làng Nghề
            </h2>
          </div>
          <p className="v16-main-desc">
            Khai báo, biên tập và gửi duyệt nội dung văn hóa, lịch sử và tinh hoa kỹ nghệ của làng nghề
          </p>
        </div>

        <button
          type="button"
          className="artisan-primary-btn v16-btn-create-header"
          onClick={handleOpenCreate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Khai Báo Câu Chuyện Mới
        </button>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="v03-kpi-grid v16-kpi-grid">
        {/* Total */}
        <div className="v03-kpi-card v16-kpi-clickable" onClick={() => setSelectedStatus('ALL')}>
          <div className="v03-kpi-icon total">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng câu chuyện</span>
            <span className="v03-kpi-value v16-kpi-num v16-kpi-total">
              {isSummaryLoading ? '...' : summary.total_stories}
            </span>
          </div>
        </div>

        {/* Approved */}
        <div className="v03-kpi-card v16-kpi-clickable" onClick={() => setSelectedStatus('APPROVED')}>
          <div className="v03-kpi-icon public">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đã xuất bản</span>
            <span className="v03-kpi-value v16-kpi-num v16-kpi-approved">
              {isSummaryLoading ? '...' : summary.approved_count}
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="v03-kpi-card v16-kpi-clickable" onClick={() => setSelectedStatus('PENDING')}>
          <div className="v03-kpi-icon pending">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Chờ duyệt</span>
            <span className="v03-kpi-value v16-kpi-num v16-kpi-pending">
              {isSummaryLoading ? '...' : summary.pending_count}
            </span>
          </div>
        </div>

        {/* Draft */}
        <div className="v03-kpi-card v16-kpi-clickable" onClick={() => setSelectedStatus('DRAFT')}>
          <div className="v03-kpi-icon draft">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Bản nháp</span>
            <span className="v03-kpi-value v16-kpi-num v16-kpi-draft">
              {isSummaryLoading ? '...' : summary.draft_count}
            </span>
          </div>
        </div>

        {/* Rejected */}
        <div className="v03-kpi-card v16-kpi-clickable" onClick={() => setSelectedStatus('REJECTED')}>
          <div className="v03-kpi-icon v16-icon-rejected">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Bị từ chối</span>
            <span className="v03-kpi-value v16-kpi-num v16-kpi-rejected">
              {isSummaryLoading ? '...' : summary.rejected_count}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="v16-filter-card">
        {/* Status Pills */}
        <div className="v16-status-pills-row">
          {statusTabs.map((tab) => {
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatus(tab.key)}
                className={`v16-status-pill-btn ${isActive ? 'active' : ''}`}
              >
                <span>{tab.label}</span>
                <span className="v16-pill-counter">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Artisan Filter */}
        <div className="v16-controls-row">
          {/* Search box */}
          <div className="toolbar-search-box v16-search-box">
            <svg
              className="v16-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, tóm tắt, nội dung câu chuyện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="v16-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="v16-search-clear-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Artisan select */}
          <div className="v16-select-wrap">
            <select
              value={selectedArtisanId}
              onChange={(e) => setSelectedArtisanId(e.target.value)}
              className="v16-select-input"
            >
              <option value="">-- Lọc theo tất cả nghệ nhân --</option>
              {formattedArtisans.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {(searchTerm || selectedStatus !== 'ALL' || selectedArtisanId) && (
            <button
              type="button"
              className="artisan-secondary-btn v16-btn-reset-filters"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('ALL');
                setSelectedArtisanId('');
              }}
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* 4. Stories Grid / Content Area */}
      {isLoading ? (
        <div className="v16-loading-panel">
          <div className="v16-loading-inner">
            <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
            <span className="v16-loading-text">Đang tải danh sách câu chuyện di sản...</span>
          </div>
        </div>
      ) : error ? (
        <div className="v16-error-panel">
          <p className="v16-error-msg">{error}</p>
          <button type="button" className="artisan-primary-btn v16-error-retry-btn" onClick={loadStories}>
            Thử lại
          </button>
        </div>
      ) : stories.length === 0 ? (
        <div className="v16-empty-panel">
          <div className="v16-empty-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h3 className="v16-empty-heading">
            Không tìm thấy câu chuyện nào
          </h3>
          <p className="v16-empty-caption">
            {searchTerm || selectedStatus !== 'ALL' || selectedArtisanId
              ? 'Không có kết quả phù hợp với tiêu chí lọc của bạn. Hãy thử thay đổi bộ lọc.'
              : 'Làng nghề chưa có câu chuyện di sản nào. Hãy bắt đầu ghi lại câu chuyện đầu tiên.'}
          </p>
          <button
            type="button"
            className="artisan-primary-btn v16-empty-create-btn"
            onClick={handleOpenCreate}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tạo câu chuyện mới ngay
          </button>
        </div>
      ) : (
        <div className="heritage-stories-grid">
          {stories.map((s) => (
            <div key={s.story_id} className="heritage-story-card">
              {/* Image wrap with Status Badge */}
              <div className="story-card-image-wrap">
                <img
                  src={
                    s.cover_image_url ||
                    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={s.title}
                  className="story-card-img"
                />
                <div className="v16-card-badge-container">
                  {renderCardStatusBadge(s.status)}
                </div>
                <span className="story-readtime-badge">
                  {s.published_at
                    ? new Date(s.published_at).toLocaleDateString('vi-VN')
                    : new Date(s.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {/* Body */}
              <div className="story-card-body">
                <div className="story-meta-top">
                  <span className="story-author" title={s.artisan_name || 'Đại diện làng nghề'}>
                    Lời kể: <strong>{s.artisan_name || 'Đại diện làng nghề'}</strong>
                  </span>
                  <span className="v16-story-id-label">#{s.story_id}</span>
                </div>

                <h4
                  className="story-title v16-story-clickable-title"
                  onClick={() => handleOpenDetail(s)}
                  title="Nhấn để xem chi tiết"
                >
                  {s.title}
                </h4>

                <p className="story-excerpt">
                  {s.summary || (s.content ? s.content.slice(0, 140) + '...' : 'Chưa có mô tả ngắn.')}
                </p>

                {/* Bottom Actions (Aligned with V05 Pattern) */}
                <div className="v16-card-actions">
                  <button
                    type="button"
                    className="v16-card-btn-view"
                    onClick={() => handleOpenDetail(s)}
                    title="Xem chi tiết toàn văn câu chuyện"
                    aria-label="Xem chi tiết"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Xem chi tiết</span>
                  </button>

                  {/* Workflow Action (Contextual based on status) */}
                  {s.status === 'APPROVED' && (
                    <button
                      type="button"
                      className="v16-action-btn hide"
                      onClick={() => handleHideStory(s)}
                      disabled={hidingId === s.story_id}
                      title="Tạm ẩn câu chuyện khỏi hiển thị công khai"
                      aria-label="Tạm ẩn câu chuyện"
                    >
                      {hidingId === s.story_id ? (
                        <svg className="v03-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  )}

                  {s.status === 'HIDDEN' && (
                    <button
                      type="button"
                      className="v16-action-btn restore"
                      onClick={() => handleQuickSubmit(s)}
                      disabled={quickSubmittingId === s.story_id}
                      title="Khôi phục và gửi câu chuyện lên Admin duyệt lại"
                      aria-label="Khôi phục câu chuyện"
                    >
                      {quickSubmittingId === s.story_id ? (
                        <svg className="v03-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  )}

                  {s.status === 'PENDING' && (
                    <button
                      type="button"
                      className="v16-action-btn withdraw"
                      onClick={() => handleWithdrawPending(s)}
                      title="Rút câu chuyện về bản nháp để tiếp tục chỉnh sửa"
                      aria-label="Rút về nháp"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </button>
                  )}

                  {(s.status === 'DRAFT' || s.status === 'REJECTED') && (
                    <button
                      type="button"
                      className="v16-action-btn submit"
                      onClick={() => handleQuickSubmit(s)}
                      disabled={quickSubmittingId === s.story_id}
                      title="Gửi bài lên Admin duyệt"
                      aria-label="Gửi duyệt"
                    >
                      {quickSubmittingId === s.story_id ? (
                        <svg className="v03-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Edit button */}
                  {s.status !== 'PENDING' && (
                    <button
                      type="button"
                      className="v16-action-btn edit"
                      onClick={() => handleOpenEdit(s)}
                      title="Chỉnh sửa câu chuyện"
                      aria-label="Chỉnh sửa câu chuyện"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}

                  {/* Delete button (DRAFT / REJECTED only) */}
                  {(s.status === 'DRAFT' || s.status === 'REJECTED') && (
                    <button
                      type="button"
                      className="v16-action-btn delete"
                      onClick={() => handleDeleteStory(s)}
                      disabled={deletingId === s.story_id}
                      title="Xóa câu chuyện"
                      aria-label="Xóa câu chuyện"
                    >
                      {deletingId === s.story_id ? (
                        <svg className="v03-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Modals */}
      <StoryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          loadStories();
          loadSummary();
        }}
        initialData={editingStory}
        villageId={villageId || 0}
        artisans={formattedArtisans}
        showToast={showToast}
      />

      <StoryDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        story={viewingStory}
        onEdit={(st) => handleOpenEdit(st)}
        onSubmitForReview={(st) => handleQuickSubmit(st)}
        onHide={(st) => handleHideStory(st)}
        onWithdraw={(st) => handleWithdrawPending(st)}
      />
    </div>
  );
};

export default HeritageStoriesTab;
