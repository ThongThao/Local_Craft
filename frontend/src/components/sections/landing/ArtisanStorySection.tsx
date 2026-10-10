import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import { ARTISAN_MASTER_DATA } from '@/data/landing';

interface ArtisanStorySectionProps {
  onReadFullStory?: () => void;
}

export const ArtisanStorySection: React.FC<ArtisanStorySectionProps> = ({
  onReadFullStory,
}) => {
  const artisan = ARTISAN_MASTER_DATA;

  return (
    <section id="ky-su" className="artisan-story-section">
      <div className="artisan-story-container">
        <div className="artisan-story-grid">
          {/* Left Column: Quote & Biography */}
          <div className="artisan-info-col">
            {/* Category tag */}
            <span className="artisan-eyebrow">
              KÝ SỰ CHÂN DUNG
            </span>

            {/* Master Artisan Quote */}
            <blockquote className="artisan-quote">
              {artisan.quote}
            </blockquote>

            {/* Biography paragraphs */}
            <div className="artisan-story-paragraphs">
              <p className="artisan-story-p">{artisan.storyParagraph1}</p>
              <p className="artisan-story-p">{artisan.storyParagraph2}</p>
            </div>

            {/* Metrics */}
            <div className="artisan-metrics-row">
              {artisan.metrics.map((m, i) => (
                <React.Fragment key={i}>
                  <div className="artisan-metric-item">
                    <span className="artisan-metric-num">{m.value}</span>
                    <span className="artisan-metric-label">{m.label}</span>
                  </div>
                  {i < artisan.metrics.length - 1 && (
                    <div className="artisan-metric-divider" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Read full story action */}
            <div>
              <button onClick={onReadFullStory} className="artisan-read-more-btn">
                <span>Đọc toàn bộ ký sự Bác Trần Văn Độ</span>
                <AppIcon name="arrow-right" size={15} />
              </button>
            </div>
          </div>

          {/* Right Column: 3D Photo Frame with Medals & Floating Badges */}
          <div className="artisan-photo-wrapper">
            {/* Floating Top Medal Badge */}
            <div className="artisan-medal-floating-badge">
              <div className="artisan-medal-icon-box">
                <AppIcon name="medal" size={22} />
              </div>
              <div className="artisan-medal-texts">
                <span className="artisan-medal-title">
                  {artisan.honorTitle}
                </span>
                <span className="artisan-medal-desc">
                  {artisan.medal}
                </span>
              </div>
            </div>

            {/* 3D Tilt Artisan Portrait */}
            <TiltCard
              maxTilt={5}
              glare={true}
              className="artisan-portrait-card"
            >
              <img
                src={artisan.image}
                alt={artisan.name}
                className="artisan-portrait-img"
              />

              {/* Gradient overlay */}
              <div className="artisan-portrait-overlay" />

              {/* Floating Bottom Card */}
              <div className="artisan-portrait-footer">
                <div className="artisan-footer-info">
                  <span className="artisan-footer-name">
                    {artisan.name}
                  </span>
                  <span className="artisan-footer-role">
                    {artisan.title}
                  </span>
                </div>

                <div className="artisan-footer-badge">
                  {artisan.experienceYears} năm làm nghề
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtisanStorySection;
