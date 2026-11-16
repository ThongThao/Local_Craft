import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi, VendorOrderDto } from '@/services/api/orders';

export interface OrderDetailModalProps {
  isOpen: boolean;
  vendorOrderId: number | null;
  onClose: () => void;
  onOrderStatusUpdated?: () => void;
  showToast?: (msg: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  vendorOrderId,
  onClose,
  onOrderStatusUpdated,
  showToast,
}) => {
  const [order, setOrder] = useState<VendorOrderDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showShippingDialog, setShowShippingDialog] = useState<boolean>(false);
  const [trackingCodeInput, setTrackingCodeInput] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !vendorOrderId) {
      setOrder(null);
      setError(null);
      setShowShippingDialog(false);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await ordersApi.getVendorOrderDetail(vendorOrderId);
        if (isMounted) {
          if (res.success && res.data) {
            setOrder(res.data);
          } else {
            setError(res.message || 'Không tìm thấy thông tin đơn hàng làng nghề.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Lỗi kết nối khi tải chi tiết đơn hàng.';
          setError(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, vendorOrderId]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (newStatus: string, trackingCode?: string) => {
    if (!order) return;

    if (newStatus === 'CANCELLED') {
      const confirmed = window.confirm(
        `XÁC NHẬN HỦY ĐƠN HÀNG LÀNG NGHỀ\n\n` +
        `• Mã đơn làng nghề: ${order.vendor_order_code}\n` +
        `• Mã đơn gốc: ${order.order_code || `ORD-${order.order}`}\n` +
        `• Người nhận: ${order.recipient_name}\n\n` +
        `Lưu ý nghiệp vụ: Hệ thống sẽ tự động hoàn trả số lượng tồn kho cho tất cả các biến thể thuộc đơn hàng này. Thao tác này không thể hoàn tác!\n\n` +
        `Bạn có chắc chắn muốn hủy đơn hàng này không?`
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);
    try {
      const payload: { status: string; tracking_code?: string } = { status: newStatus };
      if (trackingCode) payload.tracking_code = trackingCode;

      const res = await ordersApi.updateVendorOrderStatus(order.vendor_order_id, payload);
      if (res.success && res.data) {
        showToast?.(res.message || `Đã chuyển trạng thái đơn hàng sang ${newStatus}`);
        setOrder(res.data);
        setShowShippingDialog(false);
        onOrderStatusUpdated?.();
      } else {
        alert(res.message || 'Cập nhật trạng thái đơn hàng thất bại.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái đơn hàng.';
      alert(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Đơn hàng mới chờ làng nghề xác nhận">
            <span className="v08-status-dot pending" />
            Chờ xác nhận
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="v08-status-badge approved" title="Làng nghề đã xác nhận đơn">
            <span className="v08-status-dot approved" />
            Đã xác nhận
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="v08-status-badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }} title="Nghệ nhân đang hoàn thiện tác phẩm / đóng gói">
            <span className="v08-status-dot" style={{ background: '#0284c7' }} />
            Đang chế tác
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="v08-status-badge" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }} title="Đơn hàng đã bàn giao cho đơn vị vận chuyển">
            <span className="v08-status-dot" style={{ background: '#d97706' }} />
            Đang giao hàng
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="v08-status-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }} title="Khách hàng đã nhận được tác phẩm">
            <span className="v08-status-dot" style={{ background: '#10b981' }} />
            Đã giao
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="v08-status-badge approved" title="Giao dịch đã hoàn tất trọn vẹn">
            <span className="v08-status-dot approved" />
            Đã hoàn tất
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="v08-status-badge rejected" title="Đơn hàng đã bị hủy & hoàn kho">
            <span className="v08-status-dot rejected" />
            Đã hủy
          </span>
        );
      default:
        return <span className="v08-status-badge">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="v08-status-badge approved" title="Đã nhận thanh toán từ khách qua cổng thanh toán">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Đã thanh toán
          </span>
        );
      case 'UNPAID':
        return (
          <span className="v08-status-badge rejected" title="Chưa nhận được thanh toán hoặc thanh toán khi nhận hàng">
            <span className="v08-status-dot rejected" />
            Chưa thanh toán
          </span>
        );
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Giao dịch thanh toán đang xử lý">
            <span className="v08-status-dot pending" />
            Chờ thanh toán
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="v08-status-badge" style={{ background: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' }} title="Tiền đã được hoàn lại cho khách hàng">
            Đã hoàn tiền
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="v08-status-badge" style={{ background: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' }} title="Đã hoàn một phần tiền cho khách">
            Hoàn tiền 1 phần
          </span>
        );
      case 'FAILED':
        return (
          <span className="v08-status-badge rejected" title="Thanh toán qua cổng thất bại">
            Thanh toán lỗi
          </span>
        );
      default:
        return <span className="v08-status-badge">{status}</span>;
    }
  };

  const formatVND = (val?: string | number) => {
    if (val === undefined || val === null || val === '') return '0 ₫';
    const num = Number(val);
    return isNaN(num) ? '0 ₫' : num.toLocaleString('vi-VN') + ' ₫';
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return createPortal(
    <div
      className="v08-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="v08-modal-container v12-booking-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        style={{ maxWidth: '850px' }}
      >
        {/* Modal Header */}
        <div className="v08-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {order && getOrderStatusBadge(order.status)}
              {order && getPaymentStatusBadge(order.payment_status)}
            </div>
            <h2 id="order-modal-title" className="v08-modal-title">
              {order ? `Đơn hàng ${order.vendor_order_code}` : 'Đang tải thông tin đơn hàng...'}
            </h2>
            {order && (
              <p className="v08-modal-sub" style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Thuộc đơn hàng gốc: <strong style={{ color: '#1e293b' }}>{order.order_code || `ORD-${order.order}`}</strong> • Ngày đặt: {formatDate(order.order_placed_at || order.created_at)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="v08-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="v08-modal-body">
          {isLoading && (
            <div className="v12-loading-state" style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#64748b', fontWeight: 500 }}>Đang truy xuất dữ liệu snapshot từ máy chủ...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="v12-error-banner" style={{ margin: '20px 0', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {order && !isLoading && (
            <div className="v12-booking-details-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Row 1: Thông tin khách hàng & Địa chỉ giao hàng snapshot */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* Box Khách hàng */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Tài Khoản 
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Họ tên:</span>{' '}
                      <strong>{order.customer_name || 'Khách vãng lai'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Email:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{order.customer_email || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Làng nghề phục vụ:</span>{' '}
                      <strong style={{ color: '#0d9488' }}>{order.village_name}</strong>
                    </div>
                  </div>
                </div>

                {/* Box Người nhận snapshot */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Người Nhận & Địa Chỉ Giao 
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Người nhận:</span>{' '}
                      <strong>{order.recipient_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
                      <strong style={{ color: '#1e293b' }}>{order.recipient_phone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Địa chỉ:</span>{' '}
                      <span>{order.shipping_address}</span>
                    </div>
                    {order.shipping_note && (
                      <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px' }}>
                        Ghi chú: {order.shipping_note}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin vận chuyển nếu có */}
              {(order.tracking_code || order.shipped_at || order.delivered_at) && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <div>
                      <span style={{ fontSize: '12px', color: '#166534', display: 'block' }}>Mã Vận Đơn</span>
                      <strong style={{ fontSize: '14px', color: '#14532d', fontFamily: 'monospace' }}>{order.tracking_code || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>
                  {order.shipped_at && (
                    <div>
                      <span style={{ fontSize: '12px', color: '#166534', display: 'block' }}>Ngày xuất kho giao</span>
                      <span style={{ fontSize: '13px', color: '#15803d' }}>{formatDate(order.shipped_at)}</span>
                    </div>
                  )}
                  {order.delivered_at && (
                    <div>
                      <span style={{ fontSize: '12px', color: '#166534', display: 'block' }}>Ngày giao thành công</span>
                      <span style={{ fontSize: '13px', color: '#15803d' }}>{formatDate(order.delivered_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách tác phẩm snapshot thuộc làng nghề */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Danh Sách Sản Phẩm Làng Nghề ({order.items?.length || 0})
                  </h4>
                  {/* <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Snapshot giá & biến thể tại thời điểm đặt hàng
                  </span> */}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 16px', width: '300px', }}>Tác phẩm</th>
                      <th style={{ padding: '10px 16px', width: '220px', }}>Biến thể</th>
                      <th style={{ padding: '10px 16px', width: '130px', }}>Mã SKU</th>
                      <th style={{ padding: '10px 16px', width: '100px', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '10px 16px',width: '90px', textAlign: 'center' }}>Số lượng</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it) => (
                        <tr key={it.order_item_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {it.product_image && (
                                <img
                                  src={it.product_image}
                                  alt={it.product_name_snapshot}
                                  style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{it.product_name_snapshot}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {it.variant_name_snapshot}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b' }}>
                            {it.sku_snapshot}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155' }}>
                            {formatVND(it.unit_price)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f766e' }}>
                            {formatVND(it.line_total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          Không có sản phẩm nào thuộc làng nghề trong đơn hàng này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Tổng hợp tài chính của phần Làng nghề */}
                
                <div style={{ padding: '16px', background: '#fafaf9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Tiền hàng làng nghề:</span>
                      <strong style={{ color: '#1e293b' }}>{formatVND(order.subtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Phí vận chuyển:</span>
                      <span>{formatVND(order.shipping_fee)}</span>
                    </div>
                    {Number(order.discount_amount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                        <span>Giảm giá:</span>
                        <span>-{formatVND(order.discount_amount)}</span>
                      </div>
                    )}
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#0f766e' }}>
                      <span>Tổng tiền:</span>
                      <span>{formatVND(order.total_amount)}</span>
                    </div>
                    
                  </div>
                </div>
              </div>

              {/* Lịch sử giao dịch thanh toán & Hoàn tiền (nếu có) */}
              {order.payments && order.payments.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                    Giao Dịch Thanh Toán Của Đơn Hàng ({order.payments.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.payments.map((p) => (
                      <div key={p.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                        <div>
                          <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{p.payment_code}</strong>
                          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                          <span style={{ color: '#475569' }}>{p.payment_method}</span>
                          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                          <span style={{ color: '#64748b' }}>{formatDate(p.paid_at || p.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 600, color: '#0f766e' }}>{formatVND(p.amount)}</span>
                          <span className={`status-pill ${p.status === 'SUCCESS' ? 'completed' : 'pending'}`} style={{ fontSize: '11px' }}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hộp thoại nhập mã vận đơn khi bấm "Giao Hàng" */}
              {showShippingDialog && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#854d0e', fontWeight: 600 }}>
                    Xác nhận giao hàng cho đơn vị vận chuyển
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#713f12' }}>
                    Vui lòng cung cấp mã vận đơn của bưu cục/đơn vị giao vận (nếu có) để du khách có thể theo dõi hành trình:
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: VNPOST-12345678, GHN-998877"
                      value={trackingCodeInput}
                      onChange={(e) => setTrackingCodeInput(e.target.value)}
                      style={{ maxWidth: '320px', padding: '8px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      className="table-btn-action ship"
                      onClick={() => handleUpdateStatus('SHIPPED', trackingCodeInput)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Đang cập nhật...' : 'Xác nhận Đang Giao'}
                    </button>
                    <button
                      type="button"
                      style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                      onClick={() => setShowShippingDialog(false)}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="v08-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div>
            {order && (order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (
              <button
                type="button"
                className="v13-btn-action-cancel"
                onClick={() => handleUpdateStatus('CANCELLED')}
                disabled={isUpdating}
              >
                Hủy Đơn & Hoàn Kho
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {order?.status === 'PENDING' && (
              <button
                type="button"
                className="table-btn-action confirm"
                onClick={() => handleUpdateStatus('CONFIRMED')}
                disabled={isUpdating}
              >
                {isUpdating ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}
              </button>
            )}

            {order?.status === 'CONFIRMED' && (
              <button
                type="button"
                className="v13-btn-action"
                onClick={() => handleUpdateStatus('PROCESSING')}
                disabled={isUpdating}
              >
                {isUpdating ? 'Đang xử lý...' : 'Bắt đầu chế tác / Chuẩn bị'}
              </button>
            )}

            {order?.status === 'PROCESSING' && !showShippingDialog && (
              <button
                type="button"
                className="table-btn-action ship"
                onClick={() => setShowShippingDialog(true)}
                disabled={isUpdating}
              >
                Bàn giao vận chuyển 
              </button>
            )}

            {order?.status === 'SHIPPED' && (
              <button
                type="button"
                className="v13-btn-action"
                onClick={() => handleUpdateStatus('DELIVERED')}
                disabled={isUpdating}
              >
                {isUpdating ? 'Đang xử lý...' : 'Xác nhận đã giao tới khách'}
              </button>
            )}

            {order?.status === 'DELIVERED' && (
              <button
                type="button"
                className="table-btn-action complete"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={isUpdating}
              >
                {isUpdating ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
              </button>
            )}

           
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
