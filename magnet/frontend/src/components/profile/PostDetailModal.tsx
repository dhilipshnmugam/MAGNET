import { useEffect, useState } from 'react';
import {
  X, Heart, MessageCircle, Send, Share2, Bookmark, MoreHorizontal, Trash2,
  Copy, Check, Loader2, MapPin, Eye,
} from 'lucide-react';
import type { Post } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services';
import Avatar from '../common/Avatar';
import { timeAgo, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
  isOwn?: boolean;
  onDelete?: (id: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function PostDetailModal({ post, onClose, isOwn, onDelete }: PostDetailModalProps) {
  const { user } = useAuth();

  const images = post.media.filter((m) => m.media_type === 'image');
  const videos = post.media.filter((m) => m.media_type === 'video');
  const allImages =
    images.length > 0
      ? images
      : post.image_url
        ? [{ media_url: post.image_url, thumbnail_url: null } as any]
        : [];
  const video =
    videos[0] ||
    (post.video_url ? { media_url: post.video_url, thumbnail_url: null } as any : null);

  const [imgIndex, setImgIndex] = useState(0);
  const [liked, setLiked] = useState(post.is_liked_by_user);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked_by_user);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmark_count);
  const [shareCount, setShareCount] = useState(post.share_count);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const canDelete = Boolean(onDelete && (user?.id === post.author_id || user?.role === 'super_admin'));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    loadComments();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await postService.getComments(post.id, { page: commentPage, page_size: 20 });
      setComments((prev) => [...prev, ...res.data.data]);
      setHasMoreComments(res.data.has_next);
      setCommentPage((p) => p + 1);
    } catch {
      setHasMoreComments(false);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await postService.toggleLike(post.id);
      setLiked(res.data.data.liked);
      setLikeCount(res.data.data.like_count);
    } catch { /* noop */ }
  };

  const handleBookmark = async () => {
    try {
      const res = await postService.toggleBookmark(post.id);
      setBookmarked(res.data.data.bookmarked);
      setBookmarkCount(res.data.data.bookmark_count);
      toast.success(res.data.data.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch { /* noop */ }
  };

  const handleShare = async () => {
    try {
      const res = await postService.share(post.id);
      setShareCount(res.data.data.share_count);
    } catch { /* noop */ }
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  const handleCommentSubmit = async () => {
    const content = commentText.trim();
    if (!content || commentLoading) return;
    setCommentLoading(true);
    try {
      const res = await postService.addComment(post.id, { content });
      setComments((prev) => [res.data.data, ...prev]);
      setCommentText('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
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

  const hasMedia = allImages.length > 0 || video;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={cn('flex-1 overflow-y-auto md:grid md:grid-cols-2 md:overflow-hidden')}>
          {/* Media */}
          <div className={cn('relative flex items-center justify-center bg-black', hasMedia ? 'aspect-square md:aspect-auto' : 'hidden md:hidden')}>
            {allImages.length > 0 ? (
              <>
                <img
                  src={allImages[imgIndex].media_url}
                  alt=""
                  className="h-full max-h-[45vh] w-full object-contain md:max-h-[92vh]"
                />
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 flex w-full justify-center gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                        className={cn('h-1.5 rounded-full transition-all', i === imgIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50')}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : video ? (
              <video src={video.media_url} controls className="h-full max-h-[45vh] w-full object-contain md:max-h-[92vh]" />
            ) : null}
          </div>

          {/* Details */}
          <div className="flex flex-col md:h-full">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <Avatar src={post.author?.avatar_url} name={post.author?.full_name || 'U'} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{post.author?.full_name}</p>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  {post.author?.department_name && <span>{post.author.department_name}</span>}
                  {post.author?.department_name && <span>·</span>}
                  <span>{timeAgo(post.created_at)}</span>
                  {post.location && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{post.location}</span>
                    </>
                  )}
                </p>
              </div>
              {canDelete && (
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 animate-scale-in">
                        <button
                          onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Link copied'); setShowMenu(false); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied!' : 'Copy link'}
                        </button>
                        {user?.id === post.author_id && (
                          <button
                            onClick={() => { handleDelete(); setShowMenu(false); }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" /> Delete post
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 md:min-h-0">
              <div className="flex gap-3">
                <Avatar src={post.author?.avatar_url} name={post.author?.full_name || 'U'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold text-gray-900 dark:text-white">{post.author?.full_name}</span>{' '}
                    <span className="whitespace-pre-wrap">{post.content}</span>
                  </p>
                  {post.post_type === 'achievement' && post.achievement_type && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      🏆 {post.achievement_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name || 'U'} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-semibold text-gray-900 dark:text-white">{comment.author?.full_name}</span>{' '}
                        {comment.content}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(comment.created_at)}</p>
                    </div>
                  </div>
                ))}
                {hasMoreComments && (
                  <button
                    onClick={loadComments}
                    disabled={loadingComments}
                    className="w-full py-1.5 text-xs font-medium text-campus-500 hover:text-campus-600 disabled:opacity-50"
                  >
                    {loadingComments ? 'Loading...' : 'Load more comments'}
                  </button>
                )}
                {comments.length === 0 && !loadingComments && (
                  <p className="text-xs text-gray-400">No comments yet.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <button onClick={handleLike} className="group flex items-center gap-1.5 transition-transform active:scale-75">
                    <Heart className={cn('h-5 w-5 transition-all', liked ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover:text-red-400 dark:text-gray-400')} />
                    <span className={cn('text-xs font-medium', liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400')}>{formatCount(likeCount)}</span>
                  </button>
                  <button onClick={() => document.getElementById('comment-input')?.focus()} className="group flex items-center gap-1.5">
                    <MessageCircle className="h-5 w-5 text-gray-600 group-hover:text-campus-500 dark:text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatCount(post.comment_count)}</span>
                  </button>
                  <button onClick={handleShare} className="group flex items-center gap-1.5">
                    {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5 text-gray-600 group-hover:text-green-500 dark:text-gray-400" />}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatCount(shareCount)}</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Eye className="h-3.5 w-3.5" />{formatCount(post.view_count)}</span>
                  <button onClick={handleBookmark} className="transition-transform active:scale-75">
                    <Bookmark className={cn('h-5 w-5 transition-colors', bookmarked ? 'fill-campus-500 text-campus-500' : 'text-gray-600 hover:text-campus-500 dark:text-gray-400')} />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">{formatCount(bookmarkCount)} saved</p>

              {/* Comment input */}
              <div className="mt-2 flex items-center gap-2">
                <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="sm" />
                <input
                  id="comment-input"
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-campus-400 dark:bg-gray-800 dark:text-white"
                />
                <button onClick={handleCommentSubmit} disabled={!commentText.trim() || commentLoading}
                  className="rounded-xl bg-campus-500 p-2 text-white transition-colors hover:bg-campus-600 disabled:opacity-40">
                  {commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
