import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import Button from '@/components/ui/Button';
import CraftParticles from '@/components/ui/CraftParticles';
import InteractiveCraft3D from '@/components/ui/InteractiveCraft3D';
import { HERO_DATA } from '@/data/landing';

interface HeroSectionProps {
  onExploreClick?: () => void;
  onWatchVideoClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onWatchVideoClick,
}) => {
  return (
    <section id="kham-pha" className="hero-section">
      {/* Background Image with multiply blend mode & atmospheric vignette */}
      <div
        className="hero-bg-layer"
        style={{ backgroundImage: `url(${HERO_DATA.heroBgImage})` }}
      />

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
            {/* Heritage Badge */}
            <div className="hero-badge-wrap">
              <div className="hero-badge-pill">
                <span className="hero-badge-dot" />
                <span className="hero-badge-text">{HERO_DATA.badge}</span>
              </div>
            </div>

            {/* Giant Heading with 3D text styling */}
            <h1 className="hero-heading">
              {HERO_DATA.titlePart1}{' '}
              <span className="hero-heading-italic">
                {HERO_DATA.titleHighlight}
              </span>
              <br />
              {HERO_DATA.titlePart2}
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

          {/* Right Column: 3D Interactive Craft Showcase */}
          <div className="hero-craft-showcase-wrapper">
            {/* Backdrop glow ring */}
            <div className="hero-craft-backdrop-glow" />

            <TiltCard maxTilt={5} glare={false} style={{ width: '100%', zIndex: 1 }}>
              <InteractiveCraft3D />
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
