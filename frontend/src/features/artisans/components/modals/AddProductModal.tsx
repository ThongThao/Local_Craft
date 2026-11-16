import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  productsApi,
  ProductDto,
  CategoryDto,
  ProductStatus,
} from '@/services/api/products';
import { artisansApi } from '@/services/api/artisans';
import { uploadApi } from '@/services/api/upload';

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  initialData?: ProductDto | null;
  villageName?: string;
  showToast?: (message: string) => void;
  // Legacy props compatibility
  onSave?: (data: any) => void;
  artisans?: any[];
}

interface ArtisanOption {
  artisan_id: number;
  display_name: string;
  verification_status: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialData,
  villageName = 'Làng nghề truyền thống',
  showToast,
  onSave,
}) => {
  // Form fields (Strictly matching Database table products & ProductSerializer)
  const [productName, setProductName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [artisanId, setArtisanId] = useState<number | ''>('');
  const [basePrice, setBasePrice] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');

  // Auxiliary data states
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [artisanOptions, setArtisanOptions] = useState<ArtisanOption[]>([]);
  const [isLoadingAux, setIsLoadingAux] = useState<boolean>(false);
  const [auxError, setAuxError] = useState<string | null>(null);

  // Upload states
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form submission and validation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isNoteExpanded, setIsNoteExpanded] = useState<boolean>(false);

  // Track if user made modifications
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const isEditMode = Boolean(initialData && initialData.product_id);

  // Format currency display (e.g. 1500000 -> 1.500.000 ₫)
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
            setAuxError('Không thể tải danh mục sản phẩm từ máy chủ.');
          }

          if (artRes.success && Array.isArray(artRes.data)) {
            const mappedArtisans: ArtisanOption[] = artRes.data.map((a) => ({
              artisan_id: a.artisan_id,
              display_name: a.display_name,
              verification_status: a.verification_status,
            }));
            setArtisanOptions(mappedArtisans);
          } else {
            setAuxError('Không thể tải danh sách nghệ nhân của làng nghề.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Lỗi khi nạp dữ liệu danh mục/nghệ nhân:', err);
          setAuxError('Không thể kết nối đến máy chủ để lấy thông tin danh mục và nghệ nhân.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAux(false);
        }
      }
    };

    loadAuxData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Populate form fields when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    setFormErrors({});
    setGeneralError(null);
    setUploadError(null);
    setIsSubmitting(false);
    setIsDirty(false);
    setIsNoteExpanded(false);

    if (initialData) {
      setProductName(initialData.product_name || '');
      setCategoryId(initialData.category || '');
      setArtisanId(initialData.artisan || '');
      setBasePrice(
        initialData.base_price !== undefined && initialData.base_price !== null
          ? String(Math.round(Number(initialData.base_price)))
          : ''
      );
      setDescription(initialData.description || '');
      setCoverImageUrl(initialData.cover_image_url || '');
    } else {
      setProductName('');
      setCategoryId('');
      setArtisanId('');
      setBasePrice('');
      setDescription('');
      setCoverImageUrl('');
    }
  }, [initialData, isOpen]);

  // Set default category and artisan if creating new and list loaded
  useEffect(() => {
    if (!isOpen || isEditMode) return;

    if (categoryId === '' && categories.length > 0) {
      setCategoryId(categories[0].category_id);
    }
    if (artisanId === '' && artisanOptions.length > 0) {
      setArtisanId(artisanOptions[0].artisan_id);
    }
  }, [categories, artisanOptions, isOpen, isEditMode, categoryId, artisanId]);

  // 3. Close with unsaved changes confirmation
  const handleRequestClose = useCallback(() => {
    if (isDirty && !isSubmitting) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa được lưu trong biểu mẫu. Bạn có chắc chắn muốn thoát?'
      );
      if (!confirmLeave) return;
    }
    onClose();
  }, [isDirty, isSubmitting, onClose]);

  // Keyboard navigation: Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  // 4. Cloudinary Upload Handler (No local blob persistence)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Dung lượng ảnh vượt quá 5MB. Vui lòng nén hoặc chọn ảnh nhỏ hơn.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/products');
      if (res.success && (res.data?.secure_url || res.data?.url)) {
        const uploadedUrl = res.data.secure_url || res.data.url;
        setCoverImageUrl(uploadedUrl);
        setIsDirty(true);
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.coverImageUrl;
          return next;
        });
      } else {
        setUploadError(res.message || 'Không thể tải ảnh lên Cloudinary. Vui lòng thử lại. Ảnh cũ được giữ nguyên.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi kết nối khi tải ảnh lên Cloudinary. Ảnh cũ được giữ nguyên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    setCoverImageUrl('');
    setUploadError(null);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 5. Client Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Product Name: Required, max 200, no blank
    if (!productName.trim()) {
      errors.productName = 'Tên sản phẩm không được để trống.';
    } else if (productName.trim().length > 200) {
      errors.productName = 'Tên sản phẩm không được vượt quá 200 ký tự.';
    }

    // Category: Required
    if (!categoryId) {
      errors.categoryId = 'Vui lòng chọn danh mục cho sản phẩm.';
    }

    // Artisan: Required
    if (!artisanId) {
      errors.artisanId = 'Vui lòng chọn nghệ nhân chế tác.';
    }

    // Base Price: Required, numeric >= 0
    if (basePrice === '' || isNaN(Number(basePrice))) {
      errors.basePrice = 'Vui lòng nhập giá tham khảo hợp lệ.';
    } else if (Number(basePrice) < 0) {
      errors.basePrice = 'Giá tham khảo không được là số âm.';
    }

    // Description: Required
    if (!description.trim()) {
      errors.description = 'Mô tả chi tiết sản phẩm không được để trống.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6. Form Submission with Workflow Status
  const handleSubmit = async (targetStatus: ProductStatus) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const payload: Partial<ProductDto> = {
      product_name: productName.trim(),
      category: Number(categoryId),
      artisan: Number(artisanId),
      base_price: Number(basePrice),
      description: description.trim(),
      cover_image_url: coverImageUrl.trim() || undefined,
      status: targetStatus,
    };

    try {
      if (isEditMode && initialData) {
        // Mode EDIT
        const res = await productsApi.update(initialData.product_id, payload);
        if (res.success && res.data) {
          const successMessage =
            targetStatus === 'PENDING'
              ? 'Đã gửi sản phẩm để Ban quản trị kiểm duyệt thành công.'
              : targetStatus === 'DRAFT'
                ? 'Đã cập nhật bản nháp sản phẩm thành công.'
                : 'Cập nhật sản phẩm thành công.';

          showToast?.(successMessage);
          onSave?.(res.data);
          onSaveSuccess?.();
          onClose();
        } else {
          handleApiErrors(res);
        }
      } else {
        // Mode CREATE
        const res = await productsApi.create(payload);
        if (res.success && res.data) {
          const successMessage =
            targetStatus === 'PENDING'
              ? 'Tạo sản phẩm và gửi duyệt thành công.'
              : 'Tạo bản nháp sản phẩm thành công.';

          showToast?.(successMessage);
          onSave?.(res.data);
          onSaveSuccess?.();
          onClose();
        } else {
          handleApiErrors(res);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu sản phẩm:', err);
      setGeneralError(err?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to map backend validation error payload to inline errors
  const handleApiErrors = (res: any) => {
    const message = res.message || 'Lưu sản phẩm thất bại. Vui lòng kiểm tra lại thông tin.';
    setGeneralError(message);

    if (res.errors && typeof res.errors === 'object') {
      const mapped: Record<string, string> = {};
      if (res.errors.product_name) mapped.productName = Array.isArray(res.errors.product_name) ? res.errors.product_name[0] : res.errors.product_name;
      if (res.errors.category) mapped.categoryId = Array.isArray(res.errors.category) ? res.errors.category[0] : res.errors.category;
      if (res.errors.artisan) mapped.artisanId = Array.isArray(res.errors.artisan) ? res.errors.artisan[0] : res.errors.artisan;
      if (res.errors.base_price) mapped.basePrice = Array.isArray(res.errors.base_price) ? res.errors.base_price[0] : res.errors.base_price;
      if (res.errors.description) mapped.description = Array.isArray(res.errors.description) ? res.errors.description[0] : res.errors.description;
      if (res.errors.cover_image_url) mapped.coverImageUrl = Array.isArray(res.errors.cover_image_url) ? res.errors.cover_image_url[0] : res.errors.cover_image_url;
      setFormErrors((prev) => ({ ...prev, ...mapped }));
    }
  };

  // Helper to render status badge in header
  const renderStatusBadge = (st: ProductStatus) => {
    const config: Record<ProductStatus, { label: string; bg: string; color: string; border: string }> = {
      APPROVED: { label: 'Đã duyệt', bg: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: 'rgba(34, 197, 94, 0.3)' },
      PENDING: { label: 'Chờ duyệt', bg: 'rgba(234, 179, 8, 0.12)', color: '#b45309', border: 'rgba(234, 179, 8, 0.3)' },
      REJECTED: { label: 'Bị từ chối', bg: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.3)' },
      DRAFT: { label: 'Bản nháp', bg: 'rgba(100, 116, 139, 0.1)', color: '#475569', border: 'rgba(100, 116, 139, 0.25)' },
      HIDDEN: { label: 'Đã ẩn', bg: 'rgba(15, 23, 42, 0.08)', color: '#1e293b', border: 'rgba(15, 23, 42, 0.2)' },
    };
    const c = config[st] || config.DRAFT;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          background: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.color }} />
        {c.label}
      </span>
    );
  };

  return createPortal(
    <div className="artisan-modal-overlay" onClick={handleRequestClose} role="dialog" aria-modal="true">
      <div className="v06-form-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="v06-modal-form-wrapper">
          {/* 1. Modal Header */}
          <div className="v06-modal-header">
            <div className="v06-header-left">
              <div className="v06-tag-row">
                <span className="v06-tag-pill">SẢN PHẨM THỦ CÔNG LÀNG NGHỀ</span>
                {initialData?.product_id && (
                  <span className="v06-heritage-code">MÃ SP: #{initialData.product_id}</span>
                )}
                {isEditMode && initialData && renderStatusBadge(initialData.status)}
              </div>
              <h3 className="v06-modal-title">
                {isEditMode ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Thủ Công Mới'}
              </h3>
              <p className="v06-modal-sub">
                Đơn vị quản lý: <strong>{villageName}</strong> 
              </p>
            </div>

            <div className="v06-header-actions">
              <button
                type="button"
                className="v06-close-btn"
                onClick={handleRequestClose}
                aria-label="Đóng biểu mẫu sản phẩm"
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

            {/* Rejection Alert Banner if status === 'REJECTED' */}
            {isEditMode && initialData?.status === 'REJECTED' && initialData?.moderation_note && (
              <div className="v06-rejection-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="v06-rejection-banner-icon" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="v06-rejection-content">
                  <strong className="v06-rejection-title">Sản phẩm cần chỉnh sửa và gửi duyệt lại</strong>
                  <div className="v06-rejection-note">
                    {isNoteExpanded || initialData.moderation_note.length <= 160
                      ? initialData.moderation_note
                      : `${initialData.moderation_note.slice(0, 160)}...`}
                  </div>
                  {initialData.moderation_note.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#991b1b',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        marginBottom: '4px',
                      }}
                    >
                      {isNoteExpanded ? 'Thu gọn lý do' : 'Xem toàn bộ lý do từ chối'}
                    </button>
                  )}
                  <span className="v06-rejection-hint">
                    * Vui lòng cập nhật hình ảnh, mô tả hoặc giá tham khảo theo hướng dẫn trên và bấm <strong>"Gửi duyệt lại"</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Pending Notice Banner if status === 'PENDING' */}
            {isEditMode && initialData?.status === 'PENDING' && (
              <div className="v06-pending-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <strong>Sản phẩm đang trong quá trình xét duyệt.</strong>
                  <span style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}>
                    Ban quản trị hệ thống đang thẩm định thông tin sản phẩm. Bạn vẫn có thể cập nhật thông tin bổ sung nếu cần.
                  </span>
                </div>
              </div>
            )}

            {/* Auxiliary Data Loading Notice */}
            {isLoadingAux && (
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#5C6F68', fontSize: '13px' }}>
                Đang tải danh mục và danh sách nghệ nhân...
              </div>
            )}
            {auxError && (
              <div style={{ color: '#DC2626', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{auxError}</span>
              </div>
            )}

            {/* Form Two-Column Grid */}
            <div className="v06-grid">
              {/* CỘT TRÁI (340px): Hình ảnh đại diện & Preview giá */}
              <div className="v06-col-left">
                {/* 1. Ảnh đại diện sản phẩm */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label">
                      Ảnh đại diện sản phẩm <span className="v06-required-star">*</span>
                    </label>
                  </div>

                  <div className="v06-image-card">
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={productName || 'Ảnh sản phẩm'}
                        className="v06-preview-img"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="v06-empty-preview">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8C9691" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="v06-empty-preview-icon" style={{ marginBottom: '4px' }}>
                          <path d="M8 3h8l1 4H7l1-4z" />
                          <path d="M7 7c-2.5 3-3 8 0 12h10c3-4 2.5-9 0-12" />
                          <path d="M10 21v1h4v-1" />
                        </svg>
                        <span>Chưa có ảnh đại diện</span>
                        <small style={{ color: '#8C9691' }}>Khuyến nghị tỷ lệ 4:3 hoặc vuông</small>
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

                    {coverImageUrl && (
                      <button
                        type="button"
                        className="v06-btn-clear-img"
                        onClick={handleClearImage}
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

                {/* 2. Khung hiển thị giá tham khảo */}
                <div className="v06-price-highlight-card">
                  <span className="v06-price-highlight-label">Giá tham khảo hiển thị:</span>
                  <div className="v06-price-highlight-val">
                    {basePrice !== '' ? formatDisplayPrice(basePrice) : 'Chưa định giá'}
                  </div>
                  <span className="v06-price-highlight-hint">
                    * Giá tham khảo ban đầu của tác phẩm. Giá bán chính xác cho từng biến thể (màu sắc, kích cỡ) sẽ được cấu hình tại màn hình V07.
                  </span>
                </div>
              </div>

              {/* CỘT PHẢI: Thông tin sản phẩm, danh mục, nghệ nhân, mô tả */}
              <div className="v06-col-right">
                {/* 1. Tên sản phẩm */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="product-name-input">
                      Tên sản phẩm thủ công <span className="v06-required-star">*</span>
                    </label>
                    <span className="v06-char-counter">{productName.length}/200</span>
                  </div>
                  <input
                    id="product-name-input"
                    type="text"
                    maxLength={200}
                    className={`v06-input ${formErrors.productName ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Bình gốm men rạn vẽ hoa sen cổ"
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      setIsDirty(true);
                      if (formErrors.productName) {
                        setFormErrors((prev) => ({ ...prev, productName: '' }));
                      }
                    }}
                  />
                  {formErrors.productName && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.productName}</span>
                    </div>
                  )}
                  <span className="v06-field-hint">
                    Tên tác phẩm đầy đủ, trang trọng, thể hiện dòng men hoặc kỹ thuật thủ công đặc trưng.
                  </span>
                </div>

                {/* 2. Hai cột: Danh mục & Nghệ nhân chế tác */}
                <div className="v06-two-input-row">
                  {/* Danh mục */}
                  <div className="v06-form-group">
                    <label className="v06-field-label" htmlFor="product-category-select">
                      Danh mục sản phẩm <span className="v06-required-star">*</span>
                    </label>
                    <select
                      id="product-category-select"
                      className={`v06-input ${formErrors.categoryId ? 'input-error' : ''}`}
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.categoryId) {
                          setFormErrors((prev) => ({ ...prev, categoryId: '' }));
                        }
                      }}
                      disabled={isLoadingAux && categories.length === 0}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.categoryId && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.categoryId}</span>
                      </div>
                    )}
                  </div>

                  {/* Nghệ nhân */}
                  <div className="v06-form-group">
                    <label className="v06-field-label" htmlFor="product-artisan-select">
                      Nghệ nhân chế tác <span className="v06-required-star">*</span>
                    </label>
                    <select
                      id="product-artisan-select"
                      className={`v06-input ${formErrors.artisanId ? 'input-error' : ''}`}
                      value={artisanId}
                      onChange={(e) => {
                        setArtisanId(e.target.value ? Number(e.target.value) : '');
                        setIsDirty(true);
                        if (formErrors.artisanId) {
                          setFormErrors((prev) => ({ ...prev, artisanId: '' }));
                        }
                      }}
                      disabled={isLoadingAux && artisanOptions.length === 0}
                    >
                      <option value="">-- Chọn nghệ nhân làng nghề --</option>
                      {artisanOptions.map((a) => (
                        <option key={a.artisan_id} value={a.artisan_id}>
                          {a.display_name} {a.verification_status === 'APPROVED' ? '(Đã xác minh)' : '(Chờ xác minh)'}
                        </option>
                      ))}
                    </select>
                    {formErrors.artisanId && (
                      <div className="v06-field-error">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{formErrors.artisanId}</span>
                      </div>
                    )}
                    {artisanOptions.length === 0 && !isLoadingAux && (
                      <span className="v06-field-hint" style={{ color: '#B45309' }}>
                        * Làng nghề chưa có nghệ nhân khả dụng. Vui lòng thêm nghệ nhân tại Tab Nghệ nhân trước.
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Giá tham khảo */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="product-price-input">
                      Giá tham khảo <span className="v06-required-star">*</span>
                    </label>
                  </div>
                  <div className="v06-price-input-wrap">
                    <input
                      id="product-price-input"
                      type="number"
                      min="0"
                      step="1000"
                      className={`v06-input ${formErrors.basePrice ? 'input-error' : ''}`}
                      placeholder="Ví dụ: 750000"
                      value={basePrice}
                      onChange={(e) => {
                        setBasePrice(e.target.value);
                        setIsDirty(true);
                        if (formErrors.basePrice) {
                          setFormErrors((prev) => ({ ...prev, basePrice: '' }));
                        }
                      }}
                    />
                    <span className="v06-price-suffix">VNĐ</span>
                  </div>
                  {formErrors.basePrice && (
                    <div className="v06-field-error">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{formErrors.basePrice}</span>
                    </div>
                  )}
                  <span className="v06-field-hint">
                    Giá ước tính để hiển thị trên danh mục. 
                  </span>
                </div>

                {/* 4. Mô tả chi tiết sản phẩm */}
                <div className="v06-form-group">
                  <div className="v06-label-row">
                    <label className="v06-field-label" htmlFor="product-description-textarea">
                      Mô tả chi tiết sản phẩm <span className="v06-required-star">*</span>
                    </label>
                  </div>
                  <textarea
                    id="product-description-textarea"
                    rows={4}
                    className={`v06-textarea ${formErrors.description ? 'input-error' : ''}`}
                    placeholder="Mô tả chất liệu, quy trình nung chế tác, ý nghĩa hoa văn văn hóa, kích thước tham khảo và cách bảo quản tác phẩm thủ công..."
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
                    Toàn bộ nội dung mô tả sản phẩm sẽ được hiển thị đến du khách và ban kiểm duyệt.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Modal Sticky Footer */}
          <div className="v06-modal-footer">
            <button
              type="button"
              className="v06-btn-cancel"
              onClick={handleRequestClose}
              disabled={isSubmitting || isUploading}
            >
              Hủy bỏ
            </button>

            <div className="v06-footer-right">
              {/* If Create mode */}
              {!isEditMode && (
                <>
                  <button
                    type="button"
                    className="v06-btn-draft"
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}
                  </button>
                  <button
                    type="button"
                    className="v06-btn-submit"
                    onClick={() => handleSubmit('PENDING')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? (
                      'Đang gửi...'
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Gửi duyệt sản phẩm</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* If Edit mode: DRAFT */}
              {isEditMode && initialData?.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    className="v06-btn-draft"
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}
                  </button>
                  <button
                    type="button"
                    className="v06-btn-submit"
                    onClick={() => handleSubmit('PENDING')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi duyệt sản phẩm'}
                  </button>
                </>
              )}

              {/* If Edit mode: REJECTED */}
              {isEditMode && initialData?.status === 'REJECTED' && (
                <>
                  <button
                    type="button"
                    className="v06-btn-draft"
                    onClick={() => handleSubmit('DRAFT')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi (Bản nháp)'}
                  </button>
                  <button
                    type="button"
                    className="v06-btn-submit"
                    onClick={() => handleSubmit('PENDING')}
                    disabled={isSubmitting || isUploading}
                  >
                    {isSubmitting ? 'Đang gửi duyệt...' : 'Gửi duyệt lại sản phẩm'}
                  </button>
                </>
              )}

              {/* If Edit mode: PENDING */}
              {isEditMode && initialData?.status === 'PENDING' && (
                <button
                  type="button"
                  className="v06-btn-submit"
                  onClick={() => handleSubmit('PENDING')}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Cập nhật thông tin'}
                </button>
              )}

              {/* If Edit mode: APPROVED */}
              {isEditMode && initialData?.status === 'APPROVED' && (
                <button
                  type="button"
                  className="v06-btn-submit"
                  onClick={() => handleSubmit('APPROVED')}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi sản phẩm'}
                </button>
              )}

              {/* If Edit mode: HIDDEN */}
              {isEditMode && initialData?.status === 'HIDDEN' && (
                <button
                  type="button"
                  className="v06-btn-submit"
                  onClick={() => handleSubmit('HIDDEN')}
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddProductModal;
