import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { storiesApi, HeritageStoryDto, StoryPayload, StoryStatusType } from '@/services/api/stories';
import { uploadApi } from '@/services/api/upload';

export interface StoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: HeritageStoryDto | null;
  villageId: number;
  villageName?: string;
  artisans: { id: number; name: string }[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StoryFormModal: React.FC<StoryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  villageId: _villageId,
  villageName = 'Làng nghề truyền thống',
  artisans,
  showToast,
}) => {
  // Form fields (Strictly matching Database table craft_stories)
  const [title, setTitle] = useState('');
  const [artisanId, setArtisanId] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // UI & Upload States
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'DRAFT' | 'PENDING'>('DRAFT');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialData && initialData.story_id);
  const currentStatus = initialData?.status;

  // Sync state on modal open or initialData change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setArtisanId(initialData.artisan || null);
        setSummary(initialData.summary || '');
        setContent(initialData.content || '');
        setCoverImageUrl(initialData.cover_image_url || '');
      } else {
        setTitle('');
        setArtisanId(null);
        setSummary('');
        setContent('');
        setCoverImageUrl('');
      }
      setUploadMode('file');
      setErrors({});
      setGeneralError(null);
      setIsDirty(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  // Close on ESC key with dirty check
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  const handleRequestClose = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'Bạn có thay đổi chưa được lưu trong câu chuyện di sản này. Bạn có chắc chắn muốn đóng biểu mẫu không?'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Upload handler via Cloudinary only (no local media fallback)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        cover_image: 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        cover_image: 'Dung lượng ảnh tối đa là 5MB. Vui lòng chọn ảnh nhỏ hơn.',
      }));
      return;
    }

    setIsUploading(true);
    setErrors((prev) => {
      const rest = { ...prev };
      delete rest.cover_image;
      return rest;
    });

    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/stories');
      if (res.success && res.data?.secure_url) {
        setCoverImageUrl(res.data.secure_url);
        setIsDirty(true);
        showToast('Tải ảnh bìa lên Cloudinary thành công!', 'success');
      } else {
        setErrors((prev) => ({
          ...prev,
          cover_image: res.message || 'Không thể tải ảnh lên máy chủ Cloudinary. Ảnh cũ được giữ nguyên.',
        }));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        cover_image: 'Lỗi kết nối khi tải ảnh lên Cloudinary.',
      }));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearCoverImage = () => {
    setCoverImageUrl('');
    setIsDirty(true);
    setErrors((prev) => {
      const rest = { ...prev };
      delete rest.cover_image;
      return rest;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Tiêu đề câu chuyện là bắt buộc.';
    } else if (title.trim().length < 3) {
      errs.title = 'Tiêu đề câu chuyện phải có ít nhất 3 ký tự.';
    } else if (title.length > 200) {
      errs.title = 'Tiêu đề không được vượt quá 200 ký tự.';
    }

    if (summary && summary.length > 500) {
      errs.summary = 'Tóm tắt không được vượt quá 500 ký tự.';
    }

    if (!content.trim()) {
      errs.content = 'Nội dung câu chuyện là bắt buộc.';
    } else if (content.trim().length < 10) {
      errs.content = 'Nội dung ký sự phải có ít nhất 10 ký tự trước khi lưu.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PENDING') => {
    if (!validate()) return;

    setGeneralError(null);
    setIsSubmitting(true);
    setSubmitMode(targetStatus);

    const payload: StoryPayload = {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      artisan: artisanId || null,
      status: targetStatus as StoryStatusType,
    };

    try {
      if (isEditing && initialData) {
        // If story is currently PENDING and user wants to withdraw to DRAFT
        if (currentStatus === 'PENDING' && targetStatus === 'DRAFT') {
          const res = await storiesApi.update(initialData.story_id, { status: 'DRAFT' });
          if (res.success) {
            showToast('Đã rút câu chuyện về bản nháp thành công!', 'success');
            onSuccess();
            onClose();
          } else {
            setGeneralError(res.message || 'Không thể rút câu chuyện về bản nháp.');
          }
          return;
        }

        const res = await storiesApi.update(initialData.story_id, payload);
        if (res.success) {
          if (targetStatus === 'PENDING') {
            showToast('Đã lưu và gửi câu chuyện lên Admin kiểm duyệt!', 'success');
          } else {
            showToast('Cập nhật bản nháp câu chuyện thành công!', 'success');
          }
          onSuccess();
          onClose();
        } else {
          setGeneralError(res.message || 'Không thể cập nhật câu chuyện.');
        }
      } else {
        // Create new story
        const res = await storiesApi.create(payload);
        if (res.success) {
          if (targetStatus === 'PENDING') {
            showToast('Đã tạo và gửi câu chuyện lên Admin kiểm duyệt!', 'success');
          } else {
            showToast('Đã lưu câu chuyện dưới dạng bản nháp!', 'success');
          }
          onSuccess();
          onClose();
        } else {
          setGeneralError(res.message || 'Không thể tạo câu chuyện mới.');
        }
      }
    } catch {
      setGeneralError('Đã xảy ra lỗi trong quá trình gửi dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed metrics
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));
  const selectedArtisanName = artisanId
    ? artisans.find((a) => a.id === artisanId)?.name || `Nghệ nhân #${artisanId}`
    : 'Câu chuyện chung của làng nghề';

  return createPortal(
    <div
      className="artisan-modal-overlay"
      onClick={handleRequestClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="v06-form-modal-box"
        style={{ maxWidth: '960px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v06-modal-form-wrapper">
          {/* 1. Modal Header */}
          <div className="v06-modal-header">
            <div className="v06-header-left">
              <div className="v06-tag-row">
                {isEditing && initialData?.story_id && (
                  <span className="v06-heritage-code font-mono">#{initialData.story_id}</span>
                )}
                <span className="v06-tag-pill">KÝ SỰ & DI SẢN LÀNG NGHỀ</span>
                {/* {isEditing && currentStatus && renderStatusBadge(currentStatus)} */}
              </div>
              <h3 className="v06-modal-title">
                {isEditing ? 'Chỉnh Sửa Câu Chuyện Di Sản' : 'Khai Báo Câu Chuyện Làng Nghề Mới'}
              </h3>
              <p className="v06-modal-sub">
                Đơn vị bảo chứng: <strong>{initialData?.village_name || villageName}</strong> · Tôn vinh tinh hoa kỹ nghệ cổ truyền
              </p>
            </div>

            <div className="v06-header-actions">
              <button
                type="button"
                className="v06-close-btn"
                onClick={handleRequestClose}
                aria-label="Đóng biểu mẫu"
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
          <div className="v06-modal-body">
            {/* General Error Banner */}
            {generalError && (
              <div className="v06-rejection-banner" role="alert" style={{ marginBottom: '16px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v06-rejection-banner-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="v06-rejection-content">
                  <strong className="v06-rejection-title">Có lỗi xảy ra:</strong>
                  <div className="v06-rejection-note">{generalError}</div>
                </div>
              </div>
            )}

            {/* Workflow Banner: APPROVED */}
            {isEditing && currentStatus === 'APPROVED' && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', color: '#14532d', marginBottom: '2px' }}>
                    Câu chuyện đã được xuất bản công khai
                  </strong>
                  Khi bạn chỉnh sửa nội dung và lưu lại, bài viết sẽ tự động chuyển sang trạng thái <strong>Chờ duyệt</strong> để Ban quản trị Admin kiểm duyệt nội dung mới trước khi xuất bản lại.
                </div>
              </div>
            )}

            {/* Workflow Banner: REJECTED */}
            {isEditing && currentStatus === 'REJECTED' && (
              <div className="v06-rejection-banner" role="alert" style={{ marginBottom: '16px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v06-rejection-banner-icon">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="v06-rejection-content">
                  <strong className="v06-rejection-title">Bài viết cần điều chỉnh và gửi duyệt lại</strong>
                  <div className="v06-rejection-note">
                    Vui lòng hoàn thiện hoặc bổ sung chi tiết theo yêu cầu của Admin, sau đó bấm nút <strong>"Gửi duyệt lại"</strong> bên dưới.
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Banner: PENDING */}
            {isEditing && currentStatus === 'PENDING' && (
              <div className="v06-pending-banner" style={{ marginBottom: '16px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <strong>Đang chờ Admin duyệt:</strong> Bạn không thể chỉnh sửa trực tiếp khi câu chuyện đang trong hàng đợi kiểm duyệt. Bạn có thể nhấn <strong>"Rút về bản nháp"</strong> nếu muốn chỉnh sửa thêm.
                </div>
              </div>
            )}

            {/* Workflow Banner: HIDDEN */}
            {isEditing && currentStatus === 'HIDDEN' && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', color: '#1e293b', marginBottom: '2px' }}>
                    Câu chuyện đang ở trạng thái Tạm ẩn
                  </strong>
                  Bài viết hiện không hiển thị với du khách và không làm nguồn kiến thức chatbot. Bạn có thể biên tập và chọn <strong>"Lưu & Gửi duyệt lại"</strong> để Admin kích hoạt xuất bản.
                </div>
              </div>
            )}

            {/* Main Form Two-Column Grid */}
            <div className="v06-grid">
              {/* CỘT TRÁI (320px): Ảnh bìa, Thống kê ký sự & Hướng dẫn biên soạn */}
              <div className="v06-col-left">
                {/* 1. Ảnh bìa câu chuyện */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Ảnh bìa minh họa
                    </label>
                    <span style={{ fontSize: '11px', color: '#8C9691' }}>Tỷ lệ 16:9</span>
                  </div>

                  <div
                    className="v06-image-card"
                    style={{ height: '190px' }}
                  >
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={title || 'Ảnh bìa câu chuyện'}
                        className="v06-preview-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="v06-empty-preview">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8C9691" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="v06-empty-preview-icon" style={{ marginBottom: '4px' }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Chưa có ảnh bìa</span>
                        <small style={{ color: '#8C9691' }}>Khuyến nghị ảnh phong cảnh 16:9</small>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  {!(isEditing && currentStatus === 'PENDING') && (
                    <div className="v06-upload-box">
                      <div className="v06-tab-toggle">
                        <button
                          type="button"
                          className={`v06-tab-btn ${uploadMode === 'file' ? 'active' : ''}`}
                          onClick={() => {
                            setUploadMode('file');
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.cover_image;
                              return n;
                            });
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          Tải từ máy
                        </button>
                        <button
                          type="button"
                          className={`v06-tab-btn ${uploadMode === 'url' ? 'active' : ''}`}
                          onClick={() => {
                            setUploadMode('url');
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.cover_image;
                              return n;
                            });
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          Dán link ảnh
                        </button>
                      </div>

                      {uploadMode === 'file' ? (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            style={{ display: 'none' }}
                            onChange={handleImageFileChange}
                          />
                          <div
                            className="v06-dropzone"
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            aria-label="Chọn ảnh từ máy tính"
                          >
                            {isUploading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#984628' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(152, 70, 40, 0.3)',
                                    borderTopColor: '#984628',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                  }}
                                />
                                <span style={{ fontSize: '12px' }}>Đang tải lên Cloudinary...</span>
                              </div>
                            ) : (
                              <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#002720' }}>Bấm chọn tệp ảnh bìa</span>
                                  <span style={{ display: 'block', fontSize: '11px', color: '#8C9691', marginTop: '2px' }}>
                                    PNG, JPG, WEBP tối đa 5MB
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="v06-form-group" style={{ margin: 0 }}>
                          <input
                            type="url"
                            className="v06-input"
                            placeholder="https://res.cloudinary.com/..."
                            value={coverImageUrl}
                            onChange={(e) => {
                              setCoverImageUrl(e.target.value);
                              setIsDirty(true);
                            }}
                          />
                        </div>
                      )}

                      {errors.cover_image && (
                        <div className="v06-field-error" style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                          <span>{errors.cover_image}</span>
                        </div>
                      )}

                      {coverImageUrl && (
                        <button
                          type="button"
                          className="v06-btn-clear-img"
                          onClick={handleClearCoverImage}
                          title="Gỡ ảnh bìa"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Gỡ ảnh bìa
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Thẻ thống kê ký sự di sản */}
                <div
                  className="v06-price-highlight-card"
                  style={{
                    background: '#FAF8F5',
                    border: '1px solid #ECE7DE',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <span className="v06-price-highlight-label">Chỉ số văn bản ký sự</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 6px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#1C3B32' }}>
                      ~{readingTimeMinutes} phút đọc
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>({wordCount} từ)</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#5C6F68', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Lời kể: <strong>{selectedArtisanName}</strong></div>
                    <div>Tổng ký tự: <strong>{content.length}</strong> ký tự</div>
                  </div>
                </div>

                {/* 3. Gợi ý biên soạn di sản văn hóa */}
                <div
                  style={{
                    background: '#F8FBF9',
                    border: '1px dashed #A7F3D0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#065F46',
                      fontWeight: 700,
                      fontSize: '12px',
                      marginBottom: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Gợi ý biên soạn câu chuyện
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '16px',
                      fontSize: '11.5px',
                      color: '#334155',
                      lineHeight: 1.6,
                    }}
                  >
                    <li>Mở đầu bằng lịch sử hình thành hoặc ký ức truyền nghề độc bản.</li>
                    <li>Mô tả chi tiết kỹ nghệ tạo tác, công thức men hoặc chất liệu cổ.</li>
                    <li>Tôn vinh tâm huyết người nghệ nhân và thông điệp giữ gìn văn hóa.</li>
                  </ul>
                </div>
              </div>

              {/* CỘT PHẢI: Nội dung biên tập câu chuyện */}
              <div className="v06-col-right">
                {/* 1. Tiêu đề câu chuyện */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="story-title-input">
                      Tiêu đề câu chuyện di sản <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{title.length}/200 ký tự</span>
                  </div>
                  <input
                    id="story-title-input"
                    type="text"
                    className="v06-input"
                    placeholder="Ví dụ: Kỹ thuật phục dựng men rạn gốm Bát Tràng thế kỷ XVII"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                      setErrors((p) => {
                        const n = { ...p };
                        delete n.title;
                        return n;
                      });
                    }}
                    maxLength={200}
                    disabled={isEditing && currentStatus === 'PENDING'}
                  />
                  {errors.title && (
                    <div className="v06-field-error" style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px' }}>
                      {errors.title}
                    </div>
                  )}
                </div>

                {/* 2. Nghệ nhân chia sẻ / gắn liền */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="story-artisan-select">
                      Nghệ nhân chia sẻ / đại diện <span className="v06-required-star">*</span>
                    </label>
                    
                  </div>
                  <select
                    id="story-artisan-select"
                    className="v06-input"
                    value={artisanId || ''}
                    onChange={(e) => {
                      setArtisanId(e.target.value ? Number(e.target.value) : null);
                      setIsDirty(true);
                    }}
                    disabled={isEditing && currentStatus === 'PENDING'}
                  >
                    <option value="">-- Không gắn nghệ nhân cụ thể (Câu chuyện chung của làng nghề) --</option>
                    {artisans.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} 
                        {/* (Mã: #{a.id}) */}
                      </option>
                    ))}
                  </select>
                  <span className="v06-field-hint" style={{ fontSize: '11.5px', color: '#8C9691', marginTop: '2px' }}>
                    Chọn nghệ nhân thuộc làng nghề của bạn có kinh nghiệm hoặc kỹ nghệ gắn liền với ký sự này.
                  </span>
                </div>

                {/* 3. Tóm tắt câu chuyện (Summary / Excerpt) */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="story-summary-input">
                      Đoạn trích tóm tắt <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{summary.length}/500 ký tự</span>
                  </div>
                  <textarea
                    id="story-summary-input"
                    className="v06-textarea"
                    rows={2}
                    placeholder="Tóm tắt ngắn gọn bối cảnh và ý nghĩa văn hóa của câu chuyện (khoảng 1-3 câu xuất hiện ở thẻ xem nhanh)..."
                    value={summary}
                    onChange={(e) => {
                      setSummary(e.target.value);
                      setIsDirty(true);
                    }}
                    maxLength={500}
                    disabled={isEditing && currentStatus === 'PENDING'}
                  />
                  {errors.summary && (
                    <div className="v06-field-error" style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px' }}>
                      {errors.summary}
                    </div>
                  )}
                  <span className="v06-field-hint" style={{ fontSize: '11.5px', color: '#8C9691', marginTop: '2px' }}>
                    Đoạn văn tóm lược hiển thị trên thẻ danh mục và là cơ sở trích dẫn cho du khách tra cứu nhanh.
                  </span>
                </div>

                {/* 4. Nội dung ký sự toàn văn (Content) */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="story-content-input">
                      Nội dung ký sự toàn văn <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{wordCount} từ · {content.length} ký tự</span>
                  </div>
                  <textarea
                    id="story-content-input"
                    className="v06-textarea"
                    rows={10}
                    placeholder="Trình bày chi tiết lịch sử làng nghề, bí quyết kỹ nghệ cổ truyền, các giai đoạn chế tác thủ công hoặc ký ức của tiền nhân..."
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setIsDirty(true);
                      setErrors((p) => {
                        const n = { ...p };
                        delete n.content;
                        return n;
                      });
                    }}
                    disabled={isEditing && currentStatus === 'PENDING'}
                  />
                  {errors.content && (
                    <div className="v06-field-error" style={{ color: '#dc2626', fontSize: '12px', marginTop: '2px' }}>
                      {errors.content}
                    </div>
                  )}
                  <span className="v06-field-hint" style={{ fontSize: '11.5px', color: '#8C9691', marginTop: '2px' }}>
                    Toàn văn câu chuyện di sản (tối thiểu 10 ký tự). Nội dung này sẽ được sử dụng làm tư liệu văn hóa chính thức cho du khách và chatbot sau khi Admin phê duyệt.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Modal Footer */}
          <div className="v06-modal-footer">
            {/* <div style={{ marginRight: 'auto', fontSize: '12px', color: '#64748b' }}>
              {isEditing
                ? `Mã bài viết: #${initialData?.story_id} · Trạng thái: ${initialData?.status}`
                : 'Bài viết sẽ được kiểm duyệt bởi Ban quản trị Admin trước khi xuất bản công khai'}
            </div> */}

            <div className="v06-footer-right">
              <button
                type="button"
                className="v06-btn-cancel"
                onClick={handleRequestClose}
                disabled={isSubmitting || isUploading}
              >
                Hủy bỏ
              </button>

              {isEditing && currentStatus === 'PENDING' ? (
                <button
                  type="button"
                  className="v06-btn-submit"
                  style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
                  onClick={() => handleSubmit('DRAFT')}
                  disabled={isSubmitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  {isSubmitting ? 'Đang rút về nháp...' : 'Rút về bản nháp để sửa'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="v06-btn-draft"
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={isSubmitting || isUploading}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {isSubmitting && submitMode === 'DRAFT' ? 'Đang lưu nháp...' : 'Lưu bản nháp'}
                  </button>

                  <button
                    type="button"
                    className="v06-btn-submit"
                    onClick={() => handleSubmit('PENDING')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting && submitMode === 'PENDING' ? (
                      <>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255, 255, 255, 0.4)',
                            borderTopColor: '#ffffff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <span>Đang gửi duyệt...</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        <span>
                          {isEditing && currentStatus === 'REJECTED'
                            ? 'Gửi duyệt lại'
                            : isEditing && (currentStatus === 'APPROVED' || currentStatus === 'HIDDEN')
                            ? 'Lưu & Gửi duyệt lại'
                            : 'Lưu & Gửi duyệt ngay'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoryFormModal;
