import React, { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import CraftParticles from '@/components/ui/CraftParticles';
import bannerImage from '@/assets/Images/Banner.jpg';

import { authApi } from '@/services/api';

interface ResetPasswordPageProps {
  email?: string;
  otpCode?: string;
  onBackToLogin?: () => void;
  onBackToHome?: () => void;
  onResetSuccess?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  email = '',
  otpCode = '',
  onBackToLogin,
  onBackToHome,
  onResetSuccess,
}) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>(otpCode);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Criteria validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9]|[^A-Za-z0-9]/.test(newPassword);
  const isMatched = newPassword.length > 0 && newPassword === confirmPassword;

  // Password strength calculation
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Chưa nhập', bars: 0 };
    if (pwd.length < 6) return { score: 1, label: 'Yếu (1/4)', bars: 1 };
    const upper = /[A-Z]/.test(pwd);
    const num = /[0-9]/.test(pwd);
    const special = /[^A-Za-z0-9]/.test(pwd);

    if (pwd.length >= 10 && upper && num && special) {
      return { score: 4, label: 'Rất an toàn (4/4)', bars: 4 };
    }
    if (pwd.length >= 8 && ((upper && num) || (upper && special))) {
      return { score: 3, label: 'Khá an toàn (3/4)', bars: 3 };
    }
    return { score: 2, label: 'Trung bình (2/4)', bars: 2 };
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      showNotification('Mật khẩu cần tối thiểu 8 ký tự.');
      return;
    }

    if (!hasUpperCase) {
      showNotification('Mật khẩu cần có ít nhất 1 chữ cái in hoa.');
      return;
    }

    if (!hasNumberOrSpecial) {
      showNotification('Mật khẩu cần có ít nhất 1 chữ số hoặc ký tự đặc biệt.');
      return;
    }

    if (!isMatched) {
      showNotification('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    const codeToUse = (otpCode || otpInput).trim();
    if (!codeToUse) {
      showNotification('Thiếu mã xác thực OTP.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        otp: codeToUse,
        new_password: newPassword,
      });

      setIsLoading(false);
      showNotification('Đặt lại mật khẩu thành công! Đang chuyển đến Đăng nhập...');
      setTimeout(() => {
        onResetSuccess?.();
        onBackToLogin?.();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    }
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

      {/* ---------------- BACKGROUND ATMOSPHERIC LAYERS ---------------- */}
      <div
        className="auth-bg-artisan-photo"
        style={{ backgroundImage: `url(${bannerImage})` }}
      />
      <div className="auth-bg-veil" />
      <div className="auth-ambient-orb-1" />
      <div className="auth-ambient-orb-2" />
      <CraftParticles count={28} colorScheme="gold" />

      {/* Floating Top Navigation */}
      <div className="auth-top-nav">
        <button onClick={onBackToLogin || onBackToHome} className="auth-btn-back-floating">
          <AppIcon name="arrow-right-sm" size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Đăng nhập</span>
        </button>
      </div>

      {/* ---------------- CENTERED LUXURY GLASS CARD (S05) ---------------- */}
      <div className="auth-card-container">
        {/* Step Progression Indicators */}
        <div className="auth-step-indicators">
          <div className="auth-step-dot completed" />
          <div className="auth-step-dot completed" />
          <div className="auth-step-dot active" />
        </div>

        {/* Card Header */}
        <div className="auth-card-header">
          <div
            onClick={onBackToHome}
            className="auth-card-brand-emblem"
            title="Về trang chủ LocalCraft"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--color-peach)">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1.5" />
            </svg>
          </div>

          <div className="auth-card-badge">
            <span className="auth-card-badge-dot" />
            <span className="auth-card-badge-text">
              Thiết Lập Mật Khẩu Mới (S05)
            </span>
          </div>

          <h1 className="auth-card-title">
            Đặt lại mật khẩu
          </h1>

          <p className="auth-card-subtitle">
            Tạo mật khẩu mới cho tài khoản <strong>{email}</strong> để tiếp tục trải nghiệm LocalCraft.
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="auth-center-form">
          {!otpCode && (
            <div className="auth-center-field-group">
              <div className="auth-center-label-row">
                <label htmlFor="auth-reset-otp" className="auth-center-label">
                  Mã xác thực 6 số OTP <span className="auth-center-label-req">*</span>
                </label>
              </div>

              <div className="auth-center-input-wrap">
                <input
                  id="auth-reset-otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Nhập mã 6 số OTP..."
                  className="auth-center-input"
                />
              </div>
            </div>
          )}

          {/* New Password Field */}
          <div className="auth-center-field-group">
            <div className="auth-center-label-row">
              <label htmlFor="auth-new-password" className="auth-center-label">
                Mật khẩu mới <span className="auth-center-label-req">*</span>
              </label>
            </div>

            <div className="auth-center-input-wrap">
              <div className="auth-center-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <input
                id="auth-new-password"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="auth-center-input has-toggle"
              />

              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="auth-center-pw-toggle"
              >
                {showNewPassword ? (
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

          {/* Confirm New Password Field */}
          <div className="auth-center-field-group">
            <div className="auth-center-label-row">
              <label htmlFor="auth-confirm-password" className="auth-center-label">
                Xác nhận mật khẩu mới <span className="auth-center-label-req">*</span>
              </label>
            </div>

            <div className="auth-center-input-wrap">
              <div className="auth-center-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <input
                id="auth-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="auth-center-input has-toggle"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="auth-center-pw-toggle"
              >
                {showConfirmPassword ? (
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

          {/* Password Strength Bar */}
          <div className="auth-strength-container">
            <div className="auth-strength-header">
              <span className="auth-strength-label">Độ an toàn:</span>
              <span className="auth-strength-value">{strength.label}</span>
            </div>
            <div className="auth-strength-bars">
              <div className={`auth-strength-bar ${strength.bars >= 1 ? 'weak' : ''}`} />
              <div className={`auth-strength-bar ${strength.bars >= 2 ? 'medium' : ''}`} />
              <div className={`auth-strength-bar ${strength.bars >= 3 ? 'strong' : ''}`} />
              <div className={`auth-strength-bar ${strength.bars >= 4 ? 'strong' : ''}`} />
            </div>
          </div>

          {/* Interactive Criteria Checklist */}
          <div className="auth-criteria-container">
            <span className="auth-criteria-title">Yêu cầu bảo mật:</span>
            <div className="auth-criteria-grid">
              <div className={`auth-criteria-item ${hasMinLength ? 'valid' : ''}`}>
                <span className="auth-criteria-icon">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Tối thiểu 8 ký tự</span>
              </div>

              <div className={`auth-criteria-item ${hasUpperCase ? 'valid' : ''}`}>
                <span className="auth-criteria-icon">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>1 chữ cái in hoa (A-Z)</span>
              </div>

              <div className={`auth-criteria-item ${hasNumberOrSpecial ? 'valid' : ''}`}>
                <span className="auth-criteria-icon">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Số hoặc ký tự đặc biệt</span>
              </div>

              <div className={`auth-criteria-item ${isMatched ? 'valid' : ''}`}>
                <span className="auth-criteria-icon">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span>Khớp mật khẩu xác nhận</span>
              </div>
            </div>
          </div>

          {/* Submit Reset Password Button */}
          <button
            type="submit"
            disabled={isLoading || !hasMinLength || !isMatched}
            className="auth-center-submit-btn"
          >
            {isLoading ? (
              <span>Đang lưu mật khẩu mới...</span>
            ) : (
              <>
                <span>Lưu mật khẩu mới &amp; Đăng nhập</span>
                <AppIcon name="arrow-right-white" size={16} />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="auth-center-footer">
          <div className="auth-center-register-prompt">
            Đã hoàn tất?
            <span
              onClick={onBackToLogin}
              className="auth-center-register-link"
            >
              Quay lại Đăng nhập
            </span>
          </div>

          <div className="auth-center-ssl-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Bảo mật chuẩn mã hóa 256-bit SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
