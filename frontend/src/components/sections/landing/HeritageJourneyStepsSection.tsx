import React from 'react';

interface HeritageJourneyStepsSectionProps {
  onStepClick?: (stepNumber: number) => void;
}

export const HeritageJourneyStepsSection: React.FC<HeritageJourneyStepsSectionProps> = ({
  onStepClick,
}) => {
  const steps = [
    {
      number: '01',
      badgeBg: '#D6E8CF',
      badgeIconColor: '#173D35',
      tag: 'BƯỚC 1 · TÌM HIỂU',
      title: 'Khám phá cội nguồn',
      desc: 'Tìm hiểu câu chuyện các làng nghề ngàn năm, chân dung nghệ nhân ưu tú và cội nguồn của từng chất liệu bản địa độc đáo.',
      linkText: 'Đọc hồ sơ làng nghề',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#173D35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M11 8a3 3 0 0 0-3 3" />
        </svg>
      ),
    },
    {
      number: '02',
      badgeBg: '#FFDBCF',
      badgeIconColor: '#984628',
      tag: 'BƯỚC 2 · LỰA CHỌN',
      title: 'Chọn lựa tạo tác',
      desc: 'Lựa chọn tác phẩm thủ công độc bản có chứng nhận xuất xứ hoặc đăng ký workshop thực hành trực tiếp cùng nghệ nhân.',
      linkText: 'Xem hình thức tương tác',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#984628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      number: '03',
      badgeBg: '#C2EBDF',
      badgeIconColor: '#173D35',
      tag: 'BƯỚC 3 · THỂ NGHIỆM',
      title: 'Chạm & Sống cùng di sản',
      desc: 'Tận hưởng trải nghiệm văn hóa chân thực, tự tay tạo ra sản phẩm mang dấu ấn cá nhân và gìn giữ tinh hoa dân tộc.',
      linkText: 'Lưu giữ ký ức bản sắc',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#173D35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      ),
    },
  ];

  return (
    <section className="heritage-journey-section" id="hanh-trinh">
      <div className="heritage-journey-container">
        {/* Header Block */}
        <div className="journey-header-block reveal-on-scroll reveal-fade-up">
          <div className="journey-pretitle">HÀNH TRÌNH TRẢI NGHIỆM</div>
          <h2 className="journey-heading">Ba bước đồng hành cùng di sản</h2>
          <p className="journey-subheading">
            LocalCraft tinh giản mọi ranh giới để bạn dễ dàng bước vào chiều sâu văn hoá thủ công dân tộc.
          </p>
        </div>

        {/* 3 Interactive Cards */}
        <div className="journey-cards-grid">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`journey-step-card reveal-on-scroll reveal-flip-card reveal-delay-${idx + 1}`}
              onClick={() => onStepClick?.(idx + 1)}
            >
              <div className="journey-step-top">
                <div className="journey-step-badge-row">
                  <div className="journey-step-icon-badge" style={{ backgroundColor: step.badgeBg }}>
                    {step.icon}
                  </div>
                  <div className="journey-step-num">{step.number}</div>
                </div>

                <div className="journey-step-tag">{step.tag}</div>
                <h3 className="journey-step-title">{step.title}</h3>
                <p className="journey-step-desc">{step.desc}</p>
              </div>

              <div className="journey-step-bottom">
                <span className="journey-step-link">{step.linkText}</span>
                <span className="journey-step-link-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeritageJourneyStepsSection;
