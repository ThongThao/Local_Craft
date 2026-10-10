import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  isLoading = false,
  fullWidth = false,
  className = '',
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: '#984628',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 6px 20px rgba(152, 70, 40, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        };
      case 'secondary':
        return {
          background: '#002720',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(0, 39, 32, 0.25)',
        };
      case 'glass':
        return {
          background: 'rgba(252, 249, 243, 0.12)',
          color: '#FCF9F3',
          border: '1px solid rgba(255, 219, 207, 0.35)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: '#002720',
          border: '1px solid #002720',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: '#414846',
          border: 'none',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 14px',
          fontSize: '12px',
          borderRadius: '8px',
        };
      case 'lg':
        return {
          padding: '16px 32px',
          fontSize: '15px',
          borderRadius: '12px',
        };
      case 'md':
      default:
        return {
          padding: '12px 24px',
          fontSize: '14px',
          borderRadius: '10px',
        };
    }
  };

  return (
    <button
      className={`app-btn app-btn-${variant} app-btn-${size} ${className}`}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 600,
        letterSpacing: '0.2px',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        userSelect: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled || isLoading) return;
        if (variant === 'primary') {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 28px rgba(152, 70, 40, 0.5)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = '#984628';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(152, 70, 40, 0.35)';
        } else if (variant === 'glass') {
          e.currentTarget.style.background = 'rgba(252, 249, 243, 0.22)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        } else if (variant === 'outline') {
          e.currentTarget.style.background = 'rgba(0, 39, 32, 0.05)';
        } else if (variant === 'ghost') {
          e.currentTarget.style.color = '#984628';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled || isLoading) return;
        e.currentTarget.style.transform = 'translateY(0)';
        Object.assign(e.currentTarget.style, getVariantStyles());
      }}
      onMouseDown={(e) => {
        if (disabled || isLoading) return;
        e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (disabled || isLoading) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spinSlow 0.8s linear infinite',
          }}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
