import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Reply, Copy, Trash2, Star, Pin, Forward, Edit3, Check, CheckCheck,
  FileText, Paperclip, Play, Download, Image as ImageIcon, ExternalLink,
} from 'lucide-react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { cn, timeAgo } from '../../utils/helpers';

const EMOJIS = ['\u2764\uFE0F', '\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE21', '\uD83D\uDC4D', '\uD83D\uDC4E', '\uD83D\uDE30', '\uD83C\uDF89'];

interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string, mode: 'me' | 'everyone') => void;
  onForward: (message: Message) => void;
  onStar: (messageId: string) => void;
  onOpenMedia: (message: Message) => void;
}

function SharePreview({ message }: { message: Message }) {
  const p = message.share_preview;
  if (!p) return null;
  const link = p.post_id
    ? `/posts/${p.post_id}`
    : p.user_id
    ? `/profile/${p.user_id}`
    : p.event_id
    ? `/events/${p.event_id}`
    : p.club_id
    ? `/clubs/${p.club_id}`
    : p.department_id
    ? `/departments/${p.department_id}`
    : null;

  const body = (
    <div className="flex items-center gap-3 rounded-xl border border-current/20 bg-black/5 p-2.5 dark:bg-white/10">
      {p.image_url || p.avatar_url || p.icon_url || p.banner_url ? (
        <img
          src={p.image_url || p.avatar_url || p.icon_url || p.banner_url}
          alt=""
          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
          <ImageIcon className="h-5 w-5 text-gray-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">
          {p.full_name || p.title || p.name || p.content || 'Shared'}
        </p>
        <p className="line-clamp-1 text-[11px] opacity-70">
          {p.author_name || p.description || p.category || p.role || p.code || ''}
        </p>
        {typeof p.like_count === 'number' && (
          <p className="text-[10px] opacity-60">
            {p.like_count} likes · {p.comment_count} comments
          </p>
        )}
      </div>
    </div>
  );

  if (!link) return body;
  return (
    <Link to={link} className="block" onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  );
}

function LinkPreview({ message }: { message: Message }) {
  if (!message.link_title && !message.link_description && !message.link_image) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10">
      {message.link_image && (
        <img src={message.link_image} alt="" className="max-h-40 w-full object-cover" />
      )}
      <div className="p-2">
        {message.link_title && <p className="line-clamp-2 text-xs font-semibold">{message.link_title}</p>}
        {message.link_description && (
          <p className="line-clamp-2 text-[11px] opacity-70">{message.link_description}</p>
        )}
      </div>
    </div>
  );
}

function AttachmentView({ message, onOpenMedia }: { message: Message; onOpenMedia: (m: Message) => void }) {
  const attachments = message.attachments || [];
  if (!attachments.length && !message.image_url) return null;

  const renderMedia = (url: string, fileType?: string) => {
    if (fileType === 'video' || fileType === 'audio') {
      return (
        <button
          onClick={() => onOpenMedia(message)}
          className="group relative mt-2 block max-w-xs overflow-hidden rounded-xl"
        >
          {fileType === 'video' ? (
            <video src={url} className="max-h-72 w-full object-cover" />
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-gray-200 p-4 dark:bg-gray-800">
              <Play className="h-6 w-6 text-primary-600" />
              <span className="text-sm">Play audio</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
            <Play className="h-10 w-10 text-white" />
          </div>
        </button>
      );
    }
    if (fileType === 'pdf' || fileType === 'document' || fileType === 'file') {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-3 rounded-xl border border-current/20 bg-black/5 p-3 dark:bg-white/10"
        >
          <FileText className="h-6 w-6 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{message.attachments?.[0]?.file_name || 'Document'}</p>
            <p className="text-[10px] opacity-60">Tap to open</p>
          </div>
          <Download className="h-4 w-4 ml-auto flex-shrink-0" />
        </a>
      );
    }
    return (
      <button onClick={() => onOpenMedia(message)} className="mt-2 block max-w-xs overflow-hidden rounded-xl">
        <img src={url} alt="" className="max-h-72 w-full object-cover" />
      </button>
    );
  };

  return (
    <div>
      {attachments.map((a) => (
        <div key={a.id}>{renderMedia(a.file_url, a.file_type)}</div>
      ))}
      {message.image_url && !attachments.length && renderMedia(message.image_url, 'image')}
    </div>
  );
}

export default function MessageBubble({
  message, onReply, onReact, onEdit, onDelete, onForward, onStar, onOpenMedia,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const isOwn = message.sender_id === user?.id;
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  if (message.message_type === 'deleted' || (message.is_deleted && message.deleted_for_me)) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2 text-xs italic text-gray-500 dark:bg-gray-800">
          <Trash2 className="h-3.5 w-3.5" />
          {isOwn ? 'You deleted this message' : 'Message deleted'}
        </div>
      </div>
    );
  }

  const reactions = message.reactions || [];
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={cn('group flex', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={cn('relative max-w-[80%] sm:max-w-[65%]', isOwn && 'flex flex-col items-end')}>
        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2 shadow-sm',
            isOwn
              ? 'bg-gradient-to-br from-[#0095f6] to-[#833ab4] text-white'
              : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-100',
            (Boolean(message.attachments?.length) || message.image_url) && 'overflow-hidden px-2 pt-2'
          )}
        >
          {message.is_forwarded && (
            <p className={cn('mb-1 flex items-center gap-1 text-[10px] font-medium opacity-70')}>
              <Forward className="h-3 w-3" /> Forwarded
            </p>
          )}
          {message.reply_to && (
            <div className={cn('mb-1.5 rounded-lg border-l-2 border-current/40 bg-black/5 px-2 py-1 dark:bg-white/10')}>
              <p className={cn('text-[10px] font-semibold opacity-80')}>{message.reply_to.sender_name || 'Reply'}</p>
              <p className="line-clamp-1 text-xs opacity-70">{message.reply_to.content || 'Media'}</p>
            </div>
          )}

          {message.share_type && <SharePreview message={message} />}
          <AttachmentView message={message} onOpenMedia={onOpenMedia} />

          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-snug">{message.content}</p>
          )}
          <LinkPreview message={message} />

          {message.is_edited && (
            <span className={cn('ml-1 text-[10px] italic opacity-60')}>edited</span>
          )}

          <div className={cn('mt-1 flex items-center gap-1 text-[10px]', isOwn ? 'justify-end text-white/70' : 'text-gray-400 dark:text-gray-500')}>
            {message.is_pinned && <Pin className="h-3 w-3" />}
            {message.is_starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
            <span>{timeAgo(message.created_at)}</span>
            {isOwn && (message.is_read ? <CheckCheck className="h-3.5 w-3.5 text-cyan-300" /> : message.delivered_at ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
          </div>
        </div>

        {Object.keys(grouped).length > 0 && (
          <div className={cn('mt-0.5 flex gap-1')}>
            {Object.entries(grouped).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] text-gray-500">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* hover actions */}
        <div
          className={cn(
            'absolute -top-4 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-1 shadow-md dark:border-gray-700 dark:bg-gray-800 transition-opacity',
            isOwn ? 'right-2' : 'left-2',
            showActions ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <button title="React" onClick={() => { setShowEmoji((v) => !v); }} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="text-sm leading-none">{'😀'}</span>
          </button>
          <button title="Reply" onClick={() => onReply(message)} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Reply className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          <button title="Copy" onClick={() => { if (message.content) navigator.clipboard?.writeText(message.content); }} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Copy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          {isOwn && (
            <button title="Edit" onClick={() => onEdit(message)} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Edit3 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <button title="Star" onClick={() => onStar(message.id)} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Star className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          <button title="Forward" onClick={() => onForward(message)} className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Forward className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            title="Delete"
            onClick={() => onDelete(message.id, isOwn ? 'everyone' : 'me')}
            className="rounded-full p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>

        {/* emoji quick picker */}
        {showEmoji && (
          <div className="absolute -bottom-12 z-20 flex gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(message.id, e); setShowEmoji(false); }}
                className="rounded-full p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
