import React, { useState } from 'react';
import AppIcon from '../ui/AppIcon';

interface FooterProps {
  onBackToHome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  const handleBrandClick = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="app-footer">
      <div className="footer-container">
        {/* Top Grid: Brand + 3 Links Columns + Newsletter */}
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <div
              onClick={handleBrandClick}
              className="footer-brand-header"
              title="Về trang chủ LocalCraft"
            >
              <div className="footer-brand-emblem">
                <AppIcon name="pottery" size={20} />
              </div>
              <span className="footer-brand-title">LocalCraft</span>
            </div>

            <p className="footer-brand-desc">
              Nền tảng kết nối tinh hoa nghệ nhân và gìn giữ văn hóa làng nghề truyền thống Việt Nam. Đưa giá trị di sản bản địa đến gần hơn với cuộc sống hiện đại và cộng đồng tinh hoa toàn cầu.
            </p>

            <div>
              <div className="footer-mission-badge">
                <span className="footer-mission-dot" />
                <span className="footer-mission-text">
                  Bảo tồn Văn hóa Nghệ nhân
                </span>
              </div>
            </div>

            {/* Newsletter form */}
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <div className="footer-newsletter-label">
                Nhận bản tin di sản & ký sự hàng tuần:
              </div>
              <div className="footer-newsletter-row">
                <input
                  type="email"
                  placeholder="Địa chỉ email của bạn..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="footer-newsletter-input"
                />
                <button type="submit" className="footer-newsletter-submit">
                  {subscribed ? 'Đã gửi ✓' : 'Đăng ký'}
                </button>
              </div>
            </form>
          </div>

          {/* Column 1: Khám phá */}
          <div className="footer-nav-col">
            <h4 className="footer-nav-title">Khám phá</h4>
            <div className="footer-nav-links">
              {['Bản đồ Làng nghề', 'Bộ sưu tập Thủ công', 'Workshop Trải nghiệm'].map((link) => (
                <a key={link} href="#lang-nghe" className="footer-nav-link">
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Nghệ nhân */}
          <div className="footer-nav-col">
            <h4 className="footer-nav-title">Nghệ nhân</h4>
            <div className="footer-nav-links">
              {['Hồ sơ Nghệ nhân', 'Chuyện nghề & Ký sự', 'Chứng nhận Di sản'].map((link) => (
                <a key={link} href="#ky-su" className="footer-nav-link">
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Column 3: Về LocalCraft */}
          <div className="footer-nav-col">
            <h4 className="footer-nav-title">Về LocalCraft</h4>
            <div className="footer-nav-links">
              {['Sứ mệnh bảo tồn', 'Liên hệ cộng tác', 'Cổng Nghệ nhân'].map((link) => (
                <a key={link} href="#gioi-thieu" className="footer-nav-link">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Policies */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © 2025 LocalCraft. Bảo tồn và lan tỏa tinh hoa văn hóa truyền thống Việt Nam.
          </p>

          <div className="footer-legal-links">
            <a href="#" className="footer-legal-link">
              Điều khoản dịch vụ
            </a>
            <a href="#" className="footer-legal-link">
              Chính sách bảo mật di sản
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
