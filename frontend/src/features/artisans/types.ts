export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ArtisanProfileItem {
  id: number;
  villageId: number;
  villageName?: string;
  villageProvince?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  productCount: number;
  workshopCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CraftVillageData {
  villageId: number;
  name: string;
  slug: string;
  province: string;
  district: string;
  ward?: string;
  address?: string;
  establishedPeriod: string; // e.g. "Từ thế kỷ 14"
  coverImage: string;
  logoUrl?: string;
  tagline: string;
  description: string;
  detailedHistory?: string;
  phone?: string;
  email?: string;
  website?: string;
  managerName?: string;
  openingHours?: string;
  directionsGuide?: string;
  latitude?: number;
  longitude?: number;
  galleryImages?: string[];
  activeArtisansCount: number;
  activeProductsCount: number;
  activeWorkshopsCount: number;
  totalMonthlyVisitors: number;
  trustScore: number; // e.g. 99.4%
  ocopLevel: number; // 3, 4, 5 sao
  status?: string;
}

export interface CraftProductItem {
  id: number;
  name: string;
  artisanId: number;
  artisanName: string;
  category: string;
  categoryName: string;
  basePrice: number;
  formattedPrice: string;
  stockQuantity: number;
  coverImage: string;
  material: string;
  storyExcerpt: string;
  ocopStars?: number; // 4 sao, 5 sao
  status: 'APPROVED' | 'DRAFT' | 'SOLD_OUT';
  isFeatured?: boolean;
  salesCount: number;
  createdAt: string;
}

export interface CraftWorkshopItem {
  id: number;
  title: string;
  artisanId: number;
  artisanName: string;
  categoryName: string;
  pricePerPerson: number;
  formattedPrice: string;
  durationMinutes: number;
  maxParticipants: number;
  enrolledCount: number;
  coverImage: string;
  nextSessionDate: string; // e.g. "14:00 - Thứ Bảy, 18/10"
  status: 'OPEN' | 'FULL' | 'COMPLETED' | 'DRAFT';
  rating: number;
  location: string;
}

export interface OrderItemRecord {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  formattedAmount: string;
  orderDate: string;
  status: 'PENDING' | 'PREPARING' | 'SHIPPING' | 'COMPLETED';
  paymentMethod: 'VNPAY' | 'COD' | 'MOMO' | 'BANK_TRANSFER';
  isCustomOrder?: boolean;
}

export interface WorkshopBookingRecord {
  bookingId: string;
  workshopTitle: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  sessionTime: string;
  totalAmount: number;
  formattedAmount: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED';
  qrCode: string;
  specialNote?: string;
}

export interface HeritageStoryItem {
  id: number;
  title: string;
  artisanName: string;
  excerpt: string;
  coverImage: string;
  readTime: string;
  views: number;
  likes: number;
  publishedAt: string;
  tag: string;
}

export interface KpiMetricCard {
  id: string;
  title: string;
  value: string;
  subtext: string;
  changePercent: string;
  changePositive: boolean;
  accentColor: string;
  iconName: string;
}

export interface MonthlyRevenueData {
  month: string;
  productRevenue: number; // Triệu VND
  workshopRevenue: number; // Triệu VND
  visitors: number;
}
