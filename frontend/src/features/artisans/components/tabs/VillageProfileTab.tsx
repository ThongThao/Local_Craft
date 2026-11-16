import React, { useState, useEffect, useRef } from 'react';
import { villagesApi, uploadApi } from '@/services/api';
import { VillageLocationMap } from './VillageLocationMap';

export interface VillageFormData {
  village_id?: number;
  village_name: string;
  slug: string;
  description: string;
  province: string;
  district: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  cover_image_url: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FormErrors {
  village_name?: string;
  slug?: string;
  province?: string;
  district?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

interface VillageProfileTabProps {
  village?: any;
  onSaveVillage?: (updatedVillage: any) => void;
  onPreviewPublic?: () => void;
  showToast?: (message: string) => void;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1400&q=80';

export const VillageProfileTab: React.FC<VillageProfileTabProps> = ({
  village,
  onSaveVillage,
  showToast,
}) => {
  // Form State containing ONLY real database fields
  const [formData, setFormData] = useState<VillageFormData>({
    village_id: village?.villageId || village?.village_id || undefined,
    village_name: village?.name || village?.village_name || '',
    slug: village?.slug || '',
    description: village?.description || '',
    province: village?.province || '',
    district: village?.district || '',
    address: village?.address || '',
    latitude: village?.latitude !== undefined && village?.latitude !== null ? village.latitude : '',
    longitude: village?.longitude !== undefined && village?.longitude !== null ? village.longitude : '',
    cover_image_url: village?.coverImage || village?.cover_image_url || '',
    status:
      village?.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  });

  // Track original data for cancel/revert
  const [initialData, setInitialData] = useState<VillageFormData | null>(null);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // Hidden File Input & Object URL Lifecycle for Cover Image
  const coverInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Revoke object URL on unmount to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  // Map API response to clean form data
  const mapApiDataToForm = (data: any): VillageFormData => {
    return {
      village_id: data.village_id,
      village_name: data.village_name || '',
      slug: data.slug || '',
      description: data.description || '',
      province: data.province || '',
      district: data.district || '',
      address: data.address || '',
      latitude:
        data.latitude !== undefined && data.latitude !== null && data.latitude !== ''
          ? Number(data.latitude)
          : '',
      longitude:
        data.longitude !== undefined && data.longitude !== null && data.longitude !== ''
          ? Number(data.longitude)
          : '',
      cover_image_url: data.cover_image_url || '',
      status: data.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
  };

  // Fetch logged-in user's managed village (GET /api/v1/villages/my-village/)
  const loadMyVillage = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await villagesApi.getMyVillage();
      if (res.success && res.data) {
        const mapped = mapApiDataToForm(res.data);
        setFormData(mapped);
        setInitialData(mapped);
      } else {
        // Fallback to prop data if API returned no data
        if (village) {
          const fallback = mapApiDataToForm({
            village_id: village.villageId || village.village_id,
            village_name: village.name || village.village_name,
            slug: village.slug,
            description: village.description,
            province: village.province,
            district: village.district,
            address: village.address,
            latitude: village.latitude,
            longitude: village.longitude,
            cover_image_url: village.coverImage || village.cover_image_url,
            status: village.status,
          });
          setFormData(fallback);
          setInitialData(fallback);
        }
      }
    } catch (err: any) {
      console.warn('GET /api/v1/villages/my-village/ error:', err);
      // If error (e.g. 401 unauth or 404), fallback gracefully to prop data if available
      if (village) {
        const fallback = mapApiDataToForm({
          village_id: village.villageId || village.village_id,
          village_name: village.name || village.village_name,
          slug: village.slug,
          description: village.description,
          province: village.province,
          district: village.district,
          address: village.address,
          latitude: village.latitude,
          longitude: village.longitude,
          cover_image_url: village.coverImage || village.cover_image_url,
          status: village.status,
        });
        setFormData(fallback);
        setInitialData(fallback);
      } else {
        setLoadError(
          err?.message ||
          'Không thể kết nối đến máy chủ để tải thông tin làng nghề. Vui lòng thử lại sau.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyVillage();
  }, []);

  // Handle field change
  const handleChange = (field: keyof VillageFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Real-time coordinate validation
    if (field === 'latitude') {
      if (value !== '' && value !== null && value !== undefined) {
        const lat = Number(value);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          setErrors((prev) => ({
            ...prev,
            latitude: 'Vĩ độ phải nằm trong khoảng -90 đến 90.',
          }));
          return;
        }
      }
      setErrors((prev) => ({ ...prev, latitude: undefined }));
    } else if (field === 'longitude') {
      if (value !== '' && value !== null && value !== undefined) {
        const lng = Number(value);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          setErrors((prev) => ({
            ...prev,
            longitude: 'Kinh độ phải nằm trong khoảng -180 đến 180.',
          }));
          return;
        }
      }
      setErrors((prev) => ({ ...prev, longitude: undefined }));
    } else if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Validation strictly based on Database & Django model constraints
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // village_name: required, max 200
    if (!formData.village_name?.trim()) {
      newErrors.village_name = 'Tên làng nghề không được để trống.';
    } else if (formData.village_name.length > 200) {
      newErrors.village_name = 'Tên làng nghề không được vượt quá 200 ký tự.';
    }

    // slug: required, unique, slug format
    if (!formData.slug?.trim()) {
      newErrors.slug = 'Mã định danh (slug) không được để trống.';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug.trim())) {
      newErrors.slug = 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
    } else if (formData.slug.length > 220) {
      newErrors.slug = 'Slug không được vượt quá 220 ký tự.';
    }

    // province: required, max 100
    if (!formData.province?.trim()) {
      newErrors.province = 'Tỉnh / Thành phố không được để trống.';
    } else if (formData.province.length > 100) {
      newErrors.province = 'Tỉnh / Thành phố không được vượt quá 100 ký tự.';
    }

    // district: optional, max 100
    if (formData.district && formData.district.length > 100) {
      newErrors.district = 'Quận / Huyện không được vượt quá 100 ký tự.';
    }

    // address: optional, max 255
    if (formData.address && formData.address.length > 255) {
      newErrors.address = 'Địa chỉ không được vượt quá 255 ký tự.';
    }

    // latitude: optional, decimal -90 to 90
    if (
      formData.latitude !== '' &&
      formData.latitude !== null &&
      formData.latitude !== undefined
    ) {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Vĩ độ phải nằm trong khoảng -90 đến 90.';
      }
    }

    // longitude: optional, decimal -180 to 180
    if (
      formData.longitude !== '' &&
      formData.longitude !== null &&
      formData.longitude !== undefined
    ) {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'Kinh độ phải nằm trong khoảng -180 đến 180.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload Cover Image handler (POST /api/v1/upload/ -> Cloudinary-only)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side quick check: image types & max 10MB
    if (!file.type.startsWith('image/')) {
      showToast?.('Chỉ hỗ trợ tải lên tệp định dạng hình ảnh (JPG, PNG, WEBP, GIF, SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast?.('Kích thước ảnh không được vượt quá 10MB.');
      return;
    }

    // Clean up previous temporary object URL if any
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    // Create temporary browser object URL for instant visual feedback during upload
    const localPreview = URL.createObjectURL(file);
    previewObjectUrlRef.current = localPreview;
    setPreviewBlobUrl(localPreview);

    setIsUploadingCover(true);
    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/villages/cover');
      if (res.success && res.data?.secure_url) {
        const cloudUrl = res.data.secure_url;

        // Clean up temporary local preview URL
        if (previewObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
          previewObjectUrlRef.current = null;
        }
        setPreviewBlobUrl(null);

        // Update form state with the permanent Cloudinary secure URL
        handleChange('cover_image_url', cloudUrl);
        showToast?.('Tải ảnh lên Cloudinary thành công! Nhấn "Lưu" để cập nhật hồ sơ.');
      } else {
        throw new Error(res.message || 'Cloudinary không trả về đường dẫn ảnh an toàn.');
      }
    } catch (err: any) {
      console.error('Cloudinary upload failed:', err);

      // On failure: discard temporary preview and preserve existing image!
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewBlobUrl(null);

      showToast?.(
        `Không thể tải ảnh lên Cloudinary: ${err?.message || 'Vui lòng kiểm tra kết nối mạng và thử lại.'}`
      );
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Clean Payload Mapper: Contains ONLY genuine DB fields & validates Cloudinary URL
  const mapFormToPayload = (form: VillageFormData) => {
    // Strictly sanitize: Never save local blob URL or local filesystem path to DB
    let safeCoverUrl = form.cover_image_url ? form.cover_image_url.trim() : '';
    if (safeCoverUrl.startsWith('blob:') || safeCoverUrl.includes('/media/')) {
      safeCoverUrl = '';
    }

    return {
      village_name: form.village_name.trim(),
      slug: form.slug.trim(),
      description: form.description?.trim() || '',
      province: form.province.trim(),
      district: form.district?.trim() || '',
      address: form.address?.trim() || '',
      latitude:
        form.latitude !== '' && form.latitude !== null && form.latitude !== undefined
          ? Number(form.latitude)
          : null,
      longitude:
        form.longitude !== '' && form.longitude !== null && form.longitude !== undefined
          ? Number(form.longitude)
          : null,
      cover_image_url: safeCoverUrl,
      status: form.status,
    };
  };

  // Handle Form Submit / Save (PUT /api/v1/villages/my-village/)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isUploadingCover) {
      showToast?.('Ảnh đang được tải lên Cloudinary. Vui lòng đợi trong giây lát...');
      return;
    }

    if (!validateForm()) {
      showToast?.('Vui lòng kiểm tra lại các trường thông tin bị lỗi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = mapFormToPayload(formData);
      const apiRes = await villagesApi.updateMyVillage(payload as any);

      if (apiRes.success && apiRes.data) {
        const updated = mapApiDataToForm(apiRes.data);
        setFormData(updated);
        setInitialData(updated);

        // Notify parent with synced fields
        onSaveVillage?.({
          ...updated,
          name: updated.village_name,
          coverImage: updated.cover_image_url,
        });

        showToast?.('Đã lưu thay đổi hồ sơ làng nghề thành công!');
      } else {
        // Fallback update if API response was partial
        setInitialData(formData);
        onSaveVillage?.({
          ...formData,
          name: formData.village_name,
          coverImage: formData.cover_image_url,
        });
        showToast?.('Đã lưu thay đổi hồ sơ làng nghề thành công!');
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu hồ sơ làng nghề:', err);
      showToast?.(`Lỗi khi lưu hồ sơ làng nghề: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Refresh
  const handleRefresh = () => {
    if (initialData) {
      setFormData(initialData);
    }
    setErrors({});
    loadMyVillage();
    showToast?.('Đã làm mới dữ liệu làng nghề');
  };

  // Copy Public Link Helper
  const handleCopyPublicLink = () => {
    const publicUrl = `https://localcraft.vn/villages/${formData.slug || 'bat-trang'}`;
    navigator.clipboard?.writeText(publicUrl);
    showToast?.(`Đã sao chép liên kết công khai: ${publicUrl}`);
  };

  // Loading view
  if (isLoading) {
    return (
      <div className="artisan-tab-pane village-profile-pane">
        <div className="v02-loading-container">
          <span className="btn-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p>Đang tải thông tin hồ sơ làng nghề...</p>
        </div>
      </div>
    );
  }

  // Error view
  if (loadError && !formData.village_name) {
    return (
      <div className="artisan-tab-pane village-profile-pane">
        <div className="v02-error-banner">
          <div>
            <strong>Lỗi tải dữ liệu: </strong>
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            className="btn-save-luxury compact"
            onClick={loadMyVillage}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="artisan-tab-pane village-profile-pane">
      {/* 1. Header Toolbar Bar */}
      <div className="village-profile-header-card">
        <div className="header-info-left">
          <div className="header-badge-row">
            <span className="village-heritage-pill">HỒ SƠ LÀNG NGHỀ</span>
            <span className={formData.status === 'ACTIVE' ? 'saved-status-pill' : 'unsaved-badge-pill'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${formData.status === 'ACTIVE' ? 'green' : 'amber'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: formData.status === 'ACTIVE' ? '#10B981' : '#F59E0B' }} />
              <span>{formData.status === 'ACTIVE' ? 'ĐANG HOẠT ĐỘNG' : 'TẠM DỪNG'}</span>
            </span>
          </div>
          <h2 className="village-header-title">
            {formData.village_name || 'Hồ sơ làng nghề'}
          </h2>
          <p className="village-header-subtitle">
            Quản lý thông tin hiển thị chính thức của làng nghề trên cổng thông tin LOCALCRAFT
          </p>
        </div>

        {/* Action Buttons: Làm mới & Lưu */}
        <div className="header-actions-right">
          <button
            type="button"
            className="btn-cancel-luxury"
            onClick={handleRefresh}
            disabled={isSaving || isLoading}
            title="Làm mới dữ liệu làng nghề"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className={`btn-save-luxury ${isSaving ? 'loading' : ''}`}
            onClick={() => handleSave()}
            disabled={isSaving || isUploadingCover}
            title="Lưu tất cả thay đổi vào hệ thống LOCALCRAFT"
          >
            {isSaving ? (
              <>
                <span className="btn-spinner" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Lưu</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Upload Input for Cover Image */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleCoverUpload}
      />

      {/* 2. SECTION 01: HÌNH ẢNH ĐẠI DIỆN */}
      <div className="village-section-card">
        <div className="section-title-wrap">
          <div className="section-step-number">01</div>
          <div>
            <h3 className="section-heading">Hình ảnh đại diện</h3>
            <p className="section-desc">
              Ảnh bìa chính thức xuất hiện tại trang giới thiệu và kết quả tìm kiếm của làng nghề
            </p>
          </div>
        </div>

        {/* Cover Banner Preview Box */}
        <div className="cover-banner-preview-box">
          <img
            src={previewBlobUrl || formData.cover_image_url || DEFAULT_COVER}
            alt={formData.village_name || 'Ảnh bìa làng nghề'}
            className="cover-banner-img"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== DEFAULT_COVER) {
                target.src = DEFAULT_COVER;
              }
            }}
          />
          <div className="cover-banner-gradient" />

          {/* Change Cover Button */}
          <div className="cover-action-buttons">
            <button
              type="button"
              className="btn-change-cover"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover || isSaving}
            >
              {isUploadingCover ? (
                <span>Đang tải lên Cloudinary...</span>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Thay ảnh</span>
                </>
              )}
            </button>
          </div>

          {/* Banner bottom title overlay */}
          <div className="cover-banner-bottom-left">
            <div className="cover-banner-texts">
              <h3 className="cover-village-title">
                {formData.village_name || 'Làng nghề truyền thống'}
              </h3>
              <p className="cover-village-sub">
                {formData.province ? `${formData.district ? `${formData.district}, ` : ''}${formData.province}` : 'Việt Nam'}
              </p>
            </div>
          </div>
        </div>

        {/* Public URL Preview Bar */}
        <div className="public-url-bar">
          <div className="public-url-info">
            <span className="url-label">Đường dẫn công khai:</span>
            <div className="url-code-box">
              https://localcraft.vn/villages/{formData.slug || 'bat-trang'}
            </div>
          </div>
          <button
            type="button"
            className="btn-copy-url"
            onClick={handleCopyPublicLink}
            title="Sao chép đường dẫn"
          >
            Sao chép liên kết
          </button>
        </div>
      </div>

      {/* 3. SECTION 02: THÔNG TIN CƠ BẢN */}
      <div className="village-section-card">
        <div className="section-title-wrap">
          <div className="section-step-number">02</div>
          <div>
            <h3 className="section-heading">Thông tin cơ bản</h3>
            <p className="section-desc">
              Tên gọi chính thức, mã định danh đường dẫn (slug) và câu chuyện giới thiệu làng nghề
            </p>
          </div>
        </div>

        <div className="form-fields-grid">
          {/* Tên làng nghề */}
          <div className="form-group-luxury">
            <label className="field-label">
              Tên làng nghề <span className="req-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input-luxury ${errors.village_name ? 'has-error' : ''}`}
              placeholder="Ví dụ: Làng Gốm Bát Tràng"
              value={formData.village_name}
              onChange={(e) => handleChange('village_name', e.target.value)}
              maxLength={200}
            />
            {errors.village_name && (
              <div className="field-error-text">{errors.village_name}</div>
            )}
          </div>

          {/* Đường dẫn tĩnh Slug */}
          <div className="form-group-luxury">
            <label className="field-label">
              Mã định danh (Slug) <span className="req-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input-luxury ${errors.slug ? 'has-error' : ''}`}
              placeholder="Ví dụ: bat-trang"
              value={formData.slug}
              onChange={(e) =>
                handleChange(
                  'slug',
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                )
              }
              maxLength={220}
            />
            <span className="field-hint">
              Dùng cho đường dẫn SEO thân thiện, viết thường không dấu (Ví dụ: bat-trang)
            </span>
            {errors.slug && <div className="field-error-text">{errors.slug}</div>}
          </div>

          {/* Mô tả làng nghề (Full Width) */}
          <div className="form-group-luxury full-width">
            <label className="field-label">Mô tả làng nghề</label>
            <textarea
              rows={4}
              className="field-textarea-luxury"
              placeholder="Mô tả lịch sử hình thành, tinh hoa làng nghề, nghệ thuật chế tác truyền thống..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
            <span className="field-hint">
              Mô tả chi tiết xuất hiện trên trang giới thiệu và thẻ thông tin du lịch
            </span>
          </div>
        </div>
      </div>

      {/* 4. SECTION 03: ĐỊA CHỈ & VỊ TRÍ */}
      <div className="village-section-card">
        <div className="section-title-wrap">
          <div className="section-step-number">03</div>
          <div>
            <h3 className="section-heading">Địa chỉ & Vị trí</h3>
            <p className="section-desc">
              Địa chỉ hành chính và tọa độ GPS giúp định vị vị trí làng nghề trên bản đồ
            </p>
          </div>
        </div>

        <div className="form-fields-grid">
          {/* Tỉnh / Thành phố */}
          <div className="form-group-luxury">
            <label className="field-label">
              Tỉnh / Thành phố <span className="req-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input-luxury ${errors.province ? 'has-error' : ''}`}
              placeholder="Ví dụ: Hà Nội"
              value={formData.province}
              onChange={(e) => handleChange('province', e.target.value)}
              maxLength={100}
            />
            {errors.province && (
              <div className="field-error-text">{errors.province}</div>
            )}
          </div>

          {/* Quận / Huyện */}
          <div className="form-group-luxury">
            <label className="field-label">Quận / Huyện</label>
            <input
              type="text"
              className={`field-input-luxury ${errors.district ? 'has-error' : ''}`}
              placeholder="Ví dụ: Gia Lâm"
              value={formData.district}
              onChange={(e) => handleChange('district', e.target.value)}
              maxLength={100}
            />
            {errors.district && (
              <div className="field-error-text">{errors.district}</div>
            )}
          </div>

          {/* Địa chỉ chi tiết (Full Width) */}
          <div className="form-group-luxury full-width">
            <label className="field-label">Địa chỉ cụ thể</label>
            <input
              type="text"
              className={`field-input-luxury ${errors.address ? 'has-error' : ''}`}
              placeholder="Ví dụ: Xóm 1, Làng cổ Bát Tràng, Huyện Gia Lâm, TP. Hà Nội"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              maxLength={255}
            />
            {errors.address && (
              <div className="field-error-text">{errors.address}</div>
            )}
          </div>

          {/* Tọa độ Vĩ độ Latitude */}
          <div className="form-group-luxury">
            <label className="field-label">Vĩ độ (Latitude)</label>
            <input
              type="number"
              step="any"
              className={`field-input-luxury ${errors.latitude ? 'has-error' : ''}`}
              placeholder="Ví dụ: 20.9782412"
              value={formData.latitude}
              onChange={(e) =>
                handleChange(
                  'latitude',
                  e.target.value === '' ? '' : e.target.value
                )
              }
            />
            {errors.latitude && (
              <div className="field-error-text">{errors.latitude}</div>
            )}
          </div>

          {/* Tọa độ Kinh độ Longitude */}
          <div className="form-group-luxury">
            <label className="field-label">Kinh độ (Longitude)</label>
            <input
              type="number"
              step="any"
              className={`field-input-luxury ${errors.longitude ? 'has-error' : ''}`}
              placeholder="Ví dụ: 105.9126431"
              value={formData.longitude}
              onChange={(e) =>
                handleChange(
                  'longitude',
                  e.target.value === '' ? '' : e.target.value
                )
              }
            />
            {errors.longitude && (
              <div className="field-error-text">{errors.longitude}</div>
            )}
          </div>
        </div>

        {/* Interactive Map Visualizer & Location Picker */}
        <VillageLocationMap
          latitude={formData.latitude}
          longitude={formData.longitude}
          villageName={formData.village_name}
          address={formData.address}
          district={formData.district}
          province={formData.province}
          onCoordinatesChange={(newLat, newLng) => {
            handleChange('latitude', newLat);
            handleChange('longitude', newLng);
          }}
          disabled={isSaving}
        />
      </div>

      {/* 5. SECTION 04: TRẠNG THÁI */}
      <div className="village-section-card">
        <div className="section-title-wrap">
          <div className="section-step-number">04</div>
          <div>
            <h3 className="section-heading">Trạng thái</h3>
            <p className="section-desc">
              Quản lý trạng thái hoạt động chính thức của làng nghề trên cổng thông tin
            </p>
          </div>
        </div>

        <div className="form-fields-grid">
          <div className="form-group-luxury">
            <label className="field-label">Trạng thái hoạt động</label>
            <select
              className="field-select-luxury"
              value={formData.status}
              onChange={(e) =>
                handleChange('status', e.target.value as 'ACTIVE' | 'INACTIVE')
              }
            >
              <option value="ACTIVE">Hoạt động </option>
              <option value="INACTIVE">Tạm dừng hoạt động</option>
            </select>
            <span className="field-hint">
              Khi ở trạng thái ACTIVE, làng nghề sẽ được hiển thị công khai trên hệ thống LOCALCRAFT
            </span>
          </div>
        </div>
      </div>


    </div>
  );
};

export default VillageProfileTab;
