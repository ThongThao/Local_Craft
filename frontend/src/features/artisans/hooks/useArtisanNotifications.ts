import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi, NotificationDto } from '@/services/api/notifications';

export type NotificationFilterType = 'all' | 'unread';

export function useArtisanNotifications(isDropdownOpen: boolean = false) {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filter, setFilter] = useState<NotificationFilterType>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Keep a reference to prevent duplicate calls
  const isFetchingRef = useRef<boolean>(false);

  // 1. Fetch unread count (lightweight endpoint)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch {
      // Quiet fail to not disrupt user experience
    }
  }, []);

  // 2. Fetch notifications list
  const fetchNotifications = useCallback(async (selectedFilter: NotificationFilterType = filter) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const params = selectedFilter === 'unread' ? { is_read: false, limit: 30 } : { limit: 30 };
      const res = await notificationsApi.getAll(params);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setTotalCount(res.data.total_count ?? 0);
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch {
      // Quiet fail
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filter]);

  // Initial fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // When dropdown opens or filter changes, load the notification list
  useEffect(() => {
    if (isDropdownOpen) {
      fetchNotifications(filter);
    }
  }, [isDropdownOpen, filter, fetchNotifications]);

  // 3. Smart polling: check every 30 seconds if tab is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (isDropdownOpen) {
          fetchNotifications(filter);
        } else {
          fetchUnreadCount();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isDropdownOpen, filter, fetchNotifications, fetchUnreadCount]);

  // 4. Focus / Visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isDropdownOpen) {
          fetchNotifications(filter);
        } else {
          fetchUnreadCount();
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isDropdownOpen, filter, fetchNotifications, fetchUnreadCount]);

  // 5. Actions: Mark single as read (Optimistic)
  const markAsRead = useCallback(async (id: number) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Re-sync on failure
      fetchNotifications(filter);
    }
  }, [filter, fetchNotifications]);

  // 6. Action: Mark all as read (Optimistic)
  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || isUpdating) return;
    setIsUpdating(true);

    const nowIso = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: nowIso })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllAsRead();
    } catch {
      // Re-sync on failure
      fetchNotifications(filter);
    } finally {
      setIsUpdating(false);
    }
  }, [unreadCount, isUpdating, filter, fetchNotifications]);

  // 7. Action: Delete single notification
  const deleteNotification = useCallback(async (id: number) => {
    const target = notifications.find((n) => n.notification_id === id);
    setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationsApi.delete(id);
    } catch {
      fetchNotifications(filter);
    }
  }, [notifications, filter, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    totalCount,
    filter,
    setFilter,
    isLoading,
    isUpdating,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

