import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { messageService } from '../services';
import { Message, Conversation } from '../types';
import { useAuth } from './AuthContext';

interface MessageContextType {
  conversations: Conversation[];
  unreadCount: number;
  typingUsers: Record<string, string>;
  onlineUsers: Set<string>;
  wsConnected: boolean;
  refreshConversations: () => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  sendTyping: (userId: string, isTyping: boolean, conversationId?: string) => void;
  sendSeen: (userId: string, conversationId?: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  onWsMessage: (listener: (data: any) => void) => () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

function getWsUrl(path: string): string {
  const base = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '';
  if (base.startsWith('ws') || base.startsWith('http')) {
    const scheme = base.startsWith('https') ? 'wss' : 'ws';
    const host = base.replace(/^(https?|wss?):\/\//, '');
    return `${scheme}://${host}${path}`;
  }
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}${path}`;
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const currentUserId = user?.id;
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const wsListeners = useRef<Set<(data: any) => void>>(new Set());

  const refreshConversations = useCallback(async () => {
    try {
      const res = await messageService.getConversations();
      const list = res.data.data || [];
      setConversations(list);
    } catch {}
  }, []);

  const upsertConversation = useCallback((message: Message, online?: boolean) => {
    setConversations((prev) => {
      const existing = prev.find((c) =>
        c.other_user_id === message.sender_id || c.other_user_id === message.receiver_id
      );
      if (!existing) {
        const isIncoming = message.receiver_id === currentUserId;
        const otherUserId = isIncoming ? message.sender_id : message.receiver_id;
        if (!otherUserId) return prev;
        const sender = message as Message & { sender_name?: string | null; sender_avatar?: string | null; receiver_name?: string | null; receiver_avatar?: string | null };
        const preview: Conversation = {
          conversation_id: message.conversation_id || undefined,
          other_user_id: otherUserId,
          other_user_name: isIncoming ? sender.sender_name || 'User' : sender.receiver_name || 'User',
          other_user_avatar: (isIncoming ? sender.sender_avatar : sender.receiver_avatar) || null,
          last_message:
            message.message_type === 'deleted'
              ? null
              : message.content || (message.message_type === 'image' ? 'Photo' : ''),
          last_message_type: message.message_type,
          last_message_at: message.created_at,
          unread_count: isIncoming ? 1 : 0,
          is_pinned: false,
          is_archived: false,
          is_muted: false,
          is_online: online !== undefined ? online : false,
        };
        return [preview, ...prev];
      }
      const isIncoming = message.receiver_id === currentUserId;
      return prev.map((c) => {
        const isRelevant =
          c.other_user_id === message.sender_id || c.other_user_id === message.receiver_id;
        if (!isRelevant) return c;
        return {
          ...c,
          last_message:
            message.message_type === 'deleted'
              ? c.last_message
              : message.content || (message.message_type === 'image' ? 'Photo' : ''),
          last_message_type: message.message_type,
          last_message_at: message.created_at,
          unread_count: isIncoming ? (c.unread_count || 0) + 1 : c.unread_count,
          is_online: online !== undefined ? online : c.is_online,
        };
      });
    });
  }, [currentUserId]);

  useEffect(() => {
    setUnreadCount(conversations.reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0));
  }, [conversations]);

  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'new_message':
          upsertConversation(msg.message);
          break;
        case 'message_updated':
          setConversations((prev) => prev.map((c) => {
            const m = msg.message;
            if (c.other_user_id !== m.sender_id && c.other_user_id !== m.receiver_id) return c;
            return { ...c, last_message: m.content || c.last_message, last_message_type: m.message_type };
          }));
          break;
        case 'typing':
          setTypingUsers((prev) => ({ ...prev, [msg.sender_id]: msg.conversation_id || '' }));
          if (typingTimers.current[msg.sender_id]) clearTimeout(typingTimers.current[msg.sender_id]);
          typingTimers.current[msg.sender_id] = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[msg.sender_id];
              return next;
            });
          }, 3000);
          break;
        case 'stop_typing':
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[msg.sender_id];
            return next;
          });
          break;
        case 'presence':
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (msg.status === 'online') next.add(msg.user_id);
            else next.delete(msg.user_id);
            return next;
          });
          break;
        case 'message_seen':
        case 'message_delivered':
        case 'pong':
          break;
      }
      wsListeners.current.forEach((l) => l(msg));
    } catch {}
  }, [upsertConversation]);

  const connectWs = useCallback(() => {
    if (!isAuthenticated || !currentUserId) return;
    const wsToken = localStorage.getItem('access_token');
    if (!wsToken) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${getWsUrl('/ws/messages')}?token=${wsToken}`);
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
    ws.onerror = () => ws.close();
  }, [isAuthenticated, currentUserId, handleWsMessage]);

  const sendRaw = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const sendTyping = useCallback((userId: string, isTyping: boolean, conversationId?: string) => {
    sendRaw({ type: isTyping ? 'typing' : 'stop_typing', conversation_with: userId, conversation_id: conversationId });
  }, [sendRaw]);

  const sendSeen = useCallback((userId: string, conversationId?: string) => {
    sendRaw({ type: 'seen', conversation_with: userId, conversation_id: conversationId });
  }, [sendRaw]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c
      )
    );
    try {
      await messageService.markConversationRead(conversationId);
    } catch {}
  }, []);

  const addMessage = useCallback((message: Message) => {
    upsertConversation(message);
  }, [upsertConversation]);

  const updateMessage = useCallback((message: Message) => {
    setConversations((prev) => prev.map((c) => {
      if (c.other_user_id !== message.sender_id && c.other_user_id !== message.receiver_id) return c;
      return { ...c, last_message: message.content || c.last_message };
    }));
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    // messages managed per-window; conversations preview untouched
    void messageId;
  }, []);

  const onWsMessage = useCallback((listener: (data: any) => void) => {
    wsListeners.current.add(listener);
    return () => { wsListeners.current.delete(listener); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshConversations();
      connectWs();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [isAuthenticated, connectWs, refreshConversations]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        refreshConversations();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshConversations]);

  return (
    <MessageContext.Provider
      value={{
        conversations,
        unreadCount,
        typingUsers,
        onlineUsers,
        wsConnected,
        refreshConversations,
        markConversationRead,
        sendTyping,
        sendSeen,
        addMessage,
        updateMessage,
        removeMessage,
        onWsMessage,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) throw new Error('useMessages must be used within MessageProvider');
  return context;
}
