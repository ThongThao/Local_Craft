import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  productsApi,
  VillageProductDto as ProductDto,
  ProductVariantDto,
  CreateVariantPayload,
  UpdateVariantPayload,
} from '@/services/api/products';
import { LocalCraftPagination } from '../LocalCraftPagination';

interface VariantsInventoryTabProps {
  product: ProductDto | null;
  onBackToProducts: () => void;
  onSelectProduct?: (product: ProductDto) => void;
  showToast?: (message: string) => void;
  villageId?: number;
}

interface AttributeRow {
  key: string;
  value: string;
}

export const VariantsInventoryTab: React.FC<VariantsInventoryTabProps> = ({
  product,
  onBackToProducts: _onBackToProducts,
  onSelectProduct,
  showToast,
}) => {
  // Product list for quick switcher (if user came from sidebar or wants to switch products)
  const [availableProducts, setAvailableProducts] = useState<ProductDto[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(product);

  // Variants list & loading state
  const [variants, setVariants] = useState<ProductVariantDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [quickViewVariant, setQuickViewVariant] = useState<ProductVariantDto | null>(null);

  // Inventory adjustment modal
  const [inventoryModal, setInventoryModal] = useState<{
    isOpen: boolean;
    variant: ProductVariantDto | null;
    quantity: number | '';
    isSaving: boolean;
    error: string | null;
  }>({
    isOpen: false,
    variant: null,
    quantity: '',
    isSaving: false,
    error: null,
  });

  // Variant create/edit form modal
  const [variantFormModal, setVariantFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    variant: ProductVariantDto | null;
    sku: string;
    variant_name: string;
    color: string;
    size: string;
    price: number | '';
    weight_gram: number | '';
    is_active: boolean;
    initial_quantity: number | '';
    attributes: AttributeRow[];
    isSaving: boolean;
    error: string | null;
  }>({
    isOpen: false,
    mode: 'create',
    variant: null,
    sku: '',
    variant_name: '',
    color: '',
    size: '',
    price: '',
    weight_gram: '',
    is_active: true,
    initial_quantity: 0,
    attributes: [],
    isSaving: false,
    error: null,
  });

  // Sync selectedProduct if prop changes
  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
    }
  }, [product]);

  // If no product is selected, fetch village products to allow selection
  useEffect(() => {
    let isMounted = true;
    const loadVillageProducts = async () => {
      try {
        const res = await productsApi.getAll();
        if (res.success && Array.isArray(res.data) && isMounted) {
          setAvailableProducts(res.data);
          if (!selectedProduct && res.data.length > 0) {
            setSelectedProduct(res.data[0]);
            onSelectProduct?.(res.data[0]);
          }
        }
      } catch (err) {
        console.warn('Could not load products for selection:', err);
      }
    };

    loadVillageProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch variants from Backend API whenever selectedProduct changes
  const fetchVariants = useCallback(async () => {
    if (!selectedProduct?.product_id) {
      setIsLoading(false);
      setVariants([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await productsApi.getVariants(selectedProduct.product_id);
      if (res.success && Array.isArray(res.data)) {
        setVariants(res.data);
      } else {
        setVariants([]);
        setErrorMessage(res.message || 'Không thể tải danh sách biến thể.');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải biến thể sản phẩm:', err);
      setErrorMessage(err?.message || 'Đã xảy ra lỗi khi kết nối với máy chủ.');
      setVariants([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProduct?.product_id]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // KPI calculations based strictly on real API response
  const kpiStats = useMemo(() => {
    const totalVariants = variants.length;
    const activeVariants = variants.filter((v) => v.is_active).length;
    const outOfStockCount = variants.filter((v) => {
      const sellable = Math.max(0, Number(v.quantity ?? 0) - Number(v.reserved_quantity ?? 0));
      return sellable <= 0;
    }).length;
    const totalSellable = variants.reduce((sum, v) => {
      const sellable = Math.max(0, Number(v.quantity ?? 0) - Number(v.reserved_quantity ?? 0));
      return sum + sellable;
    }, 0);

    return {
      total: totalVariants,
      active: activeVariants,
      outOfStock: outOfStockCount,
      sellable: totalSellable,
    };
  }, [variants]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      // Search by SKU or variant_name
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchSku = v.sku.toLowerCase().includes(query);
        const matchName = v.variant_name.toLowerCase().includes(query);
        if (!matchSku && !matchName) return false;
      }

      // Filter by is_active status
      if (statusFilter === 'ACTIVE' && !v.is_active) return false;
      if (statusFilter === 'INACTIVE' && v.is_active) return false;

      return true;
    });
  }, [variants, searchTerm, statusFilter]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedProduct?.product_id]);

  const totalPages = Math.ceil(filteredVariants.length / pageSize) || 1;
  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVariants.slice(start, start + pageSize);
  }, [filteredVariants, currentPage, pageSize]);

  // Format currency helper
  const formatPrice = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '0 ₫';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Open Create Variant Modal
  const handleOpenCreateModal = () => {
    if (!selectedProduct) return;
    // Auto-generate suggested SKU based on product id
    const baseSku = `SKU-${selectedProduct.product_id}-V${variants.length + 1}`;
    setVariantFormModal({
      isOpen: true,
      mode: 'create',
      variant: null,
      sku: baseSku,
      variant_name: '',
      color: '',
      size: '',
      price: selectedProduct.base_price ? Number(selectedProduct.base_price) : '',
      weight_gram: '',
      is_active: true,
      initial_quantity: 0,
      attributes: [],
      isSaving: false,
      error: null,
    });
  };

  // Open Edit Variant Modal
  const handleOpenEditModal = (v: ProductVariantDto) => {
    // Parse attributes object into key-value array
    const attrRows: AttributeRow[] = [];
    if (v.attributes && typeof v.attributes === 'object') {
      Object.entries(v.attributes).forEach(([key, val]) => {
        attrRows.push({ key, value: String(val) });
      });
    }

    setVariantFormModal({
      isOpen: true,
      mode: 'edit',
      variant: v,
      sku: v.sku,
      variant_name: v.variant_name,
      color: v.color || '',
      size: v.size || '',
      price: Number(v.price),
      weight_gram: v.weight_gram ?? '',
      is_active: v.is_active,
      initial_quantity: v.quantity ?? 0,
      attributes: attrRows,
      isSaving: false,
      error: null,
    });
  };

  // Open Inventory Modal
  const handleOpenInventoryModal = (v: ProductVariantDto) => {
    setInventoryModal({
      isOpen: true,
      variant: v,
      quantity: v.quantity ?? 0,
      isSaving: false,
      error: null,
    });
  };

  // Toggle active status directly
  const handleToggleActive = async (v: ProductVariantDto) => {
    try {
      const nextStatus = !v.is_active;
      const res = await productsApi.updateVariant(v.variant_id, { is_active: nextStatus });
      if (res.success && res.data) {
        setVariants((prev) =>
          prev.map((item) => (item.variant_id === v.variant_id ? { ...item, is_active: nextStatus } : item))
        );
        showToast?.(
          nextStatus
            ? `✓ Đã kích hoạt hoạt động cho biến thể: ${v.sku}`
            : `Đã ngừng kinh doanh biến thể: ${v.sku}`
        );
      } else {
        showToast?.(res.message || 'Không thể thay đổi trạng thái biến thể.');
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Có lỗi xảy ra khi cập nhật trạng thái biến thể.');
    }
  };

  // Delete Variant (calls DELETE /api/v1/products/variants/<id>/)
  const handleDeleteVariant = async (v: ProductVariantDto) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa biến thể "${v.sku} - ${v.variant_name}" không?`)) {
      return;
    }

    try {
      const res = await productsApi.deleteVariant(v.variant_id);
      if (res.success) {
        if (res.data && res.data.is_active === false) {
          // Deactivated instead of deleted due to order history
          setVariants((prev) =>
            prev.map((item) => (item.variant_id === v.variant_id ? { ...item, is_active: false } : item))
          );
          showToast?.(res.message || 'Biến thể đã có trong lịch sử đơn hàng nên được chuyển sang trạng thái Ngừng kinh doanh.');
        } else {
          setVariants((prev) => prev.filter((item) => item.variant_id !== v.variant_id));
          showToast?.(`✓ Đã xóa biến thể "${v.sku}" thành công!`);
        }
      } else {
        showToast?.(res.message || 'Không thể xóa biến thể.');
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Có lỗi xảy ra khi xóa biến thể.');
    }
  };

  // Save Inventory Quantity (Real API call to PATCH /products/variants/<id>/inventory/)
  const handleSaveInventory = async () => {
    if (!inventoryModal.variant) return;

    const qty = Number(inventoryModal.quantity);
    if (isNaN(qty) || qty < 0) {
      setInventoryModal((prev) => ({ ...prev, error: 'Số lượng tồn kho phải là số nguyên lớn hơn hoặc bằng 0.' }));
      return;
    }

    const reserved = Number(inventoryModal.variant.reserved_quantity ?? 0);
    if (qty < reserved) {
      setInventoryModal((prev) => ({
        ...prev,
        error: `Số lượng tồn (${qty}) không thể nhỏ hơn số lượng đang giữ trong các đơn hàng (${reserved}).`,
      }));
      return;
    }

    setInventoryModal((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const res = await productsApi.updateInventory(inventoryModal.variant.variant_id, qty);
      if (res.success && res.data) {
        const updated = res.data;
        setVariants((prev) =>
          prev.map((item) => (item.variant_id === updated.variant_id ? updated : item))
        );
        showToast?.(`✓ Đã cập nhật tồn kho thành công cho biến thể "${updated.sku}": ${qty} sản phẩm.`);
        setInventoryModal({ isOpen: false, variant: null, quantity: '', isSaving: false, error: null });
      } else {
        setInventoryModal((prev) => ({
          ...prev,
          isSaving: false,
          error: res.message || 'Không thể cập nhật số lượng tồn kho.',
        }));
      }
    } catch (err: any) {
      setInventoryModal((prev) => ({
        ...prev,
        isSaving: false,
        error: err?.message || 'Đã xảy ra lỗi khi kết nối với máy chủ.',
      }));
    }
  };

  // Save Variant Form (Create or Edit)
  const handleSaveVariantForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const { mode, variant, sku, variant_name, color, size, price, weight_gram, is_active, initial_quantity, attributes } =
      variantFormModal;

    // Validation
    const trimmedSku = sku.trim().toUpperCase();
    if (!trimmedSku) {
      setVariantFormModal((prev) => ({ ...prev, error: 'Vui lòng nhập mã SKU cho biến thể.' }));
      return;
    }

    const trimmedName = variant_name.trim();
    if (!trimmedName) {
      setVariantFormModal((prev) => ({ ...prev, error: 'Vui lòng nhập tên biến thể.' }));
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setVariantFormModal((prev) => ({ ...prev, error: 'Giá bán phải là số hợp lệ và lớn hơn hoặc bằng 0.' }));
      return;
    }

    const numWeight = weight_gram === '' ? undefined : Number(weight_gram);
    if (numWeight !== undefined && (isNaN(numWeight) || numWeight <= 0)) {
      setVariantFormModal((prev) => ({ ...prev, error: 'Khối lượng (gram) nếu nhập phải lớn hơn 0.' }));
      return;
    }

    // Convert attribute rows back to JSON object
    const attributesObj: Record<string, string> = {};
    attributes.forEach((row) => {
      const k = row.key.trim();
      const v = row.value.trim();
      if (k && v) {
        attributesObj[k] = v;
      }
    });

    setVariantFormModal((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      if (mode === 'create') {
        const payload: CreateVariantPayload = {
          sku: trimmedSku,
          variant_name: trimmedName,
          color: color.trim() || undefined,
          size: size.trim() || undefined,
          attributes: Object.keys(attributesObj).length > 0 ? attributesObj : undefined,
          price: numPrice,
          weight_gram: numWeight,
          is_active,
          initial_quantity: Number(initial_quantity) || 0,
        };

        const res = await productsApi.createVariant(selectedProduct.product_id, payload);
        if (res.success && res.data) {
          const created = res.data;
          setVariants((prev) => [...prev, created]);
          showToast?.(`✓ Đã thêm mới thành công biến thể "${created.sku}".`);
          setVariantFormModal((prev) => ({ ...prev, isOpen: false, isSaving: false }));
        } else {
          setVariantFormModal((prev) => ({
            ...prev,
            isSaving: false,
            error: res.message || 'Không thể tạo biến thể mới.',
          }));
        }
      } else if (mode === 'edit' && variant) {
        const payload: UpdateVariantPayload = {
          sku: trimmedSku,
          variant_name: trimmedName,
          color: color.trim() || undefined,
          size: size.trim() || undefined,
          attributes: Object.keys(attributesObj).length > 0 ? attributesObj : undefined,
          price: numPrice,
          weight_gram: numWeight,
          is_active,
        };

        const res = await productsApi.updateVariant(variant.variant_id, payload);
        if (res.success && res.data) {
          const updated = res.data;
          setVariants((prev) =>
            prev.map((item) => (item.variant_id === updated.variant_id ? updated : item))
          );
          showToast?.(`✓ Đã cập nhật thành công biến thể "${updated.sku}".`);
          setVariantFormModal((prev) => ({ ...prev, isOpen: false, isSaving: false }));
        } else {
          setVariantFormModal((prev) => ({
            ...prev,
            isSaving: false,
            error: res.message || 'Không thể cập nhật thông tin biến thể.',
          }));
        }
      }
    } catch (err: any) {
      setVariantFormModal((prev) => ({
        ...prev,
        isSaving: false,
        error: err?.message || 'Đã xảy ra lỗi khi kết nối với máy chủ.',
      }));
    }
  };

  // Format attributes chips helper
  const renderAttributeChips = (attrs?: Record<string, any>) => {
    if (!attrs || typeof attrs !== 'object' || Object.keys(attrs).length === 0) {
      return <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>;
    }

    const entries = Object.entries(attrs);
    const visibleEntries = entries.slice(0, 2);
    const extraCount = entries.length - visibleEntries.length;

    return (
      <div className="v07-attr-chips-wrap">
        {visibleEntries.map(([k, v], idx) => (
          <span key={idx} className="v07-attr-chip" title={`${k}: ${v}`}>
            <span className="chip-key">{k}:</span> {String(v)}
          </span>
        ))}
        {extraCount > 0 && (
          <span
            className="v07-attr-chip extra"
            title={entries.map(([k, v]) => `${k}: ${v}`).join('\n')}
          >
            +{extraCount}
          </span>
        )}
      </div>
    );
  };

  // Handle closing variant modal with dirty state check
  const handleCloseVariantFormModal = () => {
    if (variantFormModal.isSaving) return;

    let isDirty = false;
    if (variantFormModal.mode === 'create') {
      const basePrice = selectedProduct?.base_price ? Number(selectedProduct.base_price) : '';
      isDirty =
        Boolean(variantFormModal.variant_name.trim()) ||
        Boolean(variantFormModal.color.trim()) ||
        Boolean(variantFormModal.size.trim()) ||
        (variantFormModal.price !== '' && variantFormModal.price !== basePrice) ||
        variantFormModal.weight_gram !== '' ||
        Number(variantFormModal.initial_quantity) > 0 ||
        variantFormModal.attributes.some((a) => a.key.trim() || a.value.trim());
    } else if (variantFormModal.mode === 'edit' && variantFormModal.variant) {
      const v = variantFormModal.variant;
      isDirty =
        variantFormModal.variant_name !== v.variant_name ||
        variantFormModal.sku !== v.sku ||
        variantFormModal.color !== (v.color || '') ||
        variantFormModal.size !== (v.size || '') ||
        Number(variantFormModal.price) !== Number(v.price) ||
        (variantFormModal.weight_gram === '' ? null : Number(variantFormModal.weight_gram)) !== (v.weight_gram ?? null) ||
        variantFormModal.is_active !== v.is_active;
    }

    if (isDirty) {
      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?')) {
        return;
      }
    }

    setVariantFormModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="artisan-tab-pane variants-inventory-pane">
      {/* ========================================================================= */}
      {/* 1. HEADER V07 WITH BACK BUTTON AND PRODUCT SWITCHER                       */}
      {/* ========================================================================= */}
      <div className="v03-header-card v07-main-header">
        <div className="v03-header-left">
          {/* {onBackToProducts && (
            <div style={{ marginBottom: '8px' }}>
              <button
                type="button"
                className="v07-btn-back"
                onClick={onBackToProducts}
                title="Quay lại danh sách sản phẩm (V05)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Quay lại sản phẩm</span>
              </button>
            </div>
          )} */}

          <h2 className="v03-header-title">
            Quản lý biến thể &amp; tồn kho
          </h2>
          <p className="v03-header-subtitle">
            Thiết lập các phiên bản quy cách (màu sắc, kích thước, thuộc tính) và theo dõi số lượng tồn kho khả dụng theo từng biến thể.
          </p>

          {/* Product Switcher Dropdown (Seamless product switching) */}
          {availableProducts.length > 1 && (
            <div className="v07-header-back-row" style={{ marginTop: '10px' }}>
              <div className="v07-product-switcher">
                <label className="v07-switcher-label">Chọn sản phẩm:</label>
                <select
                  className="v03-select-box v07-switcher-select"
                  value={selectedProduct?.product_id || ''}
                  title={selectedProduct?.product_name || 'Chọn sản phẩm'}
                  onChange={(e) => {
                    const found = availableProducts.find((p) => p.product_id === Number(e.target.value));
                    if (found) {
                      setSelectedProduct(found);
                      onSelectProduct?.(found);
                    }
                  }}
                >
                  {availableProducts.map((p) => (
                    <option key={p.product_id} value={p.product_id} title={p.product_name}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="v03-header-right">
          <button
            type="button"
            className="v03-btn-add-artisan"
            onClick={handleOpenCreateModal}
            disabled={!selectedProduct || isLoading}
            title="Thêm biến thể mới cho sản phẩm này"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm biến thể</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRODUCT CONTEXT CARD (SECTION 10)                                      */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="v07-product-context-card">
          <div className="v07-context-left">
            <div className="v07-context-badge-tag">QUẢN LÝ BIẾN THỂ</div>
            <h3 className="v07-context-product-title" title={selectedProduct.product_name}>
              {selectedProduct.product_name}
            </h3>
            <div className="v07-context-artisan-line">
              <span className="label">Chế tác bởi:</span>
              <strong className="name">
                {selectedProduct.artisan_name || 'Nghệ nhân làng nghề'}
              </strong>
            </div>
          </div>

          <div className="v07-context-right">
            <span className="v05-category-badge">
              {selectedProduct.category_name || 'Đồ thủ công'}
            </span>
            <span
              className={`v05-badge-approval ${
                selectedProduct.status === 'APPROVED'
                  ? 'approved'
                  : selectedProduct.status === 'PENDING'
                  ? 'pending'
                  : selectedProduct.status === 'REJECTED'
                  ? 'rejected'
                  : 'draft'
              }`}
            >
              <span className="status-dot" />
              <span>
                {selectedProduct.status === 'APPROVED'
                  ? 'Đã duyệt'
                  : selectedProduct.status === 'PENDING'
                  ? 'Chờ duyệt'
                  : selectedProduct.status === 'REJECTED'
                  ? 'Bị từ chối'
                  : 'Bản nháp'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUMMARY KPI CARDS (SECTION 11) - Chuẩn cấu trúc V03/V05               */}
      {/* ========================================================================= */}
      <div className="v03-kpi-grid">
        {/* Card 1: Tổng biến thể */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Tổng biến thể</span>
            <div className="v03-kpi-value">{isLoading ? '—' : kpiStats.total}</div>
            <span className="v03-kpi-sub">Quy cách định danh của sản phẩm</span>
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon public">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Đang hoạt động</span>
            <div className="v03-kpi-value public-val">{isLoading ? '—' : kpiStats.active}</div>
            <span className="v03-kpi-sub">Sẵn sàng phục vụ giao dịch</span>
          </div>
        </div>

        {/* Card 3: Hết hàng */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon closed" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Hết hàng</span>
            <div className="v03-kpi-value" style={{ color: kpiStats.outOfStock > 0 ? '#DC2626' : '#1C3B32' }}>
              {isLoading ? '—' : kpiStats.outOfStock}
            </div>
            <span className="v03-kpi-sub">Tồn khả dụng hiện tại = 0</span>
          </div>
        </div>

        {/* Card 4: Có thể bán */}
        <div className="v03-kpi-card">
          <div className="v03-kpi-icon" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="v03-kpi-content">
            <span className="v03-kpi-label">Có thể bán</span>
            <div className="v03-kpi-value" style={{ color: '#984628' }}>
              {isLoading ? '—' : kpiStats.sellable}
            </div>
            <span className="v03-kpi-sub">Tồn khả dụng sẵn sàng mở bán</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TOOLBAR SEARCH & FILTERS (SECTION 12) - Căn 1 hàng ngang chuẩn        */}
      {/* ========================================================================= */}
      <div className="v03-filter-card" style={{ flexWrap: 'wrap', gap: '14px' }}>
        {/* Left: Search Box */}
        <div className="v03-search-wrapper" style={{ minWidth: '260px', flex: '1 1 280px' }}>
          <svg
            className="v03-search-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm theo SKU hoặc tên biến thể..."
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
              ✕
            </button>
          )}
        </div>

        {/* Right: Filters & Action */}
        <div className="v03-filter-controls">
          <div className="v03-filter-group">
            <label className="v03-filter-label">Trạng thái:</label>
            <select
              className="v03-select-box"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng kinh doanh</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="v03-btn-reset-filters"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              title="Đặt lại bộ lọc"
            >
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MAIN VARIANTS TABLE (SECTIONS 13 - 21)                                  */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="v03-table-card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="v03-loading-spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: '#64748b', fontSize: '14px' }}>Đang tải danh sách biến thể & tồn kho...</div>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="v03-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
            Không thể tải dữ liệu biến thể
          </h3>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px' }}>{errorMessage}</p>
          <button
            type="button"
            className="v03-btn-add-artisan"
            onClick={fetchVariants}
            style={{ margin: '0 auto' }}
          >
            <span>Thử lại</span>
          </button>
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="v03-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ color: '#A3A3A3', marginBottom: '16px' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          {searchTerm || statusFilter !== 'ALL' ? (
            <>
              <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
                Không tìm thấy biến thể phù hợp
              </h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px' }}>
                Thử thay đổi từ khóa SKU hoặc chọn trạng thái lọc khác.
              </p>
              <button
                type="button"
                className="v03-btn-reset-filters"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Đặt lại bộ lọc
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '17px', color: '#1C3B32', marginBottom: '8px', fontWeight: 700 }}>
                Chưa có biến thể
              </h3>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '20px' }}>
                Sản phẩm này chưa được thiết lập biến thể quy cách và tồn kho tương ứng.
              </p>
              <button
                type="button"
                className="v03-btn-add-artisan"
                onClick={handleOpenCreateModal}
                style={{ margin: '0 auto' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Thêm biến thể</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="v03-table-card">
          <div className="v03-table-container">
            <table className="v03-artisans-table v07-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>SKU</th>
                  <th style={{ minWidth: '180px' }}>BIẾN THỂ</th>
                  <th style={{ minWidth: '170px' }}>THUỘC TÍNH</th>
                  <th style={{ minWidth: '130px' }}>GIÁ BÁN</th>
                  <th style={{ minWidth: '130px' }}>TỒN KHO</th>
                  <th style={{ minWidth: '130px' }}>CÓ THỂ BÁN</th>
                  <th style={{ minWidth: '150px' }}>TRẠNG THÁI</th>
                  <th style={{ minWidth: '150px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVariants.map((v) => {
                  const qty = Number(v.quantity ?? 0);
                  const reserved = Number(v.reserved_quantity ?? 0);
                  const sellable = Math.max(0, qty - reserved);

                  return (
                    <tr key={v.variant_id} className="v03-table-row">
                      {/* 1. CỘT SKU */}
                      <td>
                        <span className="v07-sku-badge" title={v.sku}>
                          {v.sku}
                        </span>
                      </td>

                      {/* 2. CỘT BIẾN THỂ */}
                      <td>
                        <div className="v07-variant-cell">
                          <strong className="v07-variant-title" title={v.variant_name}>
                            {v.variant_name}
                          </strong>
                          {(v.color || v.size) && (
                            <div className="v07-variant-submeta">
                              {v.color && <span className="sub-item">Màu: {v.color}</span>}
                              {v.size && <span className="sub-item">Size: {v.size}</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. CỘT THUỘC TÍNH */}
                      <td>{renderAttributeChips(v.attributes)}</td>

                      {/* 4. CỘT GIÁ BÁN */}
                      <td>
                        <span className="v07-price-val">{formatPrice(v.price)}</span>
                      </td>

                      {/* 5. CỘT TỒN KHO */}
                      <td>
                        <div className="v07-stock-cell">
                          <strong className="v07-stock-num">{qty}</strong>
                          <span className="v07-reserved-sub">Đang giữ: {reserved}</span>
                        </div>
                      </td>

                      {/* 6. CỘT CÓ THỂ BÁN */}
                      <td>
                        {sellable > 0 ? (
                          <span className="v07-sellable-badge available" title={`Có thể bán ngay: ${sellable}`}>
                            {sellable}
                          </span>
                        ) : (
                          <span className="v07-sellable-badge out-of-stock" title="Đã hết hàng khả dụng">
                            Hết hàng (0)
                          </span>
                        )}
                      </td>

                      {/* 7. CỘT TRẠNG THÁI */}
                      <td>
                        {v.is_active ? (
                          <span className="v07-status-badge active" title="Biến thể đang hoạt động giao dịch">
                            ● Đang hoạt động
                          </span>
                        ) : (
                          <span className="v07-status-badge inactive" title="Biến thể đã tạm ngừng kinh doanh">
                            ○ Ngừng kinh doanh
                          </span>
                        )}
                      </td>

                      {/* 8. CỘT THAO TÁC */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="v05-actions-cell" style={{ justifyContent: 'center' }}>
                          {/* Xem Quick View */}
                          <button
                            type="button"
                            className="v05-action-btn"
                            onClick={() => setQuickViewVariant(v)}
                            title="Xem chi tiết biến thể"
                            aria-label="Xem chi tiết biến thể"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Chỉnh sửa */}
                          <button
                            type="button"
                            className="v05-action-btn edit"
                            onClick={() => handleOpenEditModal(v)}
                            title="Chỉnh sửa thông tin biến thể"
                            aria-label="Chỉnh sửa biến thể"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Quản lý tồn kho */}
                          <button
                            type="button"
                            className="v05-action-btn variant"
                            onClick={() => handleOpenInventoryModal(v)}
                            title="Điều chỉnh số lượng tồn kho (Inventory)"
                            aria-label="Quản lý tồn kho"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                          </button>

                          {/* Kích hoạt / Ngừng kinh doanh */}
                          <button
                            type="button"
                            className={`v05-action-btn ${v.is_active ? 'hide' : 'unhide'}`}
                            onClick={() => handleToggleActive(v)}
                            title={v.is_active ? 'Ngừng kinh doanh biến thể' : 'Kích hoạt lại biến thể'}
                            aria-label={v.is_active ? 'Ngừng kinh doanh' : 'Kích hoạt lại'}
                          >
                            {v.is_active ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>

                          {/* Xóa biến thể */}
                          <button
                            type="button"
                            className="v05-action-btn delete"
                            onClick={() => handleDeleteVariant(v)}
                            title="Xóa biến thể (hoặc ngừng kinh doanh nếu đã có đơn hàng)"
                            aria-label="Xóa biến thể"
                            style={{ color: '#EF4444' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          {/* Table summary & unified pagination */}
          <LocalCraftPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredVariants.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            itemLabel="biến thể"
            totalUnfiltered={variants.length}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL QUICK VIEW BIẾN THỂ (SECTION 22)                                 */}
      {/* ========================================================================= */}
      {quickViewVariant &&
        createPortal(
          <div
            className="artisan-modal-overlay"
            onClick={() => setQuickViewVariant(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="v06-form-modal-box v07-quickview-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="v06-modal-form-wrapper">
                {/* 1. Modal Header */}
                <div className="v06-modal-header">
                  <div className="v06-header-left">
                    {/* <div className="v06-tag-row">
                      <span className="v06-tag-pill">CHI TIẾT BIẾN THỂ</span>
                      <span className="v06-heritage-code font-mono">SKU: {quickViewVariant.sku}</span>
                      <span className={`v07-modal-status-badge ${quickViewVariant.is_active ? 'active' : 'inactive'}`}>
                        <span className="dot" />
                        {quickViewVariant.is_active ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                      </span>
                    </div> */}
                    <h3 className="v06-modal-title">{quickViewVariant.variant_name}</h3>
                    <p className="v06-modal-sub">
                      Sản phẩm: <strong>{selectedProduct?.product_name || '—'}</strong>
                    </p>
                  </div>

                  <div className="v06-header-actions">
                    <button
                      type="button"
                      className="v06-close-btn"
                      onClick={() => setQuickViewVariant(null)}
                      aria-label="Đóng xem nhanh"
                      title="Đóng (ESC)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 2. Scrollable Body */}
                <div className="v06-modal-body">
                  {/* SKU & Price Headline Card */}
                  <div className="v07-quickview-headline" style={{ marginBottom: '16px' }}>
                    <span className="v07-sku-badge font-mono">{quickViewVariant.sku}</span>
                    <h4 className="v07-quickview-name">{quickViewVariant.variant_name}</h4>
                    <div className="v07-quickview-price text-brand">{formatPrice(quickViewVariant.price)}</div>
                  </div>

                  {/* Physical Properties Card */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        1. Quy Cách Vật Lý
                      </span>
                    </div>
                    <div className="v07-quickview-grid">
                      <div className="v07-qprop-item">
                        <span className="label">Màu sắc:</span>
                        <span className="val">{quickViewVariant.color || '—'}</span>
                      </div>
                      <div className="v07-qprop-item">
                        <span className="label">Kích thước:</span>
                        <span className="val">{quickViewVariant.size || '—'}</span>
                      </div>
                      <div className="v07-qprop-item">
                        <span className="label">Khối lượng:</span>
                        <span className="val">
                          {quickViewVariant.weight_gram ? `${quickViewVariant.weight_gram} gram` : '—'}
                        </span>
                      </div>
                      <div className="v07-qprop-item">
                        <span className="label">Trạng thái:</span>
                        <span className="val">
                          {quickViewVariant.is_active ? (
                            <span className="v07-status-badge active">● Đang hoạt động</span>
                          ) : (
                            <span className="v07-status-badge inactive">○ Ngừng kinh doanh</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Extended Attributes Card */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        2. Thuộc Tính Mở Rộng
                      </span>
                    </div>
                    {quickViewVariant.attributes && Object.keys(quickViewVariant.attributes).length > 0 ? (
                      <div className="v07-attr-chips-wrap">
                        {Object.entries(quickViewVariant.attributes).map(([k, v], idx) => (
                          <span key={idx} className="v07-attr-chip">
                            <span className="chip-key">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Không có thuộc tính mở rộng</span>
                    )}
                  </div>

                  {/* Inventory Snapshot Section */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        3. Tình Trạng Tồn Kho Thực Tế
                      </span>
                    </div>
                    <div className="v07-inv-stats-row">
                      <div className="inv-stat-col">
                        <span className="stat-label">Tổng tồn thực tế</span>
                        <strong className="stat-val">{quickViewVariant.quantity ?? 0}</strong>
                      </div>
                      <div className="inv-stat-col">
                        <span className="stat-label">Đang giữ cho đơn</span>
                        <strong className="stat-val text-amber">{quickViewVariant.reserved_quantity ?? 0}</strong>
                      </div>
                      <div className="inv-stat-col highlight">
                        <span className="stat-label">Khả dụng bán ngay</span>
                        <strong className="stat-val text-green">
                          {Math.max(
                            0,
                            Number(quickViewVariant.quantity ?? 0) - Number(quickViewVariant.reserved_quantity ?? 0)
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Footer */}
                <div className="v06-modal-footer">
                 
                  <div className="v06-footer-right">
                    <button
                      type="button"
                      className="v06-btn-cancel"
                      onClick={() => setQuickViewVariant(null)}
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      className="v06-btn-submit"
                      onClick={() => {
                        const v = quickViewVariant;
                        setQuickViewVariant(null);
                        handleOpenEditModal(v);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Chỉnh sửa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* 7. MODAL QUẢN LÝ TỒN KHO (SECTION 24)                                      */}
      {/* ========================================================================= */}
      {inventoryModal.isOpen &&
        inventoryModal.variant &&
        createPortal(
          <div
            className="artisan-modal-overlay"
            onClick={() => {
              if (!inventoryModal.isSaving) {
                setInventoryModal({ isOpen: false, variant: null, quantity: '', isSaving: false, error: null });
              }
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="v06-form-modal-box v07-inv-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="v06-modal-form-wrapper">
                {/* 1. Modal Header */}
                <div className="v06-modal-header">
                  <div className="v06-header-left">
                    {/* <div className="v06-tag-row">
                      <span className="v06-tag-pill">QUẢN LÝ TỒN KHO</span>
                      <span className="v06-heritage-code font-mono">SKU: {inventoryModal.variant.sku}</span>
                    </div> */}
                    <h3 className="v06-modal-title">Cập Nhật Tồn Kho Khả Dụng</h3>
                   
                  </div>

                  <div className="v06-header-actions">
                    <button
                      type="button"
                      className="v06-close-btn"
                      onClick={() => {
                        if (!inventoryModal.isSaving) {
                          setInventoryModal({ isOpen: false, variant: null, quantity: '', isSaving: false, error: null });
                        }
                      }}
                      disabled={inventoryModal.isSaving}
                      aria-label="Đóng modal"
                      title="Đóng (ESC)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 2. Scrollable Body */}
                <div className="v06-modal-body">
                  {/* Context Info Card */}
                  <div className="v07-inv-context-block" style={{ marginBottom: '16px' }}>
                    <div className="v07-inv-row">
                      <span className="label">Sản phẩm:</span>
                      <strong className="val">{selectedProduct?.product_name}</strong>
                    </div>
                    <div className="v07-inv-row">
                      <span className="label">Biến thể:</span>
                      <span className="val">{inventoryModal.variant.variant_name}</span>
                    </div>
                    <div className="v07-inv-row">
                      <span className="label">Mã SKU:</span>
                      <span className="v07-sku-badge font-mono">{inventoryModal.variant.sku}</span>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {inventoryModal.error && (
                    <div className="v06-rejection-banner" role="alert" style={{ marginBottom: '16px' }}>
                      <span className="v06-rejection-banner-icon">⚠️</span>
                      <div className="v06-rejection-content">
                        <strong className="v06-rejection-title">Số lượng chưa hợp lệ:</strong>
                        <div className="v06-rejection-note">{inventoryModal.error}</div>
                      </div>
                    </div>
                  )}

                  {/* Quantity Input Field */}
                  <div className="v06-form-group">
                    <div className="v06-label-row">
                      <label className="v06-field-label">
                        Số lượng tồn kho thực tế mới <span className="v06-required-star">*</span>
                      </label>
                    </div>
                    <div className="v07-input-suffix-wrap">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="v06-input"
                        value={inventoryModal.quantity}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setInventoryModal((prev) => ({
                            ...prev,
                            quantity: isNaN(val as number) ? '' : val,
                            error: null,
                          }));
                        }}
                        placeholder="Nhập số lượng tồn hiện có..."
                        autoFocus
                      />
                      <span className="v07-input-suffix">SP</span>
                    </div>
                    <span className="v06-field-hint">
                      Lưu ý: Số lượng tồn thực tế không được nhỏ hơn số lượng đang giữ trong các đơn hàng ({inventoryModal.variant.reserved_quantity ?? 0}).
                    </span>
                  </div>

                  {/* Calculation Box */}
                  <div className="v07-inv-calc-box">
                    <div className="calc-row">
                      <span className="calc-label">Số lượng đang giữ :</span>
                      <strong className="calc-val text-amber">{inventoryModal.variant.reserved_quantity ?? 0}</strong>
                    </div>
                    <div className="calc-row highlight">
                      <span className="calc-label">Khả dụng bán ngay :</span>
                      <strong className="calc-val green">
                        {Math.max(
                          0,
                          Number(inventoryModal.quantity || 0) - Number(inventoryModal.variant.reserved_quantity ?? 0)
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. Footer */}
                <div className="v06-modal-footer">
                  <div className="v06-footer-right">
                    <button
                      type="button"
                      className="v06-btn-cancel"
                      onClick={() => {
                        setInventoryModal({ isOpen: false, variant: null, quantity: '', isSaving: false, error: null });
                      }}
                      disabled={inventoryModal.isSaving}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      className="v06-btn-submit"
                      onClick={handleSaveInventory}
                      disabled={inventoryModal.isSaving}
                    >
                      {inventoryModal.isSaving ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(250, 248, 245, 0.3)',
                              borderTopColor: '#FAF8F5',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          <span>Lưu</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* 8. MODAL FORM THÊM / CHỈNH SỬA BIẾN THỂ (SECTION 23)                       */}
      {/* ========================================================================= */}
      {variantFormModal.isOpen &&
        createPortal(
          <div
            className="artisan-modal-overlay"
            onClick={handleCloseVariantFormModal}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="v06-form-modal-box v07-variant-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSaveVariantForm} className="v06-modal-form-wrapper" noValidate>
                {/* 1. Modal Header */}
                <div className="v06-modal-header">
                  <div className="v06-header-left">
                    <div className="v06-tag-row">
                      
                    </div>
                    <h3 className="v06-modal-title">
                      {variantFormModal.mode === 'create' ? 'Thêm Biến Thể Sản Phẩm Mới' : 'Chỉnh Sửa Biến Thể Sản Phẩm'}
                    </h3>
                    <p className="v06-modal-sub">
                      Sản phẩm: <strong>{selectedProduct?.product_name || 'Chưa chọn'}</strong> 
                    </p>
                  </div>

                  <div className="v06-header-actions">
                    <button
                      type="button"
                      className="v06-close-btn"
                      onClick={handleCloseVariantFormModal}
                      aria-label="Đóng biểu mẫu"
                      title="Đóng (ESC)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 2. Scrollable Body */}
                <div className="v06-modal-body">
                  {/* Error Banner */}
                  {variantFormModal.error && (
                    <div className="v06-rejection-banner" role="alert" style={{ marginBottom: '16px' }}>
                      <span className="v06-rejection-banner-icon">⚠️</span>
                      <div className="v06-rejection-content">
                        <strong className="v06-rejection-title">Thông tin chưa hợp lệ:</strong>
                        <div className="v06-rejection-note">{variantFormModal.error}</div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: THÔNG TIN ĐỊNH DANH BIẾN THỂ */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        1. Thông Tin Định Danh Biến Thể
                      </span>
                    </div>

                    {/* Tên biến thể */}
                    <div className="v06-form-group">
                      <div className="v06-label-row">
                        <label className="v06-field-label">
                          Tên biến thể quy cách <span className="v06-required-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="v06-input"
                        value={variantFormModal.variant_name}
                        onChange={(e) =>
                          setVariantFormModal((prev) => ({ ...prev, variant_name: e.target.value, error: null }))
                        }
                        placeholder="Ví dụ: Mẫu men rạn xanh ngọc - Size nhỏ"
                        required
                      />
                      <span className="v06-field-hint">
                        Tên mô tả cụ thể phiên bản (dòng men, kích thước hoặc họa tiết đặc trưng).
                      </span>
                    </div>

                    {/* Mã SKU định danh */}
                    <div className="v06-form-group">
                      <div className="v06-label-row">
                        <label className="v06-field-label">
                          Mã SKU định danh <span className="v06-required-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        className="v06-input font-mono"
                        value={variantFormModal.sku}
                        onChange={(e) =>
                          setVariantFormModal((prev) => ({
                            ...prev,
                            sku: e.target.value.toUpperCase(),
                            error: null,
                          }))
                        }
                        placeholder="Ví dụ: AMTRA-XANH-S"
                        required
                      />
                      <span className="v06-field-hint">
                        Mã SKU là duy nhất trên toàn hệ thống sản phẩm để phân biệt trong kho và đơn hàng.
                      </span>
                    </div>

                    {/* Hai cột: Màu sắc & Kích thước */}
                    <div className="v06-two-input-row">
                      <div className="v06-form-group">
                        <label className="v06-field-label">Màu sắc đặc trưng</label>
                        <input
                          type="text"
                          className="v06-input"
                          value={variantFormModal.color}
                          onChange={(e) => setVariantFormModal((prev) => ({ ...prev, color: e.target.value }))}
                          placeholder="Ví dụ: Men rạn xanh / Đỏ son"
                        />
                      </div>

                      <div className="v06-form-group">
                        <label className="v06-field-label">Kích thước / Dung tích</label>
                        <input
                          type="text"
                          className="v06-input"
                          value={variantFormModal.size}
                          onChange={(e) => setVariantFormModal((prev) => ({ ...prev, size: e.target.value }))}
                          placeholder="Ví dụ: Size S / 250ml / D20cm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: GIÁ BÁN & QUY CÁCH VẬT LÝ */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        2. Định Giá &amp; Quy Cách Kho Hàng
                      </span>
                    </div>

                    <div className="v06-two-input-row">
                      {/* Giá bán */}
                      <div className="v06-form-group">
                        <label className="v06-field-label">
                          Giá bán niêm yết <span className="v06-required-star">*</span>
                        </label>
                        <div className="v07-input-suffix-wrap">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="v06-input"
                            value={variantFormModal.price}
                            onChange={(e) =>
                              setVariantFormModal((prev) => ({
                                ...prev,
                                price: e.target.value === '' ? '' : parseFloat(e.target.value),
                                error: null,
                              }))
                            }
                            placeholder="Ví dụ: 750000"
                            required
                          />
                          <span className="v07-input-suffix">₫</span>
                        </div>
                        <span className="v06-field-hint">
                          {variantFormModal.price !== '' ? `${Number(variantFormModal.price).toLocaleString('vi-VN')} ₫` : 'Giá bán lẻ cho khách hàng'}
                        </span>
                      </div>

                      {/* Khối lượng */}
                      <div className="v06-form-group">
                        <label className="v06-field-label">Khối lượng tịnh</label>
                        <div className="v07-input-suffix-wrap">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="v06-input"
                            value={variantFormModal.weight_gram}
                            onChange={(e) =>
                              setVariantFormModal((prev) => ({
                                ...prev,
                                weight_gram: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                error: null,
                              }))
                            }
                            placeholder="Ví dụ: 650"
                          />
                          <span className="v07-input-suffix">gram</span>
                        </div>
                        <span className="v06-field-hint">Dùng để tính cước phí vận chuyển chính xác.</span>
                      </div>
                    </div>

                    {/* Số lượng tồn kho ban đầu (chỉ khi tạo mới) */}
                    {variantFormModal.mode === 'create' && (
                      <div className="v06-form-group">
                        <label className="v06-field-label">Số lượng tồn kho ban đầu</label>
                        <div className="v07-input-suffix-wrap">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="v06-input"
                            value={variantFormModal.initial_quantity}
                            onChange={(e) =>
                              setVariantFormModal((prev) => ({
                                ...prev,
                                initial_quantity: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                              }))
                            }
                            placeholder="0"
                          />
                          <span className="v07-input-suffix">sản phẩm</span>
                        </div>
                        <span className="v06-field-hint">
                          * Hệ thống sẽ tự động khởi tạo bản ghi Tồn kho tương ứng.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: THUỘC TÍNH MỞ RỘNG (JSON) */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        3. Thuộc Tính Mở Rộng Đặc Thù
                      </span>
                      <button
                        type="button"
                        className="v07-btn-add-attr-pill"
                        onClick={() => {
                          setVariantFormModal((prev) => ({
                            ...prev,
                            attributes: [...prev.attributes, { key: '', value: '' }],
                          }));
                        }}
                      >
                        <span>+</span> Thêm thuộc tính
                      </button>
                    </div>

                    {variantFormModal.attributes.length === 0 ? (
                      <div className="v07-attr-empty-note">
                        Chưa có thuộc tính mở rộng. Bạn có thể nhấn <strong>"+ Thêm thuộc tính"</strong> để bổ sung các cặp đặc tả thủ công như: <em>Men nung, Nhiệt độ lò, Hoa văn khắc, Thể tích...</em>
                      </div>
                    ) : (
                      <div className="v07-attr-rows-list">
                        {variantFormModal.attributes.map((row, idx) => (
                          <div key={idx} className="v07-attr-input-row">
                            <input
                              type="text"
                              className="v06-input"
                              placeholder="Tên thuộc tính (VD: Men gốm)"
                              value={row.key}
                              onChange={(e) => {
                                const newArr = [...variantFormModal.attributes];
                                newArr[idx].key = e.target.value;
                                setVariantFormModal((prev) => ({ ...prev, attributes: newArr }));
                              }}
                            />
                            <input
                              type="text"
                              className="v06-input"
                              placeholder="Giá trị (VD: Men rạn hoàng tộc)"
                              value={row.value}
                              onChange={(e) => {
                                const newArr = [...variantFormModal.attributes];
                                newArr[idx].value = e.target.value;
                                setVariantFormModal((prev) => ({ ...prev, attributes: newArr }));
                              }}
                            />
                            <button
                              type="button"
                              className="v07-btn-del-attr"
                              onClick={() => {
                                const newArr = variantFormModal.attributes.filter((_, i) => i !== idx);
                                setVariantFormModal((prev) => ({ ...prev, attributes: newArr }));
                              }}
                              title="Xóa thuộc tính này"
                              aria-label="Xóa thuộc tính"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: TRẠNG THÁI HOẠT ĐỘNG (IS_ACTIVE) */}
                  <div className="v07-modal-section-card">
                    <div className="v07-modal-section-header">
                      <span className="v07-modal-section-title">
                        4. Trạng Thái Hoạt Động
                      </span>
                    </div>

                    <div className="v07-toggle-switch-card" style={{ margin: 0 }}>
                      <div className="toggle-info">
                        <div className="toggle-title">Kích hoạt kinh doanh </div>
                        <div className="toggle-desc">
                          Khi bật, biến thể này sẽ hiển thị để khách du lịch đặt mua trực tiếp trên sàn LocalCraft.
                        </div>
                      </div>
                      <label className="v07-switch">
                        <input
                          type="checkbox"
                          checked={variantFormModal.is_active}
                          onChange={(e) =>
                            setVariantFormModal((prev) => ({ ...prev, is_active: e.target.checked }))
                          }
                        />
                        <span className="slider round" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Footer */}
                <div className="v06-modal-footer">
                  <div style={{ marginRight: 'auto', fontSize: '12px', color: '#5C6F68' }}>
                    {variantFormModal.mode === 'create' ? (
                      <span>* Vui lòng kiểm tra mã SKU & giá bán trước khi khởi tạo.</span>
                    ) : (
                      <span>* Các thay đổi sẽ được cập nhật đồng bộ vào hệ thống.</span>
                    )}
                  </div>
                  <div className="v06-footer-right">
                    <button
                      type="button"
                      className="v06-btn-cancel"
                      onClick={handleCloseVariantFormModal}
                      disabled={variantFormModal.isSaving}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="v06-btn-submit"
                      disabled={variantFormModal.isSaving}
                    >
                      {variantFormModal.isSaving ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(250, 248, 245, 0.3)',
                              borderTopColor: '#FAF8F5',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          <span>{variantFormModal.mode === 'create' ? 'Tạo biến thể mới' : 'Lưu thay đổi'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default VariantsInventoryTab;
