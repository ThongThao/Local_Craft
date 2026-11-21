import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  workshopsApi,
  WorkshopItemDto,
  WorkshopStatus,
  artisansApi,
  ArtisanDto,
} from '../../../../services/api';
import { LocalCraftPagination } from '../LocalCraftPagination';
import { CraftWorkshopItem } from '../../types';

export interface WorkshopsManagerTabProps {
  onOpenAddModal: () => void;
  onEditWorkshop?: (workshop: CraftWorkshopItem | WorkshopItemDto) => void;
  onNavigateToSchedules?: (workshopId: number) => void;
  onNavigateToBookings?: (workshopId?: number) => void;
  showToast?: (message: string) => void;
  villageId?: number;
  refreshTrigger?: number;
  // Backward compatibility with legacy props
  workshops?: any[];
  onDeleteWorkshop?: (workshopId: number) => void;
}

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80';

// Safe date formatter for next_session_date
const formatSessionDate = (val?: string | null): string | null => {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('-') && val.includes('/')) {
    return val; // Already formatted by backend as "HH:mm - dd/MM/yyyy"
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

/* --- Reusable SVG Icons (Replacing Emojis) --- */
const IconUser: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconUsers: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconCalendar: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconMapPin: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconEdit: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconPalette: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 40, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', ...style }}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const IconAlertTriangle: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 20, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconLightbulb: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 15, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
  </svg>
);

const IconClose: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

export const WorkshopsManagerTab: React.FC<WorkshopsManagerTabProps> = ({
  onOpenAddModal,
  onEditWorkshop,
  onNavigateToSchedules,
  onNavigateToBookings,
  showToast,
  villageId: _villageId,
  refreshTrigger = 0,
}) => {
  // Real data state from Backend (Scoped strictly to Manager's Village)
  const [workshops, setWorkshops] = useState<WorkshopItemDto[]>([]);
  // Store full unfiltered list for village KPI metrics (P1: prevents KPI distortion on filter/search)
  const [allVillageWorkshops, setAllVillageWorkshops] = useState<WorkshopItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [artisanFilter, setArtisanFilter] = useState<string>('ALL');
  const [artisanList, setArtisanList] = useState<ArtisanDto[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = viewMode === 'card' ? 6 : 9;

  // Modals state: Quick View & Delete Confirm
  const [viewingWorkshop, setViewingWorkshop] = useState<WorkshopItemDto | null>(null);
  const [deletingWorkshop, setDeletingWorkshop] = useState<WorkshopItemDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Race condition prevention: request identifier
  const latestRequestIdRef = useRef<number>(0);

  // 1. Load village artisans for filter dropdown (P2)
  useEffect(() => {
    let isMounted = true;
    artisansApi.getAll().then((res) => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        setArtisanList(res.data);
      }
    }).catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 3. Load baseline full village workshops for KPI calculation
  const fetchBaselineWorkshops = useCallback(async () => {
    try {
      const res = await workshopsApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        setAllVillageWorkshops(res.data);
      }
    } catch {
      // Baseline fetch fail is silently tolerated as fetchWorkshops will also populate if unfiltered
    }
  }, []);

  useEffect(() => {
    fetchBaselineWorkshops();
  }, [fetchBaselineWorkshops, refreshTrigger]);

  // 4. Load filtered workshops from authentic backend API
  const fetchWorkshops = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await workshopsApi.getAll({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        artisan_id: artisanFilter !== 'ALL' ? Number(artisanFilter) : undefined,
      });

      // Ignore stale responses if a newer request was initiated
      if (requestId !== latestRequestIdRef.current) return;

      if (res.success && Array.isArray(res.data)) {
        setWorkshops(res.data);
        // If query is unfiltered, update baseline as well
        if (!debouncedSearch && statusFilter === 'ALL' && artisanFilter === 'ALL') {
          setAllVillageWorkshops(res.data);
        }
      } else {
        setErrorMessage(res.message || 'Không thể tải danh sách workshop của làng nghề.');
        setWorkshops([]);
      }
    } catch (err: any) {
      if (requestId !== latestRequestIdRef.current) return;
      setErrorMessage(err?.message || 'Có lỗi kết nối máy chủ khi lấy danh sách workshop.');
      setWorkshops([]);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, statusFilter, artisanFilter]);

  // Fetch on mount or filter/trigger changes
  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops, refreshTrigger]);

  // 5. KPI Quick Summary Metrics (P1: Calculated from baseline village data, immune to search/filter)
  const kpiSummary = useMemo(() => {
    const source = allVillageWorkshops.length > 0 ? allVillageWorkshops : workshops;
    const total = source.length;
    let approved = 0;
    let pending = 0;
    let draft = 0;
    let hidden = 0;
    let rejected = 0;

    source.forEach((w) => {
      if (w.status === 'APPROVED') approved++;
      else if (w.status === 'PENDING') pending++;
      else if (w.status === 'DRAFT') draft++;
      else if (w.status === 'HIDDEN') hidden++;
      else if (w.status === 'REJECTED') rejected++;
    });

    const other = draft + hidden + rejected;
    return { total, approved, pending, draft, hidden, rejected, other };
  }, [allVillageWorkshops, workshops]);

  // 6. Filtered & Paginated items
  const totalPages = Math.ceil(workshops.length / pageSize) || 1;

  // Auto-correct out-of-bounds page if items deleted or view mode changed
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedWorkshops = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return workshops.slice(start, start + pageSize);
  }, [workshops, currentPage, pageSize]);

  // Handle Search Input Change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setArtisanFilter('ALL');
    setCurrentPage(1);
  };

  // Trigger edit modal with authentic WorkshopItemDto
  const handleTriggerEdit = (item: WorkshopItemDto) => {
    if (!onEditWorkshop) return;
    onEditWorkshop(item);
  };

  // Confirm and execute workshop deletion (P0 Safety Check)
  const handleConfirmDelete = async () => {
    if (!deletingWorkshop) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await workshopsApi.delete(deletingWorkshop.workshop_id);
      if (res.success) {
        showToast?.(`Đã xóa thành công workshop "${deletingWorkshop.workshop_name}".`);
        setWorkshops((prev) => prev.filter((w) => w.workshop_id !== deletingWorkshop.workshop_id));
        setAllVillageWorkshops((prev) => prev.filter((w) => w.workshop_id !== deletingWorkshop.workshop_id));
        setDeletingWorkshop(null);
      } else {
        setDeleteError(res.message || 'Không thể xóa workshop.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Có lỗi xảy ra khi xóa workshop.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Safe alternative: Hide workshop (P0: preserve booking history)
  const handleHideWorkshop = async (workshopId: number) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await workshopsApi.update(workshopId, { status: 'HIDDEN' });
      if (res.success) {
        showToast?.(`Đã chuyển workshop sang trạng thái "Đang ẩn" (HIDDEN).`);
        setWorkshops((prev) =>
          prev.map((w) => (w.workshop_id === workshopId ? { ...w, status: 'HIDDEN' as WorkshopStatus } : w))
        );
        setAllVillageWorkshops((prev) =>
          prev.map((w) => (w.workshop_id === workshopId ? { ...w, status: 'HIDDEN' as WorkshopStatus } : w))
        );
        setDeletingWorkshop(null);
      } else {
        setDeleteError(res.message || 'Không thể tạm ẩn workshop.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Có lỗi xảy ra khi tạm ẩn workshop.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper: Status Badge Render
  const renderStatusBadge = (status: WorkshopStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="v08-status-badge approved" title="Workshop đã được kiểm duyệt và công khai">
            <span className="v08-status-dot approved" />
            Đã duyệt
          </span>
        );
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Workshop đang chờ ban quản trị phê duyệt">
            <span className="v08-status-dot pending" />
            Chờ duyệt
          </span>
        );
      case 'DRAFT':
        return (
          <span className="v08-status-badge draft" title="Bản nháp nội bộ, chưa gửi duyệt">
            <span className="v08-status-dot draft" />
            Bản nháp
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="v08-status-badge hidden" title="Đang tạm ẩn khỏi trang khám phá">
            <span className="v08-status-dot hidden" />
            Đang ẩn
          </span>
        );
      case 'REJECTED':
        return (
          <span className="v08-status-badge rejected" title="Bị từ chối kiểm duyệt">
            <span className="v08-status-dot rejected" />
            Từ chối
          </span>
        );
      default:
        return <span className="v08-status-badge">{status}</span>;
    }
  };

  return (
    <div className="artisan-tab-pane v08-workshops-pane">
      {/* 1. Header Toolbar (Screen V08 Standard Title & Actions) */}
      <div className="v03-header-card">
        <div className="v03-header-left">
          <h2 className="v03-header-title">Danh sách workshop của làng nghề</h2>
          <p className="v03-header-subtitle">
            Theo dõi các hoạt động trải nghiệm và workshop đang được làng nghề tổ chức.
          </p>
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-add-artisan"
            onClick={onOpenAddModal}
            title="Mở biểu mẫu tạo workshop mới (V09)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm workshop</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Quick Statistics (4 cards: Tổng, Đã duyệt, Chờ duyệt, Bản nháp/Khác) */}
      <div className="v03-kpi-grid">
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng workshop</span>
            <div className="v03-kpi-value">{isLoading ? '...' : kpiSummary.total}</div>
            <span className="v03-kpi-sub">Do làng nghề quản lý</span>
          </div>
        </div>

        <div className="v03-kpi-card">
          <div className="v03-kpi-icon public">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đã duyệt / Công khai</span>
            <div className="v03-kpi-value" style={{ color: '#059669' }}>
              {isLoading ? '...' : kpiSummary.approved}
            </div>
            <span className="v03-kpi-sub">Khách có thể đặt vé</span>
          </div>
        </div>

        <div className="v03-kpi-card">
          <div className="v03-kpi-icon pending">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Chờ duyệt</span>
            <div className="v03-kpi-value" style={{ color: '#d97706' }}>
              {isLoading ? '...' : kpiSummary.pending}
            </div>
            <span className="v03-kpi-sub">Chờ ban quản trị xét duyệt</span>
          </div>
        </div>

        <div className="v03-kpi-card">
          <div className="v03-kpi-icon draft">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Bản nháp / Khác</span>
            <div className="v03-kpi-value" style={{ color: '#64748b' }}>
              {isLoading ? '...' : kpiSummary.other}
            </div>
            <span className="v03-kpi-sub">
              {isLoading ? '...' : `${kpiSummary.draft} nháp • ${kpiSummary.hidden} ẩn • ${kpiSummary.rejected} từ chối`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="v03-filter-card" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="v03-search-wrapper" style={{ minWidth: '260px', flex: '1 1 260px' }}>
          <svg className="v03-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm theo tên workshop, nghệ nhân, địa điểm..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="v03-search-clear"
              onClick={handleClearSearch}
              title="Xóa từ khóa tìm kiếm"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>

        <div className="v03-filter-controls" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Filter Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Tất cả </option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="HIDDEN">Tạm ẩn</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>

          {/* Artisan Filter Dropdown (P2) */}
          {artisanList.length > 0 && (
            <div className="v03-filter-group">
              <label className="v03-filter-label">Nghệ nhân:</label>
              <select
                className="v03-select-box"
                value={artisanFilter}
                onChange={(e) => {
                  setArtisanFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Tất cả nghệ nhân</option>
                {artisanList.map((art) => (
                  <option key={art.artisan_id} value={String(art.artisan_id)}>
                    {art.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || artisanFilter !== 'ALL') && (
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc về mặc định"
            >
              <span>Đặt lại</span>
            </button>
          )}

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
        </div>
      </div>

      {/* 4. Main Content Area */}
      {isLoading ? (
        /* Loading Skeleton */
        <div className="v08-skeleton-container">
          <div className="v08-skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="v08-skeleton-card" />
            ))}
          </div>
        </div>
      ) : errorMessage ? (
        /* Error State (No Mock Fallback!) */
        <div className="v03-error-card">
          <div className="v03-error-icon">
            <IconAlertTriangle size={32} />
          </div>
          <h3 className="v03-error-title">Không thể tải danh sách workshop</h3>
          <p className="v03-error-message">{errorMessage}</p>
          <button type="button" className="v03-btn-retry" onClick={fetchWorkshops}>
            Thử lại kết nối
          </button>
        </div>
      ) : workshops.length === 0 ? (
        /* Empty State */
        <div className="v03-empty-card">
          <div className="v03-empty-icon">
            <IconPalette size={42} style={{ color: '#984628' }} />
          </div>
          <h3 className="v03-empty-title">Chưa có workshop nào</h3>
          <p className="v03-empty-message">
            {searchTerm || statusFilter !== 'ALL' || artisanFilter !== 'ALL'
              ? 'Không tìm thấy workshop nào phù hợp với bộ lọc tìm kiếm hiện tại.'
              : 'Làng nghề chưa tổ chức workshop nào. Hãy tạo workshop đầu tiên để thu hút du khách trải nghiệm văn hóa thủ công!'}
          </p>
          {searchTerm || statusFilter !== 'ALL' || artisanFilter !== 'ALL' ? (
            <button type="button" className="v03-btn-retry" onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          ) : (
            <button type="button" className="v03-btn-add-artisan" onClick={onOpenAddModal}>
              + Thêm workshop mới
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        /* 5A. Card Grid View */
        <div className="v08-workshops-grid">
          {paginatedWorkshops.map((w) => {
            const priceFormatted = Number(w.price_per_person || 0).toLocaleString('vi-VN');
            const hasSessions = (w.sessions_count ?? 0) > 0;
            const nextSessionDisplay = formatSessionDate(w.next_session_date);

            return (
              <div key={w.workshop_id} className="v08-workshop-card">
                {/* Cover Image Wrap */}
                <div className="v08-card-cover">
                  <img
                    src={w.cover_image_url || DEFAULT_COVER_IMAGE}
                    alt={w.workshop_name}
                    className="v08-card-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_COVER_IMAGE;
                    }}
                  />
                  <div className="v08-card-cover-overlay">
                    {renderStatusBadge(w.status)}
                    {w.category_name && (
                      <span className="v08-category-pill" title={`Danh mục: ${w.category_name}`}>
                        {w.category_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="v08-card-body">
                  <h4 className="v08-card-title" title={w.workshop_name}>
                    {w.workshop_name}
                  </h4>

                  {/* Artisan info */}
                  <div className="v08-card-artisan-row">
                    <IconUser size={14} className="v08-icon" />
                    <span className="v08-meta-text">
                      Nghệ nhân:{' '}
                      <strong className="v08-meta-highlight">
                        {w.artisan_name || 'Chưa phân công'}
                      </strong>
                    </span>
                  </div>

                  {/* Location Address */}
                  <div className="v08-card-location-row" title={w.location_address}>
                    <IconMapPin size={13} style={{ flexShrink: 0, color: '#64748b', marginRight: '4px' }} />
                    <span className="v08-meta-text v08-truncate-1">{w.location_address || 'Tại làng nghề'}</span>
                  </div>

                  {/* Schedule & Bookings Summary (Only real computed fields) */}
                  <div className="v08-session-summary-box">
                    <div className="v08-session-row">
                      <span className="v08-session-label">
                        <IconCalendar size={13} style={{ marginRight: '5px' }} />
                        Lịch tổ chức:
                      </span>
                      <strong className="v08-session-value">
                        {hasSessions ? `${w.sessions_count} buổi đã lên lịch` : 'Chưa xếp ca'}
                      </strong>
                    </div>
                    {nextSessionDisplay && (
                      <div className="v08-session-row">
                        <span className="v08-session-label">
                          <IconClock size={13} style={{ marginRight: '5px' }} />
                          Buổi gần nhất:
                        </span>
                        <span className="v08-session-value-next">{nextSessionDisplay}</span>
                      </div>
                    )}
                    <div className="v08-session-row">
                      <span className="v08-session-label">
                        <IconUsers size={13} style={{ marginRight: '5px' }} />
                        Đã đăng ký:
                      </span>
                      <strong className="v08-session-value-booked">
                        {w.total_booked_participants ?? 0} người
                      </strong>
                    </div>
                  </div>

                  {/* Duration & Price */}
                  <div className="v08-card-pricing-row">
                    <div className="v08-price-block">
                      <span className="v08-price-label">Giá vé:</span>
                      <span className="v08-price-amount">{priceFormatted}₫</span>
                      <span className="v08-price-unit">/ khách</span>
                    </div>
                    <div className="v08-duration-badge" title="Thời lượng mỗi buổi trải nghiệm">
                      <IconClock size={12} style={{ marginRight: '4px' }} /> {w.duration_minutes} phút
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="v08-card-actions">
                    <button
                      type="button"
                      className="v08-btn-action view"
                      onClick={() => setViewingWorkshop(w)}
                      title="Xem thông tin chi tiết workshop"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Xem</span>
                    </button>

                    <button
                      type="button"
                      className="v08-btn-action edit"
                      onClick={() => handleTriggerEdit(w)}
                      title="Chỉnh sửa thông tin workshop (V09)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="v08-btn-action schedule"
                      onClick={() => {
                        if (onNavigateToSchedules) {
                          onNavigateToSchedules(w.workshop_id);
                        } else {
                          showToast?.(`Chuyển đến V10 – Quản lý lịch cho workshop: ${w.workshop_name}`);
                        }
                      }}
                      title="Quản lý lịch và ca tổ chức workshop (V10)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="v08-btn-action booking"
                      onClick={() => {
                        if (onNavigateToBookings) {
                          onNavigateToBookings(w.workshop_id);
                        } else {
                          showToast?.(`Chuyển đến V11 – Quản lý lượt đặt cho workshop: ${w.workshop_name}`);
                        }
                      }}
                      title="Xem danh sách lượt đặt chỗ của khách (V11)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="v08-btn-action delete"
                      onClick={() => setDeletingWorkshop(w)}
                      title="Xóa workshop"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 5B. Table View */
        <div className="v03-table-card">
          <div className="v03-table-container">
            <table className="v03-artisans-table v08-table">
              <thead>
                <tr>
                  {/* <th style={{ width: '48px', textAlign: 'center' }}>STT</th> */}
                  <th style={{ minWidth: '260px' }}>Workshop</th>
                  <th style={{ minWidth: '150px' }}>Nghệ nhân & Nghề</th>
                  <th style={{ minWidth: '130px' }}>Giá & Thời lượng</th>
                  <th style={{ minWidth: '140px' }}>Lịch & Lượt đặt</th>
                  <th style={{ minWidth: '120px' }}>Trạng thái</th>
                  <th style={{ width: '190px', minWidth: '190px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWorkshops.map((w) => {
                  const priceFormatted = Number(w.price_per_person || 0).toLocaleString('vi-VN');

                  return (
                    <tr key={w.workshop_id} className="v03-table-row">
                      <td>
                        <div className="v08-table-workshop-col">
                          <div
                            className="v08-table-thumb-wrap"
                            onClick={() => setViewingWorkshop(w)}
                            title="Xem chi tiết workshop"
                          >
                            <img
                              src={w.cover_image_url || DEFAULT_COVER_IMAGE}
                              alt={w.workshop_name}
                              className="v08-table-thumb"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_COVER_IMAGE;
                              }}
                            />
                          </div>
                          <div className="v08-table-info">
                            <span
                              className="v08-table-name"
                              title={w.workshop_name}
                              onClick={() => setViewingWorkshop(w)}
                            >
                              {w.workshop_name}
                            </span>
                            <span className="v08-table-address" title={w.location_address}>
                              <IconMapPin size={12} style={{ flexShrink: 0, color: '#64748b' }} /> {w.location_address || 'Tại khuôn viên làng nghề'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="v08-table-artisan-col">
                          <span className="v08-table-artisan-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconUser size={13} style={{ color: '#475569' }} />
                            {w.artisan_name || 'Chưa phân công'}
                          </span>
                          <span className="v08-table-category-pill">
                            {w.category_name || 'Workshop Trực Tiếp'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="v08-table-price-col">
                          <span className="v08-table-price">{priceFormatted}₫</span>
                          <span className="v08-table-duration" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconClock size={12} style={{ color: '#64748b' }} /> {w.duration_minutes} phút
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="v08-table-session-col">
                          <span
                            className="v08-table-session-count"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title={w.next_session_date ? `Buổi tới: ${formatSessionDate(w.next_session_date)}` : undefined}
                          >
                            <IconCalendar size={13} style={{ color: '#475569' }} /> {w.sessions_count ? `${w.sessions_count} buổi` : 'Chưa xếp ca'}
                          </span>
                          <span
                            className={`v08-table-bookings-count ${(w.total_booked_participants ?? 0) > 0 ? 'has-bookings' : 'zero-bookings'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <IconUsers size={12} /> {w.total_booked_participants ?? 0} người đặt
                          </span>
                        </div>
                      </td>
                      <td>{renderStatusBadge(w.status)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="v08-table-actions-row">
                          <button
                            type="button"
                            className="v08-table-action-btn view"
                            onClick={() => setViewingWorkshop(w)}
                            title="Xem chi tiết workshop"
                            aria-label="Xem chi tiết"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="v08-table-action-btn edit"
                            onClick={() => handleTriggerEdit(w)}
                            title="Chỉnh sửa workshop"
                            aria-label="Chỉnh sửa"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="v08-table-action-btn schedule"
                            onClick={() => {
                              if (onNavigateToSchedules) {
                                onNavigateToSchedules(w.workshop_id);
                              } else {
                                showToast?.(`Chuyển đến V10 – Quản lý lịch: ${w.workshop_name}`);
                              }
                            }}
                            title="Quản lý lịch tổ chức"
                            aria-label="Quản lý lịch"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="v08-table-action-btn booking"
                            onClick={() => {
                              if (onNavigateToBookings) {
                                onNavigateToBookings(w.workshop_id);
                              } else {
                                showToast?.(`Chuyển đến V11 – Quản lý lượt đặt`);
                              }
                            }}
                            title="Quản lý lượt đặt"
                            aria-label="Quản lý lượt đặt"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="v08-table-action-btn delete"
                            onClick={() => setDeletingWorkshop(w)}
                            title="Xóa / Tạm ẩn workshop"
                            aria-label="Xóa workshop"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Unified Pagination */}
      {!isLoading && !errorMessage && workshops.length > 0 && (
        <LocalCraftPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={workshops.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="workshop"
          className="v03-pagination-card"
        />
      )}

      {/* 7. Quick View Modal (V08 Overview) */}
      {viewingWorkshop && (
        <div className="artisan-modal-overlay" onClick={() => setViewingWorkshop(null)}>
          <div
            className="artisan-modal-dialog"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div>
                <div className="modal-tag">THÔNG TIN WORKSHOP</div>
                <h3 className="modal-title">{viewingWorkshop.workshop_name}</h3>
                <p className="modal-sub">Chi tiết tổng quan workshop do làng nghề tổ chức</p>
              </div>
              <button
                type="button"
                className="v06-close-btn"
                onClick={() => setViewingWorkshop(null)}
                aria-label="Đóng"
                title="Đóng (ESC)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="v08-view-modal-body">
              <div className="v08-view-cover-wrap">
                <img
                  src={viewingWorkshop.cover_image_url || DEFAULT_COVER_IMAGE}
                  alt={viewingWorkshop.workshop_name}
                  className="v08-view-cover-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_COVER_IMAGE;
                  }}
                />
                <div className="v08-view-cover-badge">
                  {renderStatusBadge(viewingWorkshop.status)}
                </div>
              </div>

              {viewingWorkshop.description && (
                <div className="v08-view-desc-box">
                  <span className="v08-view-section-title">Mô tả hoạt động trải nghiệm:</span>
                  <p className="v08-view-desc-text">{viewingWorkshop.description}</p>
                </div>
              )}

              <div className="v08-view-info-grid">
                <div className="v08-view-info-item">
                  <span className="v08-info-label">Nghệ nhân hướng dẫn:</span>
                  <strong className="v08-info-val">
                    {viewingWorkshop.artisan_name || 'Chưa phân công'}
                  </strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Danh mục / Nghề:</span>
                  <strong className="v08-info-val">
                    {viewingWorkshop.category_name || 'Workshop Trực Tiếp'}
                  </strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Giá vé niêm yết:</span>
                  <strong className="v08-info-val highlight">
                    {Number(viewingWorkshop.price_per_person || 0).toLocaleString('vi-VN')}₫ / khách
                  </strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Thời lượng trải nghiệm:</span>
                  <strong className="v08-info-val">{viewingWorkshop.duration_minutes} phút</strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Số ca đã xếp lịch:</span>
                  <strong className="v08-info-val">
                    {viewingWorkshop.sessions_count ?? 0} ca
                  </strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Buổi diễn ra kế tiếp:</span>
                  <strong className="v08-info-val" style={{ color: '#0369a1' }}>
                    {formatSessionDate(viewingWorkshop.next_session_date) || 'Chưa có buổi tới'}
                  </strong>
                </div>

                <div className="v08-view-info-item">
                  <span className="v08-info-label">Tổng lượt khách đăng ký:</span>
                  <strong className="v08-info-val booked">
                    {viewingWorkshop.total_booked_participants ?? 0} người
                  </strong>
                </div>

                <div className="v08-view-info-item full-width">
                  <span className="v08-info-label">Địa điểm tổ chức:</span>
                  <span className="v08-info-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <IconMapPin size={14} style={{ color: '#64748b' }} /> {viewingWorkshop.location_address || 'Tại khuôn viên làng nghề'}
                  </span>
                </div>
              </div>

              {/* Navigation CTA Shortcuts */}
              {/* <div className="v08-view-shortcuts-bar">
                <span className="v08-shortcuts-label">Điều hướng quản lý:</span>
                <div className="v08-shortcuts-btns">
                  <button
                    type="button"
                    className="v08-shortcut-btn edit"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const target = viewingWorkshop;
                      setViewingWorkshop(null);
                      handleTriggerEdit(target);
                    }}
                  >
                    <IconEdit size={13} />
                    <span>Sửa workshop</span>
                  </button>
                  <button
                    type="button"
                    className="v08-shortcut-btn schedule"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const id = viewingWorkshop.workshop_id;
                      setViewingWorkshop(null);
                      if (onNavigateToSchedules) onNavigateToSchedules(id);
                      else showToast?.(`Chuyển đến V10 – Quản lý lịch workshop #${id}`);
                    }}
                  >
                    <IconCalendar size={13} />
                    <span>Quản lý lịch</span>
                  </button>
                  <button
                    type="button"
                    className="v08-shortcut-btn booking"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const id = viewingWorkshop.workshop_id;
                      setViewingWorkshop(null);
                      if (onNavigateToBookings) onNavigateToBookings(id);
                      else showToast?.(`Chuyển đến V11 – Quản lý lượt đặt`);
                    }}
                  >
                    <IconUsers size={13} />
                    <span>Quản lý lượt đặt</span>
                  </button>
                </div>
              </div> */}
            </div>

            <div className="modal-actions-row" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="v06-btn-cancel"
                onClick={() => setViewingWorkshop(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Modal (P0 Safety & P2 UI Consistency) */}
      {deletingWorkshop && (
        <div
          className="artisan-modal-overlay"
          onClick={() => !isDeleting && setDeletingWorkshop(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="v03-delete-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            {/* Modal Icon */}
            <div
              className="v03-delete-icon"
              style={{
                backgroundColor: (deletingWorkshop.total_booked_participants ?? 0) > 0 ? '#fff7ed' : '#fee2e2',
                color: (deletingWorkshop.total_booked_participants ?? 0) > 0 ? '#c2410c' : '#dc2626',
              }}
            >
              {(deletingWorkshop.total_booked_participants ?? 0) > 0 ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              )}
            </div>

            {/* Modal Title */}
            <h3 className="v03-delete-title" style={{ fontSize: '18px' }}>
              {(deletingWorkshop.total_booked_participants ?? 0) > 0
                ? 'Workshop đã có khách đặt chỗ'
                : 'Xác nhận xóa workshop?'}
            </h3>

            {/* Modal Description */}
            <div className="v03-delete-desc" style={{ fontSize: '13px', textAlign: 'left', marginTop: '10px' }}>
              {(deletingWorkshop.total_booked_participants ?? 0) > 0 ? (
                <>
                  <p style={{ margin: '0 0 8px', color: '#334155' }}>
                    Workshop <strong>"{deletingWorkshop.workshop_name}"</strong> hiện đã ghi nhận{' '}
                    <strong style={{ color: '#c2410c' }}>
                      {deletingWorkshop.total_booked_participants} người tham gia đặt chỗ
                    </strong>
                    .
                  </p>
                  <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: '12.5px' }}>
                    Để bảo toàn lịch sử giao dịch và quyền lợi của du khách đã đặt vé, hệ thống{' '}
                    <strong>không cho phép xóa vĩnh viễn</strong> workshop này.
                  </p>
                  <p style={{ margin: '0', color: '#0369a1', fontSize: '12.5px', background: '#f0f9ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <IconLightbulb size={15} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Gợi ý an toàn:</strong> Bạn có thể chuyển trạng thái sang <strong>"Đang ẩn" (HIDDEN)</strong> để ngừng nhận thêm khách mới mà vẫn giữ nguyên dữ liệu lịch sử.</span>
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px', color: '#334155' }}>
                    Bạn có chắc chắn muốn xóa workshop <strong>"{deletingWorkshop.workshop_name}"</strong>?
                  </p>
                  <p style={{ margin: '0', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconAlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span>Hành động này sẽ xóa dữ liệu workshop và các buổi chưa có khách đặt khỏi hệ thống của làng nghề.</span>
                  </p>
                </>
              )}

              {/* Inline Error Display from Backend Safety Rejection */}
              {deleteError && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                  }}
                >
                  <strong>Thông báo từ hệ thống:</strong> {deleteError}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="v03-delete-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="v03-btn-cancel-delete"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingWorkshop(null);
                  setDeleteError(null);
                }}
              >
                Hủy bỏ
              </button>

              {(deletingWorkshop.total_booked_participants ?? 0) > 0 ? (
                <button
                  type="button"
                  className="v03-btn-confirm-delete"
                  style={{ backgroundColor: '#c2410c' }}
                  disabled={isDeleting}
                  onClick={() => handleHideWorkshop(deletingWorkshop.workshop_id)}
                >
                  {isDeleting ? 'Đang cập nhật...' : 'Chuyển sang Đang ẩn (HIDDEN)'}
                </button>
              ) : (
                <>
                  {deleteError && (
                    <button
                      type="button"
                      className="v03-btn-confirm-delete"
                      style={{ backgroundColor: '#c2410c' }}
                      disabled={isDeleting}
                      onClick={() => handleHideWorkshop(deletingWorkshop.workshop_id)}
                    >
                      {isDeleting ? 'Đang cập nhật...' : 'Ẩn workshop thay thế'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="v03-btn-confirm-delete"
                    style={{ backgroundColor: '#dc2626' }}
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                  >
                    {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopsManagerTab;
