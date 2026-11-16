import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { bookingsApi, BookingDto } from '@/services/api/bookings';

export interface BookingDetailModalProps {
  isOpen: boolean;
  bookingId: number | null;
  onClose: () => void;
  onBookingCancelled?: () => void;
  onBookingUpdated?: () => void;
  showToast?: (msg: string) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onBookingCancelled,
  onBookingUpdated,
  showToast,
}) => {
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<boolean>(false);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setBooking(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await bookingsApi.getBookingDetail(bookingId);
        if (isMounted) {
          if (res.success && res.data) {
            setBooking(res.data);
          } else {
            setError(res.message || 'Không tìm thấy thông tin đơn đặt workshop.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Lỗi kết nối khi tải chi tiết.';
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
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const handleCancelBooking = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      `XÁC NHẬN HỦY ĐẶT CHỖ WORKSHOP\n\n` +
      `• Mã đơn đặt: ${booking.booking_code}\n` +
      `• Khách hàng: ${booking.customer_name || 'Khách đặt trực tuyến'}\n` +
      `• Số người tham gia: ${booking.participant_count} người\n` +
      `• Buổi workshop: ${booking.workshop_name}\n\n` +
      `Lưu ý: Sau khi xác nhận hủy, ${booking.participant_count} chỗ ngồi sẽ được tự động hoàn trả cho ca trải nghiệm tương ứng. Bạn có chắc chắn muốn tiếp tục?`
    );
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const res = await bookingsApi.cancelBooking(booking.booking_id);
      if (res.success && res.data) {
        showToast?.('Đã hủy đơn đặt và hoàn trả chỗ ngồi thành công.');
        setBooking(res.data);
        onBookingCancelled?.();
      } else {
        alert(res.message || 'Hủy đơn đặt thất bại.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi hủy đơn đặt.';
      alert(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmAttendance = async (targetStatus: 'COMPLETED' | 'NO_SHOW') => {
    if (!booking) return;

    const promptMsg =
      targetStatus === 'COMPLETED'
        ? `XÁC NHẬN KHÁCH THAM DỰ WORKSHOP\n\n` +
          `• Khách hàng: ${booking.customer_name || 'Khách đặt trực tuyến'}\n` +
          `• Mã booking: ${booking.booking_code}\n` +
          `• Số người: ${booking.participant_count} người\n` +
          `• Buổi workshop: ${booking.workshop_name}\n\n` +
          `Bạn có chắc chắn muốn xác nhận khách hàng đã đến tham dự buổi workshop này không?`
        : `XÁC NHẬN KHÁCH VẮNG MẶT (NO-SHOW)\n\n` +
          `• Khách hàng: ${booking.customer_name || 'Khách đặt trực tuyến'}\n` +
          `• Mã booking: ${booking.booking_code}\n` +
          `• Số người: ${booking.participant_count} người\n` +
          `• Buổi workshop: ${booking.workshop_name}\n\n` +
          `Lưu ý: Chỉ ghi nhận vắng mặt khi buổi workshop đã bắt đầu và khách không đến. Bạn có chắc chắn muốn tiếp tục?`;

    const confirmed = window.confirm(promptMsg);
    if (!confirmed) return;

    setIsUpdatingAttendance(true);
    try {
      const res = await bookingsApi.updateAttendance(booking.booking_id, targetStatus);
      if (res.success && res.data) {
        showToast?.(
          targetStatus === 'COMPLETED'
            ? 'Đã điểm danh xác nhận khách tham dự thành công!'
            : 'Đã ghi nhận khách vắng mặt (No-show).'
        );
        setBooking(res.data);
        onBookingUpdated?.();
      } else {
        alert(res.message || 'Cập nhật điểm danh thất bại.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối khi cập nhật điểm danh.';
      alert(message);
    } finally {
      setIsUpdatingAttendance(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="v08-status-badge approved" title="Đã xác nhận và đang giữ chỗ">
            <span className="v08-status-dot approved" />
            Đã xác nhận
          </span>
        );
      case 'PENDING':
        return (
          <span className="v08-status-badge pending" title="Đang chờ xác nhận / thanh toán">
            <span className="v08-status-dot pending" />
            Chờ xác nhận
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="v08-status-badge approved" title="Khách đã tham gia buổi trải nghiệm">
            <span className="v08-status-dot approved" />
            Đã hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="v08-status-badge rejected" title="Đơn đặt đã bị hủy">
            <span className="v08-status-dot rejected" />
            Đã hủy
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="v08-status-badge draft" title="Khách không đến tham dự">
            <span className="v08-status-dot draft" />
            Vắng mặt
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="v08-status-badge draft" title="Hết thời hạn thanh toán/giữ chỗ">
            <span className="v08-status-dot draft" />
            Hết hạn
          </span>
        );
      default:
        return (
          <span className="v08-status-badge draft">
            <span className="v08-status-dot draft" />
            {status}
          </span>
        );
    }
  };

  const getSessionStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPEN':
        return <span style={{ color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #a7f3d0' }}>Mở nhận khách</span>;
      case 'FULL':
        return <span style={{ color: '#dc2626', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #fecaca' }}>Đã đầy chỗ</span>;
      case 'CANCELLED':
        return <span style={{ color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>Ca đã hủy</span>;
      case 'COMPLETED':
        return <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>Đã kết thúc</span>;
      default:
        return status ? <span style={{ fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>{status}</span> : null;
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
        return <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #a7f3d0' }}>Đã thanh toán</span>;
      case 'PENDING':
        return <span style={{ color: '#d97706', background: '#fffbeb', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #fde68a' }}>Chờ thanh toán</span>;
      case 'FAILED':
        return <span style={{ color: '#dc2626', background: '#fef2f2', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #fecaca' }}>Thất bại</span>;
      case 'REFUNDED':
        return <span style={{ color: '#7c3aed', background: '#f5f3ff', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, border: '1px solid #ddd6fe' }}>Đã hoàn tiền</span>;
      default:
        return status ? <span style={{ fontSize: '11.5px', color: '#4b5563', fontWeight: 600 }}>{status}</span> : null;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
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

  return createPortal(
    <div
      className="artisan-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div
        className="v06-form-modal-box v12-booking-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v06-modal-form-wrapper">
          {/* 1. Modal Header */}
          <div className="v06-modal-header">
            <div className="v06-header-left">
              <div className="v06-tag-row">
                {/* {booking && (
                  <span className="v06-heritage-code font-mono">
                    MÃ ĐƠN: {booking.booking_code}
                  </span>
                )} */}
                {booking && getStatusBadge(booking.status)}
              </div>
              <h3 id="booking-modal-title" className="v06-modal-title">
                {booking ? `Đơn Đặt Chỗ: ${booking.booking_code}` : 'Chi Tiết Đặt Chỗ Workshop'}
              </h3>
              <p className="v06-modal-sub">
                {booking ? (
                  <>
                    Workshop: <strong>{booking.workshop_name}</strong> • Ngày tạo:{' '}
                    {formatDateTime(booking.created_at)}
                  </>
                ) : (
                  'Đang truy xuất thông tin đặt chỗ từ hệ thống...'
                )}
              </p>
            </div>

            <div className="v06-header-actions">
              <button
                type="button"
                className="v06-close-btn"
                onClick={onClose}
                aria-label="Đóng cửa sổ"
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
          <div className="v06-modal-body v12-modal-body">
            {isLoading ? (
              <div className="v12-state-container">
                <div className="v03-spinner" style={{ margin: '0 auto 14px' }} />
                <p className="v12-state-text">Đang tải chi tiết đơn đặt workshop...</p>
              </div>
            ) : error ? (
              <div className="v06-rejection-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: '#991B1B' }}>Không thể hiển thị thông tin</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#B91C1C' }}>{error}</p>
                </div>
              </div>
            ) : booking ? (
              <>
                {/* Banner trạng thái điểm danh */}
                {booking.status === 'COMPLETED' && (
                  <div className="v12-attendance-banner completed">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#065F46' }}>Khách đã hoàn thành buổi trải nghiệm</strong>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#047857', marginTop: '2px' }}>
                        Làng nghề đã xác nhận đón tiếp và phục vụ khách hàng thành công.
                      </div>
                    </div>
                  </div>
                )}

                {booking.status === 'NO_SHOW' && (
                  <div className="v12-attendance-banner noshow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#991B1B' }}>Khách hàng vắng mặt </strong>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#B91C1C', marginTop: '2px' }}>
                        Khách không đến tham dự ca workshop theo lịch đã xác nhận.
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 1: Thông tin khách hàng & Tài khoản */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Thông tin khách hàng & liên hệ
                    </h4>
                    <span className="v12-account-pill">
                      {booking.user_id ? `Tài khoản #${booking.user_id}` : 'Khách đặt trực tuyến'}
                    </span>
                  </div>
                  <div className="v12-grid-4">
                    <div className="v12-field-item">
                      <span className="v12-field-label">Họ và tên khách:</span>
                      <strong className="v12-field-value text-strong">{booking.customer_name || 'Khách đặt trực tuyến'}</strong>
                    </div>
                    <div className="v12-field-item">
                      <span className="v12-field-label">Số điện thoại:</span>
                      <strong className="v12-field-value">{booking.customer_phone || 'Chưa cung cấp'}</strong>
                    </div>
                    <div className="v12-field-item">
                      <span className="v12-field-label">Email liên hệ:</span>
                      <span className="v12-field-value font-mono">{booking.customer_email || 'Chưa cung cấp'}</span>
                    </div>
                    <div className="v12-field-item">
                      <span className="v12-field-label">Thời điểm đặt:</span>
                      <span className="v12-field-value">{formatDateTime(booking.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Thông tin Workshop & Địa điểm tổ chức */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                      Thông tin Workshop & Địa điểm tổ chức
                    </h4>
                    {Boolean(booking.workshop_duration_minutes) && (
                      <span className="v12-duration-pill">
                        Thời lượng: {booking.workshop_duration_minutes} phút
                      </span>
                    )}
                  </div>
                  <div className="v12-workshop-media-row">
                    {booking.workshop_image ? (
                      <img
                        src={booking.workshop_image}
                        alt={booking.workshop_name}
                        className="v12-workshop-thumb"
                      />
                    ) : (
                      <div className="v12-workshop-thumb-placeholder">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="v12-workshop-info">
                      <h5 className="v12-workshop-name">{booking.workshop_name}</h5>
                      <div className="v12-grid-2">
                        <div className="v12-meta-tag-item">
                          <span className="v12-meta-label">Nghệ nhân phụ trách:</span><strong className="v12-artisan-name">{booking.artisan_name || 'Làng nghề'}</strong>
                        </div>
                        <div className="v12-meta-tag-item">
                          <span className="v12-meta-label">Làng nghề tổ chức:</span><strong className="v12-village-name">{booking.village_name || '---'}</strong>
                        </div>
                      </div>
                      {booking.location_address && (
                        <div className="v12-address-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{booking.location_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 3: Lịch ca trải nghiệm & Tình trạng chỗ (V10) */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Lịch ca trải nghiệm & Sức chứa ca (V10)
                    </h4>
                    {getSessionStatusBadge(booking.session_status)}
                  </div>

                  <div className="v12-session-time-banner">
                    <div className="v12-time-label">Khung giờ tổ chức ca:</div>
                    <div className="v12-time-range-pill">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatDateTime(booking.start_at)}</span>
                      <span className="v12-arrow">→</span>
                      <span>{formatDateTime(booking.end_at)}</span>
                    </div>
                  </div>

                  <div className="v12-session-capacity-grid">
                    <div className="v12-cap-box this-booking">
                      <span className="v12-cap-label">Khách đơn này</span>
                      <span className="v12-cap-val">{booking.participant_count} người</span>
                    </div>
                    <div className="v12-cap-box session-registered">
                      <span className="v12-cap-label">Đã đăng ký ca này</span>
                      <span className="v12-cap-val">
                        {booking.session_booked_participants !== undefined ? `${booking.session_booked_participants} người` : '---'}
                      </span>
                    </div>
                    <div className="v12-cap-box session-max">
                      <span className="v12-cap-label">Sức chứa ca tối đa</span>
                      <span className="v12-cap-val">
                        {booking.session_capacity !== undefined ? `${booking.session_capacity} chỗ` : '---'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Chi tiết thanh toán & Đơn giá */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Chi tiết thanh toán & Đơn giá
                    </h4>
                  </div>
                  <div className="v12-financial-grid">
                    <div className="v12-fin-box">
                      <span className="v12-fin-label">Số lượng khách</span>
                      <strong className="v12-fin-val">{booking.participant_count} người</strong>
                    </div>
                    <div className="v12-fin-box">
                      <span className="v12-fin-label">Đơn giá / người</span>
                      <strong className="v12-fin-val">{Number(booking.unit_price).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div className="v12-fin-box highlight">
                      <span className="v12-fin-label">Tổng tiền đơn đặt</span>
                      <strong className="v12-fin-val total">{Number(booking.total_amount).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                  </div>
                </div>

                {/* Card 5: Giao dịch thanh toán trực tuyến */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                      Giao dịch thanh toán trực tuyến
                    </h4>
                    {booking.payment_info && getPaymentStatusBadge(booking.payment_info.status)}
                  </div>

                  {booking.payment_info ? (
                    <div className="v12-payment-details-box">
                      <div className="v12-grid-4">
                        <div>
                          <span className="v12-field-label">Mã giao dịch:</span>
                          <strong className="v12-field-value font-mono">{booking.payment_info.payment_code}</strong>
                        </div>
                        <div>
                          <span className="v12-field-label">Phương thức:</span>
                          <strong className="v12-field-value">{booking.payment_info.payment_method}</strong>
                        </div>
                        <div>
                          <span className="v12-field-label">Số tiền:</span>
                          <strong className="v12-field-value text-green">
                            {Number(booking.payment_info.amount).toLocaleString('vi-VN')} {booking.payment_info.currency}
                          </strong>
                        </div>
                        <div>
                          <span className="v12-field-label">Thời gian:</span>
                          <span className="v12-field-value">
                            {formatDateTime(booking.payment_info.paid_at || booking.payment_info.created_at)}
                          </span>
                        </div>
                      </div>
                      {booking.payment_info.provider_transaction_id && (
                        <div className="v12-provider-ref-row">
                          <span className="v12-field-label">Mã tham chiếu đối tác (Provider Ref):</span>
                          <span className="v12-field-value font-mono">{booking.payment_info.provider_transaction_id}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="v12-empty-payment-note">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Chưa có giao dịch thanh toán trực tuyến được ghi nhận cho đơn đặt này (hoặc thanh toán tại xưởng).
                    </div>
                  )}
                </div>

                {/* Card 6: Yêu cầu đặc biệt của khách hàng */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Yêu cầu đặc biệt của khách hàng
                    </h4>
                  </div>
                  {booking.special_request && booking.special_request.trim() ? (
                    <div className="v12-special-request-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>{booking.special_request}</span>
                    </div>
                  ) : (
                    <div className="v12-empty-request-note">
                      Khách hàng không có yêu cầu đặc biệt nào đi kèm đơn đặt này.
                    </div>
                  )}
                </div>

                {/* Card 7: Ghi chú hủy đơn (nếu có) */}
                {booking.cancelled_at && (
                  <div className="v12-cancellation-banner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>
                      Đơn đăng ký này đã được hủy vào lúc: <strong>{formatDateTime(booking.cancelled_at)}</strong>. Số lượng {booking.participant_count} chỗ ngồi đã được hoàn trả tự động vào ca tổ chức.
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* 3. Modal Footer */}
          <div className="v06-modal-footer">
            <div className="v06-footer-left">
              {booking && (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                <button
                  type="button"
                  className="v12-btn-cancel-booking"
                  onClick={handleCancelBooking}
                  disabled={isCancelling || isUpdatingAttendance}
                  title="Hủy đơn đặt và hoàn trả chỗ ngồi cho ca workshop"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {isCancelling ? 'Đang hủy đơn...' : 'Hủy lượt đặt chỗ'}
                </button>
              )}
            </div>
            <div className="v06-footer-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Hành động Điểm danh cho Quản lý làng nghề */}
              {booking && booking.status === 'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    className="v12-btn-noshow"
                    onClick={() => handleConfirmAttendance('NO_SHOW')}
                    disabled={isUpdatingAttendance || isCancelling}
                    title="Báo khách không đến tham dự buổi workshop"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {isUpdatingAttendance ? 'Đang lưu...' : 'Báo vắng mặt'}
                  </button>

                  <button
                    type="button"
                    className="v12-btn-checkin"
                    onClick={() => handleConfirmAttendance('COMPLETED')}
                    disabled={isUpdatingAttendance || isCancelling}
                    title="Xác nhận khách đã đến tham gia workshop thành công"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isUpdatingAttendance ? 'Đang lưu...' : 'Xác nhận tham gia'}
                  </button>
                </>
              )}

              {booking && (
                <button
                  type="button"
                  className="v12-btn-print"
                  onClick={() => window.print()}
                  title="In phiếu xác nhận tiếp đón khách"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  In phiếu tiếp đón
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default BookingDetailModal;
