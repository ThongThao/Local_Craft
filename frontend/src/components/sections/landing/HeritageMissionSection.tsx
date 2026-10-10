import React from 'react';

export const HeritageMissionSection: React.FC = () => {
  return (
    <section className="heritage-mission-section" id="su-menh">
      <div className="heritage-mission-container">
        {/* Left Column: Mission Narrative & Core Pillars */}
        <div className="mission-content-col reveal-on-scroll reveal-slide-left">
          {/* Tagline Badge */}
          <div className="mission-badge">
            <span className="mission-badge-line" />
            <span className="mission-badge-text">SỨ MỆNH GÌN GIỮ &amp; KẾT NỐI ĐƯƠNG ĐẠI</span>
          </div>

          {/* Heading */}
          <h2 className="mission-heading">
            Cầu nối bền vững giữa kho<br className="desktop-br" /> tàng di sản và nhịp sống hiện<br className="desktop-br" /> đại.
          </h2>

          {/* Quote Block with Red Terracotta Accent Bar */}
          <div className="mission-quote-wrap">
            <div className="mission-quote-bar" />
            <blockquote className="mission-quote-text">
              &ldquo;Hàng trăm làng nghề cổ truyền đang đứng trước nguy cơ mai một khi
              thiếu vắng cầu nối với thế hệ trẻ và du khách đương đại. LocalCraft ra
              đời như một nhịp cầu bền vững: tôn vinh đôi bàn tay tài hoa của nghệ
              nhân Việt, mang tinh hoa bản địa đến gần hơn với cuộc sống mỗi ngày.&rdquo;
            </blockquote>
          </div>

          {/* 2 Foundation Value Cards */}
          <div className="mission-pillars-grid">
            <div className="mission-pillar-card">
              <div className="mission-pillar-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="mission-pillar-title">Gốc tích thuần bản</h3>
              <p className="mission-pillar-desc">
                Tôn trọng cốt cách, khuôn phép kỹ thuật lâu đời được lưu truyền qua
                nhiều thế hệ gia tộc.
              </p>
            </div>

            <div className="mission-pillar-card">
              <div className="mission-pillar-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3 className="mission-pillar-title">Sinh kế tôn nghiêm</h3>
              <p className="mission-pillar-desc">
                Tạo dựng thu nhập xứng tầm để các gia đình nghệ nhân an tâm gắn bó với
                lò nung, khung cửi.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Layered Visual Showcase with Overlapping Craft Floating Card */}
        <div className="mission-visual-col reveal-on-scroll reveal-slide-right reveal-delay-2">
          <div className="mission-image-stack">
            {/* Primary Large Artisan Image */}
            <div className="mission-main-img-card">
              <img
                src="https://images.unsplash.com/photo-1590374585152-ca0e8194c0d6?auto=format&fit=crop&w=900&q=85"
                alt="Nghệ nhân gốm truyền thống Việt Nam tạo hình trên bàn xoay"
                className="mission-main-img"
                loading="lazy"
              />
              <div className="mission-img-overlay-gradient" />
            </div>

            {/* Floating Overlapping Detailed Craft Card */}
            <div className="mission-floating-craft-card">
              <div className="mission-floating-img-frame">
                <img
                  src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=85"
                  alt="Tạo tác thủ công độc bản"
                  className="mission-floating-img"
                  loading="lazy"
                />
              </div>
              <div className="mission-floating-badge">
                <span className="mission-floating-tag">ĐỘC BẢN VIỆT</span>
                <span className="mission-floating-label">Hoa văn khắc thủ công tinh xảo</span>
              </div>
            </div>
          </div>

          {/* Bottom Caption Pill */}
          <div className="mission-visual-caption">
            <span className="caption-dot" />
            <span className="caption-text">Bảo tồn qua trải nghiệm sống và giá trị độc bản.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeritageMissionSection;
