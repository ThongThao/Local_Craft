import React from 'react';

export const HeritageCoreValuesSection: React.FC = () => {
  return (
    <section className="heritage-values-section" id="gia-tri-cot-loi">
      <div className="heritage-values-container">
        {/* Header with Title on Left, Description on Right */}
        <div className="values-header-row reveal-on-scroll reveal-fade-up">
          <div className="values-title-col">
            <div className="values-pretitle">GIÁ TRỊ CỐT LÕI</div>
            <h2 className="values-heading">
              Tại sao LocalCraft tạo nên sự<br className="desktop-br" /> khác biệt?
            </h2>
          </div>
          <div className="values-desc-col">
            <p className="values-desc-text">
              Không đơn thuần là cổng thông tin, chúng tôi kiến tạo hệ sinh
              thái lưu giữ tri thức và kết nối tinh tuyển với chuẩn mực cao
              nhất.
            </p>
          </div>
        </div>

        {/* 3 Core Value Cards Grid */}
        <div className="values-cards-grid">
          {/* Card 1: Authentic Story */}
          <div className="value-card value-card-soft reveal-on-scroll reveal-flip-card reveal-delay-1">
            <div className="value-card-body">
              <div className="value-card-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002720" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="9" y1="7" x2="15" y2="7" />
                  <line x1="9" y1="11" x2="13" y2="11" />
                </svg>
              </div>
              <h3 className="value-card-title">Câu chuyện di sản chân thực</h3>
              <p className="value-card-desc">
                Mỗi làng nghề, mỗi dòng men, từng thớ lụa đều gắn liền với chiều sâu lịch sử văn
                hóa được ghi chép và xác thực minh bạch qua nghiên cứu điền dã chuyên
                sâu.
              </p>
            </div>
            <div className="value-card-footer">
              <span className="value-card-badge value-badge-clay">
                <span>Minh bạch xuất xứ</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </span>
            </div>
          </div>

          {/* Card 2: Featured Artisan Connect (Hero Forest Card) */}
          <div className="value-card value-card-featured reveal-on-scroll reveal-zoom-in reveal-delay-2">
            <div className="value-card-featured-glow" />
            <div className="value-card-body">
              <div className="value-card-icon-wrap featured-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2EBDF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="value-card-title featured-title">Kết nối trực tiếp cùng nghệ nhân</h3>
              <p className="value-card-desc featured-desc">
                Không qua trung gian thương mại hóa, du khách được trực tiếp học hỏi, giao lưu và
                ủng hộ sinh kế bền vững của chính các nghệ nhân bản địa tại xưởng thủ công.
              </p>
            </div>
            <div className="value-card-footer">
              <span className="value-card-badge value-badge-peach">
                <span>Bảo trợ sinh kế cộng đồng</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFDBCF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Card 3: AI Personalized Intelligence */}
          <div className="value-card value-card-soft reveal-on-scroll reveal-flip-card reveal-delay-3">
            <div className="value-card-body">
              <div className="value-card-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002720" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <h3 className="value-card-title">Cá nhân hóa trải nghiệm bằng AI</h3>
              <p className="value-card-desc">
                Hệ thống đề xuất thông minh gợi ý điểm đến, workshop và tác phẩm tương thích
                chính xác với sở thích, phong cách và hành trình riêng biệt của bạn.
              </p>
            </div>
            <div className="value-card-footer">
              <span className="value-card-badge value-badge-forest">
                <span>Gợi ý theo gu thẩm mỹ</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#002720" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeritageCoreValuesSection;
