import React, { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  authApi,
  uploadApi,
  bookingsApi,
  ordersApi,
  recommendationsApi,
  BookingDto,
  OrderDto,
  FavoriteItemDto,
} from '@/services/api';

interface ProfilePageProps {
  onBackToHome?: () => void;
  onNavigateToLogin?: () => void;
  onChangePassword?: () => void;
  onExploreWorkshops?: () => void;
  userEmail?: string;
  userFullName?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBackToHome,
  onNavigateToLogin,
  onChangePassword,
  onExploreWorkshops,
  userEmail,
  userFullName,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'profile' | 'workshops' | 'orders' | 'favorites' | 'preferences'
  >('profile');

  // Form states (Synchronized with backend DB)
  const [fullName, setFullName] = useState<string>(userFullName || '');
  const [email, setEmail] = useState<string>(userEmail || '');
  const [phone, setPhone] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [gender, setGender] = useState<string>('OTHER');
  const [address, setAddress] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState<string>('');

  // Subtab data
  const [bookingsList, setBookingsList] = useState<BookingDto[]>([]);
  const [ordersList, setOrdersList] = useState<OrderDto[]>([]);
  const [favoritesList, setFavoritesList] = useState<FavoriteItemDto[]>([]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load user profile accurately from backend DB on mount
  useEffect(() => {
    authApi.getMe()
      .then((res) => {
        if (res.success && res.data) {
          const u = res.data;
          setFullName(u.full_name || '');
          setEmail(u.email || '');
          setPhone(u.phone || '');
          setBirthDate(u.birth_date || '');
          setGender(u.gender || 'OTHER');
          setAddress(u.address || '');
          setAvatarUrl(u.avatar_url || '');
          setRoles(u.roles || []);
          setCreatedAt(u.created_at || '');
        }
      })
      .catch(() => {});
  }, []);

  // Handle avatar upload to Cloudinary
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    // Instant local preview
    const tempUrl = URL.createObjectURL(file);
    setAvatarUrl(tempUrl);
    setIsUploadingAvatar(true);
    showToast('Đang tải ảnh lên Cloudinary...');

    try {
      const res = await uploadApi.uploadImage(file, 'localcraft/avatars');
      if (res.success && res.data?.secure_url) {
        setAvatarUrl(res.data.secure_url);
        showToast('Tải ảnh lên Cloudinary thành công! Bấm "Lưu thay đổi" để cập nhật tài khoản.');
      } else {
        showToast(res.message || 'Tải ảnh thất bại. Vui lòng thử lại.');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải ảnh lên Cloudinary.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Cancel / Reset to DB values
  const handleCancel = () => {
    authApi.getMe()
      .then((res) => {
        if (res.success && res.data) {
          const u = res.data;
          setFullName(u.full_name || '');
          setEmail(u.email || '');
          setPhone(u.phone || '');
          setBirthDate(u.birth_date || '');
          setGender(u.gender || 'OTHER');
          setAddress(u.address || '');
          setAvatarUrl(u.avatar_url || '');
          setRoles(u.roles || []);
          showToast('Đã khôi phục thông tin ban đầu từ hệ thống.');
        }
      })
      .catch(() => {
        showToast('Đã khôi phục thông tin ban đầu.');
      });
  };

  // Handle Save to backend DB
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Vui lòng nhập họ và tên (*).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        birth_date: birthDate || undefined,
        gender: (gender as any) || undefined,
        address: address.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      });
      if (res.success && res.data) {
        const u = res.data;
        setFullName(u.full_name);
        if (u.phone !== undefined) setPhone(u.phone || '');
        if (u.birth_date !== undefined) setBirthDate(u.birth_date || '');
        if (u.gender !== undefined) setGender(u.gender || 'OTHER');
        if (u.address !== undefined) setAddress(u.address || '');
        if (u.avatar_url !== undefined) setAvatarUrl(u.avatar_url || '');
      }
      setIsSaving(false);
      showToast('Cập nhật thông tin tài khoản thành công!');
    } catch (err: any) {
      setIsSaving(false);
      showToast(err.message || 'Cập nhật thông tin thất bại. Vui lòng thử lại.');
    }
  };

  const handleTabChange = async (tab: 'profile' | 'workshops' | 'orders' | 'favorites' | 'preferences') => {
    setActiveTab(tab);
    if (tab === 'workshops') {
      try {
        const res = await bookingsApi.getMyBookings();
        setBookingsList(res.data || []);
        showToast(`Lịch sử: ${res.data?.length || 0} workshop đã đăng ký.`);
      } catch {
        showToast('Lịch sử đặt workshop');
      }
    } else if (tab === 'orders') {
      try {
        const res = await ordersApi.getMyOrders();
        setOrdersList(res.data || []);
        showToast(`Đơn hàng: ${res.data?.length || 0} đơn tác phẩm thủ công.`);
      } catch {
        showToast('Đơn hàng tác phẩm');
      }
    } else if (tab === 'favorites') {
      try {
        const res = await recommendationsApi.getFavorites();
        setFavoritesList(res.data || []);
        showToast(`Bộ sưu tập: ${res.data?.length || 0} tác phẩm yêu thích.`);
      } catch {
        showToast('Bộ sưu tập yêu thích');
      }
    } else if (tab === 'preferences') {
      showToast('Cá nhân hóa AI: Đang kết nối sở thích di sản của bạn.');
    }
  };

  return (
    <div className="profile-page-canvas">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast-container">
          <span>🌿</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Ambient background glows */}
      <div className="profile-ambient-orb-1" />
      <div className="profile-ambient-orb-2" />

      {/* Navigation Header */}
      <Navbar
        onBackToHome={onBackToHome}
        onOpenLogin={onNavigateToLogin}
        onOpenProfile={() => {}}
        onLogout={onNavigateToLogin}
        onOpenExplore={onBackToHome}
        onOpenSearch={() => showToast('Tính năng tìm kiếm nhanh di sản')}
        isLoggedIn={true}
        currentUser={{
          email: userEmail || email,
          fullName: userFullName || fullName,
          avatarUrl: avatarUrl,
        }}
      />

      {/* Main Content */}
      <main className="profile-main-wrapper">
        {/* Navigation Sub-Tabs */}
        <div className="profile-subtabs-bar">
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className={`profile-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Hồ sơ cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('workshops')}
            className={`profile-tab-item ${activeTab === 'workshops' ? 'active' : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Lịch sử đặt workshop</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('orders')}
            className={`profile-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Đơn hàng tác phẩm</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('favorites')}
            className={`profile-tab-item ${activeTab === 'favorites' ? 'active' : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Bộ sưu tập yêu thích</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('preferences')}
            className={`profile-tab-item ${activeTab === 'preferences' ? 'active' : ''}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Cá nhân hóa</span>
          </button>
        </div>

        {/* Master Two-Column Grid */}
        <div className="profile-master-grid">
          {/* ================= LEFT SIDEBAR ================= */}
          <aside className="profile-sidebar">
            {/* Card 1: Identity & Avatar Card */}
            <div className="profile-identity-card">
              <div className="profile-card-top-banner" />

              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-img-box">
                  <img
                    src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=002720&color=fff&size=160`}
                    alt={fullName}
                    className="profile-avatar-img"
                  />
                </div>

                {/* Edit badge trigger */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="profile-avatar-edit-badge"
                  title="Thay đổi ảnh đại diện"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="profile-avatar-change-btn"
                style={{ opacity: isUploadingAvatar ? 0.7 : 1, cursor: isUploadingAvatar ? 'wait' : 'pointer' }}
              >
                {isUploadingAvatar ? 'Đang tải lên Cloudinary...' : 'Thay đổi ảnh đại diện'}
              </button>

              <h2 className="profile-identity-name">{fullName || 'Người dùng'}</h2>
              <p className="profile-identity-email">{email}</p>

              <div className="profile-role-badge-pill">
                <span className="profile-role-badge-dot" />
                <span className="profile-role-badge-text">
                  {roles.includes('ADMIN')
                    ? 'Quản trị viên hệ thống'
                    : roles.includes('CRAFT_VILLAGE')
                    ? 'Quản lý làng nghề'
                    : 'Khách du lịch trải nghiệm'}
                </span>
              </div>

              {/* User Metadata Box */}
              <div className="profile-meta-summary-box">
                <div className="profile-meta-row">
                  <span className="profile-meta-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Thành viên từ:
                  </span>
                  <span className="profile-meta-value">
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
                      : 'Tháng 10, 2026'}
                  </span>
                </div>

                <div className="profile-meta-row">
                  <span className="profile-meta-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Đã tham gia:
                  </span>
                  <span
                    className="profile-meta-value highlight"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onExploreWorkshops?.();
                      handleTabChange('workshops');
                    }}
                  >
                    {bookingsList.length > 0 ? `${bookingsList.length} Workshop` : '4 Workshop'}
                  </span>
                </div>

                <div className="profile-meta-row">
                  <span className="profile-meta-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Bộ sưu tập:
                  </span>
                  <span className="profile-meta-value">
                    {favoritesList.length > 0 ? `${favoritesList.length} Tác phẩm yêu thích` : 'Bát Tràng • Vạn Phúc'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Heritage Passport Widget */}
            <div className="profile-passport-card">
              <div className="profile-passport-header">
                <span className="profile-passport-tag">HỘ CHIẾU DI SẢN</span>
                <span className="profile-passport-level">Cấp độ 2 / 5</span>
              </div>

              <div className="profile-passport-body">
                {/* 65% Progress Ring */}
                <div className="profile-passport-circle-wrap">
                  <svg className="profile-passport-circle-svg" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F0EEE8"
                      strokeWidth="3.2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--color-clay)"
                      strokeWidth="3.2"
                      strokeDasharray="65, 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="profile-passport-percent">65%</span>
                </div>

                <div className="profile-passport-details">
                  <div className="profile-passport-rank-title">
                    Nhà sưu tầm Đồng điệu
                  </div>
                  <div className="profile-passport-rank-desc">
                    Hoàn thành thêm 1 buổi giao lưu nghệ nhân để mở khóa đặc quyền Gốm Thượng hạng.
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN ================= */}
          <section className="profile-content-column">
            {/* Form Card: Hồ sơ chi tiết */}
            <div className="profile-form-card">
              <div className="profile-card-header-row">
                <div className="profile-card-header-title-box">
                  <h3 className="profile-card-section-title">Hồ sơ chi tiết</h3>
                  <p className="profile-card-section-desc">
                    Thông tin dùng để xác thực quyền tham dự và gửi chứng thư tác phẩm chế tác tay.
                  </p>
                </div>
                <span className="profile-req-badge">
                  {ordersList.length > 0 ? `${ordersList.length} đơn hàng` : '* Trường bắt buộc'}
                </span>
              </div>

              <form onSubmit={handleSave} className="profile-detail-form">
                {/* 2-Column Responsive Form Grid matching Figma layout */}
                <div className="profile-form-grid">
                  {/* Field 1: Họ và tên (Cột 1, Hàng 1) */}
                  <div className="profile-input-group profile-grid-col-1">
                    <div className="profile-input-label-row">
                      <label htmlFor="profile-fullname" className="profile-input-label">
                        Họ và tên <span className="profile-input-label-req">*</span>
                      </label>
                    </div>
                    <div className="profile-input-container">
                      <input
                        id="profile-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên..."
                        className="profile-input-field"
                      />
                      <div className="profile-input-icon-right">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Field 2: Địa chỉ Email (Cột 2, Hàng 1) */}
                  <div className="profile-input-group profile-grid-col-2">
                    <div className="profile-input-label-row">
                      <label htmlFor="profile-email" className="profile-input-label">
                        Địa chỉ Email <span className="profile-input-label-req">*</span>
                      </label>
                      <div className="profile-input-badge-fixed">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Cố định bảo mật</span>
                      </div>
                    </div>
                    <div className="profile-input-container">
                      <input
                        id="profile-email"
                        type="email"
                        readOnly
                        disabled
                        value={email}
                        className="profile-input-field disabled"
                      />
                      <div className="profile-input-icon-right">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Field 3: Số điện thoại (Cột 1, Hàng 2) */}
                  <div className="profile-input-group profile-grid-col-1">
                    <div className="profile-input-label-row">
                      <label htmlFor="profile-phone" className="profile-input-label">
                        Số điện thoại <span className="profile-input-label-req">*</span>
                      </label>
                    </div>
                    <div className="profile-input-container">
                      <div className="profile-input-prefix-flag">
                        <span role="img" aria-label="Vietnam Flag">🇻🇳</span>
                        <span>+84</span>
                      </div>
                      <input
                        id="profile-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Nhập số điện thoại..."
                        className="profile-input-field with-prefix"
                      />
                    </div>
                  </div>

                  {/* Field 4: Ngày sinh (Cột 2, Hàng 2) */}
                  <div className="profile-input-group profile-grid-col-2">
                    <div className="profile-input-label-row">
                      <label htmlFor="profile-dob" className="profile-input-label">
                        Ngày sinh <span className="profile-input-label-sub">(Tùy chọn)</span>
                      </label>
                    </div>
                    <div className="profile-input-container">
                      <input
                        ref={dateInputRef}
                        id="profile-dob"
                        type="date"
                        value={birthDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBirthDate(e.target.value)}
                        onClick={() => {
                          try {
                            dateInputRef.current?.showPicker();
                          } catch {
                            // Fallback
                          }
                        }}
                        className="profile-input-field profile-input-date"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (dateInputRef.current) {
                            try {
                              dateInputRef.current.showPicker();
                            } catch {
                              dateInputRef.current.focus();
                            }
                          }
                        }}
                        className="profile-input-btn-right"
                        title="Mở lịch chọn ngày sinh"
                        aria-label="Chọn ngày sinh"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Field 5: Giới tính (Cột 1, Hàng 3) */}
                  <div className="profile-input-group profile-grid-col-1">
                    <div className="profile-input-label-row">
                      <label className="profile-input-label">
                        Giới tính <span className="profile-input-label-sub">(Tùy chọn)</span>
                      </label>
                    </div>
                    <div className="profile-gender-pills-row">
                      <button
                        type="button"
                        onClick={() => setGender('MALE')}
                        className={`profile-gender-pill-btn ${gender === 'MALE' ? 'active' : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="10" cy="14" r="5" />
                          <line x1="19" y1="5" x2="13.5" y2="10.5" />
                          <polyline points="14 5 19 5 19 10" />
                        </svg>
                        <span>Nam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('FEMALE')}
                        className={`profile-gender-pill-btn ${gender === 'FEMALE' ? 'active' : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="9" r="5" />
                          <line x1="12" y1="14" x2="12" y2="21" />
                          <line x1="9" y1="18" x2="15" y2="18" />
                        </svg>
                        <span>Nữ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('OTHER')}
                        className={`profile-gender-pill-btn ${gender === 'OTHER' ? 'active' : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="6" />
                          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                        </svg>
                        <span>Khác</span>
                      </button>
                    </div>
                  </div>

                  {/* Field 6: Địa chỉ nhận tác phẩm thủ công (Cả 2 cột / Full row, Hàng 4) */}
                  <div className="profile-input-group profile-grid-col-full">
                    <div className="profile-input-label-row">
                      <label htmlFor="profile-address" className="profile-input-label">
                        Địa chỉ nhận tác phẩm thủ công <span className="profile-input-label-sub">(Tùy chọn)</span>
                      </label>
                      <span className="profile-input-label-sub">
                        Giao tận tay sau thời gian nung gốm / hấp lụa
                      </span>
                    </div>
                    <div className="profile-input-container">
                      <textarea
                        id="profile-address"
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập địa chỉ nhận hàng chi tiết..."
                        className="profile-textarea-field"
                      />
                      <div className="profile-input-icon-right profile-textarea-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="profile-form-actions-row">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="profile-btn-cancel"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="profile-btn-save"
                  >
                    {isSaving ? (
                      <span>Đang lưu...</span>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Security Card */}
            <div className="profile-security-card">
              <div className="profile-security-left">
                <div className="profile-security-emblem">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <div className="profile-security-info">
                  <div className="profile-security-title-row">
                    <span className="profile-security-title">Bảo mật tài khoản</span>
                    <span className="profile-security-badge">Tiêu chuẩn 256-bit</span>
                  </div>
                  <p className="profile-security-desc">
                    Cập nhật mật khẩu định kỳ và quản lý các phiên đăng nhập để bảo vệ thông tin hành trình và chứng nhận di sản của bạn.
                  </p>
                  <div className="profile-security-last-changed">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Mật khẩu được đổi lần cuối vào: <strong>3 tháng trước</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onChangePassword || (() => showToast('Chuyển hướng đến màn hình Đặt lại mật khẩu'))}
                className="profile-btn-change-pw"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Đổi mật khẩu</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer onBackToHome={onBackToHome} />
    </div>
  );
};

export default ProfilePage;
