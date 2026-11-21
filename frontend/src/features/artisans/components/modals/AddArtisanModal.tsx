import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArtisanProfileItem } from '../../types';
import { uploadApi } from '../../../../services/api/upload';

interface AddArtisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (artisanData: Partial<ArtisanProfileItem>) => Promise<boolean | void> | void;
  initialData?: ArtisanProfileItem | null;
  villageName: string;
}

export const AddArtisanModal: React.FC<AddArtisanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  villageName,
}) => {
  // Form fields (Strictly matching Database table artisan_profiles)
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | string>(10);
  const [bio, setBio] = useState('');

  // UI & Upload states
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    setErrors({});
    setGeneralError(null);
    setUploadError(null);
    setIsSubmitting(false);

    if (initialData) {
      setDisplayName(initialData.displayName || '');
      setAvatarUrl(initialData.avatarUrl || '');
      setExperienceYears(initialData.experienceYears ?? 0);
      setBio(initialData.bio || '');
    } else {
      setDisplayName('');
      setAvatarUrl('');
      setExperienceYears(5);
      setBio('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(initialData);

  // Upload image handler - CLOUDINARY ONLY (No blob fallback)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      setUploadError('Tệp tải lên phải là hình ảnh (JPG, PNG, WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Dung lượng ảnh tối đa là 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/artisans');
      if (res.success && (res.data?.secure_url || res.data?.url)) {
        const uploadedUrl = res.data.secure_url || res.data.url;
        setAvatarUrl(uploadedUrl);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.avatarUrl;
          return next;
        });
      } else {
        setUploadError(res.message || 'Tải ảnh lên máy chủ Cloudinary thất bại. Ảnh cũ được giữ nguyên.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi kết nối khi tải ảnh lên Cloudinary. Ảnh cũ được giữ nguyên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAvatar = () => {
    setAvatarUrl('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Họ và tên nghệ nhân (bắt buộc, max 150)
    if (!displayName.trim()) {
      newErrors.displayName = 'Vui lòng nhập họ và tên nghệ nhân.';
    } else if (displayName.trim().length > 150) {
      newErrors.displayName = 'Họ và tên nghệ nhân không được vượt quá 150 ký tự.';
    }

    // 2. Số năm kinh nghiệm (bắt buộc, số nguyên >= 0)
    const expNum = Number(experienceYears);
    if (experienceYears === '' || isNaN(expNum)) {
      newErrors.experienceYears = 'Vui lòng nhập số năm thâm niên làm nghề.';
    } else if (!Number.isInteger(expNum) || expNum < 0) {
      newErrors.experienceYears = 'Số năm thâm niên phải là số nguyên lớn hơn hoặc bằng 0.';
    } else if (expNum > 100) {
      newErrors.experienceYears = 'Số năm thâm niên không hợp lý (tối đa 100 năm).';
    }

    // 3. Avatar URL (nếu nhập tay thì phải là http/https hợp lệ, không chấp nhận blob)
    if (uploadMode === 'url' && avatarUrl.trim()) {
      if (avatarUrl.trim().startsWith('blob:')) {
        newErrors.avatarUrl = 'Không chấp nhận đường dẫn ảnh cục bộ blob. Vui lòng tải ảnh lên Cloudinary.';
      } else if (!/^https?:\/\/.+/i.test(avatarUrl.trim())) {
        newErrors.avatarUrl = 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<ArtisanProfileItem> = {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        experienceYears: Number(experienceYears),
        bio: bio.trim() || undefined,
      };

      const result = await onSave(payload);
      if (result === false) {
        setGeneralError('Không thể lưu hồ sơ nghệ nhân. Vui lòng kiểm tra lại thông tin và thử lại.');
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ nghệ nhân.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="artisan-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v04-form-modal-box" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="v04-modal-form-wrapper" noValidate>
          {/* 1. Header */}
          <div className="v04-modal-header">
            <div className="v04-header-left">
              <div className="v04-tag-row">
                <span className="v04-tag-pill">HỒ SƠ NGHỆ NHÂN LÀNG NGHỀ</span>
                {initialData?.id && (
                  <span className="v04-heritage-code">MÃ SỐ: #{initialData.id}</span>
                )}
              </div>
              <h3 className="v04-modal-title">
                {isEditMode ? 'Chỉnh sửa hồ sơ nghệ nhân' : 'Thêm hồ sơ nghệ nhân'}
              </h3>
              <p className="v04-modal-sub">
                Làng nghề bảo chứng: <strong>{villageName}</strong> · Quản lý thông tin & câu chuyện văn hóa
              </p>
            </div>

            <div className="v04-header-actions">
              <button
                type="button"
                className="v06-close-btn"
                onClick={onClose}
                aria-label="Đóng form hồ sơ nghệ nhân"
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
          <div className="v04-modal-body">
            {/* General Error Banner */}
            {generalError && (
              <div className="v04-alert-error" role="alert" style={{ marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>{generalError}</div>
              </div>
            )}

            {/* Rejection Note Notice if previously rejected */}
            {isEditMode && initialData?.verificationStatus === 'REJECTED' && initialData?.verificationNote && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong style={{ color: '#991b1b', fontSize: '13px', display: 'block' }}>
                    Hồ sơ bị từ chối duyệt trước đó:
                  </strong>
                  <p style={{ color: '#b91c1c', fontSize: '12px', margin: '4px 0 0' }}>
                    {initialData.verificationNote}
                  </p>
                  <small style={{ color: '#7f1d1d', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    * Vui lòng cập nhật lại thông tin để gửi Ban quản trị thẩm định lại.
                  </small>
                </div>
              </div>
            )}

            <div className="v04-two-col">
              {/* CỘT TRÁI (35-40%): Ảnh chân dung & Thâm niên */}
              <div className="v04-col-left">
                {/* Khung ảnh tỷ lệ 3:4 */}
                <div className="v04-image-card">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || 'Ảnh nghệ nhân'}
                      className="v04-preview-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <div className="v04-empty-preview">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="v04-empty-preview-icon" style={{ marginBottom: '4px' }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Chưa có ảnh chân dung</span>
                      <small style={{ color: '#94a3b8' }}>Khuyến nghị tỷ lệ 3:4</small>
                    </div>
                  )}

                  {isEditMode && initialData?.verificationStatus && (
                    <div className="v04-status-overlay">
                      <span className={`v03-badge-status ${initialData.verificationStatus.toLowerCase()}`}>
                        <span
                          className={`status-dot ${initialData.verificationStatus === 'APPROVED'
                              ? 'green'
                              : initialData.verificationStatus === 'PENDING'
                                ? 'amber'
                                : 'red'
                            }`}
                        />
                        <span>
                          {initialData.verificationStatus === 'APPROVED'
                            ? 'Đã xác minh'
                            : initialData.verificationStatus === 'PENDING'
                              ? 'Chờ xác minh'
                              : 'Từ chối'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Controls (Cloudinary Only) */}
                <div className="v06-upload-box">
                  <div className="v06-tab-toggle">
                    <button
                      type="button"
                      className={`v06-tab-btn ${uploadMode === 'file' ? 'active' : ''}`}
                      onClick={() => {
                        setUploadMode('file');
                        setUploadError(null);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      Tải ảnh từ máy
                    </button>
                    <button
                      type="button"
                      className={`v06-tab-btn ${uploadMode === 'url' ? 'active' : ''}`}
                      onClick={() => {
                        setUploadMode('url');
                        setUploadError(null);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Dán liên kết ảnh
                    </button>
                  </div>

                  {uploadMode === 'file' ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <div
                        className="v06-dropzone"
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        aria-label="Chọn ảnh từ máy tính"
                      >
                        {isUploading ? (
                          <>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '18px',
                                height: '18px',
                                border: '2px solid rgba(152, 70, 40, 0.3)',
                                borderTopColor: '#984628',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                              }}
                            />
                            <span style={{ fontSize: '13px', color: '#984628' }}>
                              Đang tải lên Cloudinary...
                            </span>
                          </>
                        ) : (
                          <>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <div>
                              <span style={{ fontWeight: 600, color: '#002720' }}>Bấm chọn tệp ảnh</span>
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
                        className={`v06-input ${errors.avatarUrl ? 'input-error' : ''}`}
                        placeholder="https://res.cloudinary.com/..."
                        value={avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value);
                          if (errors.avatarUrl) {
                            setErrors((prev) => ({ ...prev, avatarUrl: '' }));
                          }
                        }}
                      />
                      {errors.avatarUrl && (
                        <div className="v06-field-error">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span>{errors.avatarUrl}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {avatarUrl && (
                    <button
                      type="button"
                      className="v06-btn-clear-img"
                      onClick={handleClearAvatar}
                      title="Xóa ảnh đại diện"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Gỡ ảnh đại diện
                    </button>
                  )}
                </div>

                {/* Left Meta Card: Thâm niên kinh nghiệm */}
                <div className="v04-left-meta-card">
                  <div className="v04-meta-highlight-box">
                    <label className="v04-field-label">
                      Thâm niên làm nghề <span className="required-asterisk">*</span>
                    </label>
                    <div className="v04-exp-input-row">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className={`form-input v04-exp-input ${errors.experienceYears ? 'input-error' : ''}`}
                        placeholder="10"
                        value={experienceYears}
                        onChange={(e) => {
                          setExperienceYears(e.target.value);
                          if (errors.experienceYears) {
                            setErrors((prev) => ({ ...prev, experienceYears: '' }));
                          }
                        }}
                      />
                      <span className="v04-exp-unit">năm kinh nghiệm</span>
                    </div>
                    {errors.experienceYears && (
                      <div className="v04-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{errors.experienceYears}</span>
                      </div>
                    )}
                    <div className="v04-meta-exp-display">
                      <span className="v04-meta-exp-num">{experienceYears || 0} Năm</span>
                      <span className="v04-meta-exp-lbl">Gắn bó và phát triển nghề truyền thống</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (60-65%): Thông tin hồ sơ & Câu chuyện */}
              <div className="v04-col-right">
                {/* 1. Tên nghệ nhân */}
                <div className="form-group">
                  <label className="v04-field-label">
                    Họ và tên nghệ nhân <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input v04-name-input ${errors.displayName ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Nghệ nhân Trần Văn Độ"
                    maxLength={150}
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName) {
                        setErrors((prev) => ({ ...prev, displayName: '' }));
                      }
                    }}
                  />
                  {errors.displayName && (
                    <div className="v04-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{errors.displayName}</span>
                    </div>
                  )}
                  <span className="v04-field-hint">
                    Họ tên đại diện của nghệ nhân thuộc làng nghề (tối đa 150 ký tự)
                  </span>
                </div>

                {/* 2. Tiểu sử & Câu chuyện nghề */}
                <div className="v04-section-card" style={{ marginTop: '20px' }}>
                  <div className="v04-section-header">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Tiểu sử & Câu chuyện nghề truyền đời</span>
                  </div>
                  <textarea
                    className={`form-textarea v04-bio-textarea ${errors.bio ? 'input-error' : ''}`}
                    rows={8}
                    placeholder="Mô tả quá trình học nghề, kỹ thuật trao truyền, các tác phẩm tiêu biểu và tâm huyết giữ lửa nghề truyền thống của nghệ nhân..."
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      if (errors.bio) {
                        setErrors((prev) => ({ ...prev, bio: '' }));
                      }
                    }}
                  />
                  {errors.bio && (
                    <div className="v04-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{errors.bio}</span>
                    </div>
                  )}
                  <span className="v04-field-hint">
                    Nội dung giới thiệu câu chuyện văn hóa, kinh nghiệm và kỹ năng của nghệ nhân đến du khách.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Sticky Footer */}
          <div className="v04-modal-footer">
            <button
              type="button"
              className="v06-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="v04-btn-submit"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting && <span className="v04-spinner" />}
              {isSubmitting
                ? 'Đang lưu hồ sơ...'
                : isEditMode
                  ? 'Lưu hồ sơ'
                  : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddArtisanModal;
