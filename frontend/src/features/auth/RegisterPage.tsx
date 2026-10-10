import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import CraftParticles from '@/components/ui/CraftParticles';
import bannerImage from '@/assets/Images/Banner.jpg';
import { authApi } from '@/services/api';

interface RegisterPageProps {
  onBackToHome?: () => void;
  onSwitchToLogin?: () => void;
  onRegisterSuccess?: (data: {
    email: string;
    fullName: string;
    phone: string;
    gender: string;
  }) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onBackToHome,
  onSwitchToLogin,
  onRegisterSuccess,
}) => {
  // Step 1: 'register' | Step 2: 'verify-otp'
  const [step, setStep] = useState<'register' | 'verify-otp'>('register');

  // Form fields
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gender, setGender] = useState<string>('MALE'); // 'MALE' | 'FEMALE' | 'OTHER'
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);

  // OTP Verification state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<boolean>(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer: any;
    if (step === 'verify-otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step === 'verify-otp') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Calculate password strength indicator
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Chưa nhập', bars: 0 };
    if (pwd.length < 6) return { score: 1, label: 'Yếu (1/4)', bars: 1 };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    if (pwd.length >= 10 && hasUpper && hasNum && hasSpecial) {
      return { score: 4, label: 'Rất an toàn (4/4)', bars: 4 };
    }
    if (pwd.length >= 8 && ((hasUpper && hasNum) || (hasUpper && hasSpecial))) {
      return { score: 3, label: 'Khá an toàn (3/4)', bars: 3 };
    }
    return { score: 2, label: 'Trung bình (2/4)', bars: 2 };
  };

  const strength = calculateStrength(password);

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !gender || !password) {
      showNotification('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (!agreeTerms) {
      showNotification('Vui lòng đồng ý với Điều khoản & Chính sách LocalCraft.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim(),
        gender: gender as any,
      });

      setIsLoading(false);
      showNotification(`Mã OTP đã được gửi tới ${email}. Vui lòng nhập mã để kích hoạt!`);
      setStep('verify-otp');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    }
  };

  const handleGoogleRegister = () => {
    showNotification('Tính năng đăng ký liên kết Google đang được kết nối.');
  };

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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      await authApi.resendVerificationOtp(email.trim());
      setIsLoading(false);
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
      showNotification('Mã OTP mới đã được gửi lại vào email của bạn!');
    } catch (err: any) {
      setIsLoading(false);
      showNotification(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length < 6) {
      setOtpError(true);
      showNotification('Vui lòng nhập đầy đủ mã 6 số OTP.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyEmail({
        email: email.trim(),
        otp: enteredCode,
      });

      setIsLoading(false);
      showNotification('Xác thực tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        onRegisterSuccess?.({ email, fullName, phone, gender });
        onSwitchToLogin?.();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setOtpError(true);
      showNotification(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
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

      {/* Background Layers */}
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
          type="button"
          onClick={onBackToHome}
          className="auth-btn-back-floating"
          aria-label="Quay lại trang chủ"
        >
          <AppIcon name="arrow-right-sm" size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Trang chủ</span>
        </button>
      </div>

      {/* Central Glass Card */}
      <div className="auth-card-container register-card">
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
              {step === 'register' ? 'Gia Nhập Cộng Đồng Di Sản (S02)' : 'Xác Thực Tài Khoản (OTP)'}
            </span>
          </div>

          <h1 className="auth-card-title">
            {step === 'register' ? 'Đăng ký tài khoản mới' : 'Xác thực tài khoản qua OTP'}
          </h1>

          <p className="auth-card-subtitle">
            {step === 'register' ? (
              'Tham gia hành trình khám phá và lưu giữ di sản thủ công Việt'
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

        {step === 'register' && (
          <>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
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
              <span>Tiếp tục nhanh với Google</span>
            </button>

            {/* Divider */}
            <div className="auth-divider-center-row">
              <div className="auth-divider-center-line" />
              <span className="auth-divider-center-text">HOẶC ĐIỀN THÔNG TIN</span>
              <div className="auth-divider-center-line" />
            </div>
          </>
        )}

        {step === 'register' ? (
          /* ---------------- STEP 1: REGISTRATION FORM ---------------- */
          <form onSubmit={handleSubmitRegister} className="auth-center-form">
            {/* Row 1: full_name & phone */}
            <div className="auth-two-col-row">
              {/* Full Name */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-name" className="auth-center-label">
                    Họ và tên <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>

                  <input
                    id="auth-register-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên..."
                    className="auth-center-input"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-phone" className="auth-center-label">
                    Số điện thoại <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>

                  <input
                    id="auth-register-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912 345 678"
                    className="auth-center-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: email & gender */}
            <div className="auth-two-col-row">
              {/* Email */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-email" className="auth-center-label">
                    Địa chỉ Email <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>

                  <input
                    id="auth-register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="auth-center-input"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-gender" className="auth-center-label">
                    Giới tính <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                  </div>

                  <select
                    id="auth-register-gender"
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="auth-center-select"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 3: password & confirmPassword */}
            <div className="auth-two-col-row">
              {/* Password */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-pwd" className="auth-center-label">
                    Mật khẩu <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  <input
                    id="auth-register-pwd"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự..."
                    className="auth-center-input"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-center-pw-toggle"
                    aria-label="Ẩn hiện mật khẩu"
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="auth-center-field-group">
                <div className="auth-center-label-row">
                  <label htmlFor="auth-register-confirm" className="auth-center-label">
                    Xác nhận mật khẩu <span className="auth-center-label-req">*</span>
                  </label>
                </div>

                <div className="auth-center-input-wrap">
                  <div className="auth-center-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>

                  <input
                    id="auth-register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="auth-center-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Password Strength Bar & Terms Agreement */}
            <div className="auth-register-extra-row">
              <div className="auth-strength-container">
                <div className="auth-strength-header">
                  <span className="auth-strength-label">Độ bảo mật:</span>
                  <span className="auth-strength-value">{strength.label}</span>
                </div>
                <div className="auth-strength-bars">
                  <div className={`auth-strength-bar ${strength.bars >= 1 ? 'weak' : ''}`} />
                  <div className={`auth-strength-bar ${strength.bars >= 2 ? 'medium' : ''}`} />
                  <div className={`auth-strength-bar ${strength.bars >= 3 ? 'strong' : ''}`} />
                  <div className={`auth-strength-bar ${strength.bars >= 4 ? 'strong' : ''}`} />
                </div>
              </div>

              <div
                onClick={() => setAgreeTerms(!agreeTerms)}
                className="auth-center-remember-row"
              >
                <div className={`auth-center-checkbox ${agreeTerms ? 'checked' : ''}`}>
                  {agreeTerms && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="auth-center-remember-label" style={{ fontSize: '12px' }}>
                  Đồng ý với{' '}
                  <span
                    className="auth-center-terms-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      showNotification('Điều khoản dịch vụ LocalCraft');
                    }}
                  >
                    Điều khoản
                  </span>{' '}
                  &amp;{' '}
                  <span
                    className="auth-center-terms-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      showNotification('Chính sách bảo mật LocalCraft');
                    }}
                  >
                    Chính sách
                  </span>
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="auth-center-submit-btn"
            >
              {isLoading ? (
                <span>Đang xử lý đăng ký...</span>
              ) : (
                <>
                  <span>Đăng ký tài khoản LocalCraft</span>
                  <AppIcon name="arrow-right-white" size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ---------------- STEP 2: OTP VERIFICATION FORM ---------------- */
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
                <span>Đang kích hoạt tài khoản...</span>
              ) : (
                <>
                  <span>Xác thực &amp; Hoàn tất đăng ký</span>
                  <AppIcon name="arrow-right-white" size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('register')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-peach)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                marginTop: '12px',
                textAlign: 'center',
                width: '100%',
              }}
            >
              ← Quay lại chỉnh sửa thông tin đăng ký
            </button>
          </form>
        )}

        {/* Card Footer */}
        <div className="auth-center-footer">
          <div className="auth-center-register-prompt">
            Đã có tài khoản?
            <span
              onClick={onSwitchToLogin}
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
            <span>Bảo mật dữ liệu chuẩn 256-bit SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
