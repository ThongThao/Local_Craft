import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  productsApi,
  VillageProductDto as ProductDto,
  ProductStatus,
  BusinessState,
  ProductSummaryDto,
  CategoryDto,
} from '@/services/api/products';
import { artisansApi } from '@/services/api/artisans';
import { LocalCraftPagination } from '../LocalCraftPagination';

interface ProductsManagerTabProps {
  onOpenAddModal?: () => void;
  onEditProduct?: (product: ProductDto) => void;
  onManageVariants?: (product: ProductDto) => void;
  showToast?: (message: string) => void;
  refreshTrigger?: number;
}

export const ProductsManagerTab: React.FC<ProductsManagerTabProps> = ({
  onOpenAddModal,
  onEditProduct,
  onManageVariants,
  showToast,
  refreshTrigger,
}) => {
  // View mode: 'table' | 'card'
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Products and Summary data
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [summary, setSummary] = useState<ProductSummaryDto | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [artisans, setArtisans] = useState<{ id: number; name: string }[]>([]);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProductStatus>('ALL');
  const [businessFilter, setBusinessFilter] = useState<'ALL' | BusinessState>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [artisanFilter, setArtisanFilter] = useState<'ALL' | string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals State
  const [quickViewProduct, setQuickViewProduct] = useState<ProductDto | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState<boolean>(false);

  const [actionConfirmModal, setActionConfirmModal] = useState<{
    isOpen: boolean;
    product: ProductDto | null;
    action: 'hide' | 'unhide' | 'delete';
  }>({
    isOpen: false,
    product: null,
    action: 'hide',
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Reset modal expansion states when product changes
  useEffect(() => {
    setIsDescExpanded(false);
    setIsNoteExpanded(false);
  }, [quickViewProduct]);

  // Keyboard navigation: Close modals on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickViewProduct) setQuickViewProduct(null);
        if (actionConfirmModal.isOpen) setActionConfirmModal({ isOpen: false, product: null, action: 'hide' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct, actionConfirmModal.isOpen]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load auxiliary data on mount (categories & village artisans)
  useEffect(() => {
    let isMounted = true;
    const fetchAuxiliary = async () => {
      try {
        const [catRes, artRes] = await Promise.all([
          productsApi.getCategories(),
          artisansApi.getAll(),
        ]);

        if (isMounted) {
          if (catRes.success && Array.isArray(catRes.data)) {
            setCategories(catRes.data);
          }
          if (artRes.success && Array.isArray(artRes.data)) {
            setArtisans(
              artRes.data.map((a) => ({
                id: a.artisan_id,
                name: a.display_name,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Lỗi khi nạp danh mục hoặc nghệ nhân:', err);
      }
    };

    fetchAuxiliary();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products and summary from backend
  const fetchProductsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [listRes, summaryRes] = await Promise.all([
        productsApi.getAll({
          search: debouncedSearch.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          business_state: businessFilter !== 'ALL' ? businessFilter : undefined,
          category_id: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          artisan_id: artisanFilter !== 'ALL' ? artisanFilter : undefined,
        }),
        productsApi.getSummary(),
      ]);

      if (listRes.success && Array.isArray(listRes.data)) {
        setProducts(listRes.data);
      } else {
        setErrorMessage(listRes.message || 'Không thể tải danh sách sản phẩm.');
      }

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (err: any) {
      console.error('Lỗi fetch sản phẩm:', err);
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, businessFilter, categoryFilter, artisanFilter, refreshTrigger]);

  useEffect(() => {
    fetchProductsData();
  }, [fetchProductsData]);

  // Pagination calculation
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, currentPage, pageSize]);



  // Reset page when any filter changes
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setBusinessFilter('ALL');
    setCategoryFilter('ALL');
    setArtisanFilter('ALL');
    setCurrentPage(1);
  };

  // Helper format VND price
  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0 ₫';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Helper format date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
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

  // Render Approval Status Badge (DRAFT, PENDING, APPROVED, REJECTED, HIDDEN)
  const renderApprovalBadge = (status: ProductStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="v05-badge-approval approved" title="Sản phẩm đã được kiểm duyệt hợp lệ">
            <span className="status-dot green" />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="v05-badge-approval pending" title="Sản phẩm đang chờ Ban quản trị kiểm duyệt nội dung">
            <span className="status-dot amber" />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="v05-badge-approval draft" title="Sản phẩm lưu dưới dạng bản nháp nội bộ">
            <span className="status-dot" />
            <span>Bản nháp</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="v05-badge-approval rejected" title="Sản phẩm bị từ chối kiểm duyệt. Nhấn xem chi tiết để biết lý do">
            <span className="status-dot red" />
            <span>Bị từ chối</span>
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="v05-badge-approval hidden" title="Sản phẩm đã được tạm ẩn khỏi sàn giao dịch">
            <span className="status-dot" />
            <span>Đã ẩn</span>
          </span>
        );
      default:
        return (
          <span className="v05-badge-approval draft">
            <span className="status-dot" />
            <span>{status}</span>
          </span>
        );
    }
  };

  // Render Business State Badge (SELLING, OUT_OF_STOCK, NOT_READY, HIDDEN)
  const renderBusinessBadge = (state: BusinessState) => {
    switch (state) {
      case 'SELLING':
        return (
          <span className="v05-badge-business selling" title="Đã duyệt, có biến thể hoạt động và còn hàng trong kho">
            <span className="status-dot blue" />
            <span>Đang kinh doanh</span>
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="v05-badge-business out-of-stock" title="Sản phẩm hợp lệ nhưng số lượng tồn kho khả dụng bằng 0">
            <span className="status-dot orange" />
            <span>Hết hàng</span>
          </span>
        );
      case 'NOT_READY':
        return (
          <span className="v05-badge-business not-ready" title="Chưa đủ điều kiện bán (chưa duyệt, nghệ nhân chưa xác minh hoặc chưa tạo biến thể)">
            <span className="status-dot purple" />
            <span>Chưa đủ điều kiện bán</span>
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="v05-badge-business hidden" title="Sản phẩm đang tạm ẩn kinh doanh">
            <span className="status-dot" />
            <span>Đã ẩn</span>
          </span>
        );
      default:
        return (
          <span className="v05-badge-business not-ready">
            <span className="status-dot" />
            <span>{state}</span>
          </span>
        );
    }
  };

  // Action Handlers
  const handleExecuteAction = async () => {
    if (!actionConfirmModal.product) return;
    setIsSubmittingAction(true);
    const prod = actionConfirmModal.product;

    try {
      if (actionConfirmModal.action === 'hide') {
        const res = await productsApi.update(prod.product_id, { status: 'HIDDEN' });
        if (res.success) {
          showToast?.(`Đã chuyển sản phẩm "${prod.product_name}" sang trạng thái Ẩn.`);
        } else {
          showToast?.(res.message || 'Không thể ẩn sản phẩm.');
        }
      } else if (actionConfirmModal.action === 'unhide') {
        const res = await productsApi.update(prod.product_id, { status: 'PENDING' });
        if (res.success) {
          showToast?.(`Đã gửi yêu cầu xét duyệt lại cho sản phẩm "${prod.product_name}".`);
        } else {
          showToast?.(res.message || 'Không thể hiện sản phẩm.');
        }
      } else if (actionConfirmModal.action === 'delete') {
        const res = await productsApi.delete(prod.product_id);
        if (res.success) {
          showToast?.(res.message || `Đã xóa sản phẩm "${prod.product_name}".`);
        } else {
          showToast?.(res.message || 'Không thể xóa sản phẩm.');
        }
      }

      setActionConfirmModal({ isOpen: false, product: null, action: 'hide' });
      fetchProductsData();
    } catch (err: any) {
      console.error('Lỗi khi thực hiện thao tác:', err);
      showToast?.(err.message || 'Có lỗi xảy ra khi thực hiện thao tác.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleVariantManage = (product: ProductDto) => {
    if (onManageVariants) {
      onManageVariants(product);
    } else {
      showToast?.(`Đang mở quản lý biến thể & tồn kho cho sản phẩm: "${product.product_name}" (V07)`);
    }
  };

  return (
    <div className="artisan-tab-pane products-manager-pane">
      {/* 1. Header Toolbar */}
      <div className="v03-header-card">
        <div className="v03-header-left">
          <h2 className="v03-header-title">Quản lý sản phẩm</h2>
          <p className="v03-header-subtitle">
            Quản lý các sản phẩm thuộc làng nghề, trạng thái duyệt và tình trạng kinh doanh.
          </p>
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-add-artisan"
            onClick={onOpenAddModal}
            title="Thêm sản phẩm mới vào làng nghề"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span> Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Quick Statistics (4 cards: Tổng, Đang kinh doanh, Chờ duyệt, Bị từ chối) */}
      <div className="v03-kpi-grid">
        {/* Total Products */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon total">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng sản phẩm</span>
            <div className="v03-kpi-value">{summary ? summary.total : '—'}</div>
            <span className="v03-kpi-sub">Do làng nghề quản lý</span>
          </div>
        </div>

        {/* Selling (Đang kinh doanh) */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon public">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đang kinh doanh</span>
            <div className="v03-kpi-value public-val">{summary ? summary.selling : '—'}</div>
            <span className="v03-kpi-sub">Đã duyệt &amp; sẵn sàng mở bán</span>
          </div>
        </div>

        {/* Pending Approval (Chờ duyệt) */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon pending">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Chờ duyệt</span>
            <div className="v03-kpi-value pending-val">{summary ? summary.pending : '—'}</div>
            <span className="v03-kpi-sub">Ban quản trị đang thẩm định</span>
          </div>
        </div>

        {/* Rejected (Bị từ chối) */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon closed" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Bị từ chối</span>
            <div className="v03-kpi-value" style={{ color: '#dc2626' }}>{summary ? summary.rejected : '—'}</div>
            <span className="v03-kpi-sub">Cần bổ sung/sửa đổi thông tin</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="v03-filter-card" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="v03-search-wrapper" style={{ minWidth: '240px', flex: '1 1 240px' }}>
          <svg className="v03-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm kiếm sản phẩm theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="v03-search-clear"
              onClick={() => setSearchTerm('')}
              title="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="v03-filter-controls" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {/* Approval Filter Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Duyệt:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>
          </div>

          {/* Business State Filter Dropdown */}
          <div className="v03-filter-group">
            <label className="v03-filter-label">Kinh doanh:</label>
            <select
              className="v03-select-box"
              value={businessFilter}
              onChange={(e) => {
                setBusinessFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="SELLING">Đang kinh doanh</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
              <option value="NOT_READY">Chưa đủ điều kiện bán</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          {categories.length > 0 && (
            <div className="v03-filter-group">
              <label className="v03-filter-label">Danh mục:</label>
              <select
                className="v03-select-box"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Tất cả</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Artisan Filter Dropdown (Scoped strictly to this village) */}
          {artisans.length > 0 && (
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
                <option value="ALL">Tất cả</option>
                {artisans.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters */}
          {(searchTerm ||
            statusFilter !== 'ALL' ||
            businessFilter !== 'ALL' ||
            categoryFilter !== 'ALL' ||
            artisanFilter !== 'ALL') && (
              <button
                type="button"
                className="v03-btn-reset-filters"
                onClick={handleResetFilters}
                title="Đặt lại tất cả bộ lọc"
              >
                <span>Đặt lại</span>
              </button>
            )}

          {/* View Mode Toggle: Table / Card */}
          <div className="v03-view-mode-toggle" role="group" aria-label="Chế độ hiển thị danh sách">
            <button
              type="button"
              className={`v03-toggle-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem danh sách dạng bảng chi tiết"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`v03-toggle-view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Xem danh sách dạng lưới thẻ"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content Area */}
      {isLoading ? (
        /* Loading Skeleton */
        <div className="v03-table-card">
          <div className="v03-skeleton-table" style={{ padding: '24px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="v03-skeleton-row"
                style={{
                  height: '56px',
                  background: 'linear-gradient(90deg, #f5f1e8 25%, #ece7de 50%, #f5f1e8 75%)',
                  backgroundSize: '200% 100%',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            ))}
          </div>
        </div>
      ) : errorMessage ? (
        /* Error State (Never fallback to mock) */
        <div className="v03-table-card" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ color: '#dc2626', marginBottom: '14px' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
            Không thể tải danh sách sản phẩm
          </h3>
          <p style={{ color: '#64748b', fontSize: '13.5px', maxWidth: '420px', margin: '0 auto 20px' }}>
            {errorMessage}
          </p>
          <button
            type="button"
            className="v03-btn-reset-filters"
            onClick={fetchProductsData}
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Thử lại
          </button>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="v03-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ color: '#A3A3A3', marginBottom: '16px' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          {searchTerm || statusFilter !== 'ALL' || businessFilter !== 'ALL' || categoryFilter !== 'ALL' || artisanFilter !== 'ALL' ? (
            <>
              <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
                Không tìm thấy sản phẩm phù hợp
              </h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px' }}>
                Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc hiện tại.
              </p>
              <button
                type="button"
                className="v03-btn-reset-filters"
                onClick={handleResetFilters}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Đặt lại bộ lọc
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
                Chưa có sản phẩm
              </h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px' }}>
                Làng nghề của bạn chưa đăng tải sản phẩm thủ công nào lên sàn giao dịch.
              </p>
              <button
                type="button"
                className="v03-btn-add-artisan"
                onClick={onOpenAddModal}
                style={{ margin: '0 auto' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Thêm sản phẩm</span>
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (6 COLUMNS: SẢN PHẨM, DANH MỤC, GIÁ THAM KHẢO, TRẠNG THÁI DUYỆT, TÌNH TRẠNG KINH DOANH, THAO TÁC) */
        <div className="v03-table-card">
          <div className="v03-table-container">
            <table className="v03-artisans-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '260px' }}>SẢN PHẨM</th>
                  <th style={{ minWidth: '140px' }}>DANH MỤC</th>
                  <th style={{ minWidth: '140px' }}>GIÁ THAM KHẢO</th>
                  <th style={{ minWidth: '150px' }}>TRẠNG THÁI DUYỆT</th>
                  <th style={{ minWidth: '170px' }}>TÌNH TRẠNG KINH DOANH</th>
                  <th style={{ minWidth: '130px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.product_id} className="v03-table-row">
                    {/* SẢN PHẨM (Cover Image + Name + Artisan) */}
                    <td>
                      <div className="v05-product-cell">
                        <div className="v05-product-thumb-wrap">
                          {p.cover_image_url ? (
                            <img
                              src={p.cover_image_url}
                              alt={p.product_name}
                              className="v05-product-thumb"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="v05-product-thumb-placeholder">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                      </svg>
                                      <span>Ảnh lỗi</span>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="v05-product-thumb-placeholder">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <span>Chưa có ảnh</span>
                            </div>
                          )}
                        </div>

                        <div className="v05-product-info">
                          <span
                            className="v05-product-name"
                            title={p.product_name}
                            onClick={() => setQuickViewProduct(p)}
                            style={{ cursor: 'pointer' }}
                          >
                            {p.product_name}
                          </span>
                          <span className="v05-product-artisan-sub">
                            Chế tác:{' '}
                            <strong>{p.artisan_name ? p.artisan_name : 'Nghệ nhân làng nghề'}</strong>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* DANH MỤC */}
                    <td>
                      <span className="v05-category-badge">
                        {p.category_name || 'Đồ thủ công'}
                      </span>
                    </td>

                    {/* GIÁ THAM KHẢO */}
                    <td>
                      <div className="v05-price-wrap">
                        <span className="v05-price-val">{formatPrice(p.base_price)}</span>
                        <span className="v05-price-label">Giá tham khảo</span>
                      </div>
                    </td>

                    {/* TRẠNG THÁI DUYỆT */}
                    <td>
                      <div>
                        {renderApprovalBadge(p.status)}
                        {p.status === 'REJECTED' && p.moderation_note && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setQuickViewProduct(p)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                fontSize: '11px',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Xem lý do từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* TÌNH TRẠNG KINH DOANH */}
                    <td>{renderBusinessBadge(p.business_state)}</td>

                    {/* THAO TÁC */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="v05-actions-cell" style={{ justifyContent: 'center' }}>
                        {/* Xem (Quick View) */}
                        <button
                          type="button"
                          className="v05-action-btn"
                          onClick={() => setQuickViewProduct(p)}
                          title="Xem chi tiết sản phẩm"
                          aria-label="Xem sản phẩm"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {/* Chỉnh sửa (V06) */}
                        <button
                          type="button"
                          className="v05-action-btn edit"
                          onClick={() => onEditProduct?.(p)}
                          title="Chỉnh sửa thông tin sản phẩm (V06)"
                          aria-label="Chỉnh sửa sản phẩm"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Quản lý biến thể (V07) */}
                        <button
                          type="button"
                          className="v05-action-btn variant"
                          onClick={() => handleVariantManage(p)}
                          title="Quản lý biến thể & tồn kho (V07)"
                          aria-label="Quản lý biến thể"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                        </button>

                        {/* Ẩn / Hiện / Xóa */}
                        {p.status === 'HIDDEN' ? (
                          <button
                            type="button"
                            className="v05-action-btn hide"
                            onClick={() =>
                              setActionConfirmModal({
                                isOpen: true,
                                product: p,
                                action: 'unhide',
                              })
                            }
                            title="Hiện lại sản phẩm (gửi duyệt lại)"
                            aria-label="Hiện sản phẩm"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="v05-action-btn hide"
                            onClick={() =>
                              setActionConfirmModal({
                                isOpen: true,
                                product: p,
                                action: 'hide',
                              })
                            }
                            title="Tạm ẩn sản phẩm khỏi sàn"
                            aria-label="Ẩn sản phẩm"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unified LocalCraft Pagination */}
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(pg) => setCurrentPage(pg)}
            itemLabel="sản phẩm"
            totalUnfiltered={products.length}
          />
        </div>
      ) : (
        /* CARD VIEW (Responsive grid, stable equal heights) */
        <div className="v03-table-card">
          <div className="v05-cards-grid">
            {paginatedProducts.map((p) => (
              <div key={p.product_id} className="v05-card-item">
                {/* Cover Image Wrap with Badges */}
                <div className="v05-card-img-wrap">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={p.product_name}
                      className="v05-card-img"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="v05-product-thumb-placeholder" style="width: 100%; height: 100%;">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                              </svg>
                              <span>Không tải được ảnh</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="v05-product-thumb-placeholder" style={{ width: '100%', height: '100%' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>Chưa có ảnh</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="v05-card-badges-top">
                    <div>{renderApprovalBadge(p.status)}</div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="v05-card-body">
                  <div className="v05-card-cat-line">
                    <span className="v05-category-badge">{p.category_name || 'Đồ thủ công'}</span>
                  </div>

                  <h4
                    className="v05-card-title"
                    title={p.product_name}
                    onClick={() => setQuickViewProduct(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    {p.product_name}
                  </h4>

                  <div className="v05-card-artisan">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>
                      Chế tác:{' '}
                      <strong>{p.artisan_name ? p.artisan_name : 'Nghệ nhân làng nghề'}</strong>
                    </span>
                  </div>

                  {/* Price Row */}
                  <div className="v05-card-price-row">
                    <span className="v05-price-label">Giá tham khảo:</span>
                    <span className="v05-card-price">{formatPrice(p.base_price)}</span>
                  </div>

                  {/* Business State */}
                  <div className="v05-card-business-badge-wrap">
                    {renderBusinessBadge(p.business_state)}
                  </div>

                  {/* Moderation Warning if rejected */}
                  {p.status === 'REJECTED' && p.moderation_note && (
                    <div
                      className="v05-card-rejection-box"
                      title={`${p.moderation_note} (Nhấn để xem đầy đủ)`}
                      onClick={() => setQuickViewProduct(p)}
                    >
                      <span className="v05-card-rejection-title">Lý do từ chối:</span>
                      <span className="v05-card-rejection-text">{p.moderation_note}</span>
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="v05-card-actions">
                    <button
                      type="button"
                      className="v05-card-btn-view"
                      onClick={() => setQuickViewProduct(p)}
                      title="Xem chi tiết"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Xem</span>
                    </button>

                    <button
                      type="button"
                      className="v05-action-btn edit"
                      onClick={() => onEditProduct?.(p)}
                      title="Chỉnh sửa sản phẩm"
                      aria-label="Chỉnh sửa sản phẩm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="v05-action-btn variant"
                      onClick={() => handleVariantManage(p)}
                      title="Quản lý biến thể & tồn kho"
                      aria-label="Quản lý biến thể"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </button>

                    {p.status === 'HIDDEN' ? (
                      <button
                        type="button"
                        className="v05-action-btn hide"
                        onClick={() =>
                          setActionConfirmModal({
                            isOpen: true,
                            product: p,
                            action: 'unhide',
                          })
                        }
                        title="Hiện lại sản phẩm"
                        aria-label="Hiện sản phẩm"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="v05-action-btn hide"
                        onClick={() =>
                          setActionConfirmModal({
                            isOpen: true,
                            product: p,
                            action: 'hide',
                          })
                        }
                        title="Tạm ẩn sản phẩm"
                        aria-label="Ẩn sản phẩm"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Unified LocalCraft Pagination */}
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(pg) => setCurrentPage(pg)}
            itemLabel="sản phẩm"
            totalUnfiltered={products.length}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. QUICK VIEW MODAL (PORTAL)                                              */}
      {/* ========================================================================= */}
      {quickViewProduct &&
        createPortal(
          <div
            className="artisan-modal-overlay"
            onClick={() => setQuickViewProduct(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="v05-quickview-box"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="v05-quickview-header">
                <h3>Chi tiết sản phẩm</h3>
                <button
                  type="button"
                  className="v03-modal-close"
                  onClick={() => setQuickViewProduct(null)}
                  title="Đóng modal"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="v05-quickview-body">
                {/* Hero section */}
                <div className="v05-quickview-hero">
                  <div className="v05-quickview-hero-img-wrap">
                    {quickViewProduct.cover_image_url ? (
                      <img
                        src={quickViewProduct.cover_image_url}
                        alt={quickViewProduct.product_name}
                        className="v05-quickview-hero-img"
                      />
                    ) : (
                      <div className="v05-product-thumb-placeholder" style={{ width: '100%', height: '100%' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  <div className="v05-quickview-hero-details">
                    <span className="v05-category-badge" style={{ alignSelf: 'flex-start' }}>
                      {quickViewProduct.category_name || 'Đồ thủ công'}
                    </span>

                    <h2 className="v05-quickview-title">{quickViewProduct.product_name}</h2>

                    <div className="v05-quickview-meta-row">
                      <div className="v05-quickview-artisan-chip">
                        {quickViewProduct.artisan_avatar_url ? (
                          <img
                            src={quickViewProduct.artisan_avatar_url}
                            alt={quickViewProduct.artisan_name || 'Nghệ nhân'}
                            className="v05-quickview-artisan-avatar"
                          />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                        <span>
                          Chế tác bởi:{' '}
                          <strong style={{ color: '#1C3B32' }}>
                            {quickViewProduct.artisan_name || 'Nghệ nhân làng nghề'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="v05-quickview-price-tag">
                      {formatPrice(quickViewProduct.base_price)}
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#8C9691', marginLeft: '6px' }}>
                        (Giá tham khảo)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {renderApprovalBadge(quickViewProduct.status)}
                      {renderBusinessBadge(quickViewProduct.business_state)}
                    </div>
                  </div>
                </div>

                {/* Moderation Note Alert Box (if rejected or note exists) */}
                {quickViewProduct.status === 'REJECTED' && quickViewProduct.moderation_note && (
                  <div className="v05-moderation-alert">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="v05-moderation-alert-title">Lý do từ chối kiểm duyệt từ Ban quản trị:</div>
                      <div
                        style={{
                          display: isNoteExpanded ? 'block' : '-webkit-box',
                          WebkitLineClamp: isNoteExpanded ? 'unset' : 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.5',
                        }}
                      >
                        {quickViewProduct.moderation_note}
                      </div>
                      {quickViewProduct.moderation_note.length > 130 && (
                        <button
                          type="button"
                          className="v05-quickview-desc-toggle"
                          style={{ marginTop: '6px', display: 'inline-block' }}
                          onClick={() => setIsNoteExpanded((prev) => !prev)}
                        >
                          {isNoteExpanded ? 'Thu gọn ▲' : 'Xem thêm lý do ▼'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Description Box */}
                <div className="v05-quickview-desc-box">
                  <div className="v05-quickview-desc-header">
                    <div className="v05-quickview-desc-title">Mô tả sản phẩm</div>
                    {quickViewProduct.description && quickViewProduct.description.length > 180 && (
                      <button
                        type="button"
                        className="v05-quickview-desc-toggle"
                        onClick={() => setIsDescExpanded((prev) => !prev)}
                      >
                        {isDescExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                      </button>
                    )}
                  </div>
                  <div className={`v05-quickview-desc-text ${isDescExpanded ? 'expanded' : 'collapsed'}`}>
                    {quickViewProduct.description ? (
                      quickViewProduct.description
                    ) : (
                      <em style={{ color: '#94a3b8' }}>Chưa có mô tả chi tiết cho sản phẩm này.</em>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="v05-quickview-timestamps">
                  <span>Ngày khởi tạo: {formatDate(quickViewProduct.created_at)}</span>
                  <span>Cập nhật lần cuối: {formatDate(quickViewProduct.updated_at)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="v05-quickview-footer">
                <button
                  type="button"
                  className="v03-btn-reset-filters"
                  onClick={() => setQuickViewProduct(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="v03-btn-reset-filters"
                  onClick={() => {
                    const prod = quickViewProduct;
                    setQuickViewProduct(null);
                    handleVariantManage(prod);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>Biến thể & Tồn kho (V07)</span>
                </button>
                <button
                  type="button"
                  className="v03-btn-add-artisan"
                  onClick={() => {
                    const prod = quickViewProduct;
                    setQuickViewProduct(null);
                    onEditProduct?.(prod);
                  }}
                >
                  <span>Chỉnh sửa sản phẩm</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* 6. ACTION CONFIRMATION MODAL (HIDE / UNHIDE / DELETE)                     */}
      {/* ========================================================================= */}
      {actionConfirmModal.isOpen &&
        actionConfirmModal.product &&
        createPortal(
          <div
            className="artisan-modal-overlay"
            onClick={() => setActionConfirmModal({ isOpen: false, product: null, action: 'hide' })}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="v03-delete-modal-box"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px' }}
            >
              <div
                className="v03-delete-icon"
                style={{
                  backgroundColor:
                    actionConfirmModal.action === 'unhide'
                      ? '#ecfdf5'
                      : actionConfirmModal.action === 'hide'
                        ? '#fff7ed'
                        : '#fee2e2',
                  color:
                    actionConfirmModal.action === 'unhide'
                      ? '#059669'
                      : actionConfirmModal.action === 'hide'
                        ? '#c2410c'
                        : '#dc2626',
                }}
              >
                {actionConfirmModal.action === 'unhide' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : actionConfirmModal.action === 'hide' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                )}
              </div>

              <h3 className="v03-delete-title" style={{ fontSize: '18px' }}>
                {actionConfirmModal.action === 'unhide'
                  ? 'Gửi duyệt lại sản phẩm?'
                  : actionConfirmModal.action === 'hide'
                    ? 'Xác nhận ẩn sản phẩm?'
                    : 'Xác nhận xóa sản phẩm?'}
              </h3>

              <p className="v03-delete-desc" style={{ fontSize: '13px' }}>
                {actionConfirmModal.action === 'unhide'
                  ? `Sản phẩm "${actionConfirmModal.product.product_name}" sẽ được chuyển sang trạng thái "Chờ duyệt" để Ban quản trị xem xét mở bán lại.`
                  : actionConfirmModal.action === 'hide'
                    ? `Sản phẩm "${actionConfirmModal.product.product_name}" sẽ được tạm ẩn khỏi sàn và danh mục công khai. Bạn có thể mở lại bất cứ lúc nào.`
                    : `Bạn có chắc chắn muốn xóa sản phẩm "${actionConfirmModal.product.product_name}"? Nếu sản phẩm đã phát sinh đơn hàng, hệ thống sẽ tự động chuyển sang trạng thái Ẩn để bảo toàn lịch sử.`}
              </p>

              <div className="v03-delete-actions">
                <button
                  type="button"
                  className="v03-btn-cancel-delete"
                  disabled={isSubmittingAction}
                  onClick={() => setActionConfirmModal({ isOpen: false, product: null, action: 'hide' })}
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  className="v03-btn-confirm-delete"
                  style={{
                    backgroundColor:
                      actionConfirmModal.action === 'unhide'
                        ? '#059669'
                        : actionConfirmModal.action === 'hide'
                          ? '#c2410c'
                          : '#dc2626',
                  }}
                  disabled={isSubmittingAction}
                  onClick={handleExecuteAction}
                >
                  {isSubmittingAction
                    ? 'Đang xử lý...'
                    : actionConfirmModal.action === 'unhide'
                      ? 'Gửi duyệt lại'
                      : actionConfirmModal.action === 'hide'
                        ? 'Tạm ẩn'
                        : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProductsManagerTab;
