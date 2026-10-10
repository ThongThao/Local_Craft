import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  HeroSection,
  HeritageVillagesSection,
  CuratedProductsSection,
  WorkshopsSection,
  AIAssistantSection,
  ArtisanStorySection,
  CtaBannerSection,
} from '@/components/sections/landing';
import Modal from '@/components/ui/Modal';
import AppIcon from '@/components/ui/AppIcon';
import { VillageItem, ProductItem, WorkshopItem } from '@/types/landing';
import { WORKSHOPS_DATA, PRODUCTS_DATA, VILLAGES_DATA, ARTISAN_MASTER_DATA } from '@/data/landing';

import { bookingsApi } from '@/services/api';

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
  const [selectedVillage, setSelectedVillage] = useState<VillageItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItem | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState<boolean>(false);
  const [artisanStoryOpen, setArtisanStoryOpen] = useState<boolean>(false);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Booking form state
  const [guestCount, setGuestCount] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('Cuối tuần này');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string>('');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để hoàn tất đặt chỗ trải nghiệm.');
      onNavigateToLogin?.();
      return;
    }

    try {
      const res = await bookingsApi.createBooking({
        workshop_id: 1,
        participant_count: guestCount,
        special_request: `Khách hàng: ${customerName} (${customerPhone}). Ngày: ${bookingDate}`,
      });
      setConfirmedBookingCode(res.data.booking_code);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedWorkshop(null);
        setCustomerName('');
        setCustomerPhone('');
        showToast(`Đặt chỗ thành công! Mã đơn: ${res.data.booking_code}`);
      }, 2200);
    } catch (err: any) {
      showToast(err.message || 'Không thể tạo đơn đặt chỗ. Vui lòng thử lại.');
    }
  };

  const handleOpenBooking = (workshop: WorkshopItem) => {
    setSelectedWorkshop(workshop);
    setGuestCount(1);
    setBookingSuccess(false);
  };

  const handleOpenExplore = () => {
    const el = document.getElementById('lang-nghe');
    el?.scrollIntoView({ behavior: 'smooth' });
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

      {/* Navigation Bar */}
      <Navbar
        onBackToHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenLogin={onNavigateToLogin || (() => showToast('Cổng đăng nhập khách hàng & nghệ nhân đang được đồng bộ.'))}
        onOpenProfile={onNavigateToProfile}
        onLogout={onLogout}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onOpenExplore={handleOpenExplore}
      />

      {/* Main Content Sections */}
      <main className="landing-main-content">
        {/* 1. Hero Section */}
        <HeroSection
          onExploreClick={handleOpenExplore}
          onWatchVideoClick={() => setVideoModalOpen(true)}
        />

        {/* 2. Bản đồ di sản (Heritage Villages Bento Grid) */}
        <HeritageVillagesSection
          onSelectVillage={(v) => setSelectedVillage(v)}
          onViewAll={() => showToast('Đang hiển thị 120+ làng nghề trên khắp 3 miền Việt Nam.')}
        />

        {/* 3. Tác phẩm chọn lọc (Curated Masterpieces) */}
        <CuratedProductsSection
          onSelectProduct={(p) => setSelectedProduct(p)}
        />

        {/* 4. Chương trình trải nghiệm (Workshops) */}
        <WorkshopsSection
          onBookWorkshop={handleOpenBooking}
        />

        {/* 5. Trợ lý hành trình LocalCraft AI */}
        <AIAssistantSection
          onBookMatch={(title) => {
            const matched = WORKSHOPS_DATA[0];
            setSelectedWorkshop(matched);
            showToast(`Đã chọn trải nghiệm phù hợp: ${title}`);
          }}
        />

        {/* 6. Ký sự chân dung (Master Artisan Trần Văn Độ) */}
        <ArtisanStorySection
          onReadFullStory={() => setArtisanStoryOpen(true)}
        />

        {/* 7. Khởi đầu hành trình (CTA Banner) */}
        <CtaBannerSection
          onJoinCommunity={() => showToast('Chào mừng bạn đến với cộng đồng người yêu di sản Việt!')}
          onArtisanPortal={() => showToast('Cổng kết nối nghệ nhân: Liên hệ hotline di sản 1900 8888')}
        />
      </main>

      {/* Footer */}
      <Footer onBackToHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {/* ---------------- MODALS ---------------- */}

      {/* Workshop Booking Modal */}
      <Modal
        isOpen={!!selectedWorkshop}
        onClose={() => setSelectedWorkshop(null)}
        title={selectedWorkshop?.title || 'Đặt chỗ trải nghiệm'}
        subtitle={`Hướng dẫn bởi: ${selectedWorkshop?.artisanGuide || 'Nghệ nhân bản địa'} · ${selectedWorkshop?.location}`}
      >
        {selectedWorkshop && (
          <div>
            {bookingSuccess ? (
              <div className="booking-success-box">
                <div className="booking-success-emoji">🎉</div>
                <h4 className="booking-success-title">
                  Xác nhận đặt chỗ thành công!
                </h4>
                <p className="booking-success-desc">
                  Mã giữ chỗ: <strong>{confirmedBookingCode || `LC-${Math.floor(100000 + Math.random() * 900000)}`}</strong>. Đang kết nối với nghệ nhân...
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="booking-form">
                {/* Workshop Summary Card */}
                <div className="booking-summary-card">
                  <img
                    src={selectedWorkshop.image}
                    alt={selectedWorkshop.title}
                    className="booking-summary-img"
                  />
                  <div>
                    <div className="booking-summary-tag">
                      {selectedWorkshop.tag} • {selectedWorkshop.duration}
                    </div>
                    <div className="booking-summary-price">
                      {selectedWorkshop.formattedPrice} / khách
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="booking-fields-grid">
                  <div className="booking-field-group">
                    <label className="booking-label">
                      Số lượng khách:
                    </label>
                    <div className="guest-counter-wrap">
                      <button
                        type="button"
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="guest-counter-btn"
                      >
                        -
                      </button>
                      <span className="guest-counter-value">
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGuestCount(guestCount + 1)}
                        className="guest-counter-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="booking-field-group">
                    <label className="booking-label">
                      Thời gian dự kiến:
                    </label>
                    <select
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="booking-select"
                    >
                      <option value="Hôm nay">Hôm nay (14:30)</option>
                      <option value="Ngày mai">Ngày mai (09:00)</option>
                      <option value="Cuối tuần này">Thứ Bảy cuối tuần</option>
                      <option value="Chủ nhật này">Chủ nhật cuối tuần</option>
                    </select>
                  </div>
                </div>

                <div className="booking-field-group">
                  <label className="booking-label">
                    Họ và tên của bạn:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="booking-input"
                  />
                </div>

                <div className="booking-field-group">
                  <label className="booking-label">
                    Số điện thoại / Zalo:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="booking-input"
                  />
                </div>

                {/* Total Price & Submit */}
                <div className="booking-footer-row">
                  <div>
                    <div className="booking-total-label">Tổng thanh toán tạm tính:</div>
                    <div className="booking-total-price">
                      {(selectedWorkshop.pricePerGuest * guestCount).toLocaleString('vi-VN')}₫
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="booking-submit-btn"
                  >
                    Xác nhận đặt chỗ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Video Experience Preview Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title="Trải nghiệm Thực tế Di sản LocalCraft"
        subtitle="Hành trình khám phá các lò nung gốm Bát Tràng và xưởng trầm hương Thủy Xuân xứ Huế"
        maxWidth="760px"
      >
        <div className="video-modal-wrap">
          {/* Mockup Video Player Frame */}
          <div className="video-frame">
            <img
              src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80"
              alt="Video preview"
              className="video-preview-img"
            />
            {/* Play Button Overlay */}
            <div
              className="video-play-btn"
              onClick={() => showToast('Đang phát phim tư liệu di sản sống độ phân giải 4K...')}
            >
              <AppIcon name="play" size={28} />
            </div>

            {/* Video overlay bar */}
            <div className="video-overlay-bar">
              <span>Phim tư liệu: 4K UltraHD • Thời lượng 08:45</span>
              <span>Âm thanh tự nhiên không lời</span>
            </div>
          </div>

          {/* Chapters row */}
          <div>
            <div className="video-chapters-title">
              Các chương tiêu biểu:
            </div>
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

      {/* Product Detail Modal */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.title}
        subtitle={`${selectedProduct?.artisan} · ${selectedProduct?.village}`}
        maxWidth="680px"
      >
        {selectedProduct && (
          <div className="product-modal-wrap">
            <div className="product-modal-hero">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="product-modal-img"
              />
            </div>

            <div>
              <div className="product-modal-badge">
                {selectedProduct.badge}
              </div>
              <p className="product-modal-desc">
                {selectedProduct.description}
              </p>
              {selectedProduct.story && (
                <div className="product-modal-story">
                  “{selectedProduct.story}”
                </div>
              )}
            </div>

            <div className="product-modal-footer">
              <div>
                <div className="product-modal-price-label">Giá tác phẩm độc bản:</div>
                <div className="product-modal-price">
                  {selectedProduct.formattedPrice}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedProduct(null);
                  showToast(`Đã thêm tác phẩm "${selectedProduct.title}" vào danh sách mong muốn.`);
                }}
                className="product-modal-order-btn"
              >
                Đặt chế tác độc bản
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Village Detail Modal */}
      <Modal
        isOpen={!!selectedVillage}
        onClose={() => setSelectedVillage(null)}
        title={selectedVillage?.name}
        subtitle={`${selectedVillage?.location} · ${selectedVillage?.period}`}
        maxWidth="680px"
      >
        {selectedVillage && (
          <div className="village-modal-wrap">
            <div className="village-modal-hero">
              <img
                src={selectedVillage.image}
                alt={selectedVillage.name}
                className="village-modal-img"
              />
            </div>

            <p className="village-modal-desc">
              {selectedVillage.description}
            </p>

            <div className="village-modal-tags">
              {selectedVillage.tags.map((t) => (
                <span
                  key={t}
                  className="village-modal-tag"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="village-modal-footer">
              <button
                onClick={() => {
                  setSelectedVillage(null);
                  handleOpenExplore();
                }}
                className="village-modal-explore-btn"
              >
                Xem các xưởng tại làng nghề
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Artisan Biography Modal */}
      <Modal
        isOpen={artisanStoryOpen}
        onClose={() => setArtisanStoryOpen(false)}
        title={ARTISAN_MASTER_DATA.name}
        subtitle={`${ARTISAN_MASTER_DATA.title} · ${ARTISAN_MASTER_DATA.medal}`}
        maxWidth="720px"
      >
        <div className="artisan-modal-wrap">
          <div className="artisan-modal-hero">
            <img
              src={ARTISAN_MASTER_DATA.image}
              alt={ARTISAN_MASTER_DATA.name}
              className="artisan-modal-img"
            />
          </div>

          <blockquote className="artisan-modal-quote">
            {ARTISAN_MASTER_DATA.quote}
          </blockquote>

          <p className="artisan-modal-p">
            {ARTISAN_MASTER_DATA.storyParagraph1}
          </p>
          <p className="artisan-modal-p">
            {ARTISAN_MASTER_DATA.storyParagraph2}
          </p>

          <div className="artisan-modal-stats-grid">
            <div className="artisan-modal-stat-card">
              <div className="artisan-modal-stat-num">120+</div>
              <div className="artisan-modal-stat-label">Mẫu men cổ phục chế thời Lý - Trần - Lê</div>
            </div>
            <div className="artisan-modal-stat-card">
              <div className="artisan-modal-stat-num">2,500+</div>
              <div className="artisan-modal-stat-label">Học viên thế hệ trẻ đã tham gia truyền nghề</div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Global Quick Search Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Tìm kiếm di sản LocalCraft"
        subtitle="Tìm làng nghề, sản phẩm độc bản hoặc chương trình workshop"
        maxWidth="600px"
      >
        <div className="search-modal-wrap">
          <input
            type="text"
            placeholder="Nhập tên làng nghề, nghệ nhân hoặc sản phẩm (ví dụ: Bát Tràng, lụa, gốm)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="search-modal-input"
          />

          <div className="search-modal-suggestions">
            <div className="search-modal-suggestions-label">
              Gợi ý kết quả:
            </div>
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
                    <span className="search-suggestion-arrow">Xem →</span>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandingPage;
