import React from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import Button from '@/components/ui/Button';
import { WORKSHOPS_DATA } from '@/data/landing';
import { WorkshopItem } from '@/types/landing';

interface WorkshopsSectionProps {
  onBookWorkshop?: (workshop: WorkshopItem) => void;
}

export const WorkshopsSection: React.FC<WorkshopsSectionProps> = ({
  onBookWorkshop,
}) => {
  return (
    <section id="trai-nghiem" className="workshops-section">
      <div className="workshops-container">
        {/* Section Header */}
        <div className="workshops-header">
          <span className="workshops-eyebrow">CHƯƠNG TRÌNH TRẢI NGHIỆM</span>
          <h2 className="workshops-title">
            Không chỉ ngắm nhìn. Hãy tự tay tạo nên.
          </h2>
          <p className="workshops-desc">
            Ngồi cùng các bậc thầy nghệ nhân, cảm nhận nhịp thở đất nung, nghe tiếng thoi đưa và mang về tác phẩm do chính tay bạn làm ra.
          </p>
        </div>

        {/* 2x2 Grid of Horizontal Workshop Experience Cards */}
        <div className="workshops-grid">
          {WORKSHOPS_DATA.map((workshop) => (
            <TiltCard
              key={workshop.id}
              maxTilt={4}
              glare={true}
              className="workshop-card"
            >
              {/* Left Photo Column */}
              <div className="workshop-thumb-col">
                <img
                  src={workshop.image}
                  alt={workshop.title}
                  className="workshop-thumb-img"
                />

                {/* Tag badge */}
                <div
                  className="workshop-tag-badge"
                  style={{
                    background: workshop.tagColor,
                    color: workshop.tagColor === '#DCDAD4' ? '#1C1C18' : '#FCF9F3',
                  }}
                >
                  {workshop.tag}
                </div>
              </div>

              {/* Right Content Column */}
              <div className="workshop-content-col">
                <div className="workshop-content-top">
                  {/* Location & Duration with Icons */}
                  <div className="workshop-meta-row">
                    <AppIcon name="pin" size={13} />
                    <span>{workshop.location}</span>
                    <span className="workshop-meta-dot">•</span>
                    <AppIcon name="clock" size={13} />
                    <span>{workshop.duration}</span>
                  </div>

                  {/* Title */}
                  <h3 className="workshop-title">
                    {workshop.title}
                  </h3>

                  {/* Description */}
                  <p className="workshop-desc">
                    {workshop.description}
                  </p>
                </div>

                {/* Price & Book Button */}
                <div className="workshop-footer-row">
                  <div>
                    <div className="workshop-price-label">
                      Giá mỗi khách
                    </div>
                    <div className="workshop-price-val">
                      {workshop.formattedPrice}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onBookWorkshop?.(workshop)}
                  >
                    Đặt chỗ ngay
                  </Button>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkshopsSection;
