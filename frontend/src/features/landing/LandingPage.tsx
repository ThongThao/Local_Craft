import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  HeroSection,
  HeritageRegionsSection,
  HeritageMissionSection,
  HeritageJourneyStepsSection,
  HeritageCoreValuesSection,
  ArtisanPartnerCtaSection,
} from '@/components/sections/landing';
import Modal from '@/components/ui/Modal';
import AppIcon from '@/components/ui/AppIcon';
import FloatingActionBubbles from '@/components/ui/FloatingActionBubbles';
import { VILLAGES_DATA, PRODUCTS_DATA } from '@/data/landing';

interface LandingPageProps {
  onNavigateToLogin?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
  currentUser?: {
    email?: string;
    fullName?: string;
    full_name?: string;
    avatarUrl?: string;
    avatar_url?: string;
  } | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToLogin,
  onNavigateToProfile,
  onLogout,
  isLoggedIn = false,
  currentUser = null,
}) => {
  // Modal states
  const [videoModalOpen, setVideoModalOpen] = useState<boolean>(false);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPinInfo, setSelectedPinInfo] = useState<{ name: string; craft: string } | null>(null);
  const [artisanModalOpen, setArtisanModalOpen] = useState<boolean>(false);

  // Artisan form states
  const [artisanForm, setArtisanForm] = useState({
    name: '',
    phone: '',
    craft: '',
    location: '',
  });

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Scroll Reveal Intersection Observer (reveals elements once and preserves state until page reload)
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // Giữ nguyên cho đến khi load lại trang
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleOpenExplore = () => {
    const el = document.getElementById('hanh-trinh-3-mien');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleArtisanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artisanForm.name || !artisanForm.phone) {
      showToast('Vui lòng điền đầy đủ họ tên và số điện thoại.');
      return;
    }
    setArtisanModalOpen(false);
    setArtisanForm({ name: '', phone: '', craft: '', location: '' });
    showToast('Cảm ơn nghệ nhân! Ban bảo trợ di sản LocalCraft sẽ liên hệ trong 24 giờ.');
  };

  return (
    <div className="localcraft-landing-page">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast-container">
          <span>🌿</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Shared Navigation Bar */}
      <Navbar
        isLanding={true}
        onBackToHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenLogin={onNavigateToLogin || (() => showToast('Cổng đăng nhập tài khoản đang sẵn sàng.'))}
        onOpenProfile={onNavigateToProfile}
        onLogout={onLogout}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onOpenExplore={handleOpenExplore}
      />

      {/* Main Visual Storytelling Flow */}
      <main className="landing-main-content">
        {/* 1. Hero Section: Parallax & 3D Interactive Bàn Xoay Nghệ Nhân */}
        <HeroSection
          onExploreClick={handleOpenExplore}
          onWatchVideoClick={() => setVideoModalOpen(true)}
        />

        {/* 2. Sứ Mệnh Gìn Giữ & Kết Nối Đương Đại */}
        <HeritageMissionSection />

        {/* 3. Hành Trình Di Sản 3 Miền (Heritage Regions Parallax Showcase) */}
        <div id="hanh-trinh-3-mien">
          <HeritageRegionsSection
            onSelectPin={(pinName, craft) => {
              setSelectedPinInfo({ name: pinName, craft });
            }}
          />
        </div>

        {/* 4. Hành Trình Trải Nghiệm — Ba Bước Đồng Hành Cùng Di Sản */}
        <HeritageJourneyStepsSection
          onStepClick={(step) => {
            if (step === 1) {
              const el = document.getElementById('hanh-trinh-3-mien');
              el?.scrollIntoView({ behavior: 'smooth' });
            } else if (step === 2) {
              showToast('Khám phá tạo tác và đăng ký trải nghiệm workshop cùng nghệ nhân.');
            } else {
              showToast('Lưu giữ ký ức bản sắc tại không gian di sản.');
            }
          }}
        />

        {/* 5. Giá Trị Cốt Lõi — Tại Sao LocalCraft Tạo Nên Sự Khác Biệt? */}
        <HeritageCoreValuesSection />

        {/* 6. Đồng Hành Cùng Nghệ Nhân */}
        <ArtisanPartnerCtaSection
          onJoinArtisanClick={() => setArtisanModalOpen(true)}
        />
      </main>

      {/* Shared Footer */}
      <Footer onBackToHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {/* ---------------- MODALS ---------------- */}

      {/* Video Documentary Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title="Ký Sự Thị Giác: Hồn Cốt Bách Nghệ"
        subtitle="Phim tư liệu 4K ghi hình trực tiếp tại các lò nung Bát Tràng và xưởng trầm Thủy Xuân"
        maxWidth="760px"
      >
        <div className="video-modal-wrap">
          <div className="video-frame">
            <img
              src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80"
              alt="Video preview"
              className="video-preview-img"
            />
            <div
              className="video-play-btn"
              onClick={() => showToast('Đang phát phim tư liệu di sản sống độ phân giải 4K...')}
            >
              <AppIcon name="play" size={28} />
            </div>
            <div className="video-overlay-bar">
              <span>Phim tư liệu: 4K UltraHD • Thời lượng 08:45</span>
              <span>Âm thanh tự nhiên không lời</span>
            </div>
          </div>

          <div>
            <div className="video-chapters-title">Các chương hành trình:</div>
            <div className="video-chapters-grid">
              {[
                { title: 'Chương 1: Lửa lò Bát Tràng', time: '02:15' },
                { title: 'Chương 2: Sắc trầm Thủy Xuân', time: '04:30' },
                { title: 'Chương 3: Khung cửi Vạn Phúc', time: '07:10' },
              ].map((ch, i) => (
                <div
                  key={i}
                  className="video-chapter-card"
                  onClick={() => showToast(`Chuyển đến ${ch.title}`)}
                >
                  <div className="video-chapter-title">{ch.title}</div>
                  <div className="video-chapter-time">{ch.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Interactive Pin Craft Insight Modal */}
      <Modal
        isOpen={!!selectedPinInfo}
        onClose={() => setSelectedPinInfo(null)}
        title={selectedPinInfo?.name || 'Điểm Di Sản'}
        subtitle={`Dòng kỹ nghệ: ${selectedPinInfo?.craft || 'Thủ công truyền thống'}`}
        maxWidth="580px"
      >
        {selectedPinInfo && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '20px',
                height: '200px',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80"
                alt={selectedPinInfo.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <p style={{ color: '#4A5652', lineHeight: '1.7', fontSize: '14.5px', marginBottom: '20px' }}>
              Điểm đến di sản <strong>{selectedPinInfo.name}</strong> lưu giữ kỹ thuật <strong>{selectedPinInfo.craft}</strong> độc bản được trao truyền qua nhiều thế hệ. Du khách có thể trực tiếp gặp gỡ nghệ nhân, tham quan lò nung hoặc xưởng chế tác thủ công để cảm nhận trọn vẹn hồn cốt làng nghề.
            </p>

            <button
              onClick={() => {
                setSelectedPinInfo(null);
                showToast(`Đã lưu ${selectedPinInfo.name} vào danh sách điểm đến.`);
              }}
              className="product-modal-order-btn"
              style={{ width: '100%' }}
            >
              Lưu vào hành trình trải nghiệm
            </button>
          </div>
        )}
      </Modal>

      {/* Artisan Partner Onboarding Modal */}
      <Modal
        isOpen={artisanModalOpen}
        onClose={() => setArtisanModalOpen(false)}
        title="Đồng Hành Cùng Mạng Lưới LocalCraft"
        subtitle="Cổng kết nối dành riêng cho gia đình nghệ nhân, xưởng thủ công và làng nghề cổ truyền"
        maxWidth="580px"
      >
        <form onSubmit={handleArtisanSubmit} style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002720', marginBottom: '6px' }}>
              Họ tên nghệ nhân / Đại diện xưởng *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nghệ nhân Nguyễn Văn An"
              value={artisanForm.name}
              onChange={(e) => setArtisanForm({ ...artisanForm, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002720', marginBottom: '6px' }}>
                Số điện thoại liên hệ *
              </label>
              <input
                type="tel"
                required
                placeholder="0912 345 678"
                value={artisanForm.phone}
                onChange={(e) => setArtisanForm({ ...artisanForm, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002720', marginBottom: '6px' }}>
                Dòng kỹ nghệ / Lĩnh vực
              </label>
              <input
                type="text"
                placeholder="Gốm sứ, Trầm hương, Lụa..."
                value={artisanForm.craft}
                onChange={(e) => setArtisanForm({ ...artisanForm, craft: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002720', marginBottom: '6px' }}>
              Địa chỉ xưởng / Làng nghề
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Làng gốm Bát Tràng, Gia Lâm, Hà Nội"
              value={artisanForm.location}
              onChange={(e) => setArtisanForm({ ...artisanForm, location: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          <div style={{ background: '#F6F3ED', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', color: '#414846', lineHeight: 1.5 }}>
            🛡️ <strong>Chính sách cam kết:</strong> LocalCraft không thu phí đăng ký, tôn trọng quyền sở hữu trí tuệ và hỗ trợ quảng bá câu chuyện di sản đến cộng đồng du khách trong nước &amp; quốc tế.
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setArtisanModalOpen(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #E0DCD3',
                background: '#FFFFFF',
                color: '#414846',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="artisan-partner-btn"
              style={{ flex: 2, justifyContent: 'center', margin: 0 }}
            >
              Gửi yêu cầu đồng hành
            </button>
          </div>
        </form>
      </Modal>

      {/* Global Quick Search Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Tìm kiếm di sản LocalCraft"
        subtitle="Tìm nhanh thông tin làng nghề hoặc dòng kỹ nghệ cổ truyền"
        maxWidth="600px"
      >
        <div className="search-modal-wrap">
          <input
            type="text"
            placeholder="Nhập tên di sản (ví dụ: Bát Tràng, men rạn, tơ lụa, trầm hương)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="search-modal-input"
          />

          <div className="search-modal-suggestions">
            <div className="search-modal-suggestions-label">Gợi ý di sản nổi bật:</div>
            {[...VILLAGES_DATA, ...PRODUCTS_DATA.slice(0, 2)]
              .filter((item) => {
                const title = 'name' in item ? item.name : item.title;
                return !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .slice(0, 4)
              .map((item, idx) => {
                const title = 'name' in item ? item.name : item.title;
                const sub = 'location' in item ? item.location : item.artisan;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSearchModalOpen(false);
                      showToast(`Đã chọn: ${title}`);
                    }}
                    className="search-suggestion-item"
                  >
                    <div>
                      <div className="search-suggestion-title">{title}</div>
                      <div className="search-suggestion-sub">{sub}</div>
                    </div>
                    <span className="search-suggestion-arrow">Khám phá →</span>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>

      {/* Floating Action Bubbles (Scroll to Top, Heritage Chat, Craft Cart) */}
      <FloatingActionBubbles />
    </div>
  );
};

export default LandingPage;
