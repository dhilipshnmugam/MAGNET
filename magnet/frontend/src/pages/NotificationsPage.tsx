import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { notificationService } from '../services';
import { Notification } from '../types';
import { timeAgo } from '../utils/helpers';
import {
  Bell, Check, CheckCheck, Heart, MessageCircle, FileText, Calendar,
  Trophy, Mail, Megaphone, Hash, AlertCircle, Clock, XCircle, Info,
  Filter, ChevronDown, AtSign, UserPlus,
} from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  post: { icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'New Post' },
  like: { icon: Heart, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20', label: 'Like' },
  comment: { icon: MessageCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20', label: 'Comment' },
  mention: { icon: AtSign, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', label: 'Mention' },
  event: { icon: Calendar, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20', label: 'Event' },
  event_reminder: { icon: Clock, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', label: 'Reminder' },
  approval: { icon: Check, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'Rejected' },
  leaderboard: { icon: Trophy, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', label: 'Leaderboard' },
  message: { icon: Mail, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', label: 'Message' },
  announcement: { icon: Megaphone, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'Announcement' },
  channel_invite: { icon: Hash, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20', label: 'Club' },
  system: { icon: Info, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800', label: 'System' },
  project_interest: { icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20', label: 'Project' },
  follow: { icon: UserPlus, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'Follow' },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'like', label: 'Likes' },
  { value: 'comment', label: 'Comments' },
  { value: 'mention', label: 'Mentions' },
  { value: 'event', label: 'Events' },
  { value: 'approval', label: 'Approvals' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'follow', label: 'Follows' },
];

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter;
  });

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success('All notifications marked as read');
  };

  const resolveTarget = (notif: Notification) => {
    if (!notif.ref_type || !notif.ref_id) return null;
    if (notif.ref_type === 'project') return `/projects/${notif.ref_id}`;
    if (notif.ref_type === 'event') return `/events/${notif.ref_id}`;
    if (notif.ref_type === 'department') return `/departments/${notif.ref_id}`;
    if (notif.ref_type === 'user' || notif.ref_type === 'profile') return `/profile/${notif.sender_id || notif.ref_id}`;
    if (notif.ref_type === 'leaderboard') return '/leaderboard';
    if (notif.ref_type === 'approval') return '/settings';
    if (notif.ref_type === 'post') return '/feed';
    return null;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors',
              showFilters ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Filter className="h-4 w-4" /> Filter
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 transition-colors"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title={filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
          description={filter === 'all' ? "You're all caught up!" : 'Try a different filter'}
        />
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) markRead(notif.id);
                  const target = resolveTarget(notif);
                  if (target) navigate(target);
                }}
                className={cn(
                  'card cursor-pointer p-4 transition-all hover:shadow-md group',
                  !notif.is_read
                    ? 'border-l-4 border-l-primary-500 bg-primary-50/30 dark:bg-primary-900/10'
                    : 'border-l-4 border-l-transparent'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', config.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm', !notif.is_read ? 'font-bold' : 'font-medium')}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{notif.body}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-xs text-gray-400">{timeAgo(notif.created_at)}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', config.color)}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
