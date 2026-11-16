import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reviewsApi, ReviewDetailDto, ReviewDto } from '@/services/api/reviews';

export interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewDetailDto | ReviewDto | null;
  onSuccess?: (updatedReview: ReviewDetailDto) => void;
  showToast?: (message: string) => void;
  initialEditMode?: boolean;
}

/* --- Inline SVG Icons Chuẩn Theme LocalCraft --- */
const IconClose: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconStar: React.FC<{ size?: number; filled?: boolean; className?: string }> = ({ size = 18, filled = true, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#F59E0B' : '#E2E8F0'}
    stroke={filled ? '#F59E0B' : '#CBD5E1'}
    strokeWidth="1"
    className={className}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconUser: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconProduct: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconWorkshop: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconMessageSquare: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconReply: React.FC<{ size?: number; className?: string }> = ({ size = 17, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconEdit: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconSend: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconCheck: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSpinner: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const IconPotteryFallback: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 3h8M9 3v2a3 3 0 0 1-1 2.24C6.4 8.5 5 11 5 14a7 7 0 0 0 14 0c0-3-1.4-5.5-3-6.76A3 3 0 0 1 15 5V3" />
    <path d="M7 14h10" />
  </svg>
);

const IconWorkshopFallback: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z" />
  </svg>
);

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
  isOpen,
  onClose,
  review,
  onSuccess,
  showToast,
  initialEditMode = false,
}) => {
  const [currentReview, setCurrentReview] = useState<ReviewDetailDto | ReviewDto | null>(review);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when review prop changes or modal opens
  useEffect(() => {
    if (review) {
      setCurrentReview(review);
      setReplyText(review.reply_content || '');
      setIsEditing(initialEditMode || !review.reply_content);
      setErrorMessage(null);
    }
  }, [review, initialEditMode, isOpen]);

  // 1. Phím tắt ESC để đóng modal
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

  // 2. Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentReview || typeof document === 'undefined') return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isProduct = currentReview.target_type === 'PRODUCT' || Boolean(currentReview.product);

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5:
        return 'Tuyệt vời';
      case 4:
        return 'Hài lòng';
      case 3:
        return 'Bình thường';
      case 2:
        return 'Chưa hài lòng';
      case 1:
        return 'Kém / Thất vọng';
      default:
        return `${score} sao`;
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) {
      setErrorMessage('Nội dung phản hồi không được để trống.');
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMessage('Nội dung phản hồi không được vượt quá 1000 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await reviewsApi.reply(currentReview.review_id, trimmed);
      if (res.data) {
        setCurrentReview(res.data);
        setIsEditing(false);
        const successMsg = currentReview.reply_content
          ? 'Đã cập nhật phản hồi thành công!'
          : 'Đã gửi phản hồi chính thức cho du khách!';
        showToast?.(successMsg);
        onSuccess?.(res.data);
      }
    } catch (err: any) {
      const errDetail = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi phản hồi.';
      setErrorMessage(errDetail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setReplyText(currentReview.reply_content || '');
    setIsEditing(false);
    setErrorMessage(null);
  };

  const hasExistingReply = Boolean(currentReview.reply_content && currentReview.reply_content.trim());

  return createPortal(
    <div
      className="artisan-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-detail-title"
    >
      <div
        className="v06-form-modal-box v15-review-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
      >
        <div className="v06-modal-form-wrapper">
          {/* 1. Modal Header */}
          <div className="v06-modal-header">
            <div className="v06-header-left">
              <div className="v06-tag-row">
                <span className="v06-heritage-code font-mono">
                   #{currentReview.review_id}
                </span>
                {currentReview.status === 'VISIBLE' ? (
                  <span className="v08-status-badge approved" title="Đánh giá đang hiển thị công khai trên LocalCraft">
                    <span className="v08-status-dot approved" />
                    Hiển thị
                  </span>
                ) : (
                  <span className="v08-status-badge rejected" title="Đánh giá đang bị ẩn">
                    <span className="v08-status-dot rejected" />
                    Đang ẩn
                  </span>
                )}
                {hasExistingReply ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '16px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    <IconCheck size={12} />
                    <span>Đã phản hồi</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '14px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      background: '#FFF0EB',
                      color: '#92400E',
                      border: '1px solid #92400E',
                    }}
                  >
                    <IconClock size={12} />
                    <span>Chờ phản hồi</span>
                  </span>
                )}
              </div>
              <h3 id="review-detail-title" className="v06-modal-title">
                Chi Tiết Đánh Giá & Phản Hồi Khách Hàng
              </h3>
              <p className="v06-modal-sub">
                Thời điểm đánh giá: <strong>{formatDate(currentReview.created_at)}</strong> • Phân loại:{' '}
                <strong>{isProduct ? 'Sản phẩm làng nghề' : 'Workshop trải nghiệm'}</strong>
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
                <IconClose size={18} />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div className="v06-modal-body v12-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Card 1: Khách hàng & Điểm đánh giá */}
            <div className="v12-section-card">
              <div className="v12-section-head">
                <h4 className="v12-section-title">
                  <IconUser size={16} />
                  Thông tin khách hàng & Điểm xếp hạng
                </h4>
                <span className="v12-account-pill">
                  {currentReview.user ? ` #${currentReview.user}` : 'Khách vãng lai'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {currentReview.user_avatar ? (
                    <img
                      src={currentReview.user_avatar}
                      alt={currentReview.user_name}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #ECE7DE',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1C3B32, #2D5A4C)',
                        color: '#FAF8F5',
                        fontSize: '19px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(28, 59, 50, 0.2)',
                      }}
                    >
                      {currentReview.user_name ? currentReview.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#1C3B32' }}>
                      {currentReview.user_name || 'Du khách ẩn danh'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#717A76', marginTop: '3px' }}>
                      {currentReview.user_email ? currentReview.user_email : 'Chưa cập nhật email'}
                    </div>
                  </div>
                </div>

                {/* Stars Rating Box */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    background: '#FAF8F5',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #ECE7DE',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IconStar
                        key={star}
                        size={18}
                        filled={star <= currentReview.rating}
                      />
                    ))}
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#D97706', marginLeft: '6px' }}>
                      {currentReview.rating}.0 / 5.0
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#92400E', marginTop: '2px' }}>
                    {getRatingLabel(currentReview.rating)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Đối tượng được đánh giá */}
            <div className="v12-section-card">
              <div className="v12-section-head">
                <h4 className="v12-section-title">
                  {isProduct ? <IconProduct size={16} /> : <IconWorkshop size={16} />}
                  Đối tượng được đánh giá
                </h4>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    background: isProduct ? '#E8F5F1' : '#FFF0EB',
                    color: isProduct ? '#2D5A4C' : '#92400E',
                    border: isProduct ? '1px solid #BBF7D0' : '1px solid #92400E',
                  }}
                >
                  {isProduct ? 'Sản phẩm thủ công' : 'Workshop trải nghiệm'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {isProduct ? (
                  <>
                    {currentReview.product_image ? (
                      <img
                        src={currentReview.product_image}
                        alt={currentReview.product_name || 'Sản phẩm'}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid #ECE7DE',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconPotteryFallback size={30} />
                      </div>
                    )}
                    <div>
                      <h5 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#1C3B32' }}>
                        {currentReview.product_name || `Sản phẩm #${currentReview.product}`}
                      </h5>
                      <span style={{ fontSize: '12px', color: '#717A76' }}>
                        Mã sản phẩm: <strong style={{ color: '#1C3B32' }}>#{currentReview.product || '---'}</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {currentReview.workshop_image ? (
                      <img
                        src={currentReview.workshop_image}
                        alt={currentReview.workshop_name || 'Workshop'}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid #ECE7DE',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          color: '#92400E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconWorkshopFallback size={30} />
                      </div>
                    )}
                    <div>
                      <h5 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#1C3B32' }}>
                        {currentReview.workshop_name || 'Workshop trải nghiệm'}
                      </h5>
                      <div style={{ fontSize: '12px', color: '#717A76', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {currentReview.booking_code && (
                          <span>
                            Mã đặt chỗ: <strong style={{ color: '#1C3B32' }}>#{currentReview.booking_code}</strong>
                          </span>
                        )}
                        {currentReview.session_start_at && (
                          <span>
                            Ca tham gia: <strong style={{ color: '#1C3B32' }}>{formatDate(currentReview.session_start_at)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Card 3: Tiêu đề & Nội dung nhận xét của khách */}
            <div className="v12-section-card">
              <div className="v12-section-head">
                <h4 className="v12-section-title">
                  <IconMessageSquare size={16} />
                  Nội dung nhận xét của khách hàng
                </h4>
                <span style={{ fontSize: '11.5px', color: '#717A76', fontWeight: 600 }}>
                  Đã kiểm duyệt
                </span>
              </div>

              {currentReview.title && (
                <h4
                  style={{
                    margin: '0 0 10px',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#1C3B32',
                    lineHeight: 1.4,
                  }}
                >
                  {currentReview.title}
                </h4>
              )}

              <div
                style={{
                  background: '#FAF8F5',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: '1px solid #ECE7DE',
                  fontSize: '14.5px',
                  color: '#2C3A35',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  position: 'relative',
                }}
              >
                {currentReview.content ? (
                  currentReview.content
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>
                    Du khách không để lại nhận xét văn bản chi tiết, chỉ gửi điểm xếp hạng sao.
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: PHẢN HỒI CHÍNH THỨC CỦA ĐẠI DIỆN LÀNG NGHỀ (V15) */}
            <div
              className="v12-section-card"
              style={{
                border: '1.5px solid #1C3B32',
                borderRadius: '12px',
                background: '#F9FAF9',
                boxShadow: '0 4px 12px rgba(28, 59, 50, 0.05)',
              }}
            >
              <div className="v12-section-head" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <h4 className="v12-section-title" style={{ color: '#1C3B32' }}>
                  <IconReply size={17} />
                  Phản hồi của Đại diện Làng nghề
                </h4>
                {hasExistingReply && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #1C3B32',
                      color: '#1C3B32',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconEdit size={13} />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>

              {/* View mode: Displays formatted reply */}
              {hasExistingReply && !isEditing ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                      fontSize: '12.5px',
                      color: '#4B5563',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1C3B32' }}>
                      {currentReview.replied_by_name || 'Đại diện Làng nghề'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(currentReview.replied_at)}</span>
                    {currentReview.reply_updated_at && (
                      <span style={{ fontStyle: 'italic', color: '#6B7280' }}>
                        (Đã sửa: {formatDate(currentReview.reply_updated_at)})
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#1F2937',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {currentReview.reply_content}
                  </div>
                </div>
              ) : (
                /* Edit / Compose form */
                <form onSubmit={handleSubmitReply} style={{ marginTop: '4px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label
                      htmlFor="reply-textarea"
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
                    >
                      {hasExistingReply ? 'Nội dung cập nhật phản hồi:' : 'Soạn phản hồi:'}
                    </label>
                    <textarea
                      id="reply-textarea"
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Gửi lời cảm ơn chân thành hoặc giải đáp chi tiết cho du khách (tối đa 1000 ký tự)..."
                      rows={4}
                      maxLength={1000}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: replyText.length > 900 ? '#DC2626' : '#6B7280' }}>
                      {replyText.length}/1000 ký tự
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {hasExistingReply && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #D1D5DB',
                            background: '#FFFFFF',
                            color: '#374151',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting || !replyText.trim()}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSubmitting || !replyText.trim() ? '#9CA3AF' : '#1C3B32',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isSubmitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <IconSpinner size={14} className="v03-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <IconSend size={14} />
                            <span>{hasExistingReply ? 'Lưu cập nhật' : 'Gửi phản hồi'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#FEE2E2',
                        border: '1px solid #FCA5A5',
                        color: '#991B1B',
                        fontSize: '12.5px',
                      }}
                    >
                      {errorMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* 3. Modal Footer */}
          <div className="v06-modal-footer">
            <div className="v06-footer-right">
              <button
                type="button"
                className="v06-btn-cancel"
                onClick={onClose}
                title="Đóng cửa sổ chi tiết (Phím ESC)"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReviewDetailModal;
