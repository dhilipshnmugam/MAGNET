import { useState, useRef } from 'react';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Share2,
  Eye, MapPin, Trophy, Calendar, Clock, BookOpen, Users, Briefcase,
  Lightbulb, Download, ExternalLink, ChevronDown, ChevronUp, Hash,
  Flag, BarChart3, Copy, Check, UserPlus,
} from 'lucide-react';
import { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services';
import { timeAgo, cn } from '../../utils/helpers';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
}

const POST_TYPE_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  general: { label: 'General', badgeClass: 'badge-general', icon: null },
  achievement: { label: 'Achievement', badgeClass: 'badge-achievement', icon: <Trophy className="h-3 w-3" /> },
  event: { label: 'Event', badgeClass: 'badge-event', icon: <Calendar className="h-3 w-3" /> },
  club_announcement: { label: 'Club', badgeClass: 'badge-club', icon: null },
  academic_resource: { label: 'Resource', badgeClass: 'badge-resource', icon: <BookOpen className="h-3 w-3" /> },
  internship: { label: 'Internship', badgeClass: 'badge-internship', icon: <Briefcase className="h-3 w-3" /> },
  placement: { label: 'Placement', badgeClass: 'badge-placement', icon: <Lightbulb className="h-3 w-3" /> },
  collaboration: { label: 'Collaboration', badgeClass: 'badge-collaboration', icon: <Users className="h-3 w-3" /> },
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: '🌐 Public',
  department: '🏢 Department',
  club_members: '👥 Club',
  private: '🔒 Only Me',
};

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="score-ring-value" style={{ color }}>{score}</span>
    </div>
  );
}

function MediaGallery({ media }: { media: Post['media'] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.media_type === 'image');
  const videos = media.filter((m) => m.media_type === 'video');
  const docs = media.filter((m) => m.media_type === 'document');

  const count = images.length;
  const gridClass = count === 1 ? 'media-grid-1' : count === 2 ? 'media-grid-2' : 'media-grid-3';

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className={cn(gridClass, 'overflow-hidden rounded-xl')}>
          {images.slice(0, 3).map((img, i) => (
            <div key={img.id} className="relative cursor-pointer overflow-hidden" onClick={() => setLightboxIndex(i)}>
              <img src={img.media_url} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" style={{ minHeight: count === 1 ? 300 : 160 }} />
            </div>
          ))}
        </div>
      )}

      {videos.map((vid) => (
        <div key={vid.id} className="relative overflow-hidden rounded-xl bg-gray-900">
          <video src={vid.media_url} controls className="w-full" style={{ maxHeight: 400 }} />
        </div>
      ))}

      {docs.map((doc) => (
        <a key={doc.id} href={doc.media_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
            <Download className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">Document</p>
            <p className="text-xs text-gray-500">Click to download</p>
          </div>
        </a>
      ))}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setLightboxIndex(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightboxIndex(null)}>
            <span className="text-xl">✕</span>
          </button>
          <img src={images[lightboxIndex].media_url} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={cn('h-2 w-2 rounded-full transition-colors', i === lightboxIndex ? 'bg-white' : 'bg-white/40')} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderHashtags(text: string | null) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? <span key={i} className="hashtag">{part}</span> : part
  );
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getTimeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Happening now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h away`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m away`;
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked_by_user);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked_by_user);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmark_count);
  const [shareCount, setShareCount] = useState(post.share_count);
  const [viewCount, setViewCount] = useState(post.view_count);
  const [showMenu, setShowMenu] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.general;

  const handleLike = async () => {
    try {
      const res = await postService.toggleLike(post.id);
      setLiked(res.data.data.liked);
      setLikeCount(res.data.data.like_count);
      if (!liked) {
        setAnimateLike(true);
        setTimeout(() => setAnimateLike(false), 450);
      }
    } catch {}
  };

  const handleBookmark = async () => {
    try {
      const res = await postService.toggleBookmark(post.id);
      setBookmarked(res.data.data.bookmarked);
      setBookmarkCount(res.data.data.bookmark_count);
      toast.success(res.data.data.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch {}
  };

  const handleShare = async () => {
    try {
      const res = await postService.share(post.id);
      setShareCount(res.data.data.share_count);
      if (navigator.share) {
        navigator.share({ title: post.title || 'UniSphere Post', text: post.content.slice(0, 200), url: window.location.href });
      } else {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied to clipboard');
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postService.delete(post.id);
      toast.success('Post deleted');
      onDelete?.(post.id);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await postService.getComments(post.id, { page: commentPage, page_size: 10 });
      setComments((prev) => [...prev, ...res.data.data]);
      setHasMoreComments(res.data.has_next);
      setCommentPage((p) => p + 1);
    } catch {} finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await postService.addComment(post.id, { content: commentText.trim() });
      setComments((prev) => [res.data.data, ...prev]);
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  return (
    <article className="card-hover overflow-hidden animate-fade-in">
      {/* Accent bar for special post types */}
      {post.post_type !== 'general' && (
        <div className={cn('h-1', `post-accent-${post.post_type}`)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-campus-400 to-campus-600 p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-900">
                <Avatar src={post.author?.avatar_url} name={post.author?.full_name || 'U'} size="sm" />
              </div>
            </div>
            {post.is_pinned && (
              <div className="absolute -right-1 -top-1 rounded-full bg-campus-500 p-0.5">
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{post.author?.full_name}</p>
              {post.author?.role === 'super_admin' && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Super Admin</span>
              )}
              {post.author?.role === 'department_admin' && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Dept Admin</span>
              )}
              {post.author?.role === 'club_admin' && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Club Admin</span>
              )}
              {post.author?.role === 'principal' && (
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">Principal</span>
              )}
              {post.author?.role === 'student' && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Student</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {post.author?.department_name && (
                <span className="font-medium text-gray-600 dark:text-gray-300">{post.author.department_name}</span>
              )}
              {post.author?.department_name && <span>·</span>}
              <span>{timeAgo(post.created_at)}</span>
              {post.location && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{post.location}</span>
                </>
              )}
              <span>·</span>
              <span>{VISIBILITY_LABELS[post.visibility]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {typeConfig.icon && (
            <span className={cn('badge text-[10px] font-semibold', typeConfig.badgeClass)}>
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          )}

          {(user?.id === post.author_id || user?.role === 'super_admin') && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 animate-scale-in">
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Link copied'); setShowMenu(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    {user?.id === post.author_id && (
                      <>
                        <button onClick={() => setShowMenu(false)} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                          <BarChart3 className="h-4 w-4" /> View Analytics
                        </button>
                      </>
                    )}
                    {onDelete && user?.id === post.author_id && (
                      <button onClick={() => { handleDelete(); setShowMenu(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4" /> Delete post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <div className="px-4 pb-1">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{post.title}</h3>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {renderHashtags(post.content)}
        </p>
      </div>

      {/* Achievement Card */}
      {post.post_type === 'achievement' && (
        <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="p-4">
            <div className="flex items-center gap-4">
              {post.achievement_score != null && <ScoreRing score={post.achievement_score} />}
              <div className="flex-1">
                {post.achievement_type && (
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{post.achievement_type}</p>
                )}
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Achievement Unlocked</p>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          </div>
          <div className="flex items-center justify-center bg-amber-100/50 px-4 py-2 dark:bg-amber-900/30">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">🎉 Congratulations!</p>
          </div>
        </div>
      )}

      {/* Event Card */}
      {post.post_type === 'event' && (
        <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="p-4 space-y-3">
            {post.event_name && <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{post.event_name}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs text-purple-600 dark:text-purple-400">
              {post.event_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(post.event_date).toLocaleDateString()}</span>
                </div>
              )}
              {post.event_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{post.event_time}</span>
                </div>
              )}
              {post.event_location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{post.event_location}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-purple-600 dark:text-purple-400">
              {post.event_date && (
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  ⏰ {getTimeUntil(post.event_date)}
                </span>
              )}
              {post.participant_count > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {post.participant_count} attending
                </span>
              )}
            </div>
            {post.registration_url && (
              <a href={post.registration_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700">
                <ExternalLink className="h-3.5 w-3.5" /> Register Now
              </a>
            )}
          </div>
        </div>
      )}

      {/* Resource Card */}
      {post.post_type === 'academic_resource' && post.file_url && (
        <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-800 dark:text-emerald-200">{post.file_name || 'Resource'}</p>
              {post.resource_type && <p className="text-xs text-emerald-600 dark:text-emerald-400">{post.resource_type}</p>}
              {post.file_size && <p className="text-xs text-emerald-500 dark:text-emerald-500">{formatFileSize(post.file_size)}</p>}
            </div>
            <a href={post.file_url} target="_blank" rel="noopener noreferrer"
              className="rounded-xl bg-emerald-600 p-2.5 text-white transition-colors hover:bg-emerald-700">
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Collaboration Card */}
      {post.post_type === 'collaboration' && (
        <div className="mx-4 mb-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="space-y-2">
            {post.collaboration_type && (
              <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{post.collaboration_type}</span>
            )}
            {post.required_skills && (
              <div className="flex flex-wrap gap-1.5">
                {post.required_skills.split(',').map((skill, i) => (
                  <span key={i} className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
              {post.team_size && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Team of {post.team_size}</span>
              )}
              <button className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
                <UserPlus className="h-3 w-3" /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery — from media array OR image_url/video_url */}
      {((post.media && post.media.length > 0) || post.image_url || post.video_url) && (
        <div className="px-4 pb-3">
          {post.media && post.media.length > 0 ? (
            <MediaGallery media={post.media} />
          ) : post.image_url ? (
            <div className="overflow-hidden rounded-xl">
              <img src={post.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 500 }} />
            </div>
          ) : post.video_url ? (
            <div className="overflow-hidden rounded-xl bg-gray-900">
              <video src={post.video_url} controls className="w-full" style={{ maxHeight: 500 }} />
            </div>
          ) : null}
        </div>
      )}

      {/* Action Bar */}
      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={handleLike} className="group flex items-center gap-1.5 transition-transform active:scale-75">
              <Heart
                className={cn(
                  'h-5 w-5 transition-all',
                  liked ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover:text-red-400 dark:text-gray-400',
                  animateLike && 'animate-like'
                )}
              />
              <span className={cn('text-xs font-medium transition-colors', liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400')}>
                {formatCount(likeCount)}
              </span>
            </button>

            <button onClick={() => { setShowComments(!showComments); if (!showComments && comments.length === 0) loadComments(); }}
              className="group flex items-center gap-1.5 transition-transform hover:text-gray-700 active:scale-95">
              <MessageCircle className="h-5 w-5 text-gray-600 group-hover:text-campus-500 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatCount(post.comment_count)}</span>
            </button>

            <button onClick={handleShare} className="group flex items-center gap-1.5 transition-transform hover:text-gray-700 active:scale-95">
              <Share2 className="h-5 w-5 text-gray-600 group-hover:text-green-500 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatCount(shareCount)}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="h-3.5 w-3.5" /> {formatCount(viewCount)}
            </span>
            <button onClick={handleBookmark} className="transition-transform active:scale-75">
              <Bookmark className={cn(
                'h-5 w-5 transition-colors',
                bookmarked ? 'fill-campus-500 text-campus-500' : 'text-gray-600 hover:text-campus-500 dark:text-gray-400'
              )} />
            </button>
          </div>
        </div>

        {/* Likes text */}
        {likeCount > 0 && (
          <p className="mt-2 text-xs font-semibold text-gray-900 dark:text-white">
            {formatCount(likeCount)} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Author content line (when images present) */}
        {post.media && post.media.length > 0 && (
          <p className="mt-1 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">{post.author?.full_name}</span>{' '}
            <span className="text-gray-700 dark:text-gray-300">{post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content}</span>
          </p>
        )}

        {/* View comments */}
        {post.comment_count > 0 && !showComments && (
          <button onClick={() => { setShowComments(true); if (comments.length === 0) loadComments(); }}
            className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            View all {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800 animate-slide-up">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name || 'U'} size="sm" />
                <div className="flex-1">
                  <p className="text-xs">
                    <span className="font-semibold text-gray-900 dark:text-white">{comment.author?.full_name}</span>{' '}
                    <span className="text-gray-700 dark:text-gray-300">{comment.content}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(comment.created_at)}</p>
                </div>
              </div>
            ))}
            {hasMoreComments && (
              <button onClick={loadComments} disabled={loadingComments}
                className="w-full py-1.5 text-xs font-medium text-campus-500 hover:text-campus-600 disabled:opacity-50">
                {loadingComments ? 'Loading...' : 'Load more comments'}
              </button>
            )}
          </div>

          {/* Comment Input */}
          <div className="mt-3 flex items-center gap-2">
            <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="sm" />
            <input
              type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
              placeholder="Add a comment..."
              className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-campus-400 dark:bg-gray-800 dark:text-white"
            />
            <button onClick={handleCommentSubmit} disabled={!commentText.trim()}
              className="rounded-xl bg-campus-500 p-2 text-white transition-colors hover:bg-campus-600 disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
