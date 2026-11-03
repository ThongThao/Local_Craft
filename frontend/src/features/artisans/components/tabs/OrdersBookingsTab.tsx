import React, { useState } from 'react';
import { OrderItemRecord, WorkshopBookingRecord } from '../../types';
import { LocalCraftPagination } from '../LocalCraftPagination';

interface OrdersBookingsTabProps {
  initialSubTab?: 'orders' | 'bookings';
  orders: OrderItemRecord[];
  bookings: WorkshopBookingRecord[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderItemRecord['status']) => void;
  onCheckInBooking: (bookingId: string) => void;
}

export const OrdersBookingsTab: React.FC<OrdersBookingsTabProps> = ({
  initialSubTab = 'orders',
  orders,
  bookings,
  onUpdateOrderStatus,
  onCheckInBooking,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'bookings'>(initialSubTab);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [bookingsPage, setBookingsPage] = useState<number>(1);
  const pageSize = 8;

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setOrdersPage(1);
    setBookingsPage(1);
  };

  const handleSubTabChange = (newSubTab: 'orders' | 'bookings') => {
    setActiveSubTab(newSubTab);
    setStatusFilter('ALL');
    setOrdersPage(1);
    setBookingsPage(1);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const paginatedOrders = filteredOrders.slice(
    (ordersPage - 1) * pageSize,
    ordersPage * pageSize
  );

  const paginatedBookings = filteredBookings.slice(
    (bookingsPage - 1) * pageSize,
    bookingsPage * pageSize
  );

  const getStatusBadge = (status: OrderItemRecord['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-pill pending">Chờ Xác Nhận</span>;
      case 'PREPARING':
        return <span className="status-pill preparing">Đang Hoàn Thiện</span>;
      case 'SHIPPING':
        return <span className="status-pill shipping">Đang Giao Hàng</span>;
      case 'COMPLETED':
        return <span className="status-pill completed">Đã Hoàn Tất</span>;
    }
  };

  return (
    <div className="artisan-tab-pane orders-bookings-pane">
      {/* Subtab Switcher */}
      <div className="tab-toolbar-card">
        <div className="orders-subtabs-row">
          <button
            type="button"
            className={`subtab-switch-btn ${activeSubTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleSubTabChange('orders')}
          >
            🏺 Đơn Đặt Tác Phẩm Thủ Công ({orders.length})
          </button>
          <button
            type="button"
            className={`subtab-switch-btn ${activeSubTab === 'bookings' ? 'active' : ''}`}
            onClick={() => handleSubTabChange('bookings')}
          >
            🎫 Vé Trải Nghiệm Workshop ({bookings.length})
          </button>
        </div>

        {/* Filter by status */}
        <div className="toolbar-filter-tabs">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('ALL')}
          >
            Tất cả
          </button>
          {activeSubTab === 'orders' ? (
            <>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('PENDING')}
              >
                Chờ xác nhận
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'PREPARING' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('PREPARING')}
              >
                Đang chế tác
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'SHIPPING' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('SHIPPING')}
              >
                Đang giao
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('CONFIRMED')}
              >
                Đã xác nhận
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'CHECKED_IN' ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('CHECKED_IN')}
              >
                Đã Check-in
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Table / Card Content */}
      {activeSubTab === 'orders' ? (
        <div className="orders-table-wrapper">
          <table className="artisan-data-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng & Nơi Nhận</th>
                <th>Tác Phẩm & Số Lượng</th>
                <th>Tổng Tiền</th>
                <th>Phương Thức</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác Xử Lý</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o) => (
                <tr key={o.orderId}>
                  <td>
                    <div className="table-order-code">{o.orderId}</div>
                    <div className="table-order-date">{o.orderDate}</div>
                    {o.isCustomOrder && (
                      <span className="table-custom-tag">⭐ Đặt riêng</span>
                    )}
                  </td>
                  <td>
                    <div className="table-customer-name">{o.customerName}</div>
                    <div className="table-customer-phone">{o.customerPhone}</div>
                    <div className="table-customer-loc">{o.customerLocation}</div>
                  </td>
                  <td>
                    <div className="table-product-title">{o.productTitle}</div>
                    <div className="table-product-qty">Số lượng: <strong>{o.quantity} chiếc</strong></div>
                  </td>
                  <td>
                    <div className="table-amount-val">{o.formattedAmount}</div>
                  </td>
                  <td>
                    <span className="payment-method-tag">{o.paymentMethod}</span>
                  </td>
                  <td>{getStatusBadge(o.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-inline">
                      {o.status === 'PENDING' && (
                        <button
                          type="button"
                          className="table-btn-action confirm"
                          onClick={() => onUpdateOrderStatus(o.orderId, 'PREPARING')}
                        >
                          Xác nhận & Chế tác
                        </button>
                      )}
                      {o.status === 'PREPARING' && (
                        <button
                          type="button"
                          className="table-btn-action ship"
                          onClick={() => onUpdateOrderStatus(o.orderId, 'SHIPPING')}
                        >
                          Giao hàng
                        </button>
                      )}
                      {o.status === 'SHIPPING' && (
                        <button
                          type="button"
                          className="table-btn-action complete"
                          onClick={() => onUpdateOrderStatus(o.orderId, 'COMPLETED')}
                        >
                          Hoàn tất
                        </button>
                      )}
                      {o.status === 'COMPLETED' && (
                        <span className="table-completed-label">✓ Đã giao</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Unified Pagination for Orders */}
          <LocalCraftPagination
            currentPage={ordersPage}
            totalPages={Math.ceil(filteredOrders.length / pageSize) || 1}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setOrdersPage}
            itemLabel="đơn đặt hàng"
            totalUnfiltered={orders.length}
          />
        </div>
      ) : (
        <div className="bookings-table-wrapper">
          <table className="artisan-data-table">
            <thead>
              <tr>
                <th>Mã Đặt Vé</th>
                <th>Du Khách & Điện Thoại</th>
                <th>Workshop & Ca Học</th>
                <th>Số Lượng Khách</th>
                <th>Tổng Vé</th>
                <th>Mã QR Check-in</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map((b) => (
                <tr key={b.bookingId}>
                  <td>
                    <div className="table-order-code">{b.bookingId}</div>
                  </td>
                  <td>
                    <div className="table-customer-name">{b.guestName}</div>
                    <div className="table-customer-phone">{b.guestPhone}</div>
                    {b.specialNote && (
                      <div className="table-booking-note">📝 {b.specialNote}</div>
                    )}
                  </td>
                  <td>
                    <div className="table-product-title">{b.workshopTitle}</div>
                    <div className="table-booking-time">⏰ {b.sessionTime}</div>
                  </td>
                  <td>
                    <div className="table-guest-count">
                      <strong>{b.guestCount} người</strong>
                    </div>
                  </td>
                  <td>
                    <div className="table-amount-val">{b.formattedAmount}</div>
                  </td>
                  <td>
                    <span className="qr-badge">{b.qrCode}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${b.status === 'CHECKED_IN' ? 'completed' : 'pending'}`}>
                      {b.status === 'CHECKED_IN' ? 'Đã Vào Lớp' : 'Đã Xác Nhận'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {b.status === 'CONFIRMED' ? (
                      <button
                        type="button"
                        className="table-btn-action checkin"
                        onClick={() => onCheckInBooking(b.bookingId)}
                      >
                        ✓ Quét QR Check-in
                      </button>
                    ) : (
                      <span className="table-completed-label">✓ Đã Check-in</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Unified Pagination for Bookings */}
          <LocalCraftPagination
            currentPage={bookingsPage}
            totalPages={Math.ceil(filteredBookings.length / pageSize) || 1}
            totalItems={filteredBookings.length}
            pageSize={pageSize}
            onPageChange={setBookingsPage}
            itemLabel="lượt đặt vé"
            totalUnfiltered={bookings.length}
          />
        </div>
      )}
    </div>
  );
};
export default OrdersBookingsTab;
