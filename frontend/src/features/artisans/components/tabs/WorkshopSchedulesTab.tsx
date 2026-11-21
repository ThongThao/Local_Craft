import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  workshopsApi,
  WorkshopItemDto,
  WorkshopSessionDto,
  WorkshopSessionDetailDto,
  SessionStatus,
  CreateSessionPayload,
  RescheduleSessionPayload,
} from '../../../../services/api/workshops';

export interface WorkshopSchedulesTabProps {
  initialWorkshopId?: number | null;
  onBackToWorkshops?: () => void;
  onNavigateToBookings?: (workshopId?: number) => void;
  showToast?: (message: string) => void;
  villageId?: number;
}

/* --- SVG Icons (Zero Emojis) --- */


const IconPlus: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconCalendar: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconUsers: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconEye: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEdit: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconBan: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IconTrash: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconSearch: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconRefresh: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconAlertTriangle: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconClose: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheckCircle: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// Helpers
const formatDate = (isoString: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (isoString: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const toLocalDatetimeInputValue = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const WorkshopSchedulesTab: React.FC<WorkshopSchedulesTabProps> = ({
  initialWorkshopId,
  onBackToWorkshops: _onBackToWorkshops,
  onNavigateToBookings: _onNavigateToBookings,
  showToast,
}) => {
  // Workshops list for dropdown selection
  const [workshops, setWorkshops] = useState<WorkshopItemDto[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(initialWorkshopId || null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopItemDto | null>(null);
  const [isLoadingWorkshops, setIsLoadingWorkshops] = useState<boolean>(true);

  // Sessions list
  const [sessions, setSessions] = useState<WorkshopSessionDto[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<WorkshopSessionDto | null>(null);
  const [detailModalSession, setDetailModalSession] = useState<WorkshopSessionDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  // F05.10 Cancellation confirmation modal state
  const [cancelModalSession, setCancelModalSession] = useState<WorkshopSessionDto | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // F05.12 Reschedule confirmation modal state
  const [rescheduleModalSession, setRescheduleModalSession] = useState<WorkshopSessionDto | null>(null);
  const [rescheduleStartAt, setRescheduleStartAt] = useState<string>('');
  const [rescheduleEndAt, setRescheduleEndAt] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Form states
  const [formStartAt, setFormStartAt] = useState<string>('');
  const [formEndAt, setFormEndAt] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<number>(10);
  const [formPrice, setFormPrice] = useState<string>('');
  const [formStatus, setFormStatus] = useState<SessionStatus>('OPEN');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load workshops list on mount
  const fetchWorkshops = useCallback(async () => {
    setIsLoadingWorkshops(true);
    try {
      const res = await workshopsApi.getAll();
      if (res.data) {
        setWorkshops(res.data);
        if (res.data.length > 0) {
          if (initialWorkshopId && res.data.some((w) => w.workshop_id === initialWorkshopId)) {
            setSelectedWorkshopId(initialWorkshopId);
          } else if (!selectedWorkshopId) {
            setSelectedWorkshopId(res.data[0].workshop_id);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching workshops for schedule manager:', err);
      showToast?.('Không thể tải danh sách workshop của làng nghề.');
    } finally {
      setIsLoadingWorkshops(false);
    }
  }, [initialWorkshopId, selectedWorkshopId, showToast]);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  // Sync selectedWorkshop object
  useEffect(() => {
    if (selectedWorkshopId && workshops.length > 0) {
      const found = workshops.find((w) => w.workshop_id === selectedWorkshopId) || null;
      setSelectedWorkshop(found);
    }
  }, [selectedWorkshopId, workshops]);

  // F05.12: Lock body scroll & listen ESC key for Reschedule Modal
  useEffect(() => {
    if (!rescheduleModalSession) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRescheduling) {
        setRescheduleModalSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rescheduleModalSession, isRescheduling]);

  // Load sessions when selected workshop changes
  const sessionRequestIdRef = useRef<number>(0);

  const fetchSessions = useCallback(async () => {
    if (!selectedWorkshopId) {
      setSessions([]);
      return;
    }
    const reqId = ++sessionRequestIdRef.current;
    setIsLoadingSessions(true);
    try {
      // Always fetch all sessions of current workshop to maintain full KPI data integrity
      const res = await workshopsApi.getSessions(selectedWorkshopId);
      if (reqId !== sessionRequestIdRef.current) return;
      if (res.data) {
        setSessions(res.data);
      }
    } catch (err: any) {
      if (reqId !== sessionRequestIdRef.current) return;
      console.error('Error fetching sessions:', err);
      showToast?.('Lỗi khi tải danh sách lịch tổ chức.');
    } finally {
      if (reqId === sessionRequestIdRef.current) {
        setIsLoadingSessions(false);
      }
    }
  }, [selectedWorkshopId, showToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filtered sessions (filtered by both status and search term)
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      // 2. Search Term
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      const dateStr = formatDate(s.start_at);
      const timeStr = `${formatTime(s.start_at)} - ${formatTime(s.end_at)}`;
      const statusStr = s.status.toLowerCase();
      return (
        dateStr.toLowerCase().includes(lower) ||
        timeStr.toLowerCase().includes(lower) ||
        statusStr.includes(lower)
      );
    });
  }, [sessions, statusFilter, searchTerm]);

  // Metrics (computed from all sessions of current workshop, immune to statusFilter & searchTerm)
  const metrics = useMemo(() => {
    const total = sessions.length;
    const openCount = sessions.filter((s) => s.status === 'OPEN').length;
    const fullCount = sessions.filter((s) => s.status === 'FULL').length;
    const totalBooked = sessions.reduce((sum, s) => sum + (s.booked_participants || 0), 0);
    return { total, openCount, fullCount, totalBooked };
  }, [sessions]);

  // Handlers for Modals
  const openCreateModal = () => {
    setFormError(null);
    // Suggest next day 09:00 - 11:00
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    const startStr = toLocalDatetimeInputValue(now.toISOString());
    now.setHours(11, 0, 0, 0);
    const endStr = toLocalDatetimeInputValue(now.toISOString());

    setFormStartAt(startStr);
    setFormEndAt(endStr);
    setFormCapacity(selectedWorkshop?.min_participants ? Math.max(10, selectedWorkshop.min_participants * 2) : 15);
    setFormPrice(selectedWorkshop ? String(selectedWorkshop.price_per_person) : '0');
    setFormStatus('OPEN');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (session: WorkshopSessionDto) => {
    setFormError(null);
    setEditingSession(session);
    setFormStartAt(toLocalDatetimeInputValue(session.start_at));
    setFormEndAt(toLocalDatetimeInputValue(session.end_at));
    setFormCapacity(session.capacity);
    setFormPrice(String(session.price_per_person));
    setFormStatus((session.status as SessionStatus) || 'OPEN');
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = async (session: WorkshopSessionDto) => {
    setIsLoadingDetail(true);
    setDetailModalSession(null);
    try {
      const res = await workshopsApi.getSessionDetail(session.session_id);
      if (res.data) {
        setDetailModalSession(res.data);
      }
    } catch (err: any) {
      showToast?.('Không thể tải chi tiết danh sách booking của buổi này.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Submit Create Session
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshopId) return;

    if (!formStartAt || !formEndAt) {
      setFormError('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    const start = new Date(formStartAt);
    const end = new Date(formEndAt);
    if (start.getTime() < Date.now()) {
      setFormError('Thời gian bắt đầu buổi workshop không được ở trong quá khứ.');
      return;
    }
    if (end <= start) {
      setFormError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      return;
    }
    if (formCapacity <= 0) {
      setFormError('Sức chứa tối đa phải là số nguyên dương lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateSessionPayload = {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        capacity: Number(formCapacity),
        price_per_person: formPrice ? Number(formPrice) : undefined,
        status: formStatus,
      };

      const res = await workshopsApi.createSession(selectedWorkshopId, payload);
      if (res.data) {
        showToast?.('Tạo buổi workshop thành công!');
        setIsCreateModalOpen(false);
        fetchSessions();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo buổi workshop';
      setFormError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Session
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    if (editingSession.status === 'CANCELLED' || editingSession.status === 'COMPLETED') {
      setFormError('Không thể chỉnh sửa buổi workshop đã kết thúc hoặc đã hủy.');
      return;
    }

    if (!formStartAt || !formEndAt) {
      setFormError('Vui lòng nhập đầy đủ thời gian.');
      return;
    }
    const start = new Date(formStartAt);
    const end = new Date(formEndAt);
    if (end <= start) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    if (Number(formCapacity) < (editingSession.booked_participants || 0)) {
      setFormError(
        `Không thể giảm sức chứa xuống ${formCapacity} vì đã có ${editingSession.booked_participants} khách đặt chỗ.`
      );
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        capacity: Number(formCapacity),
        price_per_person: formPrice ? Number(formPrice) : undefined,
        status: formStatus,
      };

      const res = await workshopsApi.updateSession(editingSession.session_id, payload);
      if (res.data) {
        showToast?.('Cập nhật buổi workshop thành công!');
        setIsEditModalOpen(false);
        fetchSessions();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật buổi workshop';
      setFormError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // F05.10: Open Cancel Session Modal
  const handleOpenCancelModal = (session: WorkshopSessionDto) => {
    if (session.status === 'CANCELLED') {
      showToast?.('Buổi workshop này đã ở trạng thái Hủy từ trước.');
      return;
    }
    if (session.status === 'COMPLETED') {
      showToast?.('Không thể hủy buổi workshop đã kết thúc.');
      return;
    }
    setCancelError(null);
    setCancelModalSession(session);
  };

  // F05.10: Confirm cancel session handler
  const handleConfirmCancelSession = async () => {
    if (!cancelModalSession) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await workshopsApi.cancelSession(cancelModalSession.session_id);
      if (res.success) {
        const affected = res.data?.affected_bookings ?? 0;
        const notifs = res.data?.notifications_created ?? 0;
        showToast?.(
          res.message ||
          `Đã hủy buổi workshop thành công! (${affected} đơn đặt đã hủy, ${notifs} khách nhận thông báo)`
        );
        setCancelModalSession(null);
        fetchSessions();
      } else {
        setCancelError(res.message || 'Không thể hủy buổi workshop');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể hủy buổi workshop';
      setCancelError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // F05.12: Open Reschedule Session Modal
  const handleOpenRescheduleModal = (session: WorkshopSessionDto) => {
    if (session.status === 'CANCELLED') {
      showToast?.('Không thể đổi lịch buổi workshop đã bị hủy.');
      return;
    }
    if (session.status === 'COMPLETED') {
      showToast?.('Không thể đổi lịch buổi workshop đã kết thúc.');
      return;
    }
    if (new Date(session.start_at).getTime() <= Date.now()) {
      showToast?.('Không thể đổi lịch buổi workshop đã bắt đầu hoặc đang diễn ra.');
      return;
    }
    setRescheduleError(null);
    setRescheduleReason('');
    setRescheduleStartAt(toLocalDatetimeInputValue(session.start_at));
    setRescheduleEndAt(toLocalDatetimeInputValue(session.end_at));
    setRescheduleModalSession(session);
  };

  // F05.12: Confirm reschedule session handler
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalSession) return;

    if (!rescheduleStartAt || !rescheduleEndAt) {
      setRescheduleError('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc mới.');
      return;
    }

    const start = new Date(rescheduleStartAt);
    const end = new Date(rescheduleEndAt);

    if (start.getTime() <= Date.now()) {
      setRescheduleError('Thời gian bắt đầu mới phải ở tương lai.');
      return;
    }

    if (end <= start) {
      setRescheduleError('Thời gian kết thúc mới phải diễn ra sau thời gian bắt đầu.');
      return;
    }

    if ((rescheduleModalSession.booked_participants || 0) > 0 && !rescheduleReason.trim()) {
      setRescheduleError('Vui lòng nhập lý do đổi lịch khi buổi workshop đã có khách đăng ký.');
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const payload: RescheduleSessionPayload = {
        new_start_at: start.toISOString(),
        new_end_at: end.toISOString(),
        reason: rescheduleReason.trim(),
      };

      const res = await workshopsApi.rescheduleSession(rescheduleModalSession.session_id, payload);
      if (res.success) {
        const affected = res.data?.affected_bookings_count ?? 0;
        const notifs = res.data?.notifications_created ?? 0;
        showToast?.(
          res.message ||
          `Đã đổi lịch buổi workshop thành công! (${affected} đơn đặt được giữ nguyên, ${notifs} khách nhận thông báo)`
        );
        setRescheduleModalSession(null);
        fetchSessions();
      } else {
        setRescheduleError(res.message || 'Không thể đổi lịch buổi workshop');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể đổi lịch buổi workshop';
      setRescheduleError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Delete Session handler
  const handleDeleteSession = async (session: WorkshopSessionDto) => {
    if ((session.booked_participants || 0) > 0) {
      alert(
        'Không thể xóa vật lý buổi workshop này vì đã có dữ liệu đăng ký của khách du lịch. Hãy chọn "Hủy buổi" để ngừng nhận đăng ký mà vẫn bảo toàn lịch sử giao dịch.'
      );
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn XÓA buổi workshop chưa có khách này? Thao tác này không thể hoàn tác.')) {
      return;
    }

    try {
      await workshopsApi.deleteSession(session.session_id);
      showToast?.('Xóa buổi workshop thành công!');
      fetchSessions();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xóa buổi workshop';
      showToast?.(msg);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="v10-status-badge open">
            <span className="v10-status-dot open" /> Mở đăng ký
          </span>
        );
      case 'FULL':
        return (
          <span className="v10-status-badge full">
            <span className="v10-status-dot full" /> Đã kín chỗ
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="v10-status-badge completed">
            <span className="v10-status-dot completed" /> Đã kết thúc
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="v10-status-badge cancelled">
            <span className="v10-status-dot cancelled" /> Đã hủy
          </span>
        );
      default:
        return <span className="v10-status-badge default">{status}</span>;
    }
  };

  return (
    <div className="v10-schedules-pane">
      {/* 1. Header Navigation Bar */}
      <div className="v10-header-bar">

        {/* 1. Header Toolbar (Screen V10 Standard Title & Actions) */}
        <div className="v10-header-card">
          <div className="v10-header-left">
            <h2 className="v10-header-title">Quản lý lịch Workshop</h2>
            <p className="v10-header-subtitle">
              Theo dõi, lên lịch và quản lý các ca tổ chức workshop của làng nghề.
            </p>
          </div>

          <div className="v10-header-right ">
            <button
              type="button"
              className="v10-refresh-btn"
              onClick={() => {
                fetchSessions();
                showToast?.('Đã làm mới danh sách buổi workshop');
              }}
              title="Làm mới dữ liệu"
            >
              <IconRefresh size={14} /> Làm mới
            </button>

            <button
              type="button"
              className="v10-btn-add-artisan"
              onClick={openCreateModal}
              title="Mở biểu mẫu lên lịch buổi workshop mới (V10)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Lên lịch mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workshop Selector & Overview Card */}
      <div className="v10-workshop-selector-card">
        <div className="v10-selector-row">
          <label className="v10-selector-label" htmlFor="workshop-select">
            <IconCalendar size={16} /> Chọn Workshop:
          </label>
          <select
            id="workshop-select"
            className="v10-select"
            value={selectedWorkshopId || ''}
            onChange={(e) => {
              setSelectedWorkshopId(Number(e.target.value));
              setSessions([]);
            }}
            disabled={isLoadingWorkshops || workshops.length === 0}
          >
            {workshops.map((w) => (
              <option key={w.workshop_id} value={w.workshop_id}>
                {w.workshop_name} ({w.artisan_name ? `Nghệ nhân: ${w.artisan_name}` : 'Chưa gán nghệ nhân'})
              </option>
            ))}
          </select>
        </div>

        {selectedWorkshop && (
          <div className="v10-current-workshop-info">
            <div className="v10-workshop-thumb-wrap">
              <img
                src={selectedWorkshop.cover_image_url || 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=400&q=80'}
                alt={selectedWorkshop.workshop_name}
                className="v10-workshop-thumb"
              />
            </div>
            <div className="v10-workshop-details">
              <h3 className="v10-workshop-name">{selectedWorkshop.workshop_name}</h3>
              <div className="v10-workshop-meta-row">
                <span className="v10-meta-item">
                  <IconUsers size={13} /> Nghệ nhân phụ trách:{' '}
                  <strong className='v10-artisans'>{selectedWorkshop.artisan_name || 'Chưa phân công'}</strong>
                </span>
                <span className="v10-meta-sep">•</span>
                <span className="v10-meta-item">
                  <IconClock size={13} /> Thời lượng: <strong className='v10-minute'>{selectedWorkshop.duration_minutes} phút</strong>
                </span>
                <span className="v10-meta-sep">•</span>
                <span className="v10-meta-item">
                  Giá gốc: <strong className='v10-price'>{Number(selectedWorkshop.price_per_person).toLocaleString('vi-VN')} đ/người</strong>
                </span>
              </div>
              <p className="v10-workshop-address" title={selectedWorkshop.location_address}>
                Địa điểm tổ chức: {selectedWorkshop.location_address || 'Tại làng nghề'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="v10-metrics-grid">
        <div className="v10-metric-card">
          <div className="v10-metric-value">{metrics.total}</div>
          <div className="v10-metric-label">Tổng số buổi tổ chức</div>
        </div>
        <div className="v10-metric-card green">
          <div className="v10-metric-value">{metrics.openCount}</div>
          <div className="v10-metric-label">Buổi đang mở đăng ký</div>
        </div>
        <div className="v10-metric-card amber">
          <div className="v10-metric-value">{metrics.fullCount}</div>
          <div className="v10-metric-label">Buổi đã kín chỗ</div>
        </div>
        <div className="v10-metric-card blue">
          <div className="v10-metric-value">{metrics.totalBooked}</div>
          <div className="v10-metric-label">Tổng lượt khách đã đặt</div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="v03-filter-card">
        <div className="v03-search-wrapper">
          <IconSearch size={16} className="v03-search-icon" />
          <input
            type="text"
            className="v03-search-input"
            placeholder="Tìm theo ngày, giờ (VD: 15/11)..."
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
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="OPEN">Mở đăng ký</option>
              <option value="FULL">Kín chỗ</option>
              <option value="COMPLETED">Đã kết thúc</option>
              <option value="CANCELLED">Đã hủy</option>
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
              title="Đặt lại bộ lọc về mặc định"
            >
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Sessions Table View */}
      <div className="v10-table-wrapper">
        {isLoadingSessions ? (
          <div className="v10-loading-state">
            <div className="v10-spinner" />
            <p>Đang tải danh sách các buổi workshop...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="v10-empty-state">
            <IconCalendar size={36} className="v10-empty-icon" />
            <h4>Chưa có buổi workshop nào</h4>
            <p>
              {searchTerm || statusFilter !== 'ALL'
                ? `Không có buổi nào phù hợp với bộ lọc ${statusFilter !== 'ALL' ? `trạng thái "${statusFilter === 'OPEN' ? 'Mở đăng ký' : statusFilter === 'FULL' ? 'Kín chỗ' : statusFilter === 'COMPLETED' ? 'Đã kết thúc' : 'Đã hủy'}"` : ''}${searchTerm ? ` và từ khóa "${searchTerm}"` : ''}.`
                : 'Workshop này hiện chưa có lịch tổ chức. Hãy nhấn "Lên Lịch Buổi Mới" để bắt đầu!'}
            </p>
            {searchTerm || statusFilter !== 'ALL' ? (
              <button
                type="button"
                className="v03-btn-reset-filters"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
              >
                <span>Xóa bộ lọc</span>
              </button>
            ) : (
              <button type="button" className="v10-btn-primary" onClick={openCreateModal}>
                <IconPlus size={16} /> Lên Lịch Mới
              </button>
            )}
          </div>
        ) : (
          <table className="v10-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Ngày & Giờ tổ chức</th>
                <th>Sức chứa & Lượt đặt</th>
                <th>Số chỗ còn lại</th>
                <th>Giá vé / người</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right', width: '220px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s, idx) => {
                const remaining = Math.max(0, s.capacity - s.booked_participants);
                const percent = Math.min(100, Math.round((s.booked_participants / s.capacity) * 100));

                return (
                  <tr key={s.session_id} className={`v10-row ${s.status === 'CANCELLED' ? 'cancelled-row' : ''}`}>
                    <td className="v10-col-index">#{idx + 1}</td>
                    <td className="v10-col-datetime">
                      <div className="v10-date-badge">
                        <IconCalendar size={13} /> {formatDate(s.start_at)}
                      </div>
                      <div className="v10-time-row">
                        <IconClock size={12} />
                        <span>
                          {formatTime(s.start_at)} - {formatTime(s.end_at)}
                        </span>
                      </div>
                    </td>
                    <td className="v10-col-capacity">
                      <div className="v10-capacity-info">
                        <span>
                          Đã đặt: <strong>{s.booked_participants}</strong> / {s.capacity} chỗ
                        </span>
                        <div className="v10-progress-bar">
                          <div
                            className={`v10-progress-fill ${percent >= 100 ? 'full' : percent >= 75 ? 'warn' : 'normal'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="v10-col-remaining">
                      <span className={`v10-remaining-pill ${remaining === 0 ? 'zero' : 'available'}`}>
                        {remaining > 0 ? `${remaining} chỗ trống` : 'Hết chỗ'}
                      </span>
                    </td>
                    <td className="v10-col-price">
                      {Number(s.price_per_person || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="v10-col-status">{renderStatusBadge(s.status)}</td>
                    <td className="v10-col-actions">
                      <div className="v10-action-btns">
                        <button
                          type="button"
                          className="v10-btn-icon view"
                          onClick={() => handleOpenDetailModal(s)}
                          title="Xem chi tiết & danh sách đặt chỗ"
                        >
                          <IconEye size={13} />
                        </button>
                        <button
                          type="button"
                          className="v10-btn-icon edit"
                          onClick={() => openEditModal(s)}
                          title="Chỉnh sửa buổi"
                          disabled={s.status === 'CANCELLED' || s.status === 'COMPLETED'}
                        >
                          <IconEdit size={13} /> 
                        </button>
                        <button
                          type="button"
                          className="v10-btn-icon reschedule"
                          onClick={() => handleOpenRescheduleModal(s)}
                          title="Đổi lịch ca học (giữ nguyên đơn đặt & thông báo du khách)"
                          disabled={s.status === 'CANCELLED' || s.status === 'COMPLETED' || new Date(s.start_at).getTime() <= Date.now()}
                          style={{ color: '#2563eb' }}
                        >
                          <IconEdit size={13} />
                        </button>
                        <button
                          type="button"
                          className="v10-btn-icon cancel"
                          onClick={() => handleOpenCancelModal(s)}
                          title="Hủy buổi workshop (giải phóng chỗ & gửi thông báo)"
                          disabled={s.status === 'CANCELLED' || s.status === 'COMPLETED'}
                        >
                          <IconBan size={13} />
                        </button>
                        <button
                          type="button"
                          className="v10-btn-icon delete"
                          onClick={() => handleDeleteSession(s)}
                          title={s.booked_participants > 0 ? 'Không thể xóa buổi đã có khách đặt' : 'Xóa buổi chưa có khách'}
                          disabled={s.booked_participants > 0}
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================================================
          MODAL: TẠO BUỔI WORKSHOP MỚI
      ========================================================================= */}
      {isCreateModalOpen && (
        <div className="v10-modal-overlay">
          <div className="v10-modal-card">
            <div className="v10-modal-header">
              <div className="v10-modal-title-wrap">
                <IconCalendar size={18} />
                <h3>Lên Lịch Buổi Workshop Mới</h3>
              </div>
              <button
                type="button"
                className="v06-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Đóng biểu mẫu"
                title="Đóng (ESC)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="v10-modal-body">
              {formError && (
                <div className="v10-error-banner">
                  <IconAlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="v10-form-group">
                <label className="v10-form-label">
                  Workshop áp dụng:
                </label>
                <input
                  type="text"
                  className="v10-input disabled"
                  value={selectedWorkshop?.workshop_name || ''}
                  disabled
                />
                <span className="v10-form-hint">
                  Nghệ nhân phụ trách: <strong>{selectedWorkshop?.artisan_name || 'Chưa phân công'}</strong>
                </span>
              </div>

              <div className="v10-form-row">
                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="create-start-at">
                    Thời gian bắt đầu: <span className="req">*</span>
                  </label>
                  <input
                    id="create-start-at"
                    type="datetime-local"
                    className="v10-input"
                    value={formStartAt}
                    min={toLocalDatetimeInputValue(new Date().toISOString())}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    required
                  />
                </div>

                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="create-end-at">
                    Thời gian kết thúc: <span className="req">*</span>
                  </label>
                  <input
                    id="create-end-at"
                    type="datetime-local"
                    className="v10-input"
                    value={formEndAt}
                    min={formStartAt || toLocalDatetimeInputValue(new Date().toISOString())}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="v10-form-row">
                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="create-capacity">
                    Sức chứa tối đa (người): <span className="req">*</span>
                  </label>
                  <input
                    id="create-capacity"
                    type="number"
                    min={1}
                    max={200}
                    className="v10-input"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    required
                  />
                  <span className="v10-form-hint">Số lượng khách tối đa được phép đặt cho buổi này</span>
                </div>

                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="create-price">
                    Giá vé buổi (VNĐ / người):
                  </label>
                  <input
                    id="create-price"
                    type="number"
                    min={0}
                    step={1000}
                    className="v10-input"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                  <span className="v10-form-hint">Mặc định lấy theo giá cơ bản của workshop</span>
                </div>
              </div>

              <div className="v10-form-group">
                <label className="v10-form-label" htmlFor="create-status">
                  Trạng thái ban đầu:
                </label>
                <select
                  id="create-status"
                  className="v10-select"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SessionStatus)}
                >
                  <option value="OPEN">Mở đăng ký </option>
                  <option value="FULL">Đã kín chỗ </option>
                </select>
              </div>

              <div className="v10-modal-footer">
                <button
                  type="button"
                  className="v06-btn-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="v10-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang kiểm tra & lưu...' : 'Tạo buổi workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHỈNH SỬA BUỔI WORKSHOP
      ========================================================================= */}
      {isEditModalOpen && editingSession && (
        <div className="v10-modal-overlay">
          <div className="v10-modal-card">
            <div className="v10-modal-header">
              <div className="v10-modal-title-wrap">
                <IconEdit size={18} />
                <h3>Chỉnh Sửa Buổi Workshop </h3>
              </div>
              <button
                type="button"
                className="v06-close-btn"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Đóng biểu mẫu"
                title="Đóng (ESC)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="v10-modal-body">
              {formError && (
                <div className="v10-error-banner">
                  <IconAlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Warning if session already has booked participants */}
              {editingSession.booked_participants > 0 && (
                <div className="v10-warning-banner">
                  <IconUsers size={16} />
                  <div>
                    <strong>Lưu ý quan trọng:</strong> Buổi này đã có{' '}
                    <strong>{editingSession.booked_participants} người</strong> đặt chỗ. Bạn không thể giảm sức chứa
                    xuống dưới con số này để bảo vệ quyền lợi của khách du lịch.
                  </div>
                </div>
              )}

              <div className="v10-form-row">
                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="edit-start-at">
                    Thời gian bắt đầu: <span className="req">*</span>
                  </label>
                  <input
                    id="edit-start-at"
                    type="datetime-local"
                    className="v10-input"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    required
                  />
                </div>

                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="edit-end-at">
                    Thời gian kết thúc: <span className="req">*</span>
                  </label>
                  <input
                    id="edit-end-at"
                    type="datetime-local"
                    className="v10-input"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="v10-form-row">
                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="edit-capacity">
                    Sức chứa tối đa: <span className="req">*</span>
                  </label>
                  <input
                    id="edit-capacity"
                    type="number"
                    min={editingSession.booked_participants || 1}
                    className="v10-input"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    required
                  />
                  <span className="v10-form-hint">
                    Tối thiểu phải bằng số người đã đặt ({editingSession.booked_participants} người)
                  </span>
                </div>

                <div className="v10-form-group">
                  <label className="v10-form-label" htmlFor="edit-price">
                    Giá vé / người:
                  </label>
                  <input
                    id="edit-price"
                    type="number"
                    min={0}
                    step={1000}
                    className="v10-input"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="v10-form-group">
                <label className="v10-form-label" htmlFor="edit-status">
                  Trạng thái buổi:
                </label>
                <select
                  id="edit-status"
                  className="v10-select"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SessionStatus)}
                >
                  <option value="OPEN">Mở đăng ký</option>
                  <option value="FULL">Đã kín chỗ</option>
                  <option value="COMPLETED">Đã kết thúc</option>
                  <option value="CANCELLED">Hủy buổi</option>
                </select>
              </div>

              <div className="v10-modal-footer">
                <button
                  type="button"
                  className="v06-btn-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="v10-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHI TIẾT BUỔI VÀ DANH SÁCH BOOKING
      ========================================================================= */}
      {(isLoadingDetail || detailModalSession) && (
        <div className="v10-modal-overlay">
          <div className="v10-modal-card detail-card">
            <div className="v10-modal-header">
              <div className="v10-modal-title-wrap">
                <h3>Chi Tiết Buổi Workshop </h3>
              </div>
              <button
                type="button"
                className="v06-close-btn"
                onClick={() => setDetailModalSession(null)}
                aria-label="Đóng chi tiết"
                title="Đóng (ESC)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="v10-modal-body">
              {isLoadingDetail ? (
                <div className="v10-loading-state">
                  <div className="v10-spinner" />
                  <p>Đang tải thông tin chi tiết và danh sách khách đặt...</p>
                </div>
              ) : detailModalSession ? (
                <>
                  {/* Session Overview Mini Card */}
                  <div className="v10-detail-overview">
                    <div className="v10-detail-item">
                      <span className="lbl">Ngày tổ chức:</span>
                      <strong>{formatDate(detailModalSession.start_at)}</strong>
                    </div>
                    <div className="v10-detail-item">
                      <span className="lbl">Khung giờ:</span>
                      <strong>
                        {formatTime(detailModalSession.start_at)} - {formatTime(detailModalSession.end_at)}
                      </strong>
                    </div>
                    <div className="v10-detail-item">
                      <span className="lbl">Sức chứa tối đa:</span>
                      <strong>{detailModalSession.capacity} người</strong>
                    </div>
                    <div className="v10-detail-item">
                      <span className="lbl">Đã đặt hợp lệ:</span>
                      <strong style={{ color: '#059669' }}>{detailModalSession.booked_participants} người</strong>
                    </div>
                    <div className="v10-detail-item">
                      <span className="lbl">Số chỗ còn lại:</span>
                      <strong>{detailModalSession.remaining_seats} chỗ</strong>
                    </div>
                    <div className="v10-detail-item">
                      <span className="lbl">Trạng thái:</span>
                      {renderStatusBadge(detailModalSession.status)}
                    </div>
                  </div>

                  {/* Bookings List Section */}
                  <div className="v10-bookings-section">
                    <div className="v10-bookings-header">
                      <h4>
                        <IconUsers size={16} /> Danh sách khách đăng ký tham gia (
                        {detailModalSession.bookings?.length || 0} đơn)
                      </h4>
                      {/* {onNavigateToBookings && (
                        <button
                          type="button"
                          className="v10-btn-link"
                          onClick={() => {
                            setDetailModalSession(null);
                            onNavigateToBookings(selectedWorkshopId || undefined);
                          }}
                        >
                          Mở màn hình Quản lý Booking →
                        </button>
                      )} */}
                    </div>

                    {!detailModalSession.bookings || detailModalSession.bookings.length === 0 ? (
                      <div className="v10-bookings-empty">
                        <IconCheckCircle size={24} style={{ color: '#10b981' }} />
                        <p>Chưa có khách nào đăng ký vào buổi workshop này.</p>
                      </div>
                    ) : (
                      <div className="v10-bookings-table-wrap">
                        <table className="v10-bookings-table">
                          <thead>
                            <tr>
                              <th>Mã đơn</th>
                              <th>Khách hàng</th>
                              <th>Số người</th>
                              <th>Tổng tiền</th>
                              <th>Trạng thái đơn</th>
                              <th>Ngày đặt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailModalSession.bookings.map((b) => (
                              <tr key={b.booking_id}>
                                <td>
                                  <span className="v10-booking-code">{b.booking_code}</span>
                                </td>
                                <td>
                                  <div className="v10-tourist-name">{b.user_name || 'Khách du lịch'}</div>
                                  <div className="v10-tourist-contact">
                                    {b.user_email || ''} {b.user_phone ? `• ${b.user_phone}` : ''}
                                  </div>
                                </td>
                                <td>
                                  <strong>{b.participant_count} người</strong>
                                </td>
                                <td>{Number(b.total_amount).toLocaleString('vi-VN')} đ</td>
                                <td>
                                  <span className={`v10-booking-status-tag ${b.status.toLowerCase()}`}>
                                    {b.status === 'CONFIRMED'
                                      ? 'Đã xác nhận'
                                      : b.status === 'PENDING'
                                        ? 'Chờ duyệt'
                                        : b.status === 'CANCELLED'
                                          ? 'Đã hủy'
                                          : b.status}
                                  </span>
                                </td>
                                <td>{formatDate(b.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="v10-modal-footer">
                    <button
                      type="button"
                      className="v06-btn-cancel"
                      onClick={() => setDetailModalSession(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: XÁC NHẬN HỦY BUỔI WORKSHOP (F05.10)
      ========================================================================= */}
      {cancelModalSession && (
        <div className="v10-modal-overlay" onClick={() => !isCancelling && setCancelModalSession(null)}>
          <div
            className="v10-modal-card"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-session-title"
          >
            <div className="v10-modal-header">
              <div className="v10-modal-title-wrap">
                <IconAlertTriangle size={18} className="text-amber-600" />
                <h3 id="cancel-session-title">Xác nhận hủy buổi workshop #{cancelModalSession.session_id}</h3>
              </div>
              <button
                type="button"
                className="v10-modal-close-btn"
                onClick={() => !isCancelling && setCancelModalSession(null)}
                aria-label="Đóng"
                disabled={isCancelling}
              >
                ✕
              </button>
            </div>

            <div className="v10-modal-body">
              {cancelError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <IconAlertTriangle size={16} />
                  <span>{cancelError}</span>
                </div>
              )}

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tên workshop:</span>
                  <strong style={{ color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>
                    {cancelModalSession.workshop_name}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Thời gian tổ chức:</span>
                  <span style={{ color: '#0f172a', fontWeight: 500 }}>
                    {formatTime(cancelModalSession.start_at)} - {formatTime(cancelModalSession.end_at)}, {formatDate(cancelModalSession.start_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Khách đã đặt chỗ:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: cancelModalSession.booked_participants > 0 ? '#b45309' : '#059669',
                    }}
                  >
                    {cancelModalSession.booked_participants} / {cancelModalSession.capacity} người
                  </span>
                </div>
              </div>

              {cancelModalSession.booked_participants > 0 ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#92400e',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>CẢNH BÁO TÁC ĐỘNG BOOKING:</strong>
                  <p style={{ margin: '4px 0 0' }}>
                    Buổi này đang có <strong>{cancelModalSession.booked_participants} người đặt chỗ</strong>. Khi xác nhận hủy:
                  </p>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    <li>Toàn bộ đơn đặt chỗ liên quan sẽ tự động chuyển sang trạng thái <strong>ĐÃ HỦY</strong>.</li>
                    <li>Giải phóng số chỗ và đóng buổi workshop.</li>
                    <li>Gửi <strong>thông báo trực tiếp</strong> đến tất cả khách hàng bị ảnh hưởng.</li>
                    <li>Dữ liệu giao dịch và lịch sử thanh toán được bảo toàn nguyên vẹn.</li>
                  </ul>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#166534',
                    fontSize: 13,
                  }}
                >
                  Buổi workshop này hiện chưa có khách đặt chỗ. Xác nhận hủy sẽ chuyển trạng thái thành{' '}
                  <strong>ĐÃ HỦY</strong> và ngừng nhận đăng ký.
                </div>
              )}
            </div>

            <div className="v10-modal-footer">
              <button
                type="button"
                className="v06-btn-cancel"
                onClick={() => setCancelModalSession(null)}
                disabled={isCancelling}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={handleConfirmCancelSession}
                disabled={isCancelling}
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy buổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F05.12: Reschedule Session Modal (Heritage Design System standard) */}
      {rescheduleModalSession && typeof document !== 'undefined' && createPortal(
        <div
          className="artisan-modal-overlay"
          onClick={() => !isRescheduling && setRescheduleModalSession(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
        >
          <div
            className="v06-form-modal-box"
            style={{ maxWidth: 660, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v06-modal-form-wrapper">
              {/* 1. Modal Header */}
              <div className="v06-modal-header">
                <div className="v06-header-left">
                  <div className="v06-tag-row">
                    <span className="v06-heritage-code font-mono">
                      #{rescheduleModalSession.session_id}
                    </span>
                    {rescheduleModalSession.booked_participants > 0 ? (
                      <span className="v08-status-badge in_progress" title="Buổi này đang có khách đặt giữ chỗ">
                        <span className="v08-status-dot in_progress" />
                        Đã có {rescheduleModalSession.booked_participants} du khách giữ chỗ
                      </span>
                    ) : (
                      <span className="v08-status-badge approved" title="Chưa có khách đặt chỗ">
                        <span className="v08-status-dot approved" />
                        Chưa có lượt đặt
                      </span>
                    )}
                  </div>
                  <h3 id="reschedule-modal-title" className="v06-modal-title">
                    Điều Chỉnh Lịch Buổi Workshop
                  </h3>
                  {/* <p className="v06-modal-sub">
                    Cập nhật ngày giờ tổ chức • Tự động gửi thông báo du khách • Bảo toàn đơn đặt chỗ
                  </p> */}
                </div>

                <div className="v06-header-actions">
                  <button
                    type="button"
                    className="v06-close-btn"
                    onClick={() => !isRescheduling && setRescheduleModalSession(null)}
                    disabled={isRescheduling}
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

              {/* 2. Modal Body */}
              <div className="v06-modal-body v12-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Alert Lỗi (nếu có) */}
                {rescheduleError && (
                  <div className="v06-rejection-banner">
                    <span className="v06-rejection-banner-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                    <div className="v06-rejection-content">
                      <strong className="v06-rejection-title">Không thể điều chỉnh lịch</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#B91C1C' }}>{rescheduleError}</p>
                    </div>
                  </div>
                )}

                {/* Card 1: Thông tin ca trải nghiệm hiện tại */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Thông tin ca trải nghiệm
                    </h4>
                    <span className="v12-account-pill">
                      #{rescheduleModalSession.workshop}
                    </span>
                  </div>

                  <div className="v12-grid-2">
                    <div className="v12-field-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="v12-field-label">Tên workshop</span>
                      <span className="v12-field-value text-strong" style={{ fontSize: '14.5px', color: '#1C3B32' }}>
                        {rescheduleModalSession.workshop_name}
                      </span>
                    </div>

                    <div className="v12-field-item">
                      <span className="v12-field-label">Lịch tổ chức hiện tại</span>
                      <span className="v12-field-value" style={{ fontWeight: 600, color: '#2C3A35' }}>
                        {formatTime(rescheduleModalSession.start_at)} – {formatTime(rescheduleModalSession.end_at)}
                        <span style={{ display: 'block', fontSize: '12px', color: '#717A76', fontWeight: 500 }}>
                          Ngày {formatDate(rescheduleModalSession.start_at)}
                        </span>
                      </span>
                    </div>

                    <div className="v12-field-item">
                      <span className="v12-field-label">Khách đã giữ chỗ</span>
                      <span className="v12-field-value">
                        <strong style={{ color: rescheduleModalSession.booked_participants > 0 ? '#984628' : '#047857', fontSize: '14px' }}>
                          {rescheduleModalSession.booked_participants}
                        </strong>
                        <span style={{ color: '#717A76' }}> / {rescheduleModalSession.capacity} người tối đa</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Thông báo chính sách & Quyền lợi du khách */}
                {rescheduleModalSession.booked_participants > 0 ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.45) 0%, rgba(255, 251, 235, 0.9) 100%)',
                      border: '1px solid #FDE68A',
                      borderRadius: '14px',
                      padding: '16px 18px',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(217, 119, 6, 0.15)',
                        color: '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.6, color: '#78350F' }}>
                      <strong style={{ display: 'block', fontSize: '13.5px', marginBottom: 4, color: '#92400E' }}>
                        Chính Sách Bảo Vệ Quyền Lợi Du Khách Khi Đổi Lịch:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <li>
                          <strong>Bảo toàn đơn đặt:</strong> Toàn bộ <strong>{rescheduleModalSession.booked_participants} chỗ</strong> đã đăng ký được giữ nguyên hiệu lực, khách hàng không cần đặt lại.
                        </li>
                        <li>
                          <strong>Thông báo tức thì:</strong> Hệ thống sẽ tự động gửi thông báo chi tiết lịch mới kèm lý do đến từng du khách bị ảnh hưởng.
                        </li>
                        <li>
                          <strong>Hỗ trợ hoàn tiền 100%:</strong> Nếu du khách không thể tham gia vào thời gian mới, du khách được quyền yêu cầu <strong>hoàn tiền 100%</strong> không mất phí.
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.6) 0%, rgba(240, 253, 244, 0.9) 100%)',
                      border: '1px solid #BBF7D0',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(5, 150, 105, 0.12)',
                        color: '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                      Buổi workshop này hiện <strong>chưa có du khách giữ chỗ</strong>. Lịch mới sẽ được cập nhật trực tiếp trên nền tảng LocalCraft để mở đón lượt đăng ký mới.
                    </div>
                  </div>
                )}

                {/* Card 3: Form thiết lập thời gian mới & Lý do */}
                <div className="v12-section-card">
                  <div className="v12-section-head">
                    <h4 className="v12-section-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Thiết lập thời gian tổ chức mới
                    </h4>
                    {/* <span className="v12-duration-pill">Múi giờ Việt Nam (GMT+7)</span> */}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="v06-two-input-row">
                      <div className="v06-form-group">
                        <label className="v06-field-label" htmlFor="reschedule-start">
                          Thời gian bắt đầu mới <span className="v06-required-star">*</span>
                        </label>
                        <input
                          id="reschedule-start"
                          type="datetime-local"
                          className="v06-input"
                          value={rescheduleStartAt}
                          onChange={(e) => setRescheduleStartAt(e.target.value)}
                          disabled={isRescheduling}
                        />
                        <span className="v06-field-hint">Phải ở tương lai so với thời điểm hiện tại</span>
                      </div>

                      <div className="v06-form-group">
                        <label className="v06-field-label" htmlFor="reschedule-end">
                          Thời gian kết thúc mới <span className="v06-required-star">*</span>
                        </label>
                        <input
                          id="reschedule-end"
                          type="datetime-local"
                          className="v06-input"
                          value={rescheduleEndAt}
                          onChange={(e) => setRescheduleEndAt(e.target.value)}
                          disabled={isRescheduling}
                        />
                        <span className="v06-field-hint">Phải diễn ra sau thời gian bắt đầu</span>
                      </div>
                    </div>

                    <div className="v06-form-group">
                      <div className="v06-label-row">
                        <label className="v06-field-label" htmlFor="reschedule-reason">
                          Lý do điều chỉnh lịch {rescheduleModalSession.booked_participants > 0 ? (
                            <span className="v06-required-star">(Bắt buộc - gửi kèm thông báo du khách) *</span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#717A76', fontWeight: 400 }}>(Tùy chọn)</span>
                          )}
                        </label>
                        <span className="v06-char-counter">{rescheduleReason.length}/500</span>
                      </div>
                      <textarea
                        id="reschedule-reason"
                        className="v06-input"
                        style={{ minHeight: 76, resize: 'vertical', lineHeight: 1.5 }}
                        maxLength={500}
                        placeholder="Ví dụ: Nghệ nhân có lịch công tác đột xuất / Làng nghề đón đoàn đại biểu trải nghiệm tập trung..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        disabled={isRescheduling}
                      />
                      <span className="v06-field-hint">
                        Nội dung lý do sẽ hiển thị trang trọng trong thông báo gửi đến tài khoản du khách đã đặt.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Modal Footer */}
              <div className="v06-modal-footer">
                {/* <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#717A76', fontSize: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Nhấn ESC để đóng cửa sổ nhanh</span>
                </div> */}

                <div className="v06-footer-right">
                  <button
                    type="button"
                    className="v06-btn-cancel"
                    onClick={() => !isRescheduling && setRescheduleModalSession(null)}
                    disabled={isRescheduling}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="v06-btn-submit"
                    onClick={handleConfirmReschedule}
                    disabled={isRescheduling}
                    style={{
                      background: '#1C3B32',
                      borderColor: '#1C3B32',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {isRescheduling ? (
                      <>
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        Đang cập nhật & gửi thông báo...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Xác nhận
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
    </div>
  );
};

export default WorkshopSchedulesTab;
