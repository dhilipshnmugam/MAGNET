import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MessageCircle, Search, PenSquare, ArrowLeft, MoreVertical, Info, Pin, Archive,
  Bell, BellOff, Ban, Flag, Trash2, Phone, Video, Send, X, Loader2, Star,
} from 'lucide-react';
import { messageService } from '../services';
import { Message, Conversation, UserSearchResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessageContext';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import MessageBubble from '../components/messages/MessageBubble';
import MessageComposer from '../components/messages/MessageComposer';
import { getApiError } from '../services/api';
import { cn, timeAgo, truncate } from '../utils/helpers';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'archived', label: 'Archived' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function UserPickerModal({
  isOpen, onClose, onSelect, title, excludeId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: UserSearchResult) => void;
  title: string;
  excludeId?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQ('');
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await messageService.searchUsers(q, 20);
        if (!cancelled) setResults(res.data.data || []);
      } catch (e) {
        if (!cancelled) toast.error(getApiError(e));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people..."
          className="input w-full pl-9"
        />
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto">
        {searching && !results.length && (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
        )}
        {!searching && !results.length && (
          <p className="py-8 text-center text-sm text-gray-400">{q ? 'No people found' : 'Type to search people'}</p>
        )}
        {results
          .filter((u) => !excludeId || u.id !== excludeId)
          .map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Avatar src={u.avatar_url} name={u.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name}</p>
                <p className="truncate text-xs text-gray-500">
                  {[u.role, u.department_name, u.register_number].filter(Boolean).join(' · ')}
                </p>
              </div>
              {u.is_online && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500" />}
            </button>
          ))}
      </div>
    </Modal>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const {
    conversations, unreadCount, typingUsers, onlineUsers, wsConnected,
    refreshConversations, markConversationRead, sendTyping, sendSeen, onWsMessage, addMessage,
  } = useMessages();

  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showPicker, setShowPicker] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ message: Message; mode: 'me' | 'everyone' } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [mediaView, setMediaView] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [clearTarget, setClearTarget] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevActiveId = useRef<string | null>(null);

  const activeConv = useMemo(
    () => conversations.find((c) => c.other_user_id === activeUserId) || null,
    [conversations, activeUserId]
  );

  const isTyping = activeUserId ? typingUsers[activeUserId] !== undefined : false;
  const isOnline = activeUserId ? onlineUsers.has(activeUserId) : false;

  // ── load messages for active conversation ───────────────────────────
  const loadMessages = useCallback(async (userId: string, reset = true, pg = 1) => {
    try {
      if (reset) setMessagesLoading(true);
      const res = await messageService.getMessages(userId, { page: pg, page_size: 50 });
      const list: Message[] = res.data.data || [];
      setMessages((prev) => {
        const merged = reset ? list : [...list, ...prev];
        const seen = new Set<string>();
        return merged.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      });
      setHasMore(Boolean(res.data.has_next));
      setPage(pg);
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      if (reset) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    setMessages([]);
    setMsgSearch('');
    setReplyTo(null);
    setEditingMsg(null);
    loadMessages(activeUserId, true, 1);
    markConversationRead(activeUserId);
    sendSeen(activeUserId);
  }, [activeUserId, loadMessages, markConversationRead, sendSeen]);

  // ── realtime updates for the open chat ─────────────────────────────
  useEffect(() => {
    const unsub = onWsMessage((msg) => {
      if (!activeUserId) return;
      const m = msg.message;
      if (msg.type === 'new_message' && m && (m.sender_id === activeUserId || m.receiver_id === activeUserId)) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        sendSeen(activeUserId);
      } else if (msg.type === 'message_updated' && m) {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      } else if (msg.type === 'message_deleted' && m && m.id) {
        setMessages((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, is_deleted: true, content: null, message_type: 'deleted' } : x))
        );
      } else if ((msg.type === 'message_seen' || msg.type === 'message_delivered') && msg.message_id) {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === msg.message_id ? { ...x, is_read: true, delivered_at: msg.type === 'message_delivered' ? new Date().toISOString() : x.delivered_at } : x
          )
        );
      }
    });
    return unsub;
  }, [activeUserId, onWsMessage, sendSeen]);

  // mark incoming while open as read + update presence on conv
  useEffect(() => {
    if (!activeUserId) return;
    setMessages((prev) => prev.map((x) => (x.receiver_id === user?.id && !x.is_read ? { ...x, is_read: true } : x)));
  }, [activeUserId, user?.id]);

  useEffect(() => {
    if (activeUserId !== prevActiveId.current) {
      prevActiveId.current = activeUserId;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    } else {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, activeUserId]);

  // ── filtered conversations ──────────────────────────────────────────
  const visibleConversations = useMemo(() => {
    let list = conversations;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.other_user_name.toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'unread') list = list.filter((c) => c.unread_count > 0);
    if (filter === 'pinned') list = list.filter((c) => c.is_pinned);
    if (filter === 'archived') list = list.filter((c) => c.is_archived);
    return list;
  }, [conversations, search, filter]);

  // ── actions ──────────────────────────────────────────────────────────
  const handleSend = async (text: string, files: File[]) => {
    if (!activeUserId) return;
    let attachments: any[] = [];
    if (files.length) {
      try {
        const ups = await Promise.all(files.map((f) => messageService.upload(f)));
        attachments = ups.map((u) => {
          const d = u.data.data;
          return {
            file_type: d.file_type || 'file',
            file_url: d.url || d.file_url,
            file_name: d.file_name,
            file_size: d.file_size,
            mime_type: d.mime_type,
          };
        });
      } catch (e) {
        toast.error('Upload failed: ' + getApiError(e));
        return;
      }
    }
    if (!text.trim() && !attachments.length) return;
    const res = await messageService.send({
      receiver_id: activeUserId,
      content: text.trim() || undefined,
      message_type: attachments.length ? 'file' : text.trim().startsWith('http') ? 'link' : 'text',
      reply_to_id: replyTo?.id,
      attachments: attachments.length ? attachments : undefined,
    });
    const sent: Message = res.data.data;
    setMessages((prev) => (prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]));
    setReplyTo(null);
    addMessage(sent);
    markConversationRead(activeUserId);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const res = await messageService.react(messageId, emoji);
      const reactions = res.data.data?.reactions;
      setMessages((prev) => prev.map((x) => (x.id === messageId ? { ...x, reactions } : x)));
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleStar = async (messageId: string) => {
    try {
      const res = await messageService.star(messageId);
      const value = res.data.data?.is_starred;
      setMessages((prev) => prev.map((x) => (x.id === messageId ? { ...x, is_starred: value } : x)));
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      const res = await messageService.pinMessage(messageId);
      const value = res.data.data?.is_pinned;
      setMessages((prev) => prev.map((x) => (x.id === messageId ? { ...x, is_pinned: value } : x)));
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleEditSubmit = async (content: string) => {
    if (!editingMsg) return;
    try {
      const res = await messageService.edit(editingMsg.id, content.trim());
      setMessages((prev) => prev.map((x) => (x.id === editingMsg.id ? res.data.data : x)));
      setEditingMsg(null);
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await messageService.deleteMessage(deleteTarget.message.id, deleteTarget.mode);
      setMessages((prev) => prev.map((x) => (x.id === deleteTarget.message.id ? res.data.data : x)));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleForward = async (user: UserSearchResult) => {
    if (!forwardMsg) return;
    try {
      await messageService.forward(forwardMsg.id, user.id);
      toast.success(`Forwarded to ${user.full_name}`);
      setForwardMsg(null);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleNewChat = async (u: UserSearchResult) => {
    setShowPicker(false);
    setActiveUserId(u.id);
    try {
      await messageService.createConversation(u.id);
      await refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleClearConversation = async () => {
    if (!activeConv?.conversation_id) return;
    try {
      await messageService.deleteConversation(activeConv.conversation_id);
      toast.success('Conversation cleared');
      setClearTarget(false);
      setActiveUserId(null);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const toggleMute = async () => {
    if (!activeConv?.conversation_id) return;
    try {
      await messageService.muteConversation(activeConv.conversation_id);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const toggleArchive = async () => {
    if (!activeConv?.conversation_id) return;
    try {
      await messageService.archiveConversation(activeConv.conversation_id);
      setActiveUserId(null);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const togglePin = async () => {
    if (!activeConv?.conversation_id) return;
    try {
      await messageService.pinConversation(activeConv.conversation_id);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleBlock = async () => {
    if (!activeUserId) return;
    try {
      await messageService.blockUser(activeUserId);
      toast.success('User blocked');
      setShowMenu(false);
      setActiveUserId(null);
      refreshConversations();
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const handleReport = async () => {
    if (!activeUserId) return;
    try {
      await messageService.reportUser(activeUserId, 'Reported from chat');
      toast.success('User reported');
      setShowMenu(false);
    } catch (e) {
      toast.error(getApiError(e));
    }
  };

  const searchResults = useMemo(() => {
    if (!msgSearch.trim() || !messages.length) return [];
    const q = msgSearch.toLowerCase();
    return messages
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => (m.content || '').toLowerCase().includes(q))
      .slice(-10);
  }, [msgSearch, messages]);

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      {/* ── Conversation list ─────────────────────────────────────────── */}
      <aside className={cn('flex w-full flex-col border-r border-gray-200 dark:border-gray-800 md:w-80 lg:w-96', activeUserId && 'hidden md:flex')}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h1 className="text-lg font-bold">Messages</h1>
          <button
            onClick={() => setShowPicker(true)}
            className="rounded-full bg-gradient-to-br from-[#0095f6] to-[#833ab4] p-2 text-white shadow-md hover:opacity-90"
            title="New message"
          >
            <PenSquare className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="input w-full pl-9"
            />
          </div>
        </div>

        <div className="flex gap-1 px-3 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition',
                filter === f.key
                  ? 'bg-[#0095f6] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-400">
              <MessageCircle className="mb-2 h-10 w-10" />
              <p className="text-sm">{search ? 'No matching conversations' : 'No conversations yet'}</p>
              <button onClick={() => setShowPicker(true)} className="mt-3 text-sm font-medium text-[#0095f6]">
                Start a conversation
              </button>
            </div>
          ) : (
            visibleConversations.map((conv) => {
              const active = activeUserId === conv.other_user_id;
              return (
                <button
                  key={conv.other_user_id}
                  onClick={() => setActiveUserId(conv.other_user_id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 text-left transition',
                    active
                      ? 'bg-[#0095f6]/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={conv.other_user_avatar} name={conv.other_user_name} />
                    {conv.is_online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-950" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{conv.other_user_name}</p>
                      <span className="flex-shrink-0 text-[10px] text-gray-400">
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('truncate text-xs', conv.unread_count > 0 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500')}>
                        {conv.last_message || 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0095f6] to-[#833ab4] px-1.5 text-[10px] font-bold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat window ───────────────────────────────────────────────── */}
      <main className={cn('flex min-w-0 flex-1 flex-col', !activeUserId && 'hidden md:flex')}>
        {activeUserId ? (
          <>
            {/* header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
              <button onClick={() => setActiveUserId(null)} className="md:hidden" title="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Link to={`/profile/${activeUserId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar src={activeConv?.other_user_avatar} name={activeConv?.other_user_name || 'User'} />
                  {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-950" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{activeConv?.other_user_name || 'User'}</p>
                  <p className="text-xs text-gray-400">
                    {isTyping ? <span className="font-medium text-[#0095f6]">typing...</span> : isOnline ? 'Online' : activeConv?.last_seen_at ? `Active ${timeAgo(activeConv.last_seen_at)}` : 'Offline'}
                  </p>
                </div>
              </Link>

              <div className="relative flex items-center gap-1">
                {!activeConv?.is_muted && (
                  <button className="hidden rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:block" title="Voice call (coming soon)">
                    <Phone className="h-[18px] w-[18px]" />
                  </button>
                )}
                {!activeConv?.is_muted && (
                  <button className="hidden rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:block" title="Video call (coming soon)">
                    <Video className="h-[18px] w-[18px]" />
                  </button>
                )}
                <button onClick={() => setShowMenu((v) => !v)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="More">
                  <MoreVertical className="h-5 w-5" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                      <Link to={`/profile/${activeUserId}`} onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Info className="h-4 w-4 text-gray-400" /> View profile
                      </Link>
                      <button onClick={() => { togglePin(); setShowMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Pin className="h-4 w-4 text-gray-400" /> {activeConv?.is_pinned ? 'Unpin' : 'Pin'} conversation
                      </button>
                      <button onClick={() => { toggleArchive(); setShowMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Archive className="h-4 w-4 text-gray-400" /> {activeConv?.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button onClick={() => { toggleMute(); setShowMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        {activeConv?.is_muted ? <Bell className="h-4 w-4 text-gray-400" /> : <BellOff className="h-4 w-4 text-gray-400" />} {activeConv?.is_muted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={() => { setShowMenu(false); setClearTarget(true); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4" /> Clear conversation
                      </button>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button onClick={() => { setShowMenu(false); handleBlock(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Ban className="h-4 w-4" /> Block user
                      </button>
                      <button onClick={() => { setShowMenu(false); handleReport(); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Flag className="h-4 w-4" /> Report
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* in-conversation search */}
            <div className="border-b border-gray-200 px-4 py-1.5 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder="Search in conversation..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#0095f6] dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto bg-gray-50/50 p-4 dark:bg-gray-950"
              onClick={() => setMsgSearch('')}
            >
              {messagesLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#0095f6]" /></div>
              ) : hasMore && (
                <button onClick={() => loadMessages(activeUserId, false, page + 1)} className="mx-auto block rounded-full bg-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300">
                  Load earlier
                </button>
              )}
              {!messagesLoading && messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <MessageCircle className="mb-2 h-12 w-12" />
                  <p className="text-sm">Say hi to {activeConv?.other_user_name || 'your friend'}</p>
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onReply={setReplyTo}
                  onReact={handleReact}
                  onEdit={setEditingMsg}
                  onDelete={(id, mode) => setDeleteTarget({ message: messages.find((x) => x.id === id)!, mode })}
                  onForward={setForwardMsg}
                  onStar={handleStar}
                  onOpenMedia={setMediaView}
                />
              ))}
            </div>

            {/* composer */}
            {editingMsg ? (
              <EditBar message={editingMsg} onCancel={() => setEditingMsg(null)} onSubmit={handleEditSubmit} />
            ) : (
              <MessageComposer
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSend={handleSend}
                onTyping={(t) => sendTyping(activeUserId, t, activeConv?.conversation_id)}
                typingEnabled={!!activeConv?.conversation_id}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 text-center dark:bg-gray-950">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0095f6] to-[#833ab4] p-5">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold">Your messages</h2>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              Send private messages and share posts with friends across Magnet.
            </p>
            <button onClick={() => setShowPicker(true)} className="mt-5 flex items-center gap-2 rounded-full bg-gradient-to-br from-[#0095f6] to-[#833ab4] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90">
              <PenSquare className="h-4 w-4" /> New message
            </button>
            {!wsConnected && (
              <p className="mt-3 text-xs text-amber-500">Realtime off — reconnect...</p>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <UserPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleNewChat}
        title="New message"
        excludeId={user?.id}
      />
      <UserPickerModal
        isOpen={!!forwardMsg}
        onClose={() => setForwardMsg(null)}
        onSelect={handleForward}
        title="Forward message"
        excludeId={user?.id}
      />

      {/* delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete message" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {deleteTarget?.mode === 'everyone'
            ? 'Delete this message for everyone? This cannot be undone.'
            : 'Delete this message for you? The other person will still see it.'}
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-gray-700">Cancel</button>
          <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Delete</button>
        </div>
      </Modal>

      {/* clear conversation confirm */}
      <Modal isOpen={clearTarget} onClose={() => setClearTarget(false)} title="Clear conversation" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This will permanently delete this conversation for you. Continue?
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setClearTarget(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-gray-700">Cancel</button>
          <button onClick={handleClearConversation} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Clear</button>
        </div>
      </Modal>

      {/* media lightbox */}
      {mediaView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setMediaView(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          {mediaView.attachments?.length ? (
            mediaView.attachments[0].file_type === 'video' ? (
              <video src={mediaView.attachments[0].file_url} controls autoPlay className="max-h-[85vh] max-w-full rounded-xl" />
            ) : (
              <img src={mediaView.attachments[0].file_url} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
            )
          ) : mediaView.image_url ? (
            <img src={mediaView.image_url} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
          ) : null}
        </div>
      )}
    </div>
  );
}

function EditBar({
  message, onCancel, onSubmit,
}: {
  message: Message;
  onCancel: () => void;
  onSubmit: (content: string) => void;
}) {
  const [value, setValue] = useState(message.content || '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-[#0095f6]">
          <Star className="h-3.5 w-3.5" /> Edit message
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          rows={2}
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm outline-none focus:border-[#0095f6] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          disabled={saving || !value.trim()}
          onClick={async () => {
            setSaving(true);
            await onSubmit(value);
            setSaving(false);
          }}
          className="rounded-full bg-gradient-to-br from-[#0095f6] to-[#833ab4] p-2.5 text-white shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
