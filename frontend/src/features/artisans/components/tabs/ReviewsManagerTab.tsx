import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  reviewsApi,
  ReviewDto,
  ReviewSummaryDto,
  ReviewQueryParams,
} from '@/services/api/reviews';
import { LocalCraftPagination } from '../LocalCraftPagination';
import { ReviewDetailModal } from '../modals/ReviewDetailModal';

export interface ReviewsManagerTabProps {
  villageId?: number;
  showToast?: (message: string) => void;
}

/* --- Inline SVG Icons Chuẩn Theme LocalCraft --- */
const IconSearch: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconClose: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRefresh: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconStar: React.FC<{ size?: number; filled?: boolean; className?: string }> = ({ size = 16, filled = true, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#F59E0B' : '#E2E8F0'}
    stroke={filled ? '#F59E0B' : '#CBD5E1'}
    strokeWidth="1"
    className={className}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconMessageSquare: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconCheckCircle: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconBox: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const IconTicket: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconReply: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

const IconCheck: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconLayoutGrid: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconList: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconEye: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ReviewsManagerTab: React.FC<ReviewsManagerTabProps> = ({
  villageId,
  showToast,
}) => {
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCT' | 'WORKSHOP'>('ALL');
  const [filterRating, setFilterRating] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterReplyStatus, setFilterReplyStatus] = useState<'ALL' | 'UNREPLIED' | 'REPLIED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // View Mode: 'card' (Chế độ thẻ lưới) hoặc 'table' (Bảng tổng hợp)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = viewMode === 'card' ? 6 : 9;

  // Detail Modal
  const [selectedReview, setSelectedReview] = useState<ReviewDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [initialEditMode, setInitialEditMode] = useState<boolean>(false);

  // Expanded review contents set for toggle
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  // 1. Fetch KPI Summary (Database Aggregated)
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await reviewsApi.getSummary(villageId);
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch reviews summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [villageId]);

  // 2. Fetch Reviews List with Backend Filters
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params: ReviewQueryParams = {
        village_id: villageId,
        target_type: filterType,
        rating: filterRating !== 'ALL' ? filterRating : undefined,
        status: filterStatus !== 'ALL' ? (filterStatus as 'VISIBLE' | 'HIDDEN') : undefined,
        reply_status: filterReplyStatus !== 'ALL' ? filterReplyStatus : undefined,
        search: searchTerm.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };

      const res = await reviewsApi.getAll(params);
      if (res.success && Array.isArray(res.data)) {
        setReviews(res.data);
      } else {
        setReviews([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đánh giá từ máy chủ.';
      setErrorMessage(msg);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [villageId, filterType, filterRating, filterStatus, filterReplyStatus, searchTerm, fromDate, toDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchReviews();
    setCurrentPage(1);
  }, [fetchReviews]);

  // Client-side pagination over server-filtered reviews
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reviews.slice(start, start + pageSize);
  }, [reviews, currentPage, pageSize]);

  const totalPages = Math.ceil(reviews.length / pageSize) || 1;

  const handleResetFilters = () => {
    setFilterType('ALL');
    setFilterRating('ALL');
    setFilterStatus('ALL');
    setFilterReplyStatus('ALL');
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterType !== 'ALL' ||
    filterRating !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterReplyStatus !== 'ALL' ||
    searchTerm.trim() !== '' ||
    fromDate !== '' ||
    toDate !== '';

  const toggleExpand = (reviewId: number) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleOpenDetail = (rev: ReviewDto, editMode: boolean = false) => {
    setSelectedReview(rev);
    setInitialEditMode(editMode);
    setIsDetailOpen(true);
  };

  const handleRefresh = () => {
    fetchReviews();
    fetchSummary();
    showToast?.('Đã làm mới dữ liệu đánh giá & phản hồi!');
  };

  // Helper format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper calculate percentage for star progress bars
  const totalReviewsCount = summary?.total_reviews || 0;
  const getPct = (count: number) => {
    if (!totalReviewsCount || totalReviewsCount === 0) return 0;
    return Math.round((count / totalReviewsCount) * 100);
  };

  return (
    <div className="artisan-tab-pane artisans-manager-pane v15-reviews-pane">
      {/* 1. Header Toolbar (Chuẩn v03-header-card) */}
      <div className="v03-header-card">
        <div className="v03-header-left">
          <h2 className="v03-header-title">Đánh giá & phản hồi</h2>
          <p className="v03-header-subtitle">
            Theo dõi phản hồi, mức độ hài lòng và trải nghiệm thực tế của du khách; gửi phản hồi chính thức từ làng nghề.
          </p>
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={handleRefresh}
            disabled={isLoading || isSummaryLoading}
            title="Làm mới danh sách và thống kê KPI"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
          >
            <IconRefresh size={14} className={isLoading ? 'v03-spin' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 2. Lưới thẻ chỉ số KPI nhanh (Chuẩn v03-kpi-grid & v15-kpi-grid) */}
      <div className="v03-kpi-grid v15-kpi-grid">
        {/* Card 1: Điểm đánh giá TB */}
        <div className="v03-kpi-card" title="Điểm đánh giá trung bình từ du khách">
          <div className="v03-kpi-icon v15-icon-rating">
            <IconStar size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Điểm đánh giá TB</span>
            <div className="v03-kpi-value" style={{ color: '#F59E0B' }}>
              {isSummaryLoading ? '...' : (summary?.average_rating ? `${summary.average_rating.toFixed(1)} ★` : '5.0 ★')}
            </div>
            <span className="v03-kpi-sub">
              Dựa trên {summary?.total_reviews ?? 0} đánh giá
            </span>
          </div>
        </div>

        {/* Card 2: Tổng lượt đánh giá */}
        <div className="v03-kpi-card" title="Tổng số lượt đánh giá du khách gửi về">
          <div className="v03-kpi-icon v15-icon-reviews">
            <IconMessageSquare size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng lượt đánh giá</span>
            <div className="v03-kpi-value">
              {isSummaryLoading ? '...' : (summary?.total_reviews ?? reviews.length)}
            </div>
            <span className="v03-kpi-sub">Nhận xét thực tế</span>
          </div>
        </div>

        {/* Card 3: Mức độ hài lòng */}
        <div className="v03-kpi-card" title="Tỷ lệ đánh giá 4 sao và 5 sao">
          <div className="v03-kpi-icon v15-icon-positive">
            <IconCheckCircle size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Mức độ hài lòng</span>
            <div className="v03-kpi-value public-val">
              {isSummaryLoading ? '...' : `${summary?.positive_percentage ?? 100}%`}
            </div>
            <span className="v03-kpi-sub">Đánh giá tích cực (4-5★)</span>
          </div>
        </div>

        {/* Card 4: Đánh giá sản phẩm */}
        <div className="v03-kpi-card" title="Số đánh giá dành cho các sản phẩm thủ công">
          <div className="v03-kpi-icon v15-icon-product">
            <IconBox size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đánh giá sản phẩm</span>
            <div className="v03-kpi-value" style={{ color: '#2563EB' }}>
              {isSummaryLoading ? '...' : (summary?.product_reviews_count ?? 0)}
            </div>
            <span className="v03-kpi-sub">Tác phẩm thủ công</span>
          </div>
        </div>

        {/* Card 5: Đánh giá workshop */}
        <div className="v03-kpi-card" title="Số đánh giá dành cho các buổi trải nghiệm workshop">
          <div className="v03-kpi-icon v15-icon-workshop">
            <IconTicket size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đánh giá Workshop</span>
            <div className="v03-kpi-value" style={{ color: '#EA580C' }}>
              {isSummaryLoading ? '...' : (summary?.workshop_reviews_count ?? 0)}
            </div>
            <span className="v03-kpi-sub">Buổi trải nghiệm</span>
          </div>
        </div>

        {/* Card 6: Tiến độ phản hồi của làng nghề (V15) */}
        <div className="v03-kpi-card" title="Tình trạng gửi phản hồi chính thức của làng nghề tới du khách">
          <div className="v03-kpi-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <IconReply size={20} />
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đã phản hồi</span>
            <div className="v03-kpi-value" style={{ color: '#059669' }}>
              {isSummaryLoading ? '...' : `${summary?.replied_count ?? 0} / ${summary?.total_reviews ?? 0}`}
            </div>
            <span className="v03-kpi-sub" style={{ color: (summary?.unreplied_count ?? 0) > 0 ? '#D97706' : '#059669', fontWeight: 600 }}>
              {summary?.unreplied_count ? `${summary.unreplied_count} đánh giá chờ trả lời` : 'Đã phản hồi tất cả'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bento Card: Phân bố số sao chi tiết (Star Distribution & Satisfaction) */}
      <div className="v15-breakdown-card">
        {/* Cột trái: Điểm số Hero */}
        <div className="v15-breakdown-hero">
          <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#717A76', fontWeight: 700 }}>
            Điểm chất lượng làng nghề
          </span>
          <div className="v15-hero-score">
            {summary ? summary.average_rating.toFixed(1) : '5.0'}
          </div>
          <div className="v15-hero-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <IconStar key={s} size={20} />
            ))}
          </div>
          <div className="v15-hero-sub">
            {summary ? `Tổng hợp từ ${summary.total_reviews} phản hồi` : 'Chưa có đánh giá'}
          </div>
          <div className="v15-hero-badge">
            <IconCheckCircle size={14} />
            <span>{summary ? `${summary.positive_percentage}% Hài lòng` : '100% Hài lòng'}</span>
          </div>
        </div>

        {/* Cột phải: Thanh tiến trình 5 mức sao */}
        <div className="v15-breakdown-bars">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
              Phân bố số sao đánh giá
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Tỷ lệ / Số lượt nhận xét
            </span>
          </div>

          {/* 5 sao */}
          <div className="v15-bar-row">
            <div className="v15-bar-label">
              <span>5</span>
              <IconStar size={13} />
            </div>
            <div className="v15-bar-track">
              <div className="v15-bar-fill star-5" style={{ width: `${getPct(summary?.rating_5_count ?? 0)}%` }} />
            </div>
            <div className="v15-bar-stats">
              <strong>{summary?.rating_5_count ?? 0}</strong> ({getPct(summary?.rating_5_count ?? 0)}%)
            </div>
          </div>

          {/* 4 sao */}
          <div className="v15-bar-row">
            <div className="v15-bar-label">
              <span>4</span>
              <IconStar size={13} />
            </div>
            <div className="v15-bar-track">
              <div className="v15-bar-fill star-4" style={{ width: `${getPct(summary?.rating_4_count ?? 0)}%` }} />
            </div>
            <div className="v15-bar-stats">
              <strong>{summary?.rating_4_count ?? 0}</strong> ({getPct(summary?.rating_4_count ?? 0)}%)
            </div>
          </div>

          {/* 3 sao */}
          <div className="v15-bar-row">
            <div className="v15-bar-label">
              <span>3</span>
              <IconStar size={13} />
            </div>
            <div className="v15-bar-track">
              <div className="v15-bar-fill star-3" style={{ width: `${getPct(summary?.rating_3_count ?? 0)}%` }} />
            </div>
            <div className="v15-bar-stats">
              <strong>{summary?.rating_3_count ?? 0}</strong> ({getPct(summary?.rating_3_count ?? 0)}%)
            </div>
          </div>

          {/* 2 sao */}
          <div className="v15-bar-row">
            <div className="v15-bar-label">
              <span>2</span>
              <IconStar size={13} />
            </div>
            <div className="v15-bar-track">
              <div className="v15-bar-fill star-2" style={{ width: `${getPct(summary?.rating_2_count ?? 0)}%` }} />
            </div>
            <div className="v15-bar-stats">
              <strong>{summary?.rating_2_count ?? 0}</strong> ({getPct(summary?.rating_2_count ?? 0)}%)
            </div>
          </div>

          {/* 1 sao */}
          <div className="v15-bar-row">
            <div className="v15-bar-label">
              <span>1</span>
              <IconStar size={13} />
            </div>
            <div className="v15-bar-track">
              <div className="v15-bar-fill star-1" style={{ width: `${getPct(summary?.rating_1_count ?? 0)}%` }} />
            </div>
            <div className="v15-bar-stats">
              <strong>{summary?.rating_1_count ?? 0}</strong> ({getPct(summary?.rating_1_count ?? 0)}%)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Search and Filter Toolbar (Chuẩn v03-filter-card) */}
      <div className="v03-filter-card">
        {/* Row 1: Search, Type, Rating, Status, Reply Status, View mode */}
        <div className="v15-toolbar-row">
          {/* Search Box */}
          <div className="v03-search-wrapper" style={{ minWidth: '220px', flex: '1 1 220px' }}>
            <IconSearch size={16} className="v03-search-icon" />
            <input
              type="text"
              className="v03-search-input"
              placeholder="Tìm theo khách, nội dung, phản hồi, sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="v03-search-clear"
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <IconClose size={12} />
              </button>
            )}
          </div>

          {/* Segmented Control cho Loại đối tượng */}
          <div className="v15-segmented-control">
            <button
              type="button"
              className={`v15-segment-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              Tất cả {summary ? `(${summary.total_reviews})` : ''}
            </button>
            <button
              type="button"
              className={`v15-segment-btn ${filterType === 'PRODUCT' ? 'active' : ''}`}
              onClick={() => setFilterType('PRODUCT')}
            >
              <IconBox size={14} />
              Sản phẩm {summary ? `(${summary.product_reviews_count})` : ''}
            </button>
            <button
              type="button"
              className={`v15-segment-btn ${filterType === 'WORKSHOP' ? 'active' : ''}`}
              onClick={() => setFilterType('WORKSHOP')}
            >
              <IconTicket size={14} />
              Workshop {summary ? `(${summary.workshop_reviews_count})` : ''}
            </button>
          </div>

          {/* Controls: Rating, Status, Reply Status, View toggle, Reset */}
          <div className="v03-filter-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Rating select */}
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="v03-select-box"
              style={{ minWidth: '120px' }}
            >
              <option value="ALL">Mọi số sao</option>
              <option value="5">5 ★★★★★</option>
              <option value="4">4 ★★★★</option>
              <option value="3">3 ★★★</option>
              <option value="2">2 ★★</option>
              <option value="1">1 ★</option>
            </select>

            {/* Reply Status select (V15) */}
            <select
              value={filterReplyStatus}
              onChange={(e) => setFilterReplyStatus(e.target.value as 'ALL' | 'UNREPLIED' | 'REPLIED')}
              className="v03-select-box"
              style={{ minWidth: '160px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả phản hồi</option>
              <option value="UNREPLIED">Chưa phản hồi ({summary?.unreplied_count ?? 0})</option>
              <option value="REPLIED">Đã phản hồi ({summary?.replied_count ?? 0})</option>
            </select>

            {/* Status select */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="v03-select-box"
              style={{ minWidth: '130px' }}
            >
              <option value="ALL">Tất cả hiển thị</option>
              <option value="VISIBLE">Đang hiển thị</option>
              <option value="HIDDEN">Đang ẩn</option>
            </select>

            {/* View Mode Toggle: Card / Table */}
            <div className="v03-view-mode-toggle" role="group" aria-label="Chế độ hiển thị danh sách">
              <button
                type="button"
                className={`v03-toggle-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Xem danh sách dạng bảng dữ liệu"
              >
                <IconList size={15} />
              </button>
              <button
                type="button"
                className={`v03-toggle-view-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
                title="Xem danh sách dạng thẻ lưới"
              >
                <IconLayoutGrid size={15} />
              </button>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                className="v03-btn-reset-filters"
                onClick={handleResetFilters}
                title="Xóa toàn bộ bộ lọc"
                style={{ padding: '7px 12px', fontSize: '12.5px' }}
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date filter bar */}
        <div className="v15-date-bar">
          <div className="v15-date-group">
            <span>Từ ngày:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="v03-date-input"
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
            />
          </div>

          <div className="v15-date-group">
            <span>Đến ngày:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="v03-date-input"
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
            />
          </div>

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#984628',
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'underline',
              }}
            >
              Xóa khoảng ngày
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#717A76', fontWeight: 500 }}>
            Hiển thị <strong>{reviews.length}</strong> đánh giá phù hợp
          </span>
        </div>
      </div>

      {/* 5. Main Content: Reviews Cards / Table View */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #ECE7DE' }}>
          <div className="v03-spinner" style={{ margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: '13.5px', color: '#717A76', fontWeight: 500 }}>
            Đang tải dữ liệu đánh giá từ làng nghề...
          </p>
        </div>
      ) : errorMessage ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FEF2F2', borderRadius: '16px', border: '1px solid #FEE2E2' }}>
          <p style={{ margin: '0 0 12px', color: '#991B1B', fontWeight: 600 }}>{errorMessage}</p>
          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={fetchReviews}
            style={{ padding: '8px 18px', background: '#FFFFFF', cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #ECE7DE' }}>
          <div style={{ color: '#D5CEBF', marginBottom: '14px' }}>
            <IconMessageSquare size={44} />
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1C1C18', fontWeight: 700 }}>
            {hasActiveFilters ? 'Không tìm thấy đánh giá nào phù hợp với bộ lọc' : 'Làng nghề chưa nhận được đánh giá nào'}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#717A76' }}>
            {hasActiveFilters
              ? 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc.'
              : 'Đánh giá từ du khách sau khi nhận sản phẩm hoặc trải nghiệm workshop sẽ hiển thị tại đây.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="artisan-primary-btn"
              onClick={handleResetFilters}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        /* --- CHẾ ĐỘ THẺ CHI TIẾT (Cards View) --- */
        <div className="v15-cards-list">
          {paginatedReviews.map((rev) => {
            const isProduct = rev.target_type === 'PRODUCT' || Boolean(rev.product);
            const isContentLong = (rev.content || '').length > 180;
            const isExpanded = expandedReviews.has(rev.review_id);
            const displayContent =
              isContentLong && !isExpanded ? `${rev.content?.slice(0, 180)}...` : rev.content;
            const hasReply = Boolean(rev.reply_content && rev.reply_content.trim());

            return (
              <div key={rev.review_id} className="v15-card">
                {/* Header: User Info, Rating, Status */}
                <div className="v15-card-header">
                  <div className="v15-card-user">
                    {rev.user_avatar ? (
                      <img
                        src={rev.user_avatar}
                        alt={rev.user_name}
                        className="v15-avatar-img"
                      />
                    ) : (
                      <div className="v15-avatar-initials">
                        {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="v15-user-name">
                        {rev.user_name || 'Du khách ẩn danh'}
                      </div>
                      <div className="v15-user-meta">
                        {rev.user_email ? `${rev.user_email} • ` : ''}
                        {formatDate(rev.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="v15-card-rating">
                    <div className="v15-stars-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <IconStar key={star} size={16} filled={star <= rev.rating} />
                      ))}
                      <span className="v15-score-pill">
                        {rev.rating}.0
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      {hasReply ? (
                        <span className="v15-reply-tag replied">
                          <IconCheck size={12} />
                          <span>Đã phản hồi</span>
                        </span>
                      ) : (
                        <span className="v15-reply-tag unreplied">
                          <IconClock size={12} />
                          <span>Chờ phản hồi</span>
                        </span>
                      )}

                      {rev.status === 'VISIBLE' ? (
                        <span className="v15-status-visible">
                          ● Hiển thị
                        </span>
                      ) : (
                        <span className="v15-status-hidden">
                          ● Ẩn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Chip (Product or Workshop) */}
                <div className="v15-subject-banner">
                  {isProduct ? (
                    <span className="v15-subject-chip product">
                      {rev.product_image ? (
                        <img src={rev.product_image} alt="" className="v15-subject-thumb" />
                      ) : (
                        <IconBox size={14} />
                      )}
                      <span>Sản phẩm: <strong>{rev.product_name || `#${rev.product}`}</strong></span>
                    </span>
                  ) : (
                    <span className="v15-subject-chip workshop">
                      {rev.workshop_image ? (
                        <img src={rev.workshop_image} alt="" className="v15-subject-thumb" />
                      ) : (
                        <IconTicket size={14} />
                      )}
                      <span>
                        Workshop: <strong>{rev.workshop_name || 'Trải nghiệm làng nghề'}</strong>
                      </span>
                    </span>
                  )}
                </div>

                {/* Title & Content */}
                {rev.title && (
                  <h4 className="v15-review-title">
                    {rev.title}
                  </h4>
                )}

                <div className="v15-review-content">
                  {displayContent || (
                    <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>
                      Du khách không để lại nhận xét bằng văn bản.
                    </span>
                  )}
                  {isContentLong && (
                    <button
                      type="button"
                      className="v15-btn-expand"
                      onClick={() => toggleExpand(rev.review_id)}
                    >
                      {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>

                {/* Official Reply Box if exists */}
                {hasReply && (
                  <div className="v15-card-reply-preview">
                    <div className="v15-card-reply-preview-author">
                      <IconReply size={13} />
                      <span>{rev.replied_by_name || 'Đại diện Làng nghề'}:</span>
                    </div>
                    <div>{rev.reply_content}</div>
                  </div>
                )}

                {/* Card Footer: Review ID & Actions */}
                <div className="v15-card-footer">
                  <span className="v15-review-id">
                    Mã đánh giá: #{rev.review_id}
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!hasReply && (
                      <button
                        type="button"
                        className="v15-btn-reply-fast"
                        onClick={() => handleOpenDetail(rev, true)}
                        title="Soạn phản hồi nhanh cho du khách"
                      >
                        <IconReply size={13} />
                        <span>Phản hồi ngay</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="v15-btn-detail"
                      onClick={() => handleOpenDetail(rev, false)}
                      title="Xem chi tiết đánh giá"
                    >
                      <IconEye size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- CHẾ ĐỘ BẢNG TỔNG HỢP (Table View) --- */
        <div className="v03-table-card">
          <table className="v03-artisans-table v08-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '170px' }}>Khách Hàng</th>
                <th style={{ minWidth: '200px' }}>Đối Tượng Đánh Giá</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Điểm Số</th>
                <th style={{ minWidth: '220px' }}>Tiêu Đề & Nhận Xét</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Phản Hồi</th>
                <th style={{ width: '140px' }}>Thời Gian</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReviews.map((rev, index) => {
                const rowStt = (currentPage - 1) * pageSize + index + 1;
                const isProduct = rev.target_type === 'PRODUCT' || Boolean(rev.product);
                const hasReply = Boolean(rev.reply_content && rev.reply_content.trim());

                return (
                  <tr key={rev.review_id} className="v03-table-row">
                    {/* STT */}
                    <td style={{ textAlign: 'center', color: '#717A76', fontSize: '12.5px', fontWeight: 600 }}>
                      #{rowStt}
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {rev.user_avatar ? (
                          <img
                            src={rev.user_avatar}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#1C3B32',
                              color: '#FAF8F5',
                              fontSize: '13px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
                            {rev.user_name || 'Du khách ẩn danh'}
                          </div>
                          {rev.user_email && (
                            <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                              {rev.user_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Đối tượng */}
                    <td>
                      {isProduct ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1C3B32', lineHeight: '1.4' }}>
                            {rev.product_name || `#${rev.product}`}
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#F0FDF4',
                              color: '#166534',
                              border: '1px solid #BBF7D0',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Sản phẩm
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1C3B32', lineHeight: '1.4' }}>
                            {rev.workshop_name || 'Workshop'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#FFFBEB',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                fontSize: '11px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Workshop
                            </span>
                            {rev.booking_code && (
                              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                                #{rev.booking_code}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Điểm số */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <IconStar key={star} size={13} filled={star <= rev.rating} />
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
                        {rev.rating}.0
                      </div>
                    </td>

                    {/* Tiêu đề & Nhận xét */}
                    <td>
                      {rev.title && (
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '12.5px', marginBottom: '2px' }}>
                          {rev.title}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#4B5563',
                          lineHeight: 1.45,
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={rev.content}
                      >
                        {rev.content || <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Không có nhận xét chữ</span>}
                      </div>
                    </td>

                    {/* Phản hồi của Làng nghề (V15) */}
                    <td style={{ textAlign: 'center' }}>
                      {hasReply ? (
                        <span
                          className="v15-reply-tag replied"
                          title={`Phản hồi: ${rev.reply_content}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleOpenDetail(rev, false)}
                        >
                          <IconCheck size={11} />
                          {/* <span>Đã phản hồi</span> */}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="v15-btn-reply-fast"
                          onClick={() => handleOpenDetail(rev, true)}
                          title="Soạn phản hồi cho du khách"
                        >
                          <IconReply size={12} />
                        </button>
                      )}
                    </td>

                    {/* Thời gian */}
                    <td>
                      <span style={{ fontSize: '12px', color: '#374151' }}>
                        {formatDate(rev.created_at)}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ textAlign: 'center' }}>
                      {rev.status === 'VISIBLE' ? (
                        <span className="v15-status-visible">
                          ● Hiển thị
                        </span>
                      ) : (
                        <span className="v15-status-hidden">
                          ● Ẩn
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(rev, false)}
                        className="v15-btn-detail"
                        title="Xem chi tiết đánh giá & phản hồi"
                      >
                        <IconEye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Phân trang chuẩn LocalCraftPagination */}
      {!isLoading && !errorMessage && reviews.length > pageSize && (
        <div style={{ marginTop: '14px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #ECE7DE', padding: '12px 18px' }}>
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={reviews.length}
            pageSize={pageSize}
            itemLabel="đánh giá"
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* 7. Modal Chi tiết đánh giá & Phản hồi */}
      <ReviewDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedReview(null);
        }}
        review={selectedReview}
        initialEditMode={initialEditMode}
        showToast={showToast}
        onSuccess={() => {
          fetchReviews();
          fetchSummary();
        }}
      />
    </div>
  );
};

export default ReviewsManagerTab;
