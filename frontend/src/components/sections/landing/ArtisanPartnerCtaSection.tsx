import React from 'react';

interface ArtisanPartnerCtaSectionProps {
  onJoinArtisanClick?: () => void;
}

export const ArtisanPartnerCtaSection: React.FC<ArtisanPartnerCtaSectionProps> = ({
  onJoinArtisanClick,
}) => {
  return (
    <section className="artisan-partner-section" id="dong-hanh-nghe-nhan">
      <div className="artisan-partner-container">
        <div className="artisan-partner-card reveal-on-scroll reveal-zoom-in">
          {/* Left Column: Authentic Artisan Portrait */}
          <div className="artisan-partner-image-col">
            <img
              src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=85"
              alt="Nghệ nhân Việt Nam gìn giữ nghề truyền thống"
              className="artisan-partner-img"
              loading="lazy"
            />
            <div className="artisan-partner-img-glow" />
            <div className="artisan-partner-badge-float">
              <span className="artisan-partner-badge-icon">🌿</span>
              <span>Bảo Tồn Bản Sắc Việt</span>
            </div>
          </div>

          {/* Right Column: Mission Content & Partnership Call */}
          <div className="artisan-partner-content-col">
            <div className="artisan-partner-pill">
              <span>ĐỒNG HÀNH CÙNG NGHỆ NHÂN</span>
            </div>

            <h2 className="artisan-partner-heading">
              Bạn là nghệ nhân gìn giữ nghề<br className="desktop-br" /> truyền thống?
            </h2>

            <p className="artisan-partner-desc">
              Hãy cùng LocalCraft lan tỏa di sản. Chúng tôi giúp bạn đưa câu
              chuyện làng nghề vươn xa, giới thiệu tác phẩm thủ công đến du
              khách trân quý nghệ thuật, và tổ chức các buổi workshop truyền
              dạy nghề bền vững.
            </p>

            {/* 3 Pillars of Partnership */}
            <div className="artisan-partner-features-row">
              <div className="artisan-partner-feat">
                <div className="artisan-partner-feat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="artisan-partner-feat-text">
                  Hỗ trợ truyền thông<br />chuyên nghiệp
                </div>
              </div>

              <div className="artisan-partner-feat">
                <div className="artisan-partner-feat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="artisan-partner-feat-text">
                  Minh bạch bảo trợ di<br />sản
                </div>
              </div>

              <div className="artisan-partner-feat">
                <div className="artisan-partner-feat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="artisan-partner-feat-text">
                  Kết nối du khách toàn<br />cầu
                </div>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="artisan-partner-action-bar">
              <button
                type="button"
                className="artisan-partner-btn"
                onClick={onJoinArtisanClick}
              >
                <span>Tham gia cùng LocalCraft</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <span className="artisan-partner-note">
                Không thu phí đăng ký · Bảo vệ bản quyền tác giả
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtisanPartnerCtaSection;
