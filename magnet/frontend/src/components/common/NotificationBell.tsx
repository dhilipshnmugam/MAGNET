import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { timeAgo } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

const TYPE_ICONS: Record<string, string> = {
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
  project_interest: '\u{2764}\u{FE0F}',
  follow: '\u{1F464}',
};

function resolveNotificationTarget(notif: { ref_type: string | null; ref_id: string | null; sender_id?: string | null }) {
  if (!notif.ref_type || !notif.ref_id) return null;
  if (notif.ref_type === 'project') return `/projects/${notif.ref_id}`;
  if (notif.ref_type === 'event') return `/events/${notif.ref_id}`;
  if (notif.ref_type === 'department') return `/departments/${notif.ref_id}`;
  if (notif.ref_type === 'user' || notif.ref_type === 'profile') return `/profile/${notif.sender_id || notif.ref_id}`;
  if (notif.ref_type === 'leaderboard') return '/leaderboard';
  if (notif.ref_type === 'approval') return '/settings';
  if (notif.ref_type === 'post') return '/feed';
  return null;
}

export default function NotificationBell() {
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllRead(); }}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[380px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <Bell className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markRead(notif.id);
                    setOpen(false);
                    const target = resolveNotificationTarget(notif);
                    if (target) navigate(target);
                  }}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
                    !notif.is_read && 'bg-primary-50/50 dark:bg-primary-900/10'
                  )}
                >
                  <span className="mt-0.5 text-lg flex-shrink-0">{TYPE_ICONS[notif.type] || '\u{1F514}'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !notif.is_read ? 'font-semibold' : 'font-medium')}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="w-full py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-gray-50 dark:text-primary-400 dark:hover:bg-gray-800/50 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
