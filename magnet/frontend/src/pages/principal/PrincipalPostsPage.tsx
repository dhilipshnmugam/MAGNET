import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, ArrowLeft, Search, Heart, MessageCircle, ChevronLeft,
  ChevronRight, Loader2, Calendar,
} from 'lucide-react';
import { analyticsService, PrincipalPost } from '../../services/analyticsService';
import { postService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import PostDetailModal from '../../components/profile/PostDetailModal';
import { useDebounce } from '../../hooks';
import { timeAgo } from '../../utils/helpers';
import type { Post } from '../../types';

const PAGE_SIZE = 15;

export default function PrincipalPostsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<PrincipalPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getPrincipalPosts({
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setPosts(res.data.data.items || []);
      setTotal(res.data.data.total || 0);
    } catch {
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openPost = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await postService.getById(id);
      setSelectedPost(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setOpeningId(null);
    }
  };

  const openProfile = (id: string) => {
    navigate(`/profile/${id}`, { state: { back: location.pathname } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <FileText className="h-6 w-6 text-cyan-600" />
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-sm text-gray-500">Monitor approved posts across campus</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <FileText className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Posts</p>
              <p className="text-2xl font-bold">{total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Heart className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Likes (this page)</p>
              <p className="text-2xl font-bold">{posts.reduce((s, p) => s + p.like_count, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Comments (this page)</p>
              <p className="text-2xl font-bold">{posts.reduce((s, p) => s + p.comment_count, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts by content..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-gray-400" />}
          title="No posts found"
          description="Try adjusting your search."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="pb-3 text-left font-medium text-gray-500">Post</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Author</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Source</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Likes</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Comments</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Posted</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openPost(p.id)}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    <td className="max-w-[320px] py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                            <FileText className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-gray-800 dark:text-gray-100">{p.content || '(No content)'}</p>
                          <p className="text-xs text-gray-500">{p.post_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openProfile(p.author.id); }}
                        className="flex items-center gap-2 text-left hover:underline"
                      >
                        <Avatar src={p.author.avatar_url} name={p.author.full_name} size="sm" />
                        <span className="font-medium text-gray-900 dark:text-white">{p.author.full_name}</span>
                      </button>
                    </td>
                    <td className="py-3 text-xs text-gray-500">{p.club_name || p.department_name || '—'}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-rose-500">
                        <Heart className="h-3.5 w-3.5" /> {p.like_count}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-blue-500">
                        <MessageCircle className="h-3.5 w-3.5" /> {p.comment_count}
                      </span>
                    </td>
                    <td className="py-3 text-right text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {p.created_at ? timeAgo(p.created_at) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {openingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-gray-600 shadow-lg dark:bg-gray-800 dark:text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading post...
          </div>
        </div>
      )}
    </div>
  );
}
