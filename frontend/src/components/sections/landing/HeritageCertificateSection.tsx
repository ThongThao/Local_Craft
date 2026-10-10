import React, { useState, useRef } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import Button from '@/components/ui/Button';

interface HeritageCertificateSectionProps {
  onVerifyDemo?: () => void;
}

export const HeritageCertificateSection: React.FC<HeritageCertificateSectionProps> = ({
  onVerifyDemo,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [shimmerPos, setShimmerPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setRotX(rotateX);
    setRotY(rotateY);
    setShimmerPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotX(0);
    setRotY(0);
  };

  return (
    <section className="story-section certificate-section">
      <div className="story-container">
        <div className="certificate-grid">
          {/* Left Column: Descriptive Story & Value proposition */}
          <div>
            <div
              className="story-badge-pill"
              style={{
                background: 'rgba(255, 219, 207, 0.1)',
                borderColor: 'rgba(255, 219, 207, 0.25)',
                color: '#FFDBCF',
              }}
            >
              <span className="story-badge-dot" style={{ background: '#FFDBCF', boxShadow: '0 0 10px #FFDBCF' }} />
              <span>Định Danh Độc Bản Di Sản</span>
            </div>

            <h2 className="story-title" style={{ color: '#FCF9F3' }}>
              Chứng Thư Bách Nghệ <br />
              <span className="story-title-italic" style={{ color: '#FFDBCF' }}>
                Xác Thực Số Cùng Nghệ Nhân
              </span>
            </h2>

            <p className="story-subtitle" style={{ color: 'rgba(252, 249, 243, 0.75)' }}>
              Mỗi tác phẩm thủ công hay buổi trải nghiệm tại LocalCraft đều được cấp một chứng thư số vĩnh cửu. 
              Minh bạch niên đại, nghệ nhân chế tác, nguồn đất, dòng men và tọa độ lịch sử của làng nghề.
            </p>

            {/* Key Certificate Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 219, 207, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFDBCF',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#FCF9F3', fontSize: '15px' }}>Chữ ký số & Con dấu nghệ nhân</div>
                  <div style={{ fontSize: '13px', color: 'rgba(252, 249, 243, 0.65)', marginTop: '2px' }}>
                    Khắc ghi dấu ấn của bàn tay bậc thầy bảo hộ nguồn gốc tác phẩm.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 219, 207, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFDBCF',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#FCF9F3', fontSize: '15px' }}>Mã định danh duy nhất (Non-Fungible Code)</div>
                  <div style={{ fontSize: '13px', color: 'rgba(252, 249, 243, 0.65)', marginTop: '2px' }}>
                    Quét QR tra cứu phả hệ chất liệu, kỹ nghệ nung và hình ảnh quá trình tác chế.
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={onVerifyDemo}
              icon={<AppIcon name="shield" size={16} />}
              iconPosition="left"
            >
              Kiểm tra chứng thư mẫu
            </Button>
          </div>

          {/* Right Column: 3D Holographic Interactive Card */}
          <div className="hologram-card-viewport">
            <div
              ref={cardRef}
              className="hologram-card"
              onMouseEnter={() => setIsHovered(true)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${isHovered ? 1.03 : 1}, ${isHovered ? 1.03 : 1}, 1)`,
              }}
            >
              {/* Dynamic Holographic Light Reflection */}
              <div
                className="hologram-shimmer"
                style={{
                  background: `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, rgba(255, 219, 207, 0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 70%)`,
                  opacity: isHovered ? 1 : 0.4,
                }}
              />

              {/* Card Header */}
              <div className="cert-header">
                <div className="cert-emblem">
                  <AppIcon name="pottery" size={24} />
                </div>
                <div className="cert-type-tag">DI SẢN BÁCH NGHỆ</div>
              </div>

              {/* Card Body */}
              <div className="cert-body">
                <div className="cert-title">Bình Gốm Men Rạn Hoa Sen</div>
                <div className="cert-subtitle">Làng nghề Gốm Bát Tràng · Đời Lý phục dựng</div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#C2EBDF' }}>
                  Bảo trợ: <strong>Nghệ nhân Nhân dân Trần Văn Độ</strong>
                </div>
              </div>

              {/* Card Footer */}
              <div className="cert-footer">
                <div className="cert-meta-group">
                  <span className="cert-code-label">MÃ ĐỊNH DANH ĐỘC BẢN</span>
                  <span className="cert-code-val">LC-HERITAGE-2026-0888</span>
                </div>

                <div className="cert-seal">
                  LOCAL CRAFT AUTHENTIC
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeritageCertificateSection;
