import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Trash2, Loader2, Eye, BarChart3,
} from 'lucide-react';
import type { Story, StoryComment, StoryViewer, StoryLiker } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services';
import { getApiError } from '../../services/api';
import { timeAgo, cn } from '../../utils/helpers';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

const STORY_DURATION_MS = 5000;
const CLOSE_ANIMATION_MS = 180;

const ROLE_LABELS: Record<string, string> = {
  principal: 'Principal',
  club_admin: 'Club Admin',
  department_admin: 'Department',
  super_admin: 'Admin',
  student: 'Student',
};

interface StoryGroup {
  creatorId: string;
  indices: number[];
}

function buildGroups(list: Story[]): StoryGroup[] {
  const groups: StoryGroup[] = [];
  const byId = new Map<string, StoryGroup>();
  list.forEach((s, i) => {
    let g = byId.get(s.creator_id);
    if (!g) {
      g = { creatorId: s.creator_id, indices: [] };
      byId.set(s.creator_id, g);
      groups.push(g);
    }
    g.indices.push(i);
  });
  return groups;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

interface StoryViewerModalProps {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
  onStoriesChange: (stories: Story[]) => void;
  onDelete: (storyId: string) => Promise<boolean>;
}

export default function StoryViewerModal({
  stories, startIndex, onClose, onStoriesChange, onDelete,
}: StoryViewerModalProps) {
  const { user } = useAuth();

  const [list, setList] = useState<Story[]>(stories);
  const [index, setIndex] = useState(startIndex);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'views' | 'likes'>('views');
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [likers, setLikers] = useState<StoryLiker[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const nextRef = useRef<() => void>(() => {});
  const mediaKey = useRef(0);
  const closingRef = useRef(false);
  const closeTimer = useRef<number | null>(null);

  const current = list[index] || null;
  const groups = useMemo(() => buildGroups(list), [list]);
  const currentGroup = groups.find((g) => g.indices.includes(index)) || null;
  const isOwn = !!user && !!current && current.creator_id === user.id;
  const panelOpen = commentsOpen || insightsOpen;

  const sync = useCallback((nextList: Story[]) => {
    setList(nextList);
    onStoriesChange(nextList);
  }, [onStoriesChange]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => onClose(), CLOSE_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const goTo = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= list.length) {
      requestClose();
      return;
    }
    setCommentsOpen(false);
    setInsightsOpen(false);
    setIndex(nextIndex);
  }, [list.length, requestClose]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  nextRef.current = next;

  const removeStory = useCallback((id: string) => {
    const removedIdx = list.findIndex((s) => s.id === id);
    const updated = list.filter((s) => s.id !== id);
    if (updated.length === 0) {
      sync(updated);
      requestClose();
      return;
    }
    sync(updated);
    setIndex(Math.min(removedIdx, updated.length - 1));
  }, [list, sync, requestClose]);

  // Reset per-story UI state when the displayed story changes.
  useEffect(() => {
    if (!current) return;
    setLiked(current.is_liked_by_user);
    setLikeCount(current.like_count);
    setCommentCount(current.comment_count);
    setViewCount(current.view_count);
    setComments([]);
    setViewers([]);
    setLikers([]);
    mediaKey.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Record a view when a story becomes active. Backend is idempotent per user.
  useEffect(() => {
    if (!current) return;
    const storyId = current.id;
    storyService.view(storyId)
      .then((res) => {
        const data = res.data?.data;
        if (data && typeof data.view_count === 'number') {
          setViewCount(data.view_count);
          sync(list.map((s) => (
            s.id === storyId ? { ...s, view_count: data.view_count } : s
          )));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Auto-advance images after the story duration (paused while panels are open).
  useEffect(() => {
    if (!current || current.media_type === 'video') return;
    if (panelOpen) return;
    const t = setTimeout(() => nextRef.current(), STORY_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id, current?.media_type, panelOpen]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (commentsOpen) setCommentsOpen(false);
        else if (insightsOpen) setInsightsOpen(false);
        else requestClose();
        return;
      }
      if (panelOpen) return;
      if (e.key === 'ArrowRight') nextRef.current();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [commentsOpen, insightsOpen, panelOpen, prev, requestClose]);

  const handleLike = async () => {
    if (!current) return;
    const wasLiked = liked;
    const delta = wasLiked ? -1 : 1;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + delta));
    try {
      const res = wasLiked
        ? await storyService.unlike(current.id)
        : await storyService.like(current.id);
      const { liked: nextLiked, like_count } = res.data.data;
      setLiked(nextLiked);
      setLikeCount(like_count);
      sync(list.map((s) => (
        s.id === current.id ? { ...s, is_liked_by_user: nextLiked, like_count } : s
      )));
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c - delta));
      if ((err as any)?.response?.status === 410) {
        toast.error('This story has expired');
        removeStory(current.id);
      } else {
        toast.error(getApiError(err) || 'Could not update like');
      }
    }
  };

  const loadComments = async (storyId: string) => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const res = await storyService.getComments(storyId, { page: 1, page_size: 50 });
      setComments(res.data?.data || []);
    } catch (err) {
      if ((err as any)?.response?.status === 410) {
        toast.error('This story has expired');
        removeStory(storyId);
      }
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    if (insightsOpen) setInsightsOpen(false);
    const open = !commentsOpen;
    setCommentsOpen(open);
    if (open && current) loadComments(current.id);
  };

  const openInsights = async () => {
    if (!current || !isOwn) return;
    setCommentsOpen(false);
    setInsightsOpen(true);
    setInsightsTab('views');
    setInsightsLoading(true);
    try {
      const [viewsRes, likesRes] = await Promise.all([
        storyService.getViewers(current.id),
        storyService.getLikers(current.id),
      ]);
      setViewers(viewsRes.data?.data?.viewers || []);
      setLikers(likesRes.data?.data?.likers || []);
    } catch (err) {
      toast.error(getApiError(err) || 'Could not load insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    const content = commentText.trim();
    if (!content || !current || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const res = await storyService.addComment(current.id, { content });
      const comment = res.data?.data as StoryComment;
      setComments((prev) => [comment, ...prev]);
      setCommentText('');
      const updatedCount = commentCount + 1;
      setCommentCount(updatedCount);
      sync(list.map((s) => (
        s.id === current.id ? { ...s, comment_count: updatedCount } : s
      )));
    } catch (err) {
      if ((err as any)?.response?.status === 410) {
        toast.error('This story has expired');
        removeStory(current.id);
      } else {
        toast.error(getApiError(err) || 'Could not add comment');
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    if (!window.confirm('Delete this story?')) return;
    const ok = await onDelete(current.id);
    if (ok) removeStory(current.id);
  };

  const handleStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (commentsOpen) return;
    if (insightsOpen) {
      setInsightsOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) prev();
    else next();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommentSubmit();
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-viewer-backdrop bg-black/70 backdrop-blur-sm"
        onClick={requestClose}
      />

      {/* Card */}
      <div
        className={cn(
          'relative flex h-[82dvh] max-h-[880px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10',
          closing ? 'animate-viewer-out' : 'animate-viewer-in'
        )}
      >
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
          {currentGroup?.indices.map((gi) => {
            const done = gi < index;
            const active = gi === index;
            return (
              <div key={gi} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                {done && <div className="h-full w-full bg-white" />}
                {active && (
                  <div
                    key={current.id}
                    className="h-full animate-story-progress bg-white"
                    style={panelOpen ? { animationPlayState: 'paused' } : undefined}
                    onAnimationEnd={() => next()}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 pb-8 pt-3 sm:px-4">
          <Avatar src={current.creator?.avatar_url} name={current.creator?.full_name || 'U'} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {current.creator?.full_name || 'User'}
            </p>
            <p className="text-xs text-white/60">
              {current.creator?.role ? ROLE_LABELS[current.creator.role] || current.creator.role : ''}
              {current.created_at ? ` · ${timeAgo(current.created_at)}` : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {isOwn && (
              <button
                onClick={handleDelete}
                className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Delete story"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={requestClose}
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Media stage */}
        <div className="absolute inset-0 z-10" onClick={handleStageClick}>
          {current.media_type === 'video' ? (
            <video
              key={mediaKey.current}
              src={current.media_url}
              poster={current.thumbnail_url || undefined}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onEnded={() => next()}
            />
          ) : (
            <img src={current.media_url} alt="Story" className="h-full w-full object-cover" />
          )}

          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
              aria-label="Previous story"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {index < list.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
              aria-label="Next story"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Caption */}
        {current.content && (
          <p className="pointer-events-none absolute inset-x-0 bottom-[76px] z-10 mx-auto max-w-sm px-6 text-center text-sm text-white">
            {current.content}
          </p>
        )}

        {/* Bottom actions */}
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-sm">
          {isOwn ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 text-white/90" title={`${viewCount} views`}>
                  <Eye className="h-5 w-5" />
                  <span className="text-sm font-medium">{formatCount(viewCount)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-white/90" title={`${likeCount} likes`}>
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-medium">{formatCount(likeCount)}</span>
                </span>
              </div>
              <button
                onClick={openInsights}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-[#8ecbff] transition-colors hover:bg-white/20"
                aria-label="View story insights"
              >
                <BarChart3 className="h-4 w-4" />
                Insights
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className={cn('flex items-center gap-1.5 text-white transition-colors', liked && 'text-[#ed4956]')}
                  aria-label={liked ? 'Unlike story' : 'Like story'}
                >
                  <Heart className={cn('h-6 w-6', liked && 'animate-like fill-current')} />
                  <span className="text-sm font-medium">{formatCount(likeCount)}</span>
                </button>
                <button
                  onClick={toggleComments}
                  className="flex items-center gap-1.5 text-white transition-colors"
                  aria-label="Comments"
                >
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-sm font-medium">{formatCount(commentCount)}</span>
                </button>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <input
                  value={commentText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment…"
                  className="w-full rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder-white/50 outline-none focus:bg-white/15"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || commentSubmitting}
                  className="rounded-full p-2 text-[#0095f6] transition-colors disabled:opacity-40"
                  aria-label="Send comment"
                >
                  {commentSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Insights panel */}
        {insightsOpen && (
          <div className="absolute inset-0 z-30 animate-slide-in-bottom">
            <div className="flex h-full flex-col bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Story insights</h3>
                <button
                  onClick={() => setInsightsOpen(false)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close insights"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setInsightsTab('views')}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-semibold transition-colors',
                    insightsTab === 'views'
                      ? 'border-b-2 border-[#0095f6] text-[#0095f6]'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  Views ({formatCount(viewers.length)})
                </button>
                <button
                  onClick={() => setInsightsTab('likes')}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-semibold transition-colors',
                    insightsTab === 'likes'
                      ? 'border-b-2 border-[#0095f6] text-[#0095f6]'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  Likes ({formatCount(likers.length)})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {insightsLoading ? (
                  <div className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : insightsTab === 'views' ? (
                  viewers.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">No views yet</p>
                  ) : (
                    <ul className="space-y-4">
                      {viewers.map((v) => (
                        <li key={v.user_id} className="flex items-center gap-3">
                          <Avatar src={v.avatar_url} name={v.full_name || 'U'} className="h-9 w-9" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {v.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {ROLE_LABELS[v.role] || v.role}
                              {v.viewed_at ? ` · ${timeAgo(v.viewed_at)}` : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : likers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">No likes yet</p>
                ) : (
                  <ul className="space-y-4">
                    {likers.map((l) => (
                      <li key={l.user_id} className="flex items-center gap-3">
                        <Avatar src={l.avatar_url} name={l.full_name || 'U'} className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {l.full_name || 'User'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {ROLE_LABELS[l.role] || l.role}
                            {l.liked_at ? ` · ${timeAgo(l.liked_at)}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comments panel */}
        {commentsOpen && (
          <div className="absolute inset-0 z-30 animate-slide-in-right">
            <div className="flex h-full flex-col bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Comments ({formatCount(commentCount)})
                </h3>
                <button
                  onClick={() => setCommentsOpen(false)}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close comments"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {commentsLoading && comments.length === 0 ? (
                  <div className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {comments.map((c) => (
                      <li key={c.id} className="flex gap-3">
                        <Avatar src={c.author?.avatar_url} name={c.author?.full_name || 'U'} className="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {c.author?.full_name || 'User'}
                            </span>{' '}
                            <span className="text-gray-700 dark:text-gray-300">{c.content}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{timeAgo(c.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                <input
                  value={commentText}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment…"
                  className="input flex-1"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || commentSubmitting}
                  className="rounded-xl bg-[#0095f6] p-2.5 text-white transition-colors disabled:opacity-40"
                  aria-label="Send comment"
                >
                  {commentSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
