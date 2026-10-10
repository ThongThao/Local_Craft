import React, { useState } from 'react';
import AppIcon from '@/components/ui/AppIcon';
import TiltCard from '@/components/ui/TiltCard';
import { PRODUCTS_DATA } from '@/data/landing';
import { ProductItem } from '@/types/landing';

interface CuratedProductsSectionProps {
  onSelectProduct?: (product: ProductItem) => void;
}

export const CuratedProductsSection: React.FC<CuratedProductsSectionProps> = ({
  onSelectProduct,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'pottery' | 'silk' | 'lacquer'>('all');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const filterTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pottery', label: 'Gốm & Men' },
    { key: 'silk', label: 'Lụa tơ tằm' },
    { key: 'lacquer', label: 'Mây tre & Sơn mài' },
  ] as const;

  const filteredProducts =
    activeCategory === 'all'
      ? PRODUCTS_DATA
      : PRODUCTS_DATA.filter((p) => p.category === activeCategory);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="san-pham" className="products-section">
      <div className="products-container">
        {/* Header & Filter Tabs row */}
        <div className="products-header">
          <div className="products-header-texts">
            <span className="products-eyebrow">TÁC PHẨM CHỌN LỌC</span>
            <h2 className="products-title">Độc bản từ đôi bàn tay Việt</h2>
            <p className="products-description">
              Mỗi tác phẩm là sự kết tinh của nguyên liệu tự nhiên bản địa, kỹ nghệ truyền đời và hàng trăm giờ chế tác tỉ mỉ.
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="filter-tabs-pills">
            {filterTabs.map((tab) => {
              const isActive = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`filter-tab-btn ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Columns Product Grid */}
        <div className="products-grid">
          {filteredProducts.map((product) => {
            const isFav = !!wishlist[product.id];
            return (
              <TiltCard
                key={product.id}
                maxTilt={6}
                glare={true}
                onClick={() => onSelectProduct?.(product)}
                className="product-card"
              >
                {/* Product Image Stage */}
                <div className="product-image-stage">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="product-img-hover"
                  />

                  {/* Badge */}
                  <div className="product-badge-pill">
                    {product.badge}
                  </div>

                  {/* Heart Wishlist Button */}
                  <button
                    onClick={(e) => toggleWishlist(product.id, e)}
                    aria-label="Yêu thích"
                    className={`product-wishlist-btn ${isFav ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>
                      {isFav ? '❤️' : '🤍'}
                    </span>
                  </button>
                </div>

                {/* Card Body */}
                <div className="product-card-body">
                  <div className="product-info-texts">
                    <span className="product-artisan-village">
                      {product.artisan} · {product.village}
                    </span>

                    <h3 className="product-card-title">
                      {product.title}
                    </h3>

                    <p className="product-card-desc">
                      {product.description}
                    </p>
                  </div>

                  {/* Price & Details Link */}
                  <div className="product-footer-row">
                    <span className="product-price">
                      {product.formattedPrice}
                    </span>

                    <div className="product-details-link">
                      <span>Chi tiết</span>
                      <AppIcon name="arrow-right-sm" size={11} />
                    </div>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CuratedProductsSection;
