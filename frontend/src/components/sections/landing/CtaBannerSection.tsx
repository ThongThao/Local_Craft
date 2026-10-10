import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import Button from '@/components/ui/Button';
import CraftParticles from '@/components/ui/CraftParticles';

interface CtaBannerSectionProps {
  onJoinCommunity?: () => void;
  onArtisanPortal?: () => void;
}

export const CtaBannerSection: React.FC<CtaBannerSectionProps> = ({
  onJoinCommunity,
  onArtisanPortal,
}) => {
  return (
    <section className="cta-section">
      {/* Dynamic background gradient */}
      <div className="cta-bg-gradient" />

      {/* Floating 3D Ember Orb */}
      <div className="cta-ember-orb" />

      {/* Craft particles */}
      <CraftParticles count={24} colorScheme="terracotta" />

      {/* Content Container */}
      <div className="cta-container">
        {/* Badge */}
        <div className="cta-badge-pill">
          <span className="cta-badge-text">
            KHỞI ĐẦU HÀNH TRÌNH
          </span>
        </div>

        {/* Heading */}
        <h2 className="cta-heading">
          Bắt đầu hành trình chạm vào linh hồn nghề thủ công Việt.
        </h2>

        {/* Subtitle */}
        <p className="cta-subtitle">
          Gia nhập cộng đồng hơn 18.000 lữ khách và những người say mê văn hóa bản địa. Cùng gìn giữ, tôn vinh và tiếp nối giá trị di sản cho thế hệ tương lai.
        </p>

        {/* Buttons Row */}
        <div className="cta-buttons-row">
          <Button
            variant="primary"
            size="lg"
            onClick={onJoinCommunity}
          >
            Khám phá LocalCraft ngay
          </Button>

          <Button
            variant="glass"
            size="lg"
            onClick={onArtisanPortal}
          >
            Dành cho nghệ nhân &amp; làng nghề
          </Button>
        </div>

        {/* 3 Trust points */}
        <div className="cta-trust-row">
          <div className="cta-trust-item">
            <AppIcon name="shield" size={16} />
            <span className="cta-trust-text">
              Đặt chỗ an toàn 100%
            </span>
          </div>

          <div className="cta-trust-item">
            <AppIcon name="support" size={16} />
            <span className="cta-trust-text">
              Hỗ trợ đồng hành 24/7
            </span>
          </div>

          <div className="cta-trust-item">
            <AppIcon name="leaf" size={16} />
            <span className="cta-trust-text">
              Trích 5% doanh thu vào quỹ bảo tồn làng nghề
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBannerSection;
