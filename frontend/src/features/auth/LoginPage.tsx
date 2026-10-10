import React, { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import CraftParticles from '@/components/ui/CraftParticles';
import bannerImage from '@/assets/Images/Banner.jpg';

import { authApi } from '@/services/api';

interface LoginPageProps {
  onBackToHome?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  onLoginSuccess?: (data: { email: string; fullName?: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onSwitchToRegister,
  onForgotPassword,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showNotification('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      showNotification('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess({
            email: res.data.user.email,
            fullName: res.data.user.full_name,
          });
        } else {
          onBackToHome?.();
        }
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.');
    }
  };

  const handleGoogleLogin = () => {
    showNotification('Tính năng đăng nhập Google đang được kết nối OAuth2.');
  };

  return (
    <div className="auth-centered-page">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            background: 'var(--color-forest)',
            color: 'var(--color-cream)',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 39, 32, 0.35)',
            border: '1px solid var(--color-peach)',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideDown 0.25s ease-out',
          }}
        >
          <span>🌿</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ---------------- BACKGROUND LAYERS WITH GENTLE MOTION ---------------- */}
      {/* 1. Atmospheric heritage photo with slow ambient zoom */}
      <div
        className="auth-bg-artisan-photo"
        style={{ backgroundImage: `url(${bannerImage})` }}
      />

      {/* 2. Soft Emerald Veil with Backdrop Blur */}
      <div className="auth-bg-veil" />

      {/* 3. Drifting Warm Ambient Glow Orbs */}
      <div className="auth-ambient-orb-1" />
      <div className="auth-ambient-orb-2" />

      {/* 4. Craft ember particles floating gently */}
      <CraftParticles count={28} colorScheme="gold" />

      {/* ---------------- FLOATING TOP NAVIGATION ---------------- */}
      <div className="auth-top-nav">
        <button onClick={onBackToHome} className="auth-btn-back-floating">
          <AppIcon name="arrow-right-sm" size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Trang chủ</span>
        </button>
      </div>

      {/* ---------------- CENTERED LUXURY GLASS CARD ---------------- */}
      <div className="auth-card-container">
        {/* Card Header */}
        <div className="auth-card-header">
          {/* Brand Emblem */}
          <div
            onClick={onBackToHome}
            className="auth-card-brand-emblem"
            title="Về trang chủ LocalCraft"
          >
            <AppIcon name="pottery" size={26} />
          </div>

          {/* Badge */}
          <div className="auth-card-badge">
            <span className="auth-card-badge-dot" />
            <span className="auth-card-badge-text">
              Cổng Đăng Nhập Di Sản
            </span>
          </div>

          {/* Title & Subtitle */}
          <h1 className="auth-card-title">
            Chào mừng trở lại
          </h1>

          <p className="auth-card-subtitle">
            Tiếp tục hành trình khám phá <strong>tinh hoa thủ công Việt</strong> và quản lý tác phẩm độc bản.
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="auth-btn-google-centered"
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.59.102-1.166.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>

        {/* Divider */}
        <div className="auth-divider-center-row">
          <div className="auth-divider-center-line" />
          <span className="auth-divider-center-text">HOẶC</span>
          <div className="auth-divider-center-line" />
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="auth-center-form">
          {/* Email Field */}
          <div className="auth-center-field-group">
            <div className="auth-center-label-row">
              <label htmlFor="auth-center-email" className="auth-center-label">
                Địa chỉ Email <span className="auth-center-label-req">*</span>
              </label>
            </div>

            <div className="auth-center-input-wrap">
              <div className="auth-center-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>

              <input
                id="auth-center-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email của bạn..."
                className="auth-center-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-center-field-group">
            <div className="auth-center-label-row">
              <label htmlFor="auth-center-password" className="auth-center-label">
                Mật khẩu <span className="auth-center-label-req">*</span>
              </label>

              <button
                type="button"
                onClick={onForgotPassword || (() => showNotification('Liên kết đặt lại mật khẩu đã gửi tới email của bạn.'))}
                className="auth-center-forgot-btn"
              >
                Quên mật khẩu?
              </button>
            </div>

            <div className="auth-center-input-wrap">
              <div className="auth-center-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <input
                id="auth-center-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn..."
                className="auth-center-input has-toggle"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="auth-center-pw-toggle"
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div
            onClick={() => setRememberMe(!rememberMe)}
            className="auth-center-remember-row"
          >
            <div className={`auth-center-checkbox ${rememberMe ? 'checked' : ''}`}>
              {rememberMe && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="auth-center-remember-label">
              Ghi nhớ đăng nhập trên thiết bị này
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="auth-center-submit-btn"
          >
            {isLoading ? (
              <span>Đang kết nối di sản...</span>
            ) : (
              <>
                <span>Đăng nhập</span>
                <AppIcon name="arrow-right-white" size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="auth-center-footer">
          <div className="auth-center-register-prompt">
            Chưa có tài khoản?
            <span
              onClick={onSwitchToRegister || (() => showNotification('Tính năng Đăng ký đang mở qua hotline 1900 8888!'))}
              className="auth-center-register-link"
            >
              Đăng ký ngay
            </span>
          </div>

          <div className="auth-center-terms">
            Bằng việc đăng nhập, bạn đồng ý với{' '}
            <span className="auth-center-terms-link" onClick={() => showNotification('Điều khoản dịch vụ')}>
              Điều khoản
            </span>{' '}
            &amp;{' '}
            <span className="auth-center-terms-link" onClick={() => showNotification('Chính sách bảo mật di sản')}>
              Bảo mật
            </span>{' '}
            của LocalCraft.
          </div>

          <div className="auth-center-ssl-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Bảo mật chuẩn 256-bit SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
