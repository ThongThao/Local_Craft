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
  const products = dynamicProducts !== undefined ? dynamicProducts : [];

  return (
    <div className="artisan-v2-showcase-section">
      {/* Section Header */}
      <div className="showcase-header-row">
        <div>
          <h3 className="showcase-title">Sản phẩm độc bản &amp; nổi bật</h3>
          <p className="showcase-subtitle">
            Các tác phẩm thủ công tiêu biểu có lượt bán và quan tâm cao nhất tại cơ sở làng nghề
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

      {/* 4 Cards Grid or Empty State */}
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 20px', background: '#FAF8F5', borderRadius: '16px', border: '1px dashed #D5CEBF' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: '#5C6F68', fontWeight: 600 }}>
            Cơ sở làng nghề chưa có sản phẩm nào được công khai
          </p>
          <button
            type="button"
            className="artisan-primary-btn"
            onClick={onManageAll}
            style={{ margin: '0 auto' }}
          >
            Đến trang quản lý sản phẩm
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default ArtisanShowcaseGrid;
