import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import Button from '@/components/ui/Button';
import CraftParticles from '@/components/ui/CraftParticles';
import { HERO_DATA } from '@/data/landing';
import heroVideo from '@/assets/Videos/hero.mp4';

interface HeroSectionProps {
  onExploreClick?: () => void;
  onWatchVideoClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onWatchVideoClick,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const userManuallyMutedRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Default is sound ON
    video.muted = false;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay policy requires user gesture for sound:
        // temporarily mute to ensure video plays smoothly, then unmute on first user click!
        video.muted = true;
        setIsMuted(true);
        video.play();

        const handleFirstInteraction = () => {
          if (videoRef.current && !userManuallyMutedRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
          }
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
          window.removeEventListener('touchstart', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction, { once: true });
        window.addEventListener('keydown', handleFirstInteraction, { once: true });
        window.addEventListener('touchstart', handleFirstInteraction, { once: true });
      });
    }
  }, []);

  // Automatically mute audio when scrolling past the hero section
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      const video = videoRef.current;
      if (!section || !video) return;

      const rect = section.getBoundingClientRect();
      // Hero scrolled out of view: turn off sound immediately
      if (rect.bottom <= 100) {
        if (!video.muted) {
          video.muted = true;
          setIsMuted(true);
        }
      } else if (rect.bottom > 300 && !userManuallyMutedRef.current) {
        // Scrolled back into hero: restore sound if user didn't manually mute
        if (video.muted) {
          video.muted = false;
          setIsMuted(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      userManuallyMutedRef.current = nextMuted;
    }
  };

  return (
    <section ref={sectionRef} id="kham-pha" className="hero-section">
      {/* Cinematic Background Video Layer */}
      <div className="hero-video-wrap">
        <video
          ref={videoRef}
          className="hero-bg-video"
          src={heroVideo}
          autoPlay
          loop
          playsInline
          poster={HERO_DATA.heroBgImage}
        />
      </div>

      {/* Sound Toggle Button (Sound ON by default) */}
      <button
        type="button"
        className="hero-sound-toggle-btn"
        onClick={toggleSound}
        title={isMuted ? 'Bật âm thanh video' : 'Tắt âm thanh video'}
        aria-label={isMuted ? 'Bật âm thanh video' : 'Tắt âm thanh video'}
      >
        <div className="hero-sound-icon-wrap">
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </div>
        <span className="hero-sound-label">
          {isMuted ? 'Bật âm thanh' : 'Âm thanh: Bật'}
        </span>
        {!isMuted && (
          <div className="hero-sound-waves">
            <span className="sound-wave wave-1" />
            <span className="sound-wave wave-2" />
            <span className="sound-wave wave-3" />
          </div>
        )}
      </button>

      {/* Multi-layer emerald & shadow gradients */}
      <div className="hero-emerald-radial" />
      <div className="hero-emerald-linear" />

      {/* Floating 3D craft particles */}
      <CraftParticles count={32} colorScheme="gold" />

      {/* Hero Ambient Glow Orb */}
      <div className="hero-ambient-glow" />

      {/* Bottom fade transition to warm parchment background */}
      <div className="hero-bottom-fade" />

      {/* Main Container */}
      <div className="hero-container">
        <div className="hero-grid">
          {/* Left Column: Headline, subhead, actions, stats */}
          <div className="hero-content-col">
            {/* Giant Heading with 3D text styling */}
            <h1 className="hero-heading">
              <span className="hero-heading-playball">{HERO_DATA.titlePart1}</span>{' '}
              <span className="hero-heading-highlight">
                {HERO_DATA.titleHighlight}
              </span>
              <br />
              <span className="hero-heading-playball">{HERO_DATA.titlePart2}</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">{HERO_DATA.subtitle}</p>

            {/* Action Buttons */}
            <div className="hero-actions-row">
              <Button
                variant="primary"
                size="lg"
                onClick={onExploreClick}
                icon={<AppIcon name="arrow-right-white" size={13} />}
                iconPosition="right"
              >
                Khám phá làng nghề
              </Button>

              <Button
                variant="glass"
                size="lg"
                onClick={onWatchVideoClick}
                icon={
                  <div className="hero-play-icon-box">
                    <AppIcon name="play" size={13} />
                  </div>
                }
                iconPosition="left"
              >
                Xem trải nghiệm thực tế
              </Button>
            </div>

            {/* Heritage Villages Ticker Badge */}
            <div className="hero-ticker-row">
              <AppIcon name="compass" size={16} />
              <span className="hero-ticker-text">{HERO_DATA.ticker}</span>
            </div>

            {/* 3D Glassmorphism Stat Cards Bento Row */}
            <div className="hero-stats-row">
              {HERO_DATA.stats.map((stat, i) => (
                <TiltCard
                  key={i}
                  maxTilt={6}
                  glare={true}
                  className="hero-stat-card"
                >
                  <div className={`hero-stat-icon-box ${stat.bgTone === 'peach' ? 'peach' : 'sage'}`}>
                    <AppIcon name={stat.iconType as any} size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="hero-stat-value">{stat.value}</span>
                    <span className="hero-stat-label">{stat.label}</span>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
