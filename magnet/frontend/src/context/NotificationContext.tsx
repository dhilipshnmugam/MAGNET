import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { notificationService } from '../services';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { initializeFCM, onFCMMessage } from '../services/firebaseMessaging';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  wsConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_TOAST_ICONS: Record<string, string> = {
  post: '\u{1F4DD}',
  like: '\u{2764}\u{FE0F}',
  comment: '\u{1F4AC}',
  mention: '\u{2049}\u{FE0F}',
  event: '\u{1F4C5}',
  event_reminder: '\u{23F0}',
  approval: '\u{2705}',
  rejected: '\u{274C}',
  leaderboard: '\u{1F3C6}',
  message: '\u{1F4E9}',
  announcement: '\u{1F4E2}',
  channel_invite: '\u{23F3}',
  system: '\u{2139}\u{FE0F}',
};

const TOAST_DURATIONS: Record<string, number> = {
  like: 3000,
  comment: 4000,
  mention: 5000,
  event_reminder: 6000,
  approval: 6000,
  rejected: 6000,
  leaderboard: 5000,
};

function getWsUrl(): string {
  const base = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const protocol = base.startsWith('https') ? 'wss' : 'ws';
  const host = base.replace(/^https?:\/\//, '');
  return `${protocol}://${host}/ws/notifications`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const seenNotifs = useRef<Set<string>>(new Set());

  const showToast = useCallback((notif: Notification) => {
    if (seenNotifs.current.has(notif.id)) return;
    seenNotifs.current.add(notif.id);
    if (seenNotifs.current.size > 200) {
      const arr = Array.from(seenNotifs.current);
      seenNotifs.current = new Set(arr.slice(-100));
    }

    const icon = NOTIFICATION_TOAST_ICONS[notif.type] || '\u{1F514}';
    const duration = TOAST_DURATIONS[notif.type] || 4000;

    toast(`${icon} ${notif.title}: ${notif.body}`, { duration });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationService.list({ page_size: 20 }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.data.count);
    } catch {}
  }, [isAuthenticated]);

  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'notification' && msg.notification) {
        const n: Notification = {
          id: msg.notification.id,
          user_id: '',
          type: msg.notification.type,
          title: msg.notification.title,
          body: msg.notification.body,
          ref_type: msg.notification.ref_type,
          ref_id: msg.notification.ref_id,
          sender_name: msg.notification.sender_name,
          sender_avatar: msg.notification.sender_avatar,
          is_read: false,
          created_at: msg.notification.created_at || new Date().toISOString(),
        };

        setNotifications((prev) => {
          if (prev.some((p) => p.id === n.id)) return prev;
          return [n, ...prev].slice(0, 50);
        });
        setUnreadCount((prev) => prev + 1);
        showToast(n);
      } else if (msg.type === 'pong') {
        // keep-alive ack
      }
    } catch {}
  }, [showToast]);

  const connectWs = useCallback(() => {
    if (!isAuthenticated) return;
    const wsToken = localStorage.getItem('access_token');
    if (!wsToken) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const wsUrl = `${getWsUrl()}?token=${wsToken}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(connectWs, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated, handleWsMessage]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      connectWs();
      initializeFCM().catch(() => {});
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [isAuthenticated, fetchNotifications, connectWs]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = onFCMMessage((payload) => {
      if (payload.notification) {
        const n: Notification = {
          id: crypto.randomUUID(),
          user_id: '',
          type: payload.data?.type || 'system',
          title: payload.notification.title || '',
          body: payload.notification.body || '',
          ref_type: payload.data?.ref_type || null,
          ref_id: payload.data?.ref_id || null,
          sender_name: null,
          sender_avatar: null,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        showToast(n);
      }
    });

    return cleanup;
  }, [isAuthenticated, showToast]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markRead, markAllRead, wsConnected }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
