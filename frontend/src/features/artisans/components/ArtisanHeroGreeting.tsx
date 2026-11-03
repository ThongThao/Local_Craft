import React, { useRef } from 'react';
import heroVideo from '@/assets/Videos/hero.mp4';

interface ArtisanHeroGreetingProps {
  onOpenAddProduct?: () => void;
  onOpenAddWorkshop?: () => void;
  onExportReport?: () => void;
}

export const ArtisanHeroGreeting: React.FC<ArtisanHeroGreetingProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="artisan-v2-hero-card">
      {/* Cinematic Background Video Layer */}
      <div className="artisan-v2-hero-video-wrap">
        <video
          ref={videoRef}
          className="artisan-v2-hero-bg-video"
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Emerald Heritage Overlay Gradients */}
        <div className="artisan-v2-hero-video-overlay" />
      </div>

      {/* Main Heritage Text with Landing Page Typography */}
      <div
        className="artisan-v2-hero-details"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 3,
          padding: '0 24px',
          gap: '8px',
        }}
      >
        <h1
          style={{
            margin: 0,
            lineHeight: 1.25,
            fontSize: 'clamp(28px, 3.2vw, 44px)',
            textShadow: '0 2px 18px rgba(0, 0, 0, 0.85), 0 4px 30px rgba(0, 39, 32, 0.95)',
          }}
        >
          <span className="hero-heading-highlight">
            Tinh hoa
          </span>{' '}
          <span className="hero-heading-playball">
            di sản làng nghề thủ công Việt Nam
          </span>
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '13.5px',
            color: 'rgba(255, 235, 225, 0.92)',
            fontFamily: "var(--font-ui, 'Manrope', sans-serif)",
            fontWeight: 500,
            letterSpacing: '0.2px',
            textShadow: '0 1px 8px rgba(0, 0, 0, 0.8)',
          }}
        >
          Quản lý toàn diện hoạt động sản phẩm, workshop và đơn hàng của làng nghề.
        </p>
      </div>
    </div>
  );
};

export default ArtisanHeroGreeting;
