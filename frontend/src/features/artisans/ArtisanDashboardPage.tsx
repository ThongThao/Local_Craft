import React, { useState, useEffect } from 'react';
import {
  CraftVillageData,
  ArtisanProfileItem,
  CraftProductItem,
  CraftWorkshopItem,
  OrderItemRecord,
  WorkshopBookingRecord,
  HeritageStoryItem,
} from './types';
import {
  INITIAL_VILLAGES,
  INITIAL_PRODUCTS,
  INITIAL_WORKSHOPS,
  INITIAL_ORDERS,
  INITIAL_BOOKINGS,
  INITIAL_HERITAGE_STORIES,
  REVENUE_CHART_DATA,
} from './data/artisanDashboardData';
import { ProductDto } from '@/services/api/products';

import ArtisanSidebar, { SidebarTabKey, SidebarNavCounts } from './components/ArtisanSidebar';
import ArtisanTopHeader from './components/ArtisanTopHeader';
import ArtisanHeroGreeting from './components/ArtisanHeroGreeting';
import ArtisanMetricCards from './components/ArtisanMetricCards';
import ArtisanGrowthChart from './components/ArtisanGrowthChart';
import ArtisanShowcaseGrid from './components/ArtisanShowcaseGrid';
import ArtisanOperationsTable from './components/ArtisanOperationsTable';
import ArtisanRecentActivities from './components/ArtisanRecentActivities';

import OverviewTab from './components/tabs/OverviewTab';
import ArtisansManagerTab from './components/tabs/ArtisansManagerTab';
import ProductsManagerTab from './components/tabs/ProductsManagerTab';
import VariantsInventoryTab from './components/tabs/VariantsInventoryTab';
import WorkshopsManagerTab from './components/tabs/WorkshopsManagerTab';
import OrdersBookingsTab from './components/tabs/OrdersBookingsTab';
import HeritageStoriesTab from './components/tabs/HeritageStoriesTab';
import VillageProfileTab from './components/tabs/VillageProfileTab';

import AddArtisanModal from './components/modals/AddArtisanModal';
import AddProductModal from './components/modals/AddProductModal';
import AddWorkshopModal from './components/modals/AddWorkshopModal';
import PublicPreviewModal from './components/modals/PublicPreviewModal';
import {
  artisansApi,
  villagesApi,
  productsApi,
  discoveryApi,
  ordersApi,
  bookingsApi,
} from '@/services/api';

export interface ArtisanDashboardPageProps {
  onBackToHome?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
}

export type DashboardTabKey =
  | 'overview'
  | 'products'
  | 'variants'
  | 'workshops'
  | 'bookings'
  | 'orders'
  | 'revenue'
  | 'reviews'
  | 'settings'
  | 'artisans'
  | 'stories';

export const ArtisanDashboardPage: React.FC<ArtisanDashboardPageProps> = ({
  onBackToHome,
  onNavigateToProfile,
  onLogout,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('artisans');

  // Primary Village & Artisan
  // Primary Village & Artisan
  const [selectedVillage, setSelectedVillage] = useState<CraftVillageData>(INITIAL_VILLAGES[0]);
  const [artisansList, setArtisansList] = useState<ArtisanProfileItem[]>([]);
  const [isLoadingArtisans, setIsLoadingArtisans] = useState<boolean>(true);
  const [artisanError, setArtisanError] = useState<string | null>(null);
  const [currentArtisan, setCurrentArtisan] = useState<ArtisanProfileItem | null>(null);

  // Management Collections
  const [productsList] = useState<CraftProductItem[]>(INITIAL_PRODUCTS);
  const [workshopsList, setWorkshopsList] = useState<CraftWorkshopItem[]>(INITIAL_WORKSHOPS);
  const [ordersList, setOrdersList] = useState<OrderItemRecord[]>(INITIAL_ORDERS);
  const [bookingsList, setBookingsList] = useState<WorkshopBookingRecord[]>(INITIAL_BOOKINGS);
  const [storiesList, setStoriesList] = useState<HeritageStoryItem[]>(INITIAL_HERITAGE_STORIES);

  // Modals state
  const [artisanModalOpen, setArtisanModalOpen] = useState<boolean>(false);
  const [editingArtisan, setEditingArtisan] = useState<ArtisanProfileItem | null>(null);

  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [productRefreshTrigger, setProductRefreshTrigger] = useState<number>(0);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<ProductDto | null>(null);

  const [workshopModalOpen, setWorkshopModalOpen] = useState<boolean>(false);
  const [editingWorkshop, setEditingWorkshop] = useState<CraftWorkshopItem | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real DB counts for Sidebar Navigation
  const [sidebarCounts, setSidebarCounts] = useState<SidebarNavCounts>({
    artisans: undefined,
    products: undefined,
    workshops: undefined,
    bookings: undefined,
    orders: undefined,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Load sidebar navigation counts directly from real backend APIs
  const loadSidebarCounts = async () => {
    try {
      const [artRes, prodRes, wsRes, ordRes, bkRes] = await Promise.allSettled([
        artisansApi.getAll(),
        productsApi.getSummary(),
        discoveryApi.getWorkshops(),
        ordersApi.getVendorOrders(),
        bookingsApi.getMyBookings(),
      ]);

      const counts: SidebarNavCounts = {};

      if (artRes.status === 'fulfilled' && artRes.value.success && Array.isArray(artRes.value.data)) {
        counts.artisans = artRes.value.data.length;
      }
      if (prodRes.status === 'fulfilled' && prodRes.value.success && prodRes.value.data) {
        counts.products = prodRes.value.data.total;
      }
      if (wsRes.status === 'fulfilled' && wsRes.value.success && Array.isArray(wsRes.value.data)) {
        counts.workshops = wsRes.value.data.length;
      }
      if (ordRes.status === 'fulfilled' && ordRes.value.success && Array.isArray(ordRes.value.data)) {
        counts.orders = ordRes.value.data.length;
      }
      if (bkRes.status === 'fulfilled' && bkRes.value.success && Array.isArray(bkRes.value.data)) {
        counts.bookings = bkRes.value.data.length;
      }

      setSidebarCounts((prev) => ({
        ...prev,
        ...counts,
      }));
    } catch (err) {
      console.warn('Failed to load sidebar counts from DB:', err);
    }
  };

  // Load artisans from backend (scoped to logged in village manager)
  const loadArtisans = async () => {
    setIsLoadingArtisans(true);
    setArtisanError(null);
    try {
      const res = await artisansApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        const mapped: ArtisanProfileItem[] = res.data.map((ba) => ({
          id: ba.artisan_id,
          villageId: ba.village,
          villageName: ba.village_name || selectedVillage.name,
          villageProvince: ba.village_province || selectedVillage.province,
          displayName: ba.display_name,
          avatarUrl: ba.avatar_url,
          bio: ba.bio || '',
          experienceYears: ba.experience_years ?? 0,
          verificationStatus: (ba.verification_status as any) || 'PENDING',
          verificationNote: (ba as any).verification_note,
          productCount: ba.product_count ?? 0,
          workshopCount: ba.workshop_count ?? 0,
          createdAt: (ba as any).created_at || new Date().toISOString(),
          updatedAt: (ba as any).updated_at,
        }));
        setArtisansList(mapped);
        setSidebarCounts((prev) => ({ ...prev, artisans: mapped.length }));
        if (mapped.length > 0) {
          setCurrentArtisan(mapped[0]);
        }
      } else {
        setArtisansList([]);
      }
    } catch (err: any) {
      console.error('Error fetching artisans:', err);
      setArtisanError(err?.message || 'Không thể tải danh sách nghệ nhân từ máy chủ.');
      setArtisansList([]);
    } finally {
      setIsLoadingArtisans(false);
    }
  };

  // Fetch logged-in craft village manager's village (V02 Source of Truth)
  useEffect(() => {
    villagesApi
      .getMyVillage()
      .then((res) => {
        if (res.success && res.data) {
          const mv = res.data;
          setSelectedVillage((prev) => ({
            ...prev,
            villageId: mv.village_id,
            name: mv.village_name,
            slug: mv.slug,
            description: mv.description || '',
            province: mv.province,
            district: mv.district || '',
            address: mv.address || '',
            latitude: mv.latitude ? Number(mv.latitude) : prev.latitude,
            longitude: mv.longitude ? Number(mv.longitude) : prev.longitude,
            coverImage: mv.cover_image_url || prev.coverImage,
            status: mv.status || 'ACTIVE',
            activeArtisansCount: mv.artisan_count ?? prev.activeArtisansCount,
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch managed village profile:', err);
      });

    loadArtisans();
    loadSidebarCounts();
  }, []);

  // Sync sidebar product count when products are created/updated/deleted
  useEffect(() => {
    productsApi
      .getSummary()
      .then((res) => {
        if (res.success && res.data) {
          setSidebarCounts((prev) => ({ ...prev, products: res.data.total }));
        }
      })
      .catch((err) => {
        console.warn('Could not refresh product summary count:', err);
      });
  }, [productRefreshTrigger]);

  // Quick Open Modal Handler
  const handleOpenAddModal = (type: 'artisan' | 'product' | 'workshop') => {
    if (type === 'artisan') {
      setEditingArtisan(null);
      setArtisanModalOpen(true);
    } else if (type === 'product') {
      setEditingProduct(null);
      setProductModalOpen(true);
    } else if (type === 'workshop') {
      setEditingWorkshop(null);
      setWorkshopModalOpen(true);
    }
  };

  // Artisan Actions (V04 Form & V03 Sync with real Backend API)
  const handleSaveArtisan = async (data: Partial<ArtisanProfileItem>): Promise<boolean> => {
    try {
      if (editingArtisan) {
        // Mode Edit (Cập nhật hồ sơ đang chọn từ V03)
        const updatePayload = {
          display_name: data.displayName,
          avatar_url: data.avatarUrl || undefined,
          bio: data.bio || '',
          experience_years: data.experienceYears,
        };
        const res = await artisansApi.update(editingArtisan.id, updatePayload);
        if (res?.success && res.data) {
          const updated = res.data;
          setArtisansList((prev) =>
            prev.map((a) =>
              a.id === editingArtisan.id
                ? ({
                    ...a,
                    displayName: updated.display_name,
                    avatarUrl: updated.avatar_url,
                    bio: updated.bio || '',
                    experienceYears: updated.experience_years ?? a.experienceYears,
                    verificationStatus: (updated.verification_status as any) || a.verificationStatus,
                    verificationNote: (updated as any).verification_note ?? a.verificationNote,
                    updatedAt: new Date().toISOString(),
                  } as ArtisanProfileItem)
                : a
            )
          );
          showToast(`✓ Đã cập nhật thành công hồ sơ nghệ nhân: ${updated.display_name}`);
          setArtisanModalOpen(false);
          setEditingArtisan(null);
          return true;
        } else {
          showToast(res?.message || 'Không thể cập nhật hồ sơ nghệ nhân.');
          return false;
        }
      } else {
        // Mode Create (Thêm mới hồ sơ nghệ nhân vào làng nghề)
        const createPayload = {
          village: selectedVillage.villageId,
          display_name: data.displayName || '',
          avatar_url: data.avatarUrl || undefined,
          bio: data.bio || '',
          experience_years: data.experienceYears ?? 0,
        };
        const res = await artisansApi.create(createPayload);
        if (res?.success && res.data) {
          const created = res.data;
          const newArtisan: ArtisanProfileItem = {
            id: created.artisan_id,
            villageId: created.village,
            villageName: selectedVillage.name,
            villageProvince: selectedVillage.province,
            displayName: created.display_name,
            avatarUrl: created.avatar_url,
            bio: created.bio || '',
            experienceYears: created.experience_years ?? 0,
            verificationStatus: (created.verification_status as any) || 'PENDING',
            verificationNote: (created as any).verification_note,
            productCount: 0,
            workshopCount: 0,
            createdAt: (created as any).created_at || new Date().toISOString(),
            updatedAt: (created as any).updated_at,
          };
          setArtisansList((prev) => [newArtisan, ...prev]);
          setSidebarCounts((prev) => ({ ...prev, artisans: (prev.artisans ?? 0) + 1 }));
          showToast(`✓ Đã thêm mới thành công hồ sơ nghệ nhân: ${newArtisan.displayName}`);
          setArtisanModalOpen(false);
          setEditingArtisan(null);
          return true;
        } else {
          showToast(res?.message || 'Không thể tạo mới hồ sơ nghệ nhân.');
          return false;
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ nghệ nhân.');
      return false;
    }
  };

  const handleDeleteArtisan = async (artisanId: number) => {
    try {
      const res = await artisansApi.delete(artisanId);
      if (res.success) {
        setArtisansList((prev) => prev.filter((a) => a.id !== artisanId));
        setSidebarCounts((prev) => ({
          ...prev,
          artisans: Math.max(0, (prev.artisans ?? 1) - 1),
        }));
        showToast('✓ Đã xóa hồ sơ nghệ nhân thành công.');
      } else {
        showToast(res.message || 'Xóa hồ sơ nghệ nhân thất bại.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa hồ sơ nghệ nhân.');
    }
  };



  // Workshop Actions
  const handleSaveWorkshop = (data: Partial<CraftWorkshopItem>) => {
    if (editingWorkshop) {
      setWorkshopsList((prev) =>
        prev.map((w) => (w.id === editingWorkshop.id ? ({ ...w, ...data } as CraftWorkshopItem) : w))
      );
      showToast(`Đã cập nhật workshop: ${data.title || editingWorkshop.title}`);
    } else {
      const newWs: CraftWorkshopItem = {
        id: Date.now(),
        title: data.title || 'Workshop Trải Nghiệm Mới',
        artisanId: data.artisanId || (currentArtisan ? currentArtisan.id : 0),
        artisanName: data.artisanName || (currentArtisan ? currentArtisan.displayName : ''),
        categoryName: data.categoryName || 'Trải nghiệm làm gốm thủ công',
        pricePerPerson: data.pricePerPerson || 450000,
        formattedPrice: data.formattedPrice || `${(data.pricePerPerson || 450000).toLocaleString('vi-VN')}₫ / người`,
        durationMinutes: data.durationMinutes || 150,
        maxParticipants: data.maxParticipants || 12,
        enrolledCount: data.enrolledCount || 0,
        coverImage:
          data.coverImage ||
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        nextSessionDate: data.nextSessionDate || '14:00 - Thứ Bảy tuần này',
        status: data.status || 'OPEN',
        rating: data.rating || 5.0,
        location: data.location || selectedVillage.name,
      };
      setWorkshopsList((prev) => [newWs, ...prev]);
      showToast(`Đã mở lịch workshop mới: ${newWs.title}`);
    }
    setWorkshopModalOpen(false);
    setEditingWorkshop(null);
  };

  const handleDeleteWorkshop = (workshopId: number) => {
    setWorkshopsList((prev) => prev.filter((w) => w.id !== workshopId));
    showToast('Đã xóa lớp workshop');
  };

  // Order & Booking Status Updates
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderItemRecord['status']) => {
    setOrdersList((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
    showToast(`Đơn hàng ${orderId} đã cập nhật sang trạng thái: ${newStatus}`);
  };

  const handleCheckInBooking = (bookingId: string) => {
    setBookingsList((prev) =>
      prev.map((b) => (b.bookingId === bookingId ? { ...b, status: 'CHECKED_IN' } : b))
    );
    showToast(`Đã điểm danh đón khách cho lịch đặt: ${bookingId}`);
  };

  const handleLikeStory = (storyId: number) => {
    setStoriesList((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, likes: s.likes + 1 } : s))
    );
    showToast('Cảm ơn bạn đã lưu giữ và yêu thích câu chuyện làng nghề!');
  };

  return (
    <div className="artisan-v2-container">
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="artisan-toast-banner">
          <span className="toast-icon">✨</span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* 1. Left Sidebar Navigation */}
      <ArtisanSidebar
        activeTab={activeTab as SidebarTabKey}
        onSelectTab={(tab) => {
          setActiveTab(tab as DashboardTabKey);
        }}
        onBackToHome={onBackToHome}
        counts={sidebarCounts}
        villageName={selectedVillage.name}
        villageSubtitle="OCOP 5 Sao Quốc Gia"
        villageId={selectedVillage.villageId}
      />

      {/* 2. Content Wrapper (TopBar + Main Area) */}
      <div className="artisan-v2-content-wrap">
        {/* Top Header Bar (Shown on overview and operational tabs, hidden on Village Profile per V02 design) */}
        {activeTab !== 'settings' && (
          <ArtisanTopHeader
            onBackToHome={onBackToHome}
            onNavigateToProfile={onNavigateToProfile}
            onLogout={onLogout}
          />
        )}

        {/* Main Dashboard Views */}
        <main className="artisan-v2-main-content">
          {/* View 1: TỔNG QUAN (V01 - Dashboard Làng Nghề) */}
          {activeTab === 'overview' && (
            <>
              {/* B. Hero / Banner */}
              <ArtisanHeroGreeting
                onOpenAddProduct={() => handleOpenAddModal('product')}
                onOpenAddWorkshop={() => handleOpenAddModal('workshop')}
                onExportReport={() => showToast('Đang kết xuất báo cáo di sản PDF & bảng kê đối soát...')}
              />

              {/* C. KPI tổng quan (5 chỉ số chính + đánh giá) */}
              <ArtisanMetricCards
                onSelectMetricTab={(tab) => setActiveTab(tab as DashboardTabKey)}
              />

              {/* D. Biểu đồ hoạt động ("Hiệu quả hoạt động" với bộ lọc thời gian & chỉ số) */}
              <ArtisanGrowthChart />

              {/* E. Sản phẩm nổi bật (Top 4 tác phẩm độc bản, "Xem tất cả" dẫn tới V05) */}
              <ArtisanShowcaseGrid
                onManageAll={() => setActiveTab('products')}
                onSelectItem={(id) => showToast(`Xem chi tiết tác phẩm: ${id}`)}
              />

              {/* F. Lượt đặt workshop gần đây (4 lượt, 7 cột, "Xem tất cả" dẫn tới V11, chi tiết V12) */}
              <ArtisanOperationsTable
                onViewAll={() => setActiveTab('orders')}
                onViewBookingDetail={(id) => showToast(`Xem chi tiết lượt đặt: ${id} (V12)`)}
                onPrintReceipt={(id) => showToast(`Đang kết nối máy in phiếu đón tiếp cho mã ${id}...`)}
              />

              {/* G. Hoạt động gần đây (5 hoạt động mới nhất) */}
              <ArtisanRecentActivities
                onViewActivityDetail={(id) => showToast(`Chi tiết diễn biến hoạt động: ${id}`)}
              />
            </>
          )}

          {/* View 2: SẢN PHẨM THỦ CÔNG (V05) */}
          {activeTab === 'products' && (
            <ProductsManagerTab
              onOpenAddModal={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setProductModalOpen(true);
              }}
              onManageVariants={(p) => {
                setSelectedProductForVariants(p);
                setActiveTab('variants');
              }}
              showToast={showToast}
              refreshTrigger={productRefreshTrigger}
            />
          )}

          {/* View 2.5: QUẢN LÝ BIẾN THỂ & TỒN KHO (V07) */}
          {activeTab === 'variants' && (
            <VariantsInventoryTab
              product={selectedProductForVariants}
              onBackToProducts={() => setActiveTab('products')}
              onSelectProduct={(p) => setSelectedProductForVariants(p)}
              showToast={showToast}
              villageId={selectedVillage.villageId}
            />
          )}

          {/* View 3: WORKSHOP & TRẢI NGHIỆM */}
          {activeTab === 'workshops' && (
            <WorkshopsManagerTab
              workshops={workshopsList}
              onOpenAddModal={() => {
                setEditingWorkshop(null);
                setWorkshopModalOpen(true);
              }}
              onEditWorkshop={(w) => {
                setEditingWorkshop(w);
                setWorkshopModalOpen(true);
              }}
              onDeleteWorkshop={handleDeleteWorkshop}
            />
          )}

          {/* View 4: LỊCH ĐẶT & ĐƠN HÀNG */}
          {(activeTab === 'orders' || activeTab === 'bookings') && (
            <OrdersBookingsTab
              initialSubTab={activeTab === 'bookings' ? 'bookings' : 'orders'}
              orders={ordersList}
              bookings={bookingsList}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onCheckInBooking={handleCheckInBooking}
            />
          )}

          {/* View 5: DOANH THU & ĐỐI SOÁT */}
          {activeTab === 'revenue' && (
            <OverviewTab
              village={selectedVillage}
              artisan={
                currentArtisan || {
                  id: 0,
                  villageId: selectedVillage.villageId,
                  displayName: 'Chưa có nghệ nhân',
                  experienceYears: 0,
                  verificationStatus: 'PENDING',
                  productCount: 0,
                  workshopCount: 0,
                  createdAt: new Date().toISOString(),
                }
              }
              products={productsList}
              workshops={workshopsList}
              orders={ordersList}
              bookings={bookingsList}
              chartData={REVENUE_CHART_DATA}
              onOpenAddModal={handleOpenAddModal}
              onViewAllOrders={() => setActiveTab('orders')}
              onViewAllWorkshops={() => setActiveTab('workshops')}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onCheckInBooking={handleCheckInBooking}
            />
          )}

          {/* View 6: ĐÁNH GIÁ CỦA DU KHÁCH / KÝ SỰ */}
          {(activeTab === 'reviews' || activeTab === 'stories') && (
            <HeritageStoriesTab
              stories={storiesList}
              onOpenCreateStory={() => showToast('Mở trình tạo bài ký sự & đánh giá mới')}
              onLikeStory={handleLikeStory}
            />
          )}

          {/* View 7: HỒ SƠ NGHỆ NHÂN (V03) */}
          {activeTab === 'artisans' && (
            <ArtisansManagerTab
              artisans={artisansList}
              isLoading={isLoadingArtisans}
              errorMessage={artisanError}
              onRetry={loadArtisans}
              onOpenAddModal={() => {
                setEditingArtisan(null);
                setArtisanModalOpen(true);
              }}
              onEditArtisan={(a) => {
                setEditingArtisan(a);
                setArtisanModalOpen(true);
              }}
              onDeleteArtisan={handleDeleteArtisan}
              showToast={showToast}
            />
          )}

          {/* View 8: V02 – HỒ SƠ LÀNG NGHỀ */}
          {activeTab === 'settings' && (
            <VillageProfileTab
              village={selectedVillage}
              onSaveVillage={(updated) => {
                setSelectedVillage(updated);
                showToast(`✓ Đã cập nhật thành công hồ sơ làng nghề: ${updated.name}`);
              }}
              onPreviewPublic={() => setPreviewModalOpen(true)}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddArtisanModal
        isOpen={artisanModalOpen}
        onClose={() => {
          setArtisanModalOpen(false);
          setEditingArtisan(null);
        }}
        onSave={handleSaveArtisan}
        initialData={editingArtisan}
        villageName={selectedVillage.name}
      />

      <AddProductModal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        initialData={editingProduct}
        villageName={selectedVillage.name}
        onSaveSuccess={() => {
          setProductRefreshTrigger((prev) => prev + 1);
        }}
        showToast={showToast}
      />

      <AddWorkshopModal
        isOpen={workshopModalOpen}
        onClose={() => {
          setWorkshopModalOpen(false);
          setEditingWorkshop(null);
        }}
        onSave={handleSaveWorkshop}
        initialData={editingWorkshop}
        artisans={artisansList}
      />

      <PublicPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        village={selectedVillage}
        artisan={
          currentArtisan || {
            id: 0,
            villageId: selectedVillage.villageId,
            displayName: 'Chưa có nghệ nhân',
            experienceYears: 0,
            verificationStatus: 'PENDING',
            productCount: 0,
            workshopCount: 0,
            createdAt: new Date().toISOString(),
          }
        }
        products={productsList}
        workshops={workshopsList}
      />
    </div>
  );
};

export default ArtisanDashboardPage;
