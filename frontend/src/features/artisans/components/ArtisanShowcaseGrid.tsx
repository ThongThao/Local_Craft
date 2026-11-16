import React from 'react';

export interface ShowcaseProductItem {
  id: string | number;
  name: string;
  artisanName: string;
  category: string;
  image: string;
  price: string;
  salesCount?: number;
  statusLabel?: string;
  statusClass?: string;
  stockNote?: string;
}

interface ArtisanShowcaseGridProps {
  onManageAll?: () => void;
  onSelectItem?: (id: string | number) => void;
  products?: ShowcaseProductItem[];
}

export const ArtisanShowcaseGrid: React.FC<ArtisanShowcaseGridProps> = ({
  onManageAll,
  onSelectItem,
  products: dynamicProducts,
}) => {
  // 4 Sản phẩm độc bản & nổi bật của làng nghề
  const defaultProducts: ShowcaseProductItem[] = [
    {
      id: 'prod-01',
      name: 'Bình gốm Men Rạn Hoa Sen Cổ',
      artisanName: 'NNƯT. Phạm Văn Vạn',
      category: 'Gốm men rạn Bát Tràng',
      image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80',
      price: '6.500.000 ₫',
      salesCount: 8,
      statusLabel: 'OCOP 5 Sao · Độc bản',
      statusClass: 'dark-green',
      stockNote: 'Chỉ còn 3 chiếc',
    },
    {
      id: 'prod-02',
      name: 'Bộ ấm chén Mộc Sa Men Tro Nung Củi',
      artisanName: 'NNƯT. Trần Độ',
      category: 'Trà cụ thủ công',
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      price: '1.850.000 ₫',
      salesCount: 45,
      statusLabel: 'Bán chạy nhất',
      statusClass: 'terracotta',
      stockNote: 'Sẵn hàng xuất xưởng',
    },
    {
      id: 'prod-03',
      name: 'Đĩa gốm phù điêu Phố Cổ Hà Nội',
      artisanName: 'NNƯT. Vũ Đức Thắng',
      category: 'Mỹ nghệ trưng bày',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
      price: '2.200.000 ₫',
      salesCount: 29,
      statusLabel: 'Di sản chứng nhận',
      statusClass: 'teal',
      stockNote: 'Còn 12 sản phẩm',
    },
    {
      id: 'prod-04',
      name: 'Lọ hoa vuốt tay Men Lam Cổ Điển',
      artisanName: 'NNƯT. Phạm Văn Vạn',
      category: 'Gốm gia dụng cao cấp',
      image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
      price: '3.400.000 ₫',
      salesCount: 18,
      statusLabel: 'Đang mở bán',
      statusClass: 'dark-green',
      stockNote: 'Sắp hết hàng',
    },
  ];

  const products = dynamicProducts && dynamicProducts.length > 0 ? dynamicProducts : defaultProducts;

  return (
    <div className="artisan-v2-showcase-section">
      {/* Section Header */}
      <div className="showcase-header-row">
        <div>
          <h3 className="showcase-title">Sản phẩm độc bản & nổi bật</h3>
          <p className="showcase-subtitle">
            Top 4 tác phẩm thủ công tiêu biểu có lượt bán và quan tâm cao nhất tại cơ sở làng nghề
          </p>
        </div>

        {/* Nút Xem tất cả dẫn tới màn hình V05 - Quản lý sản phẩm */}
        <button
          type="button"
          className="showcase-manage-link"
          onClick={onManageAll}
          title="Xem danh sách đầy đủ tại V05 - Quản lý sản phẩm"
        >
          <span>Xem tất cả</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="showcase-grid-row">
        {products.map((item) => (
          <div
            key={item.id}
            className="showcase-card"
            onClick={() => onSelectItem?.(item.id)}
            role="button"
            tabIndex={0}
          >
            {/* Image Thumbnail with Overlay Badges */}
            <div className="showcase-image-wrap">
              <img src={item.image} alt={item.name} className="showcase-img" />

              {/* Status Badge */}
              <span className={`showcase-badge-top ${item.statusClass}`}>
                {item.statusLabel}
              </span>

              {/* Stock Note Badge */}
              <span className="showcase-badge-bottom">
                {item.stockNote}
              </span>
            </div>

            {/* Card Content */}
            <div className="showcase-content">
              <div className="showcase-artisan-author">
                <span className="author-dot" />
                <span className="author-name">{item.artisanName}</span>
              </div>

              <h4 className="showcase-item-title" title={item.name}>
                {item.name}
              </h4>

              <div className="showcase-card-footer">
                <div className="showcase-price-box">
                  <span className="price-label">Đơn giá niêm yết:</span>
                  <span className="price-val">{item.price}</span>
                </div>
                <span className="showcase-count-pill" title={`Đã giao thành công ${item.salesCount} tác phẩm`}>
                  Đã bán {item.salesCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtisanShowcaseGrid;
