import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import { VILLAGES_DATA } from '@/data/landing';
import { VillageItem } from '@/types/landing';

interface HeritageVillagesSectionProps {
  onSelectVillage?: (village: VillageItem) => void;
  onViewAll?: () => void;
}

export const HeritageVillagesSection: React.FC<HeritageVillagesSectionProps> = ({
  onSelectVillage,
  onViewAll,
}) => {
  return (
    <section id="lang-nghe" className="villages-section">
      <div className="villages-container">
        {/* Section Header */}
        <div className="villages-header">
          <div className="villages-header-texts">
            <span className="villages-eyebrow">BẢN ĐỒ DI SẢN</span>
            <h2 className="villages-title">Những miền đất di sản đang vẫy gọi</h2>
            <p className="villages-description">
              Lần theo dòng chảy thời gian, tìm về những cội nguồn tạo tác với lịch sử hàng trăm năm giữ lửa tinh hoa.
            </p>
          </div>

          {/* Right Action */}
          <button onClick={onViewAll} className="villages-view-all-btn">
            <span>Xem tất cả 120+ làng nghề</span>
            <AppIcon name="arrow-right" size={14} />
          </button>
        </div>

        {/* 3D Bento Grid: 2 rows */}
        <div className="villages-bento-grid">
          {/* Card 1: Bát Tràng (Featured Hero Bento - 7 cols) */}
          {VILLAGES_DATA[0] && (
            <div className="bento-col-7">
              <TiltCard
                maxTilt={6}
                glare={true}
                onClick={() => onSelectVillage?.(VILLAGES_DATA[0])}
                className="bento-card-tall"
              >
                {/* Background image */}
                <div
                  className="bento-bg-zoom"
                  style={{ backgroundImage: `url(${VILLAGES_DATA[0].image})` }}
                />
                <div className="bento-overlay" />

                {/* Content */}
                <div className="bento-card-content">
                  <div className="bento-badges-row">
                    <span className="bento-badge-tag clay">
                      {VILLAGES_DATA[0].period}
                    </span>
                    <span className="bento-badge-loc">
                      {VILLAGES_DATA[0].location}
                    </span>
                  </div>

                  <h3 className="bento-card-title-lg">
                    {VILLAGES_DATA[0].name}
                  </h3>

                  <p className="bento-card-desc">
                    {VILLAGES_DATA[0].description}
                  </p>

                  <div className="bento-metrics-row">
                    <div className="bento-metric-item">
                      <AppIcon name="pottery" size={16} />
                      <span>{VILLAGES_DATA[0].metrics[0]?.label}</span>
                    </div>
                    <div className="bento-metric-item">
                      <AppIcon name="clock-bento" size={16} />
                      <span>{VILLAGES_DATA[0].metrics[1]?.label}</span>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </div>
          )}

          {/* Card 2: Thủy Xuân (5 cols) */}
          {VILLAGES_DATA[1] && (
            <div className="bento-col-5">
              <TiltCard
                maxTilt={6}
                glare={true}
                onClick={() => onSelectVillage?.(VILLAGES_DATA[1])}
                className="bento-card-tall"
              >
                <div
                  className="bento-bg-zoom"
                  style={{ backgroundImage: `url(${VILLAGES_DATA[1].image})` }}
                />
                <div className="bento-overlay" />

                <div className="bento-card-content">
                  <div className="bento-badges-row">
                    <span className="bento-badge-tag sage">
                      {VILLAGES_DATA[1].categoryBadge?.text}
                    </span>
                    <span className="bento-badge-loc">
                      {VILLAGES_DATA[1].location}
                    </span>
                  </div>

                  <h3 className="bento-card-title-lg">
                    {VILLAGES_DATA[1].name}
                  </h3>

                  <p className="bento-card-desc">
                    {VILLAGES_DATA[1].description}
                  </p>

                  <div className="bento-metrics-row">
                    <div className="bento-metric-item">
                      <AppIcon name="clock-bento" size={16} />
                      <span>{VILLAGES_DATA[1].metrics[0]?.label}</span>
                    </div>
                    <div className="bento-metric-item">
                      <AppIcon name="palette" size={16} />
                      <span>{VILLAGES_DATA[1].metrics[1]?.label}</span>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </div>
          )}

          {/* Card 3: Làng Lụa Vạn Phúc (6 cols) */}
          {VILLAGES_DATA[2] && (
            <div className="bento-col-6">
              <TiltCard
                maxTilt={6}
                glare={true}
                onClick={() => onSelectVillage?.(VILLAGES_DATA[2])}
                className="bento-card-standard"
              >
                <div
                  className="bento-bg-zoom"
                  style={{ backgroundImage: `url(${VILLAGES_DATA[2].image})` }}
                />
                <div className="bento-overlay" />

                <div className="bento-card-content">
                  <div className="bento-badges-row">
                    <span className="bento-badge-tag forest-light">
                      {VILLAGES_DATA[2].categoryBadge?.text}
                    </span>
                    <span className="bento-badge-loc">
                      {VILLAGES_DATA[2].location}
                    </span>
                  </div>

                  <h3 className="bento-card-title-md">
                    {VILLAGES_DATA[2].name}
                  </h3>

                  <p className="bento-card-desc">
                    {VILLAGES_DATA[2].description}
                  </p>
                </div>
              </TiltCard>
            </div>
          )}

          {/* Card 4: Làng Đá Non Nước (6 cols) */}
          {VILLAGES_DATA[3] && (
            <div className="bento-col-6">
              <TiltCard
                maxTilt={6}
                glare={true}
                onClick={() => onSelectVillage?.(VILLAGES_DATA[3])}
                className="bento-card-standard"
              >
                <div
                  className="bento-bg-zoom"
                  style={{ backgroundImage: `url(${VILLAGES_DATA[3].image})` }}
                />
                <div className="bento-overlay" />

                <div className="bento-card-content">
                  <div className="bento-badges-row">
                    <span className="bento-badge-tag olive">
                      {VILLAGES_DATA[3].categoryBadge?.text}
                    </span>
                    <span className="bento-badge-loc">
                      {VILLAGES_DATA[3].location}
                    </span>
                  </div>

                  <h3 className="bento-card-title-md">
                    {VILLAGES_DATA[3].name}
                  </h3>

                  <p className="bento-card-desc">
                    {VILLAGES_DATA[3].description}
                  </p>
                </div>
              </TiltCard>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeritageVillagesSection;
