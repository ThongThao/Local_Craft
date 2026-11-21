import React, { useState, useEffect } from 'react';
import {
  CraftVillageData,
  ArtisanProfileItem,
  CraftProductItem,
  CraftWorkshopItem,
  HeritageStoryItem,
} from './types';
import {
  INITIAL_VILLAGES,
  INITIAL_PRODUCTS,
  INITIAL_WORKSHOPS,
  INITIAL_HERITAGE_STORIES,
} from './data/artisanDashboardData';
import { ProductDto } from '@/services/api/products';

import ArtisanSidebar, { SidebarTabKey, SidebarNavCounts } from './components/ArtisanSidebar';
import ArtisanTopHeader from './components/ArtisanTopHeader';
import ArtisanHeroGreeting from './components/ArtisanHeroGreeting';
import ArtisanMetricCards, { ArtisanMetricData } from './components/ArtisanMetricCards';
import ArtisanGrowthChart from './components/ArtisanGrowthChart';
import ArtisanShowcaseGrid, { ShowcaseProductItem } from './components/ArtisanShowcaseGrid';
import ArtisanOperationsTable, { OperationBookingItem } from './components/ArtisanOperationsTable';
import ArtisanRecentActivities, { RecentActivityItem } from './components/ArtisanRecentActivities';

import ArtisansManagerTab from './components/tabs/ArtisansManagerTab';
import ProductsManagerTab from './components/tabs/ProductsManagerTab';
import VariantsInventoryTab from './components/tabs/VariantsInventoryTab';
import WorkshopsManagerTab from './components/tabs/WorkshopsManagerTab';
import WorkshopSchedulesTab from './components/tabs/WorkshopSchedulesTab';
import WorkshopBookingsTab from './components/tabs/WorkshopBookingsTab';
import VillageOrdersTab from './components/tabs/VillageOrdersTab';
import HeritageStoriesTab from './components/tabs/HeritageStoriesTab';
import VillageProfileTab from './components/tabs/VillageProfileTab';
import ReviewsManagerTab from './components/tabs/ReviewsManagerTab';
import ActivityStatisticsTab from './components/tabs/ActivityStatisticsTab';

import AddArtisanModal from './components/modals/AddArtisanModal';
import AddProductModal from './components/modals/AddProductModal';
import AddWorkshopModal from './components/modals/AddWorkshopModal';
import PublicPreviewModal from './components/modals/PublicPreviewModal';
import {
  authApi,
  artisansApi,
  villagesApi,
  productsApi,
  ordersApi,
  bookingsApi,
  workshopsApi,
  reviewsApi,
  storiesApi,
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
  | 'schedules'
  | 'bookings'
  | 'orders'
  | 'revenue'
  | 'reviews'
  | 'settings'
  | 'artisans'
  | 'stories';

export const ArtisanDashboardPage: React.FC<ArtisanDashboardPageProps> = ({
  onBackToHome: _onBackToHome,
  onNavigateToProfile: _onNavigateToProfile,
  onLogout,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<DashboardTabKey>('overview');
  const [selectedWorkshopForSchedulesId, setSelectedWorkshopForSchedulesId] = useState<number | null>(null);
  const [selectedWorkshopForBookingsId, setSelectedWorkshopForBookingsId] = useState<number | null>(null);

  // User Profile
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    name: string;
    role: string;
    avatarUrl?: string;
  }>({
    name: 'Quản lý làng nghề',
    role: 'Quản lý làng nghề',
  });

  // Primary Village (Single source of truth for logged-in Craft Village Manager)
  const [selectedVillage, setSelectedVillage] = useState<CraftVillageData>(INITIAL_VILLAGES[0]);

  const [artisansList, setArtisansList] = useState<ArtisanProfileItem[]>([]);
  const [isLoadingArtisans, setIsLoadingArtisans] = useState<boolean>(true);
  const [artisanError, setArtisanError] = useState<string | null>(null);
  const [currentArtisan, setCurrentArtisan] = useState<ArtisanProfileItem | null>(null);

  // Management Collections
  const [productsList] = useState<CraftProductItem[]>(INITIAL_PRODUCTS);
  const [workshopsList, setWorkshopsList] = useState<CraftWorkshopItem[]>(INITIAL_WORKSHOPS);
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
  const [workshopRefreshTrigger, setWorkshopRefreshTrigger] = useState<number>(0);

  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overview dynamic datasets
  const [overviewMetrics, setOverviewMetrics] = useState<ArtisanMetricData | undefined>(undefined);
  const [overviewShowcaseProducts, setOverviewShowcaseProducts] = useState<ShowcaseProductItem[]>([]);
  const [overviewRecentBookings, setOverviewRecentBookings] = useState<OperationBookingItem[]>([]);
  const [overviewRecentActivities, setOverviewRecentActivities] = useState<RecentActivityItem[]>([]);

  // Real DB counts for Sidebar Navigation & Overview KPIs
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

  // Load sidebar navigation counts and live overview collections directly from real backend APIs
  const loadSidebarCounts = async () => {
    try {
      const [artRes, prodSummaryRes, prodListRes, wsRes, ordRes, ordSummaryRes, bkRes, revRes, wsSummaryRes, storiesSummaryRes] = await Promise.allSettled([
        artisansApi.getAll(),
        productsApi.getSummary(),
        productsApi.getAll(),
        workshopsApi.getAll(),
        ordersApi.getVendorOrders(),
        ordersApi.getVendorOrdersSummary(),
        bookingsApi.getMyBookings(),
        reviewsApi.getSummary(),
        workshopsApi.getSummary(),
        storiesApi.getSummary(),
      ]);

      const counts: SidebarNavCounts = {};
      let totalProducts = 0;
      let totalWorkshops = 0;
      let totalBookings = 0;
      let totalOrders = 0;
      let totalRevenue = 0;
      let avgRating = 5.0;
      let totalReviews = 0;

      // 1. Artisans
      if (artRes.status === 'fulfilled' && artRes.value.success && Array.isArray(artRes.value.data)) {
        counts.artisans = artRes.value.data.length;
      }

      // 2. Products
      if (prodSummaryRes.status === 'fulfilled' && prodSummaryRes.value.success && prodSummaryRes.value.data) {
        counts.products = prodSummaryRes.value.data.total;
        totalProducts = prodSummaryRes.value.data.total;
      }
      if (prodListRes.status === 'fulfilled' && prodListRes.value.success && Array.isArray(prodListRes.value.data)) {
        if (!totalProducts) totalProducts = prodListRes.value.data.length;
        const mappedShowcase: ShowcaseProductItem[] = prodListRes.value.data.slice(0, 4).map((p: any) => {
          let statusLabel = 'Đang mở bán';
          let statusClass = 'dark-green';
          let stockNote = 'Sẵn sàng giao';

          if (p.status === 'PENDING') {
            statusLabel = 'Chờ duyệt';
            statusClass = 'amber';
            stockNote = 'Chờ quản trị duyệt';
          } else if (p.status === 'DRAFT') {
            statusLabel = 'Bản nháp';
            statusClass = 'gray';
            stockNote = 'Chưa phát hành';
          } else if (p.status === 'HIDDEN') {
            statusLabel = 'Tạm ẩn';
            statusClass = 'gray';
            stockNote = 'Đang tạm ẩn';
          } else if (p.status === 'REJECTED') {
            statusLabel = 'Từ chối';
            statusClass = 'red';
            stockNote = 'Cần cập nhật';
          } else if (p.business_state === 'OUT_OF_STOCK') {
            statusLabel = 'Hết hàng';
            statusClass = 'red';
            stockNote = 'Hết hàng';
          }

          return {
            id: p.product_id,
            name: p.product_name,
            artisanName: p.artisan_name || 'Nghệ nhân làng nghề',
            category: p.category_name || 'Thủ công mỹ nghệ',
            image: p.cover_image_url || 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80',
            price: `${Number(p.base_price || 0).toLocaleString('vi-VN')} ₫`,
            statusLabel,
            statusClass,
            stockNote,
          };
        });
        setOverviewShowcaseProducts(mappedShowcase);
      }

      // 3. Workshops
      if (wsRes.status === 'fulfilled' && wsRes.value.success && Array.isArray(wsRes.value.data)) {
        counts.workshops = wsRes.value.data.length;
        totalWorkshops = wsRes.value.data.length;
      }

      // 4. Orders
      if (ordRes.status === 'fulfilled' && ordRes.value.success && Array.isArray(ordRes.value.data)) {
        counts.orders = ordRes.value.data.length;
        totalOrders = ordRes.value.data.length;
      }
      if (ordSummaryRes.status === 'fulfilled' && ordSummaryRes.value.success && ordSummaryRes.value.data) {
        totalRevenue += Number(ordSummaryRes.value.data.total_village_revenue || ordSummaryRes.value.data.total_order_amount || 0);
      }

      // 5. Bookings & Workshop Summary (F05.11 Real DB Aggregations)
      if (wsSummaryRes.status === 'fulfilled' && wsSummaryRes.value.success && wsSummaryRes.value.data) {
        counts.bookings = wsSummaryRes.value.data.bookings.total_bookings;
        totalBookings = wsSummaryRes.value.data.bookings.total_bookings;
        totalRevenue += Number(wsSummaryRes.value.data.revenue.net_realized_revenue || 0);
      } else if (bkRes.status === 'fulfilled' && bkRes.value.success && Array.isArray(bkRes.value.data)) {
        counts.bookings = bkRes.value.data.length;
        totalBookings = bkRes.value.data.length;
        const bkList = bkRes.value.data;
        const bookingRevenue = bkList.reduce((acc: number, b: any) => acc + Number(b.total_amount || 0), 0);
        totalRevenue += bookingRevenue;
      }

      if (bkRes.status === 'fulfilled' && bkRes.value.success && Array.isArray(bkRes.value.data)) {
        const bkList = bkRes.value.data;

        const mappedOps: OperationBookingItem[] = bkList.slice(0, 4).map((b: any) => ({
          id: b.booking_code || `WS-${b.booking_id}`,
          customerName: b.customer_name || b.user_name || 'Du khách',
          customerCountry: 'Việt Nam',
          customerAvatarBg: '#FFDBCF',
          customerInitials: (b.customer_name || b.user_name || 'D').slice(0, 2).toUpperCase(),
          workshopName: b.workshop_name || 'Trải nghiệm làng nghề',
          workshopNote: b.special_request || 'Yêu cầu: Hướng dẫn viên làng nghề',
          scheduleTime: b.start_at ? new Date(b.start_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Hôm nay',
          participantsCount: `${String(b.participant_count || 1).padStart(2, '0')} người`,
          totalAmountFormatted: `${Number(b.total_amount || 0).toLocaleString('vi-VN')} ₫`,
          status: b.status,
          statusLabel: b.status === 'CONFIRMED' ? 'Đã xác nhận cọc' : b.status === 'COMPLETED' ? 'Hoàn thành' : b.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chờ đón khách',
        }));
        setOverviewRecentBookings(mappedOps);


      }

      // 6. Reviews (Database-aggregated KPI from reviewsApi.getSummary)
      if (revRes.status === 'fulfilled' && revRes.value.success && revRes.value.data) {
        const revData = revRes.value.data as any;
        if (typeof revData.total_reviews === 'number') {
          totalReviews = revData.total_reviews;
          avgRating = revData.average_rating ?? 5.0;
        } else if (Array.isArray(revData)) {
          totalReviews = revData.length;
          if (totalReviews > 0) {
            const sumRating = revData.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
            avgRating = Number((sumRating / totalReviews).toFixed(2));
          }
        }
        counts.reviews = totalReviews;
      }

      // 7. Stories (Database-aggregated KPI from storiesApi.getSummary)
      if (storiesSummaryRes.status === 'fulfilled' && storiesSummaryRes.value.success && storiesSummaryRes.value.data) {
        counts.stories = storiesSummaryRes.value.data.total_stories;
      }

      setSidebarCounts((prev) => ({
        ...prev,
        ...counts,
      }));

      // Aggregate dynamic recent activities from real orders, bookings, and products
      const recentList: RecentActivityItem[] = [];

      if (ordRes.status === 'fulfilled' && ordRes.value.success && Array.isArray(ordRes.value.data)) {
        ordRes.value.data.slice(0, 3).forEach((ord: any) => {
          recentList.push({
            id: `ord-${ord.vendor_order_id}`,
            type: 'order',
            content: `Đơn hàng #${ord.vendor_order_code || ord.vendor_order_id} trị giá ${Number(ord.total_amount || 0).toLocaleString('vi-VN')} ₫`,
            targetName: ord.recipient_name || ord.customer_name || 'Khách hàng',
            timestamp: ord.order_placed_at
              ? new Date(ord.order_placed_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Gần đây',
          });
        });
      }

      if (bkRes.status === 'fulfilled' && bkRes.value.success && Array.isArray(bkRes.value.data)) {
        bkRes.value.data.slice(0, 3).forEach((bk: any) => {
          recentList.push({
            id: `bk-${bk.booking_id}`,
            type: 'booking',
            content: `Lượt đăng ký trải nghiệm (${bk.participant_count || 1} khách)`,
            targetName: bk.workshop_name || 'Workshop làng nghề',
            timestamp: bk.start_at
              ? new Date(bk.start_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Gần đây',
          });
        });
      }

      if (prodListRes.status === 'fulfilled' && prodListRes.value.success && Array.isArray(prodListRes.value.data)) {
        prodListRes.value.data.slice(0, 2).forEach((prod: any) => {
          recentList.push({
            id: `prod-${prod.product_id}`,
            type: 'product',
            content: `Tác phẩm "${prod.product_name}" trong bộ sưu tập`,
            targetName: prod.artisan_name || 'Làng nghề',
            timestamp: prod.updated_at
              ? new Date(prod.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Đang mở bán',
          });
        });
      }

      setOverviewRecentActivities(recentList.slice(0, 5));

      setOverviewMetrics({
        revenueFormatted: `${totalRevenue.toLocaleString('vi-VN')} ₫`,
        ordersCount: totalOrders,
        workshopsCount: totalWorkshops,
        bookingsCount: totalBookings,
        productsCount: totalProducts,
        averageRating: avgRating,
        reviewsCount: totalReviews,
      });
    } catch (err) {
      console.warn('Failed to load dashboard live collections:', err);
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

    authApi
      .getMe()
      .then((res) => {
        if (res.success && res.data) {
          const roleLabel = res.data.roles?.includes('CRAFT_VILLAGE')
            ? 'Quản lý làng nghề'
            : res.data.roles?.[0] || 'Quản lý';
          setCurrentUserProfile({
            name: res.data.full_name || 'Quản lý làng nghề',
            role: roleLabel,
            avatarUrl: res.data.avatar_url,
          });
        }
      })
      .catch((err) => {
        console.warn('Could not fetch user profile:', err);
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
          showToast(`Đã cập nhật thành công hồ sơ nghệ nhân: ${updated.display_name}`);
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
          showToast(`Đã thêm mới thành công hồ sơ nghệ nhân: ${newArtisan.displayName}`);
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
        showToast('Đã xóa hồ sơ nghệ nhân thành công.');
      } else {
        showToast(res.message || 'Xóa hồ sơ nghệ nhân thất bại.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa hồ sơ nghệ nhân.');
    }
  };



  // Workshop Actions
  const handleWorkshopSaveSuccess = () => {
    setWorkshopRefreshTrigger((prev) => prev + 1);
    loadSidebarCounts();
    setWorkshopModalOpen(false);
    setEditingWorkshop(null);
  };


  const handleDeleteWorkshop = (workshopId: number) => {
    setWorkshopsList((prev) => prev.filter((w) => w.id !== workshopId));
    showToast('Đã xóa lớp workshop');
  };

  const handleLikeStory = (storyId: number) => {
    setStoriesList((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, likes: (s.likes || 0) + 1 } : s))
    );
    showToast('Cảm ơn bạn đã lưu giữ và yêu thích câu chuyện làng nghề!');
  };

  return (
    <div className="artisan-v2-container">
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="artisan-toast-banner">
          <span className="toast-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          </span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="artisan-v2-sidebar-backdrop active"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Left Sidebar Navigation */}
      <ArtisanSidebar
        activeTab={activeTab as SidebarTabKey}
        onSelectTab={(tab) => {
          setActiveTab(tab as DashboardTabKey);
          setMobileSidebarOpen(false);
        }}
        onBackToHome={() => {
          setActiveTab('overview');
          setMobileSidebarOpen(false);
        }}
        counts={sidebarCounts}
        villageName={selectedVillage.name}
        villageSubtitle={selectedVillage.province ? `${selectedVillage.province} · Di sản làng nghề` : 'Cơ sở làng nghề'}
        villageId={selectedVillage.villageId}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Content Wrapper (TopBar + Main Area) */}
      <div className="artisan-v2-content-wrap">
        {/* Top Header Bar (Unified header across all screens: V01 - V17) */}
        <ArtisanTopHeader
          onBackToHome={() => setActiveTab('overview')}
          onNavigateToProfile={() => setActiveTab('settings')}
          onLogout={onLogout}
          userName={currentUserProfile.name}
          userRole={currentUserProfile.role}
          userAvatar={currentUserProfile.avatarUrl}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          villageName={selectedVillage.name}
        />

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
                metrics={overviewMetrics}
                onSelectMetricTab={(tab) => setActiveTab(tab as DashboardTabKey)}
              />

              {/* D. Biểu đồ hoạt động ("Hiệu quả hoạt động" với bộ lọc thời gian & chỉ số) */}
              <ArtisanGrowthChart villageId={selectedVillage.villageId} />

              {/* E. Sản phẩm nổi bật (Top 4 tác phẩm độc bản, "Xem tất cả" dẫn tới V05) */}
              <ArtisanShowcaseGrid
                products={overviewShowcaseProducts}
                onManageAll={() => setActiveTab('products')}
                onSelectItem={(id) => showToast(`Xem chi tiết tác phẩm: ${id}`)}
              />

              {/* F. Lượt đặt workshop gần đây (4 lượt, 7 cột, "Xem tất cả" dẫn tới V11, chi tiết V12) */}
              <ArtisanOperationsTable
                bookings={overviewRecentBookings}
                onViewAll={() => setActiveTab('bookings')}
                onViewBookingDetail={(id) => showToast(`Xem chi tiết lượt đặt: ${id} (V12)`)}
                onPrintReceipt={(id) => showToast(`Đang kết nối máy in phiếu đón tiếp cho mã ${id}...`)}
              />

              {/* G. Hoạt động gần đây (5 hoạt động mới nhất) */}
              <ArtisanRecentActivities
                activities={overviewRecentActivities}
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

          {/* View 3: WORKSHOP & TRẢI NGHIỆM (V08) */}
          {activeTab === 'workshops' && (
            <WorkshopsManagerTab
              onOpenAddModal={() => {
                setEditingWorkshop(null);
                setWorkshopModalOpen(true);
              }}
              onEditWorkshop={(w: any) => {
                setEditingWorkshop(w);
                setWorkshopModalOpen(true);
              }}
              onNavigateToSchedules={(workshopId) => {
                setSelectedWorkshopForSchedulesId(workshopId);
                setActiveTab('schedules');
                showToast(`Chuyển đến V10 – Quản lý lịch cho workshop #${workshopId}`);
              }}
              onNavigateToBookings={(_workshopId) => {
                setActiveTab('bookings');
                showToast('Chuyển đến V11 – Quản lý lượt đặt');
              }}
              showToast={showToast}
              villageId={selectedVillage.villageId}
              refreshTrigger={workshopRefreshTrigger}
              onDeleteWorkshop={handleDeleteWorkshop}
            />
          )}

          {/* View: V10 – QUẢN LÝ LỊCH WORKSHOP */}
          {activeTab === 'schedules' && (
            <WorkshopSchedulesTab
              initialWorkshopId={selectedWorkshopForSchedulesId}
              onBackToWorkshops={() => setActiveTab('workshops')}
              onNavigateToBookings={(workshopId) => {
                setSelectedWorkshopForBookingsId(workshopId || null);
                setActiveTab('bookings');
                showToast('Chuyển đến V11 – Quản lý lượt đặt');
              }}
              showToast={showToast}
              villageId={selectedVillage.villageId}
            />
          )}

          {/* View: V11 – QUẢN LÝ LƯỢT ĐẶT WORKSHOP */}
          {activeTab === 'bookings' && (
            <WorkshopBookingsTab
              initialWorkshopId={selectedWorkshopForBookingsId}
              onBackToWorkshops={() => setActiveTab('workshops')}
              onNavigateToSchedules={(workshopId) => {
                setSelectedWorkshopForSchedulesId(workshopId || null);
                setActiveTab('schedules');
              }}
              showToast={showToast}
              villageId={selectedVillage.villageId}
            />
          )}

          {/* View: V13 – QUẢN LÝ ĐƠN HÀNG LÀNG NGHỀ */}
          {activeTab === 'orders' && (
            <VillageOrdersTab
              showToast={showToast}
              villageId={selectedVillage.villageId}
            />
          )}

          {/* View 5: THỐNG KÊ HOẠT ĐỘNG & DOANH THU (V17) */}
          {activeTab === 'revenue' && (
            <ActivityStatisticsTab
              villageId={selectedVillage.villageId}
              villageName={selectedVillage.name}
              onNavigateToOrders={() => setActiveTab('orders')}
              onNavigateToWorkshops={() => setActiveTab('workshops')}
              onNavigateToProducts={() => setActiveTab('products')}
              onNavigateToBookings={() => setActiveTab('bookings')}
            />
          )}

          {/* View 6: ĐÁNH GIÁ CỦA DU KHÁCH (V15) */}
          {activeTab === 'reviews' && (
            <ReviewsManagerTab
              villageId={selectedVillage.villageId}
              showToast={showToast}
            />
          )}

          {/* View 6.5: CÂU CHUYỆN DI SẢN & KÝ SỰ (V16) */}
          {activeTab === 'stories' && (
            <HeritageStoriesTab
              stories={storiesList}
              villageId={selectedVillage.villageId}
              artisans={artisansList}
              onLikeStory={handleLikeStory}
              showToast={showToast}
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
                showToast(`Đã cập nhật thành công hồ sơ làng nghề: ${updated.name}`);
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
        onSaveSuccess={handleWorkshopSaveSuccess}
        initialData={editingWorkshop as any}
        villageName={selectedVillage.name}
        showToast={showToast}
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
