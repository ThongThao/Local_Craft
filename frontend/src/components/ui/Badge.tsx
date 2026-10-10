import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  tone?: 'terracotta' | 'forest' | 'sage' | 'parchment' | 'gold' | 'glass';
  size?: 'sm' | 'md';
  pulseDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'parchment',
  size = 'sm',
  pulseDot = false,
  className = '',
  style,
}) => {
  const getToneStyle = (): React.CSSProperties => {
    switch (tone) {
      case 'terracotta':
        return {
          background: '#984628',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(152, 70, 40, 0.25)',
        };
      case 'forest':
        return {
          background: '#002720',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 39, 32, 0.25)',
        };
      case 'sage':
        return {
          background: '#C2EBDF',
          color: '#002720',
          fontWeight: 600,
        };
      case 'gold':
        return {
          background: 'rgba(255, 219, 207, 0.25)',
          color: '#FFDBCF',
          border: '1px solid rgba(255, 219, 207, 0.3)',
        };
      case 'glass':
        return {
          background: 'rgba(252, 249, 243, 0.15)',
          color: '#FCF9F3',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(252, 249, 243, 0.2)',
        };
      case 'parchment':
      default:
        return {
          background: '#F0EEE8',
          color: '#1C1C18',
        };
    }
  };

  return (
    <span
      className={`app-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '4px 10px' : '6px 14px',
        borderRadius: '9999px',
        fontSize: size === 'sm' ? '11px' : '13px',
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 600,
        letterSpacing: '0.4px',
        lineHeight: 1.2,
        transition: 'all 0.2s ease',
        ...getToneStyle(),
        ...style,
      }}
    >
      {pulseDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: tone === 'terracotta' ? '#FFDBCF' : '#984628',
            display: 'inline-block',
            animation: 'pulseGlow 2s infinite',
          }}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
