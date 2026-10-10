import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import CraftParticles from '@/components/ui/CraftParticles';
import bannerImage from '@/assets/Images/Banner.jpg';

import { authApi } from '@/services/api';

interface ForgotPasswordPageProps {
  onBackToLogin?: () => void;
  onBackToHome?: () => void;
  onOtpVerified?: (email: string, otpCode: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onBackToLogin,
  onBackToHome,
  onOtpVerified,
}) => {
  // Step 1: 'email' | Step 2: 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<boolean>(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Handle Step 1 submit: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showNotification('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setIsLoading(false);
      setStep('otp');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      showNotification(`Mã xác thực OTP đã được gửi tới ${email}. Vui lòng kiểm tra hộp thư!`);
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
    }
  };

  // Handle OTP individual cell change
  const handleOtpChange = (index: number, val: string) => {
    setOtpError(false);
    const cleaned = val.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(index + digits.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation between OTP boxes
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      await authApi.resendResetOtp(email.trim());
      setIsLoading(false);
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
      showNotification('Mã OTP mới đã được gửi lại vào email của bạn!');
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
    }
  };

  // Handle Step 2 submit: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length < 6) {
      setOtpError(true);
      showNotification('Vui lòng nhập đầy đủ mã 6 số OTP.');
      return;
    }

    showNotification('Xác thực OTP thành công! Chuyển sang đặt lại mật khẩu...');
    setTimeout(() => {
      onOtpVerified?.(email.trim(), enteredCode);
    }, 500);
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
        <button
          onClick={step === 'otp' ? () => setStep('email') : (onBackToLogin || onBackToHome)}
          className="auth-btn-back-floating"
        >
          <AppIcon name="arrow-right-sm" size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>{step === 'otp' ? 'Đổi email khác' : 'Đăng nhập'}</span>
        </button>
      </div>

      {/* ---------------- CENTERED LUXURY GLASS CARD (S04) ---------------- */}
      <div className="auth-card-container">
        {/* Step Progression Indicators */}
        <div className="auth-step-indicators">
          <div className={`auth-step-dot ${step === 'email' ? 'active' : 'completed'}`} />
          <div className={`auth-step-dot ${step === 'otp' ? 'active' : ''}`} />
          <div className="auth-step-dot" />
        </div>

        {/* Card Header */}
        <div className="auth-card-header">
          <div
            onClick={onBackToHome}
            className="auth-card-brand-emblem"
            title="Về trang chủ LocalCraft"
          >
            {step === 'email' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--color-peach)">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--color-peach)">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            )}
          </div>

          <div className="auth-card-badge">
            <span className="auth-card-badge-dot" />
            <span className="auth-card-badge-text">
              {step === 'email' ? 'Khôi Phục Mật Khẩu (S04)' : 'Xác Thực Bảo Mật (OTP)'}
            </span>
          </div>

          <h1 className="auth-card-title">
            {step === 'email' ? 'Quên mật khẩu?' : 'Nhập mã xác thực OTP'}
          </h1>

          <p className="auth-card-subtitle">
            {step === 'email' ? (
              <>
                Nhập email tài khoản của bạn để nhận <strong>mã OTP bảo mật 6 số</strong> khôi phục quyền truy cập.
              </>
            ) : (
              <>
                Mã xác thực 6 chữ số đã được gửi tới:
                <br />
                <span className="auth-email-sent-badge">
                  <span>✉️</span>
                  <strong>{email}</strong>
                </span>
              </>
            )}
          </p>
        </div>

        {/* ---------------- STEP 1: EMAIL INPUT FORM ---------------- */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="auth-center-form">
            <div className="auth-center-field-group">
              <div className="auth-center-label-row">
                <label htmlFor="auth-forgot-email" className="auth-center-label">
                  Địa chỉ Email tài khoản <span className="auth-center-label-req">*</span>
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
                  id="auth-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của bạn..."
                  className="auth-center-input"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="auth-center-submit-btn"
            >
              {isLoading ? (
                <span>Đang gửi mã xác thực...</span>
              ) : (
                <>
                  <span>Gửi mã xác thực OTP</span>
                  <AppIcon name="arrow-right-white" size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ---------------- STEP 2: 6-DIGIT OTP FORM ---------------- */
          <form onSubmit={handleVerifyOtp} className="auth-center-form">
            <div className="auth-center-field-group" style={{ alignItems: 'center' }}>
              <div className="auth-center-label-row" style={{ width: '100%', justifyContent: 'center' }}>
                <label className="auth-center-label">
                  Nhập mã 6 chữ số OTP
                </label>
              </div>

              {/* 6 Square Inputs */}
              <div className="auth-otp-grid">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`auth-otp-cell ${digit ? 'filled' : ''} ${otpError ? 'has-error' : ''}`}
                  />
                ))}
              </div>

              {/* Countdown & Resend Option */}
              <div className="auth-otp-resend-row">
                <div className="auth-otp-timer-wrap">
                  <span>Mã hết hạn sau:</span>
                  <span className="auth-otp-timer-badge">
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}s
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!canResend || isLoading}
                  onClick={handleResendOtp}
                  className="auth-otp-resend-btn"
                >
                  {isLoading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                </button>
              </div>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              disabled={isLoading || otp.join('').length < 6}
              className="auth-center-submit-btn"
            >
              {isLoading ? (
                <span>Đang xác minh OTP...</span>
              ) : (
                <>
                  <span>Xác thực &amp; Tiếp tục</span>
                  <AppIcon name="arrow-right-white" size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Card Footer */}
        <div className="auth-center-footer">
          <div className="auth-center-register-prompt">
            Đã nhớ mật khẩu?
            <span
              onClick={onBackToLogin}
              className="auth-center-register-link"
            >
              Đăng nhập ngay
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

export default ForgotPasswordPage;
