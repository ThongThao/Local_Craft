import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  workshopsApi,
  WorkshopItemDto,
  WorkshopStatus,
  CreateWorkshopPayload,
} from '@/services/api/workshops';
import { productsApi, CategoryDto } from '@/services/api/products';
import { artisansApi, ArtisanDto } from '@/services/api/artisans';
import { uploadApi } from '@/services/api/upload';

export interface AddWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  initialData?: WorkshopItemDto | null;
  villageName?: string;
  showToast?: (message: string) => void;
  // Legacy backward compatibility
  onSave?: (data: any) => void;
  artisans?: any[];
}

export const AddWorkshopModal: React.FC<AddWorkshopModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialData,
  villageName = 'Làng nghề truyền thống',
  showToast,
  onSave,
}) => {
  // Form fields strictly mapping to Workshop Model in Database
  const [workshopName, setWorkshopName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [artisanId, setArtisanId] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(120);
  const [pricePerPerson, setPricePerPerson] = useState<string>('350000');
  const [minParticipants, setMinParticipants] = useState<number | ''>(1);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [slug, setSlug] = useState<string>('');

  // Auxiliary data states
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [artisanList, setArtisanList] = useState<ArtisanDto[]>([]);
  const [isLoadingAux, setIsLoadingAux] = useState<boolean>(false);
  const [auxError, setAuxError] = useState<string | null>(null);

  // Upload states (Cloudinary-only)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Validation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Dirty check & Confirmation
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState<boolean>(false);

  const isEditMode = Boolean(
    initialData && (initialData.workshop_id || (initialData as any).id)
  );
  const currentWorkshopId = initialData?.workshop_id ?? (initialData as any)?.id;

  // Format currency display (e.g. 350000 -> 350.000 ₫)
  const formatDisplayPrice = (val: string | number): string => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return '0 ₫';
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  // 1. Fetch categories and village artisans on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadAuxData = async () => {
      setIsLoadingAux(true);
      setAuxError(null);
      try {
        const [catRes, artRes] = await Promise.all([
          productsApi.getCategories(),
          artisansApi.getAll(),
        ]);

        if (isMounted) {
          if (catRes.success && Array.isArray(catRes.data)) {
            setCategories(catRes.data);
          } else {
            setAuxError('Không thể tải danh mục nghề thủ công từ máy chủ.');
          }

          if (artRes.success && Array.isArray(artRes.data)) {
            setArtisanList(artRes.data);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setAuxError(err?.message || 'Có lỗi kết nối khi tải danh mục hoặc nghệ nhân.');
        }
      } finally {
        if (isMounted) setIsLoadingAux(false);
      }
    };

    loadAuxData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Populate form fields when opening in Create or Edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Edit mode: populate from real DTO or fallback to legacy props
      setWorkshopName(initialData.workshop_name || (initialData as any).title || '');
      setCategoryId(initialData.category || (initialData as any).categoryId || '');
      setArtisanId(initialData.artisan || (initialData as any).artisanId || '');
      setDescription(initialData.description || '');
      setDurationMinutes(
        initialData.duration_minutes ?? (initialData as any).durationMinutes ?? 120
      );
      setPricePerPerson(
        String(initialData.price_per_person ?? (initialData as any).pricePerPerson ?? '350000')
      );
      setMinParticipants(initialData.min_participants ?? 1);
      setLocationAddress(
        initialData.location_address || (initialData as any).location || ''
      );
      setCoverImageUrl(
        initialData.cover_image_url || (initialData as any).coverImage || ''
      );
      setSlug(initialData.slug || '');
    } else {
      // Create mode: clean initial state (NO hardcoded fake Bat Trang demo data)
      setWorkshopName('');
      setCategoryId('');
      setArtisanId('');
      setDescription('');
      setDurationMinutes(120);
      setPricePerPerson('350000');
      setMinParticipants(1);
      setLocationAddress('');
      setCoverImageUrl('');
      setSlug('');
    }

    setFormErrors({});
    setGeneralError(null);
    setUploadError(null);
    setIsDirty(false);
    setShowDirtyConfirm(false);
    setIsSubmitting(false);
  }, [isOpen, initialData]);

  // 3. Cloudinary Image Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations for file
    if (!file.type.startsWith('image/')) {
      setUploadError('Tệp đã chọn không phải hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Dung lượng ảnh tối đa cho phép là 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/workshops');
      if (res.success && res.data) {
        // Cloudinary secure_url is the ONLY accepted source
        setCoverImageUrl(res.data.secure_url || res.data.url);
        setIsDirty(true);
      } else {
        setUploadError(res.message || 'Không thể tải ảnh lên máy chủ Cloudinary.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Có lỗi kết nối khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImageUrl('');
    setUploadError(null);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 4. Dirty Check & Close Request
  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showDirtyConfirm) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDirtyConfirm, handleRequestClose]);

  // 5. Client Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Workshop Name: Required, max 200
    if (!workshopName.trim()) {
      errors.workshop_name = 'Tên workshop không được để trống.';
    } else if (workshopName.trim().length > 200) {
      errors.workshop_name = 'Tên workshop không được vượt quá 200 ký tự.';
    }

    // Category: Required
    if (!categoryId) {
      errors.category = 'Vui lòng chọn danh mục nghề thủ công cho workshop.';
    }

    // Description: Required by Database
    if (!description.trim()) {
      errors.description = 'Mô tả chi tiết workshop không được để trống.';
    }

    // Duration: Required, > 0, <= 1440
    if (durationMinutes === '' || Number(durationMinutes) <= 0) {
      errors.duration_minutes = 'Thời lượng workshop phải lớn hơn 0 phút.';
    } else if (Number(durationMinutes) > 1440) {
      errors.duration_minutes = 'Thời lượng workshop không được vượt quá 1440 phút (24 giờ).';
    }

    // Price per person: Required, >= 0
    if (pricePerPerson === '' || isNaN(Number(pricePerPerson))) {
      errors.price_per_person = 'Vui lòng nhập giá vé hợp lệ.';
    } else if (Number(pricePerPerson) < 0) {
      errors.price_per_person = 'Giá vé mỗi người không được là số âm.';
    }

    // Min participants: Required, >= 1
    if (minParticipants === '' || Number(minParticipants) < 1) {
      errors.min_participants = 'Số người tham gia tối thiểu phải từ 1 người trở lên.';
    }

    // Location Address: Required
    if (!locationAddress.trim()) {
      errors.location_address = 'Địa chỉ tổ chức workshop không được để trống.';
    } else if (locationAddress.trim().length > 255) {
      errors.location_address = 'Địa chỉ tổ chức không được vượt quá 255 ký tự.';
    }

    // Cloudinary Cover Image: Warn if uploading
    if (isUploading) {
      errors.cover_image_url = 'Vui lòng đợi ảnh tải lên hoàn tất trước khi lưu.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper to map backend validation error payload to inline errors
  const handleApiErrors = (res: any) => {
    const message =
      res.message || 'Lưu workshop thất bại. Vui lòng kiểm tra lại các trường thông tin.';
    setGeneralError(message);

    if (res.errors && typeof res.errors === 'object') {
      const mapped: Record<string, string> = {};
      Object.keys(res.errors).forEach((key) => {
        const val = res.errors[key];
        mapped[key] = Array.isArray(val) ? val[0] : String(val);
      });
      setFormErrors((prev) => ({ ...prev, ...mapped }));
    }
  };

  // 6. Form Submission with Workflow Status
  const handleSubmit = async (targetStatus: WorkshopStatus) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const payload: CreateWorkshopPayload = {
      workshop_name: workshopName.trim(),
      category: categoryId ? Number(categoryId) : null,
      artisan: artisanId ? Number(artisanId) : null,
      description: description.trim(),
      duration_minutes: Number(durationMinutes),
      price_per_person: Number(pricePerPerson),
      min_participants: Number(minParticipants) || 1,
      location_address: locationAddress.trim(),
      cover_image_url: coverImageUrl.trim() || null,
      status: targetStatus,
    };

    if (slug.trim()) {
      payload.slug = slug.trim();
    }

    try {
      if (isEditMode && currentWorkshopId) {
        // Mode UPDATE (PATCH)
        const res = await workshopsApi.update(currentWorkshopId, payload);
        if (res.success && res.data) {
          const successMsg =
            targetStatus === 'PENDING'
              ? 'Đã cập nhật và gửi workshop để Ban quản trị kiểm duyệt.'
              : targetStatus === 'DRAFT'
                ? 'Đã cập nhật bản nháp workshop thành công.'
                : 'Cập nhật workshop thành công.';
          showToast?.(successMsg);
          onSave?.(res.data);
          onSaveSuccess?.();
          onClose();
        } else {
          handleApiErrors(res);
        }
      } else {
        // Mode CREATE (POST)
        const res = await workshopsApi.create(payload);
        if (res.success && res.data) {
          const successMsg =
            targetStatus === 'PENDING'
              ? 'Tạo workshop và gửi kiểm duyệt thành công! Bạn có thể sang V10 để lên lịch các ca học.'
              : 'Tạo bản nháp workshop thành công. Bạn có thể sang V10 để lên lịch các ca học.';
          showToast?.(successMsg);
          onSave?.(res.data);
          onSaveSuccess?.();
          onClose();
        } else {
          handleApiErrors(res);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu workshop:', err);
      setGeneralError(
        err?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render status badge in header
  const renderStatusBadge = (st: WorkshopStatus) => {
    const config: Record<
      WorkshopStatus,
      { label: string; bg: string; color: string; border: string }
    > = {
      APPROVED: {
        label: 'Đã duyệt',
        bg: 'rgba(34, 197, 94, 0.1)',
        color: '#15803d',
        border: 'rgba(34, 197, 94, 0.3)',
      },
      PENDING: {
        label: 'Chờ duyệt',
        bg: 'rgba(234, 179, 8, 0.12)',
        color: '#b45309',
        border: 'rgba(234, 179, 8, 0.3)',
      },
      REJECTED: {
        label: 'Bị từ chối',
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#b91c1c',
        border: 'rgba(239, 68, 68, 0.3)',
      },
      DRAFT: {
        label: 'Bản nháp',
        bg: 'rgba(100, 116, 139, 0.1)',
        color: '#475569',
        border: 'rgba(100, 116, 139, 0.25)',
      },
      HIDDEN: {
        label: 'Đã ẩn',
        bg: 'rgba(15, 23, 42, 0.08)',
        color: '#1e293b',
        border: 'rgba(15, 23, 42, 0.2)',
      },
    };
    const c = config[st] || config.DRAFT;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          background: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
        }}
      >
        ● {c.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="artisan-modal-overlay"
      onClick={handleRequestClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="v06-form-modal-box"
        style={{ maxWidth: '980px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v06-modal-form-wrapper">
          {/* 1. Modal Header */}
          <div className="v06-modal-header">
            <div className="v06-header-left">
              <div className="v06-tag-row">
                {/* <span className="v06-tag-pill">TRẢI NGHIỆM THỦ CÔNG LÀNG NGHỀ</span> */}
                {currentWorkshopId && (
                  <span className="v06-heritage-code font-mono">#{currentWorkshopId}</span>
                )}
                {isEditMode && initialData && renderStatusBadge(initialData.status)}
              </div>
              <h3 className="v06-modal-title">
                {isEditMode ? 'Chỉnh Sửa Hoạt Động Workshop' : 'Tạo Hoạt Động Workshop Mới'}
              </h3>
              <p className="v06-modal-sub">
                Đơn vị tổ chức: <strong>{villageName}</strong> 
              </p>
            </div>

            <div className="v06-header-actions">
              <button
                type="button"
                className="v06-close-btn"
                onClick={handleRequestClose}
                aria-label="Đóng biểu mẫu workshop"
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
              <div className="v06-rejection-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v06-rejection-banner-icon" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="v06-rejection-content">
                  <strong className="v06-rejection-title">Có lỗi xảy ra:</strong>
                  <div className="v06-rejection-note">{generalError}</div>
                </div>
              </div>
            )}

            {/* Rejection Alert if status === 'REJECTED' */}
            {isEditMode && initialData?.status === 'REJECTED' && (
              <div className="v06-rejection-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v06-rejection-banner-icon" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div className="v06-rejection-content">
                  <strong className="v06-rejection-title">Workshop bị từ chối kiểm duyệt</strong>
                  <div className="v06-rejection-note">
                    Vui lòng hoàn thiện lại hình ảnh, mô tả trải nghiệm, thông tin nghệ nhân theo tiêu chuẩn di sản trước khi bấm <strong>"Cập nhật & Gửi duyệt"</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* Pending Notice Banner if status === 'PENDING' */}
            {isEditMode && initialData?.status === 'PENDING' && (
              <div className="v06-pending-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <strong>Workshop đang trong quá trình xét duyệt của Ban quản trị.</strong>
                  <span style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}>
                    Bạn vẫn có thể bổ sung hoặc cập nhật thông tin nếu cần thiết.
                  </span>
                </div>
              </div>
            )}

            {/* Auxiliary Data Loading Notice */}
            {isLoadingAux && (
              <div style={{ textAlign: 'center', padding: '6px 0', color: '#5C6F68', fontSize: '12.5px' }}>
                Đang đồng bộ danh mục nghề thủ công và hồ sơ nghệ nhân làng nghề...
              </div>
            )}
            {auxError && (
              <div style={{ color: '#DC2626', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{auxError}</span>
              </div>
            )}

            {/* Two-Column Form Grid */}
            <div className="v06-grid">
              {/* CỘT TRÁI (310px): Hình ảnh Cloudinary & Thẻ tóm tắt thông số */}
              <div className="v06-col-left">
                {/* 1. Ảnh đại diện Workshop */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Ảnh đại diện workshop <span className="v06-required-star">*</span>
                    </label>
                  </div>

                  <div className="v06-image-card" style={{ height: '340px' }}>
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={workshopName || 'Ảnh đại diện workshop'}
                        className="v06-preview-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="v06-empty-preview">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8C9691" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="v06-empty-preview-icon" style={{ marginBottom: '4px' }}>
                          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.437 6.2 17.2 2 12 2z" />
                        </svg>
                        <span style={{ fontWeight: 600 }}>Chưa có ảnh đại diện</span>
                        <small style={{ color: '#8C9691' }}>Khuyến nghị tỷ lệ 16:9 hoặc 4:3</small>
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
                    {formErrors.cover_image_url && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.cover_image_url}</span>
                      </div>
                    )}

                    {coverImageUrl && (
                      <button
                        type="button"
                        className="v06-btn-clear-img"
                        onClick={handleRemoveImage}
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
                </div>

                {/* 2. Thẻ tóm tắt thông số & giá vé */}
                <div className="v06-workshop-summary-card">
                  <div className="v06-workshop-summary-title">Tóm tắt chi phí & thông số</div>
                  <div className="v06-workshop-summary-price">
                    <span className="v06-workshop-summary-amount">
                      {formatDisplayPrice(pricePerPerson)}
                    </span>
                    <span className="v06-workshop-summary-unit">/ khách tham gia</span>
                  </div>
                  <div className="v06-workshop-summary-meta">
                    <span className="v06-workshop-summary-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: '-2px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <strong>{durationMinutes || 0} phút</strong>
                    </span>
                    <span>•</span>
                    <span className="v06-workshop-summary-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: '-2px' }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Tối thiểu: <strong>{minParticipants || 1} khách</strong>
                    </span>
                  </div>
                  <div className="v06-workshop-summary-note" style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Lịch tổ chức từng ca học cụ thể (ngày, giờ, số lượng chỗ) sẽ được thiết lập tại <strong>Tab Quản lý lịch workshop (V10)</strong> sau khi hoàn tất tạo workshop.</span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: Toàn bộ thông tin định danh & nội dung workshop */}
              <div className="v06-col-right">
                {/* SECTION 1: THÔNG TIN CƠ BẢN & NGHỆ NHÂN */}
                <div className="v06-form-section-title">
                  <span className="v06-section-badge">1</span>
                  <span>Thông tin cơ bản & Nghệ nhân</span>
                </div>

                {/* Tên workshop */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Tên workshop / Hoạt động trải nghiệm <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{workshopName.length}/200</span>
                  </div>
                  <input
                    type="text"
                    className={`v06-input ${formErrors.workshop_name ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Kỹ thuật vuốt gốm bàn xoay & phục dựng men rạn cổ Bát Tràng"
                    maxLength={200}
                    value={workshopName}
                    onChange={(e) => {
                      setWorkshopName(e.target.value);
                      setIsDirty(true);
                      if (formErrors.workshop_name) {
                        setFormErrors((prev) => ({ ...prev, workshop_name: '' }));
                      }
                    }}
                  />
                  {formErrors.workshop_name && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.workshop_name}</span>
                    </div>
                  )}
                  <span className="v06-field-hint">
                    Tên workshop trang trọng, thể hiện rõ nét nghề thủ công và kỹ năng du khách sẽ được trải nghiệm.
                  </span>
                </div>

                {/* Lưới 2 cột: Danh mục nghề & Nghệ nhân phụ trách */}
                <div className="v06-two-input-row">
                  {/* Danh mục nghề thủ công */}
                  <div className="v06-form-group">
                    <label className="v06-field-label">
                      Danh mục nghề thủ công <span className="v06-required-star">*</span>
                    </label>
                    <select
                      className={`v06-input ${formErrors.category ? 'input-error' : ''}`}
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.category) {
                          setFormErrors((prev) => ({ ...prev, category: '' }));
                        }
                      }}
                      disabled={isLoadingAux && categories.length === 0}
                    >
                      <option value="">-- Chọn danh mục nghề --</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Nghệ nhân phụ trách */}
                  <div className="v06-form-group">
                    <label className="v06-field-label">Nghệ nhân hướng dẫn chính</label>
                    <select
                      className={`v06-input ${formErrors.artisan ? 'input-error' : ''}`}
                      value={artisanId}
                      onChange={(e) => {
                        setArtisanId(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.artisan) {
                          setFormErrors((prev) => ({ ...prev, artisan: '' }));
                        }
                      }}
                      disabled={isLoadingAux && artisanList.length === 0}
                    >
                      <option value="">-- Chưa chỉ định nghệ nhân --</option>
                      {artisanList.map((a) => (
                        <option key={a.artisan_id} value={a.artisan_id}>
                          {a.display_name} ({a.experience_years} năm KN) {a.verification_status === 'APPROVED' ? '(Đã xác minh)' : '(Chờ xác minh)'}
                        </option>
                      ))}
                    </select>
                    {formErrors.artisan && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.artisan}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mô tả chi tiết workshop (Database Required) */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Mô tả chi tiết trải nghiệm <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{description.length} ký tự</span>
                  </div>
                  <textarea
                    rows={4}
                    className={`v06-textarea ${formErrors.description ? 'input-error' : ''}`}
                    placeholder="Mô tả cụ thể hoạt động: du khách sẽ được tìm hiểu những gì, các công đoạn tự tay thực hành (nhào đất, tạo dáng trên bàn xoay, vẽ họa tiết, tráng men...), vật phẩm được mang về sau buổi học..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsDirty(true);
                      if (formErrors.description) {
                        setFormErrors((prev) => ({ ...prev, description: '' }));
                      }
                    }}
                  />
                  {formErrors.description && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.description}</span>
                    </div>
                  )}
                  <span className="v06-field-hint">
                    Nội dung mô tả hấp dẫn giúp du khách nắm bắt lộ trình học và chuẩn bị tâm thế tham gia.
                  </span>
                </div>

                {/* SECTION 2: THÔNG TIN TRẢI NGHIỆM & CHI PHÍ */}
                <div className="v06-form-section-title">
                  <span className="v06-section-badge">2</span>
                  <span>Thông số trải nghiệm & Giá vé</span>
                </div>

                {/* Lưới 3 cột: Thời lượng, Giá vé, Số khách tối thiểu */}
                <div className="v06-three-input-row">
                  {/* Thời lượng (phút) */}
                  <div className="v06-form-group">
                    <label className="v06-field-label">
                      Thời lượng (Phút) <span className="v06-required-star">*</span>
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      step={15}
                      className={`v06-input ${formErrors.duration_minutes ? 'input-error' : ''}`}
                      placeholder="120"
                      value={durationMinutes}
                      onChange={(e) => {
                        setDurationMinutes(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.duration_minutes) {
                          setFormErrors((prev) => ({ ...prev, duration_minutes: '' }));
                        }
                      }}
                    />
                    {formErrors.duration_minutes && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.duration_minutes}</span>
                      </div>
                    )}
                  </div>

                  {/* Giá vé / người */}
                  <div className="v06-form-group">
                    <label className="v06-field-label">
                      Giá vé / Khách <span className="v06-required-star">*</span>
                    </label>
                    <div className="v06-price-input-wrap">
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        className={`v06-input ${formErrors.price_per_person ? 'input-error' : ''}`}
                        placeholder="350000"
                        value={pricePerPerson}
                        onChange={(e) => {
                          setPricePerPerson(e.target.value);
                          setIsDirty(true);
                          if (formErrors.price_per_person) {
                            setFormErrors((prev) => ({ ...prev, price_per_person: '' }));
                          }
                        }}
                      />
                      <span className="v06-price-suffix">VNĐ</span>
                    </div>
                    {formErrors.price_per_person && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.price_per_person}</span>
                      </div>
                    )}
                  </div>

                  {/* Số người tối thiểu */}
                  <div className="v06-form-group">
                    <label className="v06-field-label">
                      Khách tối thiểu <span className="v06-required-star">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={`v06-input ${formErrors.min_participants ? 'input-error' : ''}`}
                      placeholder="1"
                      value={minParticipants}
                      onChange={(e) => {
                        setMinParticipants(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.min_participants) {
                          setFormErrors((prev) => ({ ...prev, min_participants: '' }));
                        }
                      }}
                    />
                    {formErrors.min_participants && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.min_participants}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: ĐỊA ĐIỂM TỔ CHỨC & ĐỊNH DANH */}
                <div className="v06-form-section-title">
                  <span className="v06-section-badge">3</span>
                  <span>Địa điểm tổ chức & Định danh URL</span>
                </div>

                {/* Địa chỉ tổ chức */}
                <div className="v06-form-group">
                  <label className="v06-field-label">
                    Địa chỉ tổ chức tại làng nghề <span className="v06-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    className={`v06-input ${formErrors.location_address ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Xưởng Gốm Nghệ Nhân Trần Độ, Số 12 Xóm 2, Xã Bát Tràng, Gia Lâm, Hà Nội"
                    value={locationAddress}
                    onChange={(e) => {
                      setLocationAddress(e.target.value);
                      setIsDirty(true);
                      if (formErrors.location_address) {
                        setFormErrors((prev) => ({ ...prev, location_address: '' }));
                      }
                    }}
                  />
                  {formErrors.location_address && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.location_address}</span>
                    </div>
                  )}
                  <span className="v06-field-hint">
                    Địa chỉ cụ thể nơi diễn ra hoạt động trải nghiệm để du khách dễ dàng tìm đến xưởng.
                  </span>
                </div>

                {/* Đường dẫn định danh (Slug) - Tùy chọn */}
                {/* <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Đường dẫn định danh (Slug) <small style={{ fontWeight: 400, color: '#64748B' }}>(Tùy chọn)</small>
                    </label>
                  </div>
                  <input
                    type="text"
                    maxLength={200}
                    className={`v06-input font-mono ${formErrors.slug ? 'input-error' : ''}`}
                    placeholder="Để trống hệ thống sẽ tự sinh mã URL từ tên workshop"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setIsDirty(true);
                      if (formErrors.slug) {
                        setFormErrors((prev) => ({ ...prev, slug: '' }));
                      }
                    }}
                  />
                  {formErrors.slug && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.slug}</span>
                    </div>
                  )}
                </div> */}
              </div>
            </div>
          </div>

          {/* 3. Modal Sticky Footer */}
          <div className="v06-modal-footer">
            <div style={{ marginRight: 'auto', fontSize: '12px', color: '#5C6F68' }}>
              * Workshop sẽ được gửi đến Ban quản trị thẩm định trước khi công khai.
            </div>

            <button
              type="button"
              className="v06-btn-cancel"
              onClick={handleRequestClose}
              disabled={isSubmitting || isUploading}
            >
              Hủy bỏ
            </button>

            <div className="v06-footer-right">
              {/* Nút 1: Lưu bản nháp (DRAFT) */}
              <button
                type="button"
                className="v06-btn-draft"
                onClick={() => handleSubmit('DRAFT')}
                disabled={isSubmitting || isUploading}
                title="Lưu lại bản nháp nội bộ, chưa công khai cho du khách"
              >
                {isSubmitting ? (
                  'Đang lưu...'
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>Lưu bản nháp</span>
                  </>
                )}
              </button>

              {/* Nút 2: Gửi kiểm duyệt (PENDING) */}
              <button
                type="button"
                className="v06-btn-submit"
                onClick={() => handleSubmit('PENDING')}
                disabled={isSubmitting || isUploading}
                title="Gửi workshop lên Ban quản trị để kiểm duyệt và phê duyệt công khai"
              >
                {isSubmitting ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(250, 248, 245, 0.3)',
                        borderTopColor: '#FAF8F5',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isEditMode ? 'Cập nhật & Gửi duyệt' : 'Gửi kiểm duyệt'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dirty Confirmation Alert Modal */}
      {showDirtyConfirm && (
        <div
          className="artisan-modal-overlay"
          style={{ zIndex: 10001, background: 'rgba(0, 39, 32, 0.75)' }}
          onClick={() => setShowDirtyConfirm(false)}
        >
          <div
            className="v03-delete-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v03-delete-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h4 className="v03-delete-title">Hủy bỏ các thay đổi?</h4>
            <p className="v03-delete-desc">
              Bạn có các thông tin workshop chưa được lưu. Nếu đóng bây giờ, toàn bộ nội dung vừa chỉnh sửa sẽ bị mất.
            </p>

            <div className="v03-delete-actions">
              <button
                type="button"
                className="v03-btn-cancel-delete"
                onClick={() => setShowDirtyConfirm(false)}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                className="v06-btn-submit"
                style={{ background: '#DC2626', borderColor: '#DC2626', flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setShowDirtyConfirm(false);
                  setIsDirty(false);
                  onClose();
                }}
              >
                Rời khỏi không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default AddWorkshopModal;
