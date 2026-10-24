import { useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '../types';
import { notificationsApi } from '../api/notifications';
import { invitationsApi } from '../api/invitations';
import { useAuth } from '../stores/authContext';

interface WebSocketNotificationPayload {
  type: 'NOTIFICATION_CREATED' | 'NOTIFICATION_UPDATED' | 'ALL_NOTIFICATIONS_READ';
  notification?: Notification;
  unreadCount?: number;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15000;
const BACKOFF_FACTOR = 1.5;

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const connectRef = useRef<() => void>(() => {});

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await notificationsApi.getNotifications();
      if (isMountedRef.current) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  const cleanupSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.onclose = null;
        socket.onopen = () => {
          try {
            socket.close(1000, 'Cleanup');
          } catch {
            // Socket may already be closed
          }
        };
      } else if (socket.readyState === WebSocket.OPEN) {
        socket.onclose = null;
        try {
          socket.close(1000, 'Cleanup');
        } catch {
          // Socket may already be closed
        }
      }
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (!user) {
      return;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    cleanupSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/notifications`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as WebSocketNotificationPayload;
          if (payload.type === 'NOTIFICATION_CREATED' && payload.notification) {
            setNotifications((prev) => [payload.notification!, ...prev]);
            if (typeof payload.unreadCount === 'number') {
              setUnreadCount(payload.unreadCount);
            } else {
              setUnreadCount((c) => c + 1);
            }
          } else if (payload.type === 'NOTIFICATION_UPDATED' && payload.notification) {
            setNotifications((prev) =>
              prev.map((item) => (item.id === payload.notification!.id ? payload.notification! : item))
            );
            if (typeof payload.unreadCount === 'number') {
              setUnreadCount(payload.unreadCount);
            }
          } else if (payload.type === 'ALL_NOTIFICATIONS_READ') {
            setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
            setUnreadCount(0);
          }
        } catch {
          // Ignore invalid WS payload
        }
      };

      socket.onclose = (event: CloseEvent) => {
        wsRef.current = null;
        if (event.code !== 1000 && isMountedRef.current && user) {
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_RETRY_DELAY);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && user) {
              connectRef.current();
            }
          }, delay);
        }
      };

      socket.onerror = () => {
        // socket onclose handles backoff
      };
    } catch {
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_RETRY_DELAY);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && user) {
          connectRef.current();
        }
      }, delay);
    }
  }, [user, cleanupSocket]);

  useEffect(() => {
    connectRef.current = connectSocket;
  }, [connectSocket]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();
    connectSocket();

    return () => {
      isMountedRef.current = false;
      cleanupSocket();
    };
  }, [fetchNotifications, connectSocket, cleanupSocket]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const updated = await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? updated : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err: unknown) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const acceptInvite = useCallback(
    async (invitationId: number) => {
      try {
        await invitationsApi.acceptInvitation(invitationId);
        await fetchNotifications();
        return true;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('ACCEPTED')) {
          await fetchNotifications();
          return true;
        }
        console.error('Failed to accept invitation:', err);
        throw err;
      }
    },
    [fetchNotifications]
  );

  const declineInvite = useCallback(
    async (invitationId: number) => {
      try {
        await invitationsApi.declineInvitation(invitationId);
        await fetchNotifications();
        return true;
      } catch (err: unknown) {
        console.error('Failed to decline invitation:', err);
        throw err;
      }
    },
    [fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    acceptInvite,
    declineInvite,
  };
};

export default useNotifications;
