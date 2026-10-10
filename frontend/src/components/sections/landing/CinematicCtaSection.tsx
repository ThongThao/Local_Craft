import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import Button from '@/components/ui/Button';
import CraftParticles from '@/components/ui/CraftParticles';

interface CinematicCtaSectionProps {
  onExploreClick?: () => void;
  onJoinArtisanClick?: () => void;
}

export const CinematicCtaSection: React.FC<CinematicCtaSectionProps> = ({
  onExploreClick,
  onJoinArtisanClick,
}) => {
  return (
    <section className="cinematic-cta-section">
      <CraftParticles count={24} colorScheme="gold" />

      <div className="cinematic-cta-container">
        <div className="story-badge-pill" style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#FFDBCF', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
          <span className="story-badge-dot" style={{ background: '#FFDBCF' }} />
          <span>Hành Trình Tiếp Nối Di Sản</span>
        </div>

        <h2 className="cinematic-cta-title">
          Chạm Vào Tinh Hoa Đất Việt <br />
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#FFDBCF' }}>
            Ngay Hôm Nay
          </span>
        </h2>

        <p className="cinematic-cta-desc">
          Mỗi bước chân của bạn không chỉ là một chuyến du lịch, mà là một sự tiếp nối thiêng liêng 
          để những ngọn lửa lò gốm, khung cửi tơ lụa và tiếng đục đá truyền đời mãi ngân vang.
        </p>

        <div className="cinematic-cta-buttons">
          <Button
            variant="secondary"
            size="lg"
            onClick={onExploreClick}
            icon={<AppIcon name="arrow-right-white" size={14} />}
            iconPosition="right"
          >
            Bắt đầu khám phá
          </Button>

          <Button
            variant="glass"
            size="lg"
            onClick={onJoinArtisanClick}
            icon={<AppIcon name="pottery" size={16} />}
            iconPosition="left"
          >
            Dành cho Nghệ nhân & Làng nghề
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CinematicCtaSection;
