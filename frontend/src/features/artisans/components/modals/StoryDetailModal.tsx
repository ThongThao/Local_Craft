import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HeritageStoryDto, StoryStatusType } from '@/services/api/stories';

export interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: HeritageStoryDto | null;
  onEdit?: (story: HeritageStoryDto) => void;
  onSubmitForReview?: (story: HeritageStoryDto) => void;
  onHide?: (story: HeritageStoryDto) => void;
  onWithdraw?: (story: HeritageStoryDto) => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  isOpen,
  onClose,
  story,
  onEdit,
  onSubmitForReview,
  onHide,
  onWithdraw,
}) => {
  // Close on ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !story) return null;

  const canEdit = story.status !== 'PENDING';
  const canSubmit = story.status === 'DRAFT' || story.status === 'REJECTED' || story.status === 'HIDDEN';
  const isApproved = story.status === 'APPROVED';
  const isPending = story.status === 'PENDING';

  // Format date helper
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Reading time and word count computation
  const wordCount = story.content ? story.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  // Render Status Alert Banner
  const renderStatusBanner = (status: StoryStatusType) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="v16-detail-banner approved">
            <div className="v16-detail-banner-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v16-detail-banner-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <strong>ĐÃ ĐƯỢC PHÊ DUYỆT CÔNG KHAI · ĐÃ KÍCH HOẠT CHO CHATBOT AI</strong>
                
              </div>
            </div>
           
          </div>
        );
      case 'PENDING':
        return (
          <div className="v16-detail-banner pending">
            <div className="v16-detail-banner-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v16-detail-banner-icon">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <strong>ĐANG CHỜ ADMIN DUYỆT KIỂM ĐỊNH</strong>
                <div className="v16-detail-banner-sub">
                  Câu chuyện đang trong hàng đợi phê duyệt của Quản trị viên. Bạn có thể rút về bản nháp để chỉnh sửa thêm nếu cần.
                </div>
              </div>
            </div>
            <span className="v16-detail-banner-badge pending">
              CHỜ DUYỆT
            </span>
          </div>
        );
      case 'DRAFT':
        return (
          <div className="v16-detail-banner draft">
            <div className="v16-detail-banner-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v16-detail-banner-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div>
                <strong>BẢN NHÁP NỘI BỘ</strong>
                <div className="v16-detail-banner-sub">
                  Câu chuyện chưa được gửi kiểm duyệt và chỉ hiển thị trong trang quản trị nội bộ của làng nghề.
                </div>
              </div>
            </div>
            <span className="v16-detail-banner-badge draft">
              BẢN NHÁP
            </span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="v16-detail-banner rejected">
            <div className="v16-detail-banner-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v16-detail-banner-icon">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <div>
                <strong>YÊU CẦU HOÀN THIỆN LẠI </strong>
                <div className="v16-detail-banner-sub">
                  Admin đã yêu cầu bổ sung hoặc chỉnh lý nội dung. Vui lòng bấm 'Chỉnh sửa câu chuyện' để cập nhật rồi gửi duyệt lại.
                </div>
              </div>
            </div>
            <span className="v16-detail-banner-badge rejected">
              TỪ CHỐI
            </span>
          </div>
        );
      case 'HIDDEN':
        return (
          <div className="v16-detail-banner hidden">
            <div className="v16-detail-banner-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="v16-detail-banner-icon">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <div>
                <strong>ĐANG TẠM ẨN CÔNG KHAI</strong>
                <div className="v16-detail-banner-sub">
                  Câu chuyện hiện không hiển thị với du khách và tạm thời không cung cấp tri thức cho Chatbot. Bạn có thể khôi phục lại bất kỳ lúc nào.
                </div>
              </div>
            </div>
            <span className="v16-detail-banner-badge hidden">
              TẠM ẨN
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <div
      className="artisan-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-detail-modal-title"
    >
      <div
        className="v16-detail-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="v06-modal-header">
          <div className="v06-header-left">
            <div className="v06-tag-row">
              <span className="v06-heritage-code font-mono">#{story.story_id}</span>
              <span className="v06-tag-pill">KÝ SỰ &amp; DI SẢN LÀNG NGHỀ</span>
              {/* {renderCardBadge(story.status)} */}
            </div>
            <h3 id="story-detail-modal-title" className="v06-modal-title">
              Toàn Văn Câu Chuyện Di Sản
            </h3>
            <p className="v06-modal-sub">
              Bảo tồn di sản bởi: <strong>{story.village_name}</strong> · Tôn vinh tinh hoa kỹ nghệ truyền đời
            </p>
          </div>

          <div className="v06-header-actions">
            <button
              type="button"
              className="v06-close-btn"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              title="Đóng (ESC)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div className="v16-detail-body">
          {/* Status Alert Banner */}
          {renderStatusBanner(story.status)}

          {/* Cover Image Banner */}
          {story.cover_image_url ? (
            <div className="v16-detail-cover-container">
              <img
                src={story.cover_image_url}
                alt={story.title}
                className="v16-detail-cover-img"
              />
              {/* <div className="v16-detail-cover-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{readingTime} phút đọc · {wordCount} từ</span>
              </div> */}
            </div>
          ) : (
            <div className="v16-detail-cover-container">
              <div className="v16-detail-cover-fallback">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span className="v16-detail-fallback-text">Tác phẩm di sản làng nghề {story.village_name}</span>
                <div className="v16-detail-cover-badge">
                  <span>{readingTime} phút đọc · {wordCount} từ</span>
                </div>
              </div>
            </div>
          )}

          {/* Meta Chips Bar */}
          <div className="v16-detail-meta-row">
            <div className="v16-detail-chips-group">
              {/* Artisan / Narrator */}
              <div className="v16-detail-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>
                  Lời: <strong>{story.artisan_name || 'Đại diện làng nghề'}</strong>
                </span>
              </div>

              {/* Village */}
              <div className="v16-detail-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21V11h6v10" />
                </svg>
                <span>
                  Làng nghề: <strong>{story.village_name}</strong>
                </span>
              </div>

              {/* Created Date */}
              {/* <div className="v16-detail-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Tạo lúc: {formatDate(story.created_at)}</span>
              </div> */}

              {/* Published Date */}
              {story.published_at && (
                <div className="v16-detail-chip">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Xuất bản: {formatDate(story.published_at)}</span>
                </div>
              )}
            </div>

            {/* Slug chip with quick copy */}
            {/* <div className="v16-detail-chips-group">
              <div className="v16-detail-chip slug-chip">
                <span>slug: /{story.slug}</span>
                <button
                  type="button"
                  onClick={handleCopySlug}
                  className="v16-detail-chip-copy-btn"
                  title="Sao chép slug"
                >
                  {copiedSlug ? (
                    <span className="v16-detail-copied-text">Đã chép!</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div> */}
          </div>

          {/* Story Title */}
          <h2 className="v16-detail-heading">
            {story.title}
          </h2>

          {/* Summary Quote Box */}
          {story.summary && (
            <div className="v16-detail-summary-card">
              <div className="v16-detail-summary-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Tóm tắt nội dung
              </div>
              <p className="v16-detail-summary-text">
                &ldquo;{story.summary}&rdquo;
              </p>
            </div>
          )}

          {/* Full Story Content Article */}
          <div className="v16-detail-content-section">
            <div className="v16-detail-content-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="21" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="3" y2="18" />
              </svg>
              Toàn văn câu chuyện di sản
            </div>
            <div className="v16-detail-article">
              {story.content}
            </div>
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="v16-detail-footer">
          <button
            type="button"
            className="v06-btn-cancel"
            onClick={onClose}
          >
            Đóng
          </button>

          <div className="v16-detail-footer-right">
            {/* Withdraw button if PENDING */}
            {isPending && onWithdraw && (
              <button
                type="button"
                className="v16-btn-action-pill withdraw v16-detail-btn-action"
                onClick={() => {
                  onClose();
                  onWithdraw(story);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Rút về bản nháp
              </button>
            )}

            {/* Hide button if APPROVED */}
            {isApproved && onHide && (
              <button
                type="button"
                className="v16-btn-action-pill hide v16-detail-btn-action"
                onClick={() => {
                  onClose();
                  onHide(story);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                Tạm ẩn 
              </button>
            )}

            {/* Submit / Re-submit / Restore button */}
            {canSubmit && onSubmitForReview && (
              <button
                type="button"
                className="v16-btn-action-pill submit v16-detail-btn-action"
                onClick={() => {
                  onClose();
                  onSubmitForReview(story);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {story.status === 'HIDDEN'
                  ? 'Khôi phục & Gửi duyệt'
                  : story.status === 'REJECTED'
                  ? 'Gửi duyệt lại'
                  : 'Gửi duyệt Admin'}
              </button>
            )}

            {/* Edit button */}
            {canEdit && onEdit && (
              <button
                type="button"
                className="artisan-primary-btn v16-detail-btn-edit"
                onClick={() => {
                  onClose();
                  onEdit(story);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Chỉnh sửa 
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoryDetailModal;
