import { useState, useEffect, useCallback } from 'react';
import { postService } from '../services';
import { Post, PostType, TrendingTag } from '../types';
import PostCard from '../components/feed/PostCard';
import StoriesBar from '../components/feed/StoriesBar';
import SuggestionsSidebar from '../components/feed/SuggestionsSidebar';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import {
  FileText, TrendingUp, Sparkles, Trophy, Calendar, BookOpen,
  Users, Briefcase, Lightbulb, Globe, Compass, Hash, Zap,
  BarChart3, ChevronRight,
} from 'lucide-react';
import { useInfiniteScroll } from '../hooks';
import { cn } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const FILTER_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Globe className="h-4 w-4" /> },
  { value: 'general', label: 'Posts', icon: <FileText className="h-4 w-4" /> },
  { value: 'achievement', label: 'Achievements', icon: <Trophy className="h-4 w-4" /> },
  { value: 'event', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
  { value: 'academic_resource', label: 'Resources', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'collaboration', label: 'Collabs', icon: <Users className="h-4 w-4" /> },
];

const AI_SUGGESTIONS = [
  { label: 'Trending in CS', icon: <TrendingUp className="h-4 w-4 text-red-500" />, color: 'bg-red-50 dark:bg-red-900/20' },
  { label: 'Popular This Week', icon: <Zap className="h-4 w-4 text-amber-500" />, color: 'bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Recommended for You', icon: <Sparkles className="h-4 w-4 text-purple-500" />, color: 'bg-purple-50 dark:bg-purple-900/20' },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);

  const fetchPosts = useCallback(async (pageNum: number, filter?: string) => {
    const currentFilter = filter || activeFilter;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: any = { page: pageNum, page_size: 20 };
      if (currentFilter !== 'all') {
        params.post_type = currentFilter;
      }
      const res = await postService.getFeed(params);
      const data = res.data;
      setPosts((prev) => (pageNum === 1 ? data.data : [...prev, ...data.data]));
      setHasNext(data.has_next);
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchPosts(1); }, []);

  // Real-time polling: refresh feed every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPosts(1);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  useEffect(() => {
    postService.getTrendingTags(8).then((res) => setTrendingTags(res.data.data || [])).catch(() => {});
  }, []);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPosts([]);
    setPage(1);
    setHasNext(true);
    fetchPosts(1, filter);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNext) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPosts(nextPage);
  }, [page, loadingMore, hasNext, fetchPosts]);

  const { lastElementRef } = useInfiniteScroll(loadMore, hasNext);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto flex max-w-[1100px] gap-8 px-4 py-6 lg:px-0">
      {/* Main Feed */}
      <div className="mx-auto w-full max-w-[540px] space-y-4 lg:mx-0">
        {/* Stories */}
        <StoriesBar />

        {/* Filter Tabs */}
        <div className="card p-1.5">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                  activeFilter === tab.value
                    ? 'bg-campus-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-12 w-12" />}
            title="No posts yet"
            description={activeFilter === 'all' ? "Be the first to share something!" : `No ${activeFilter.replace('_', ' ')} posts yet`}
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <div key={post.id} ref={i === posts.length - 1 ? lastElementRef : undefined}>
                <PostCard post={post} onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} />
              </div>
            ))}
            {loadingMore && (
              <div className="py-6 text-center">
                <div className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-gray-300 border-t-campus-500" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden w-[320px] flex-shrink-0 space-y-4 lg:block">
        {/* User Card */}
        <SuggestionsSidebar />

        {/* AI Recommendations */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Recommendations</h3>
          </div>
          <div className="space-y-2">
            {AI_SUGGESTIONS.map((suggestion, i) => (
              <button key={i} className={cn('flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-all hover:scale-[1.01]', suggestion.color)}>
                {suggestion.icon}
                <span className="flex-1 font-medium text-gray-700 dark:text-gray-300">{suggestion.label}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Trending Hashtags */}
        {trendingTags.length > 0 && (
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Trending</h3>
            </div>
            <div className="space-y-2">
              {trendingTags.map((tag, i) => (
                <button key={i} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-campus-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tag.tag}</span>
                  </div>
                  <span className="text-xs text-gray-400">{tag.post_count} posts</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-2 text-[11px] text-gray-400 dark:text-gray-600">
          <p>Magnet Campus Platform</p>
          <p className="mt-1">Terms · Privacy · Help · About</p>
        </div>
      </div>
    </div>
  );
}
