import React from 'react';
import { CraftVillageData, ArtisanProfileItem, CraftProductItem, CraftWorkshopItem } from '../../types';

interface PublicPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  village: CraftVillageData;
  artisan: ArtisanProfileItem;
  products: CraftProductItem[];
  workshops: CraftWorkshopItem[];
}

export const PublicPreviewModal: React.FC<PublicPreviewModalProps> = ({
  isOpen,
  onClose,
  village,
  artisan,
  products,
  workshops,
}) => {
  if (!isOpen) return null;

  return (
    <div className="artisan-modal-overlay">
      <div className="artisan-modal-dialog public-preview-dialog">
        <div className="modal-header-row preview-header">
          <div className="preview-indicator-chip">
            <span className="live-dot" />
            <span>Chế độ Xem Trước Giao Diện Du Khách</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕ 
          </button>
        </div>

        <div className="public-preview-scroll-body">
          {/* Hero Village Banner */}
          <div className="preview-hero-banner" style={{ backgroundImage: `url(${village.coverImage})` }}>
            <div className="preview-hero-shade" />
            <div className="preview-hero-content">
              <span className="preview-badge">🏛️ LÀNG NGHỀ DI SẢN QUỐC GIA · {village.establishedPeriod}</span>
              <h2 className="preview-village-title">{village.name}</h2>
              <p className="preview-tagline">{village.tagline}</p>
              <div className="preview-stats-bar">
                <span>📍 {village.address || `${village.district}, ${village.province}`}</span>
                <span>👤 {village.activeArtisansCount} Nghệ nhân truyền đời</span>
                <span>⭐ {village.trustScore}% Tín nhiệm du khách</span>
                <span>🏆 OCOP {village.ocopLevel} Sao</span>
              </div>
            </div>
          </div>

          {/* Village Info & Contact Quick Bar */}
          {(village.phone || village.email || village.openingHours) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', padding: '12px 24px', background: '#FAF8F5', borderBottom: '1px solid #ECE7DE', fontSize: '12.5px', color: '#414846' }}>
              {village.phone && <span>📞 <strong>Hotline:</strong> {village.phone}</span>}
              {village.email && <span>✉️ <strong>Email:</strong> {village.email}</span>}
              {village.openingHours && <span>⏰ <strong>Mở cửa:</strong> {village.openingHours}</span>}
            </div>
          )}

          {/* Master Artisan Spotlight */}
          <div className="preview-section">
            <div className="preview-section-title-row">
              <h3>Đại Diện Nghệ Nhân Di Sản Tiêu Biểu</h3>
              <span className="section-pill">Bảo tồn sống</span>
            </div>

            <div className="preview-artisan-spotlight-card">
              {artisan.avatarUrl && (
                <img src={artisan.avatarUrl} alt={artisan.displayName} className="spotlight-avatar" />
              )}
              <div className="spotlight-info">
                <div className="spotlight-role">Nghệ nhân làng nghề</div>
                <h4 className="spotlight-name">{artisan.displayName}</h4>
                <div className="spotlight-specialty">{artisan.experienceYears} năm thâm niên làm nghề</div>
                <p className="spotlight-bio">{artisan.bio}</p>
                <div className="spotlight-tags">
                  <span className="spotlight-tag">
                    {artisan.verificationStatus === 'APPROVED' ? '✓ Đã xác minh' : '⏳ Đang xác minh'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Masterpieces Grid */}
          <div className="preview-section">
            <div className="preview-section-title-row">
              <h3>Tác Phẩm Thủ Công Đang Trưng Bày ({products.length})</h3>
              <span className="section-pill">Tem chống hàng giả</span>
            </div>

            <div className="preview-products-grid">
              {products.slice(0, 4).map((p) => (
                <div key={p.id} className="preview-prod-card">
                  <div className="preview-prod-img-wrap">
                    <img src={p.coverImage} alt={p.name} />
                    {p.ocopStars && <span className="preview-ocop">⭐ OCOP {p.ocopStars} Sao</span>}
                  </div>
                  <div className="preview-prod-body">
                    <div className="preview-prod-cat">{p.categoryName}</div>
                    <div className="preview-prod-name">{p.name}</div>
                    <div className="preview-prod-price">{p.formattedPrice}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workshops Grid */}
          <div className="preview-section">
            <div className="preview-section-title-row">
              <h3>Trải Nghiệm Workshop Học Nghề Trực Tiếp ({workshops.length})</h3>
              <span className="section-pill">Kèm 1-1 tại xưởng</span>
            </div>

            <div className="preview-workshops-grid">
              {workshops.slice(0, 2).map((w) => (
                <div key={w.id} className="preview-ws-card">
                  <img src={w.coverImage} alt={w.title} className="preview-ws-img" />
                  <div className="preview-ws-body">
                    <div className="preview-ws-time">⏰ {w.nextSessionDate} ({w.durationMinutes} phút)</div>
                    <div className="preview-ws-title">{w.title}</div>
                    <div className="preview-ws-author">Nghệ nhân: {w.artisanName}</div>
                    <div className="preview-ws-price-row">
                      <span className="preview-ws-price">{w.formattedPrice}</span>
                      <span className="preview-ws-seats">Còn {w.maxParticipants - w.enrolledCount} ghế trống</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PublicPreviewModal;
