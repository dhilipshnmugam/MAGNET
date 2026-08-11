import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, Users, GraduationCap, Activity, FileText, Calendar, Trophy,
  ArrowLeft, Search, Crown, Mail, Loader2, Play, Heart, MessageCircle,
  Layers, Image as ImageIcon, Award,
} from 'lucide-react';
import { analyticsService, PrincipalDepartmentDetails } from '../../services/analyticsService';
import { departmentService, eventService, clubManagementService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import { ChartCard, SimpleAreaChart, SimpleBarChart } from '../../components/charts';
import Avatar from '../../components/common/Avatar';
import EventCard from '../../components/events/EventCard';
import PostDetailModal from '../../components/profile/PostDetailModal';
import EmptyState from '../../components/common/EmptyState';
import { useDebounce } from '../../hooks';
import { cn } from '../../utils/helpers';
import type { Post, Event, Club } from '../../types';

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  student: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: 'Student' },
  department_admin: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Faculty' },
  super_admin: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Admin' },
  club_admin: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Club Admin' },
  principal: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Principal' },
};

interface DeptUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
  year: string | null;
  register_number: string | null;
  department_id: string | null;
  points: number;
  last_seen_at: string | null;
  created_at: string | null;
}

const MEMBER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'student', label: 'Students' },
  { value: 'department_admin', label: 'Faculty' },
];

type DeptView = 'overview' | 'students' | 'faculty' | 'active' | 'posts' | 'events' | 'clubs' | 'members' | 'points';

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ---------- Posts: Instagram-style compact grid ---------- */

function PostTile({ post, onClick }: { post: Post; onClick: () => void }) {
  const images = post.media.filter((m) => m.media_type === 'image');
  const videos = post.media.filter((m) => m.media_type === 'video');
  const cover =
    images[0] ||
    (post.image_url ? { media_url: post.image_url, thumbnail_url: null } : null) ||
    videos[0] ||
    (post.video_url ? { media_url: post.video_url, thumbnail_url: null } : null);
  const hasVideo = videos.length > 0 || Boolean(post.video_url);
  const multi = images.length > 1;
  const hasMedia = cover != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095f6] dark:bg-gray-800"
    >
      {hasMedia ? (
        <img
          src={(cover as any).thumbnail_url || cover!.media_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2">
          <p className="line-clamp-4 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {post.content}
          </p>
        </div>
      )}

      {!hasMedia && post.post_type === 'achievement' && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 p-1.5 text-white">
          <Award className="h-3.5 w-3.5" />
        </span>
      )}
      {!hasMedia && post.post_type === 'general' && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/30 p-1.5 text-white">
          <ImageIcon className="h-3.5 w-3.5" />
        </span>
      )}
      {(hasVideo || multi) && (
        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/50 p-1.5 text-white">
          {hasVideo && <Play className="h-3.5 w-3.5 fill-current" />}
          {multi && <Layers className="h-3.5 w-3.5" />}
        </span>
      )}

      <span className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Heart className="h-4 w-4 fill-white" /> {formatCount(post.like_count)}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4 fill-white" /> {formatCount(post.comment_count)}
        </span>
      </span>
    </button>
  );
}

function DepartmentPostsGrid({ departmentId }: { departmentId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);

  const load = useCallback((p: number, reset: boolean) => {
    if (!departmentId) return;
    setLoading(true);
    departmentService.getPosts(departmentId, { page: p, page_size: 12 })
      .then((res) => {
        const items = res.data.data || [];
        setPosts((prev) => (reset ? items : [...prev, ...items]));
        setTotal(res.data.total || 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departmentId]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const hasMore = page * 12 < total;

  return (
    <div>
      {posts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostTile key={post.id} post={post} onClick={() => setActivePost(post)} />
          ))}
        </div>
      )}
      {posts.length === 0 && !loading && (
        <div className="card">
          <EmptyState
            icon={<ImageIcon className="h-12 w-12" />}
            title="No posts yet"
            description="Posts from department members will appear here."
          />
        </div>
      )}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => load(page + 1, false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more posts'}
          </button>
        </div>
      )}
      {activePost && (
        <PostDetailModal post={activePost} onClose={() => setActivePost(null)} />
      )}
    </div>
  );
}

/* ---------- Department members list ---------- */

function UserListSection({
  departmentId, role, active = false, searchable = true, showTabs = false, title, subtitle,
}: {
  departmentId: string;
  role: string;
  active?: boolean;
  searchable?: boolean;
  showTabs?: boolean;
  title: string;
  subtitle?: string;
}) {
  const [members, setMembers] = useState<DeptUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState(role);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback((p: number, reset: boolean) => {
    if (!departmentId) return;
    setLoading(true);
    departmentService.getUsers(departmentId, {
      role: roleFilter,
      search: debouncedSearch || undefined,
      active: active || undefined,
      page: p,
      page_size: 10,
    })
      .then((res) => {
        const items = res.data.data || [];
        setMembers((prev) => (reset ? items : [...prev, ...items]));
        setTotal(res.data.total || 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departmentId, roleFilter, debouncedSearch, active]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const hasMore = page * 10 < total;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle || `${total} members`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showTabs && (
            <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {MEMBER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setRoleFilter(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                    roleFilter === tab.value
                      ? 'bg-white text-sky-600 shadow-sm dark:bg-gray-700 dark:text-sky-400'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="w-44 rounded-lg border border-gray-200 bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400 dark:border-gray-700"
              />
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((m) => {
          const badge = ROLE_BADGE[m.role] || ROLE_BADGE.student;
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.full_name}</p>
                <p className="truncate text-xs text-gray-400">
                  {m.register_number || m.email}
                  {m.year ? ` • ${m.year}` : ''}
                </p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', badge.bg, badge.text)}>
                {badge.label}
              </span>
              <span className="shrink-0 text-sm font-bold text-sky-600">{m.points} pts</span>
            </div>
          );
        })}
      </div>

      {members.length === 0 && !loading && (
        <div className="py-10 text-center text-sm text-gray-400">No members found</div>
      )}

      {hasMore && (
        <div className="flex justify-center border-t border-gray-100 p-3 dark:border-gray-800">
          <button
            onClick={() => load(page + 1, false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more members'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Department events ---------- */

function EventsSection({ departmentId }: { departmentId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback((p: number, reset: boolean) => {
    if (!departmentId) return;
    setLoading(true);
    eventService.list({ department_id: departmentId, page: p, page_size: 6 })
      .then((res) => {
        const items = res.data.data || [];
        setEvents((prev) => (reset ? items : [...prev, ...items]));
        setTotal(res.data.total || 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departmentId]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const hasMore = page * 6 < total;

  return (
    <div>
      {events.length === 0 && !loading ? (
        <div className="card">
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="No events yet"
            description="Events organized by this department will appear here."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => load(page + 1, false)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more events'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Department clubs ---------- */

function ClubsSection({ departmentId }: { departmentId: string }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentId) return;
    setLoading(true);
    clubManagementService.getDepartmentClubs(departmentId)
      .then((res) => setClubs((res.data?.data as Club[]) || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departmentId]);

  return (
    <div>
      {clubs.length === 0 && !loading ? (
        <div className="card">
          <EmptyState
            icon={<Building2 className="h-12 w-12" />}
            title="No clubs yet"
            description="Clubs belonging to this department will appear here."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <div key={club.id} className="card group overflow-hidden">
              <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600">
                {club.banner_url ? (
                  <img src={club.banner_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-10 w-10 text-white/70" />
                  </div>
                )}
                <div className="absolute -bottom-4 left-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-gray-200 dark:bg-gray-800">
                  {club.icon_url ? (
                    <img src={club.icon_url} alt={club.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-sky-600" />
                  )}
                </div>
              </div>
              <div className="p-4 pt-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-bold">{club.name}</h3>
                  {club.category && <span className="badge shrink-0">{club.category}</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{club.description || club.club_code}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {club.member_count} members
                  </span>
                  {club.faculty_coordinator_name && <span className="truncate">{club.faculty_coordinator_name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Top students ---------- */

function TopStudentsSection({ students }: { students: PrincipalDepartmentDetails['top_students'] }) {
  if (students.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No students with points yet</p>;
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {students.map((s) => (
        <div key={s.user_id} className="flex items-center gap-3 py-3">
          <span className={cn(
            'w-6 text-center text-sm font-bold',
            s.rank === 1 ? 'text-yellow-500' : s.rank === 2 ? 'text-gray-400' : s.rank === 3 ? 'text-amber-700' : 'text-gray-400'
          )}>
            {s.rank}
          </span>
          <Avatar src={s.avatar} name={s.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.name}</p>
            {s.register_number && <p className="truncate text-xs text-gray-400">{s.register_number}</p>}
          </div>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            {s.points} pts
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Main page ---------- */

export default function PrincipalDepartmentDetailsPage() {
  const { departmentId } = useParams<{ departmentId: string }>();

  const [details, setDetails] = useState<PrincipalDepartmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<DeptView>('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!departmentId) return;
    analyticsService.getPrincipalDepartmentDetails(departmentId)
      .then((res) => setDetails(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [departmentId]);

  const goTo = (next: DeptView) => {
    setView(next);
    window.setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (loading) return <PageLoader />;

  if (notFound || !details) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/principal/departments" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Department Details</h1>
        </div>
        <div className="card">
          <EmptyState icon={<Building2 className="h-12 w-12" />} title="Department not found" description="The department may have been removed or the link is invalid." />
        </div>
      </div>
    );
  }

  const dept = details.department;
  const activityData = details.activity_trend || [];
  const postsOverTime = details.posts_over_time || [];
  const topStudents = details.top_students || [];

  const stats: Array<{
    label: string;
    view: DeptView;
    value: string | number;
    icon: React.ReactNode;
    bg: string;
    text: string;
  }> = [
    { label: 'Students', view: 'students', value: dept.students, icon: <Users className="h-5 w-5" />, bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600' },
    { label: 'Faculty', view: 'faculty', value: dept.faculty_count, icon: <GraduationCap className="h-5 w-5" />, bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600' },
    { label: 'Active (30d)', view: 'active', value: dept.active_users, icon: <Activity className="h-5 w-5" />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600' },
    { label: 'Posts', view: 'posts', value: dept.posts, icon: <FileText className="h-5 w-5" />, bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600' },
    { label: 'Events', view: 'events', value: dept.events, icon: <Calendar className="h-5 w-5" />, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600' },
    { label: 'Clubs', view: 'clubs', value: dept.clubs, icon: <Building2 className="h-5 w-5" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600' },
    { label: 'Members', view: 'members', value: dept.total_users, icon: <Users className="h-5 w-5" />, bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600' },
    { label: 'Points', view: 'points', value: dept.total_points, icon: <Trophy className="h-5 w-5" />, bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600' },
  ];

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/principal/departments" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 text-lg font-bold text-sky-600">
          {dept.code?.charAt(0) || 'D'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{dept.name}</h1>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              {dept.code}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            {dept.department_type && <span>{dept.department_type}</span>}
            {dept.head_name && (
              <span className="inline-flex items-center gap-1">
                <Crown className="h-3.5 w-3.5 text-amber-500" /> {dept.head_name}
              </span>
            )}
          </div>
          {dept.head_email && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-400">
              <Mail className="h-3 w-3" /> {dept.head_email}
            </p>
          )}
        </div>
      </div>

      {dept.description && (
        <p className="text-sm text-gray-500">{dept.description}</p>
      )}

      {/* Clickable Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => goTo(s.view)}
            className={cn(
              'card cursor-pointer p-4 text-left transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-lg',
              view === s.view ? 'ring-2 ring-sky-400/70 shadow-lg' : 'hover:border-sky-300 dark:hover:border-sky-600'
            )}
          >
            <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', s.bg, s.text)}>
              {s.icon}
            </div>
            <p className="mt-2 text-xl font-bold">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Section content */}
      {view === 'overview' && (
        <>
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Activity Trend" subtitle="Daily activities from department members (30 days)">
              {activityData.length > 0 ? (
                <SimpleAreaChart
                  data={activityData}
                  xKey="day"
                  areas={[
                    { key: 'activities', color: '#0ea5e9', name: 'Activities' },
                    { key: 'points', color: '#f59e0b', name: 'Points' },
                  ]}
                  height={280}
                />
              ) : (
                <div className="flex h-[280px] items-center justify-center text-gray-400">No activity data</div>
              )}
            </ChartCard>

            <ChartCard title="Posts Over Time" subtitle="Monthly post volume (6 months)">
              {postsOverTime.length > 0 ? (
                <SimpleBarChart
                  data={postsOverTime}
                  xKey="month"
                  yKey="posts"
                  color="#0ea5e9"
                  height={280}
                />
              ) : (
                <div className="flex h-[280px] items-center justify-center text-gray-400">No post data</div>
              )}
            </ChartCard>
          </div>

          {/* Top Students */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold">Top Students</h2>
            </div>
            <TopStudentsSection students={topStudents} />
          </div>

          {/* Members */}
          <UserListSection
            departmentId={departmentId!}
            role="all"
            showTabs
            title="Department Members"
          />

          {/* Posts */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent Posts</h2>
              <span className="text-xs text-gray-500">{dept.posts} posts</span>
            </div>
            <DepartmentPostsGrid departmentId={departmentId!} />
          </div>
        </>
      )}

      {view === 'students' && (
        <>
          <SectionHeader title="Students" subtitle="All student members of this department" onBack={() => goTo('overview')} />
          <UserListSection departmentId={departmentId!} role="student" title="Students" subtitle={`${dept.students} students`} />
        </>
      )}

      {view === 'faculty' && (
        <>
          <SectionHeader title="Faculty" subtitle="Faculty members of this department" onBack={() => goTo('overview')} />
          <UserListSection departmentId={departmentId!} role="department_admin" title="Faculty" subtitle={`${dept.faculty_count} faculty`} />
        </>
      )}

      {view === 'active' && (
        <>
          <SectionHeader title="Active Members (30d)" subtitle="Members active in the last 30 days" onBack={() => goTo('overview')} />
          <UserListSection departmentId={departmentId!} role="all" active title="Active Members" subtitle={`${dept.active_users} active in 30 days`} />
        </>
      )}

      {view === 'members' && (
        <>
          <SectionHeader title="All Members" subtitle="Every member of this department" onBack={() => goTo('overview')} />
          <UserListSection departmentId={departmentId!} role="all" showTabs title="Department Members" />
        </>
      )}

      {view === 'posts' && (
        <>
          <SectionHeader title="Posts" subtitle={`${dept.posts} posts from department members`} onBack={() => goTo('overview')} />
          <DepartmentPostsGrid departmentId={departmentId!} />
        </>
      )}

      {view === 'events' && (
        <>
          <SectionHeader title="Events" subtitle="Events organized by this department" onBack={() => goTo('overview')} />
          <EventsSection departmentId={departmentId!} />
        </>
      )}

      {view === 'clubs' && (
        <>
          <SectionHeader title="Clubs" subtitle={`${dept.clubs} clubs in this department`} onBack={() => goTo('overview')} />
          <ClubsSection departmentId={departmentId!} />
        </>
      )}

      {view === 'points' && (
        <>
          <SectionHeader title="Points" subtitle="Department point leaderboard" onBack={() => goTo('overview')} />
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h2 className="font-semibold">Points Leaderboard</h2>
              </div>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                {dept.total_points.toLocaleString()} total pts
              </span>
            </div>
            <TopStudentsSection students={topStudents} />
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Back to overview"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
