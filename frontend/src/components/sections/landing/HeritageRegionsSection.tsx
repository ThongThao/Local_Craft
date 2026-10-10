import React, { useState } from 'react';
import TiltCard from '@/components/ui/TiltCard';

interface RegionData {
  id: 'bac' | 'trung' | 'nam';
  name: string;
  tagline: string;
  description: string;
  image: string;
  villagesCount: string;
  craftTypes: string;
  masterArtisans: string;
  pins: Array<{
    name: string;
    craft: string;
    top: string;
    left: string;
  }>;
}

const REGIONS: Record<'bac' | 'trung' | 'nam', RegionData> = {
  bac: {
    id: 'bac',
    name: 'Bắc Bộ',
    tagline: 'Sông Hồng Ngàn Năm — Đất Nung & Tơ Lụa Cổ',
    description:
      'Cái nôi văn minh lúa nước và tinh hoa bách nghệ Đại Việt. Nơi dòng men rạn Bát Tràng thăng hoa qua 7 thế kỷ và dải lụa Vạn Phúc mềm mại như mây ngàn dệt nên hồn cốt Thăng Long.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    villagesCount: '48+ Làng Nghề Cổ',
    craftTypes: 'Gốm Sứ · Tơ Lụa · Đồng Đúc',
    masterArtisans: '18 Nghệ Nhân Ưu Tú',
    pins: [
      { name: 'Gốm Bát Tràng', craft: 'Men Rạn Cổ', top: '35%', left: '28%' },
      { name: 'Lụa Vạn Phúc', craft: 'Tơ Tằm Vân Thêu', top: '60%', left: '62%' },
    ],
  },
  trung: {
    id: 'trung',
    name: 'Trung Bộ',
    tagline: 'Miền Cố Đô Trầm Mặc — Sắc Hương & Điêu Khắc',
    description:
      'Nơi giao thoa giữa nghệ thuật cung đình Huế tôn nghiêm và bàn tay tạc đá Ngũ Hành Sơn huyền bí. Hương trầm ngát thơm dưới chân lăng tẩm và phiến đá cẩm thạch hóa thành tác phẩm vĩnh cửu.',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80',
    villagesCount: '36+ Làng Nghề Cổ',
    craftTypes: 'Trầm Hương · Khắc Đá · Nón Bài Thơ',
    masterArtisans: '14 Nghệ Nhân Ưu Tú',
    pins: [
      { name: 'Hương Thủy Xuân', craft: 'Trầm Trầm Cung Đình', top: '40%', left: '42%' },
      { name: 'Đá Non Nước', craft: 'Điêu Khắc Cẩm Thạch', top: '65%', left: '70%' },
    ],
  },
  nam: {
    id: 'nam',
    name: 'Nam Bộ',
    tagline: 'Phù Sa Mở Cõi — Sơn Mài Vàng Son & Đan Lát',
    description:
      'Hơi thở phóng khoáng của đất phương Nam in dấu trên từng lớp sơn ta truyền thống Tương Bình Hiệp và nhịp dệt chiếu Định Yên rộn rã bên sông Hậu. Nét mộc mạc hòa quyện cùng kỹ nghệ tinh xảo.',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1000&q=80',
    villagesCount: '42+ Làng Nghề Cổ',
    craftTypes: 'Sơn Mài · Dệt Chiếu · Đan Lục Bình',
    masterArtisans: '12 Nghệ Nhân Ưu Tú',
    pins: [
      { name: 'Sơn Mài Tương Bình Hiệp', craft: 'Cẩn Trứng & Thếp Vàng', top: '30%', left: '55%' },
      { name: 'Chiếu Định Yên', craft: 'Chiếu Dệt Hoa Đồng Tháp', top: '70%', left: '35%' },
    ],
  },
};

interface HeritageRegionsSectionProps {
  onSelectPin?: (pinName: string, craft: string) => void;
}

export const HeritageRegionsSection: React.FC<HeritageRegionsSectionProps> = ({ onSelectPin }) => {
  const [activeRegion, setActiveRegion] = useState<'bac' | 'trung' | 'nam'>('bac');
  const region = REGIONS[activeRegion];

  return (
    <section id="lang-nghe" className="story-section regions-section">
      <div className="regions-ambient-glow" />

      <div className="story-container">
        {/* Section Header */}
        <div className="reveal-on-scroll reveal-fade-up" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="story-badge-pill">
            <span className="story-badge-dot" />
            <span>Bản Đồ Thị Giác 3 Miền</span>
          </div>

          <h2 className="story-title" style={{ marginBottom: '14px' }}>
            Hành Trình Di Sản <span className="story-title-italic">Dọc Dải Đất Hình Chữ S</span>
          </h2>

          <p className="story-subtitle" style={{ margin: '0 auto', maxWidth: '680px' }}>
            Không chỉ là những làng nghề, đó là ký ức ngàn năm của dân tộc được giữ lửa qua bàn tay tài hoa của các thế hệ nghệ nhân.
          </p>
        </div>

        {/* Region Selector Tabs */}
        <div className="reveal-on-scroll reveal-fade-up reveal-delay-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div className="region-tabs-row" style={{ marginBottom: 0 }}>
            <button
              onClick={() => setActiveRegion('bac')}
              className={`region-tab-btn ${activeRegion === 'bac' ? 'active' : ''}`}
            >
              <span>🏮</span>
              <span>Bắc Bộ (Đất Nung & Lụa)</span>
            </button>
            <button
              onClick={() => setActiveRegion('trung')}
              className={`region-tab-btn ${activeRegion === 'trung' ? 'active' : ''}`}
            >
              <span>🪷</span>
              <span>Trung Bộ (Hương Trầm & Đá)</span>
            </button>
            <button
              onClick={() => setActiveRegion('nam')}
              className={`region-tab-btn ${activeRegion === 'nam' ? 'active' : ''}`}
            >
              <span>🛶</span>
              <span>Nam Bộ (Sơn Mài & Chiếu)</span>
            </button>
          </div>
        </div>

        {/* 3D Showcase Grid */}
        <div className="region-showcase-grid">
          {/* Visual 3D Stage with Pins */}
          <div className="reveal-on-scroll reveal-zoom-in reveal-delay-2">
            <TiltCard maxTilt={6} glare={true} className="region-visual-stage">
              <img
                src={region.image}
                alt={region.tagline}
                className="region-stage-img"
              />
              <div className="region-stage-overlay" />

              {/* Dynamic Interactive Craft Pins */}
              {region.pins.map((pin, idx) => (
                <div
                  key={idx}
                  className="region-stage-pin"
                  style={{ top: pin.top, left: pin.left }}
                  onClick={() => onSelectPin?.(pin.name, pin.craft)}
                  title={`Bấm để khám phá: ${pin.name}`}
                >
                  <span className="region-stage-pin-radar" />
                  <div>
                    <div style={{ lineHeight: 1.1 }}>{pin.name}</div>
                    <div style={{ fontSize: '10px', color: '#984628', fontWeight: 600 }}>{pin.craft}</div>
                  </div>
                </div>
              ))}
            </TiltCard>
          </div>

          {/* Region Story Details */}
          <div className="region-details-card reveal-on-scroll reveal-slide-right reveal-delay-3">
            <h3 className="region-tagline">{region.tagline}</h3>
            <p className="region-desc">{region.description}</p>

            {/* Cultural stats */}
            <div className="region-highlights-row">
              <div className="region-highlight-box">
                <span className="region-highlight-value">{region.villagesCount}</span>
                <span className="region-highlight-label">Điểm di sản bảo tồn</span>
              </div>
              <div className="region-highlight-box">
                <span className="region-highlight-value">{region.masterArtisans}</span>
                <span className="region-highlight-label">Nghệ nhân truyền lửa</span>
              </div>
              <div className="region-highlight-box">
                <span className="region-highlight-value">{region.craftTypes}</span>
                <span className="region-highlight-label">Chất liệu bản địa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeritageRegionsSection;
