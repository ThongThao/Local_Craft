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
          <button type="button" className="v06-close-btn" onClick={onClose} aria-label="Đóng" title="Đóng (ESC)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="public-preview-scroll-body">
          {/* Hero Village Banner */}
          <div className="preview-hero-banner" style={{ backgroundImage: `url(${village.coverImage})` }}>
            <div className="preview-hero-shade" />
            <div className="preview-hero-content">
              <span className="preview-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21V11h6v10" />
                </svg>
                LÀNG NGHỀ DI SẢN QUỐC GIA · {village.establishedPeriod}
              </span>
              <h2 className="preview-village-title">{village.name}</h2>
              <p className="preview-tagline">{village.tagline}</p>
              <div className="preview-stats-bar">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {village.address || `${village.district}, ${village.province}`}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {village.activeArtisansCount} Nghệ nhân truyền đời
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#F59E0B' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {village.trustScore}% Tín nhiệm du khách
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                  </svg>
                  OCOP {village.ocopLevel} Sao
                </span>
              </div>
            </div>
          </div>

          {/* Village Info & Contact Quick Bar */}
          {(village.phone || village.email || village.openingHours) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', padding: '12px 24px', background: '#FAF8F5', borderBottom: '1px solid #ECE7DE', fontSize: '12.5px', color: '#414846' }}>
              {village.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <strong>Hotline:</strong> {village.phone}
                </span>
              )}
              {village.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <strong>Email:</strong> {village.email}
                </span>
              )}
              {village.openingHours && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <strong>Mở cửa:</strong> {village.openingHours}
                </span>
              )}
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
                  <span className="spotlight-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {artisan.verificationStatus === 'APPROVED' ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Đã xác minh</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Đang xác minh</span>
                      </>
                    )}
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
                    {p.ocopStars && (
                      <span className="preview-ocop" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        OCOP {p.ocopStars} Sao
                      </span>
                    )}
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
                    <div className="preview-ws-time" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{w.nextSessionDate} ({w.durationMinutes} phút)</span>
                    </div>
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
