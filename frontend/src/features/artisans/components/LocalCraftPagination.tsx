import React from 'react';

export interface LocalCraftPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  totalUnfiltered?: number;
  className?: string;
}

/**
 * LocalCraftPagination - Component phân trang chuẩn dùng chung cho tất cả các trang/tab trong Artisans.
 * Đảm bảo giao diện đồng bộ: thông tin bản ghi bên trái, cụm nút chuyển trang bên phải.
 */
export const LocalCraftPagination: React.FC<LocalCraftPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'mục',
  totalUnfiltered,
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((item, idx) => {
      if (item === '...') {
        return (
          <span
            key={`dots-${idx}`}
            className="v03-page-dots"
            style={{
              padding: '0 6px',
              color: '#9CA3AF',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            …
          </span>
        );
      }
      const pg = item as number;
      return (
        <button
          key={pg}
          type="button"
          className={`v03-page-btn num-btn ${currentPage === pg ? 'active' : ''}`}
          onClick={() => onPageChange(pg)}
          aria-label={`Trang ${pg}`}
          aria-current={currentPage === pg ? 'page' : undefined}
        >
          {pg}
        </button>
      );
    });
  };

  return (
    <div
      className={`v03-pagination-bar ${className}`.trim()}
      role="navigation"
      aria-label="Phân trang danh sách"
    >
      <div className="v03-pagination-info">
        Hiển thị <strong>{startItem} - {endItem}</strong> trong tổng số <strong>{totalItems}</strong> {itemLabel}
        {totalUnfiltered !== undefined && totalItems !== totalUnfiltered && (
          <span className="v03-pagination-filter-note">
            {' '}(Lọc từ <strong>{totalUnfiltered}</strong> {itemLabel})
          </span>
        )}
      </div>

      <div className="v03-pagination-controls">
        <button
          type="button"
          className="v03-page-btn nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Trang trước"
          aria-label="Về trang trước"
        >
          ← Trước
        </button>

        <div className="v03-page-numbers">{renderPageNumbers()}</div>

        <button
          type="button"
          className="v03-page-btn nav-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          title="Trang kế tiếp"
          aria-label="Sang trang tiếp theo"
        >
          Sau →
        </button>
      </div>
    </div>
  );
};

export default LocalCraftPagination;
