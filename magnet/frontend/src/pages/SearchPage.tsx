import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks';
import { searchService } from '../services';
import {
  Search as SearchIcon, Users, Building2, Club as ClubIcon, FileText,
  Heart, MessageCircle, MapPin, Calendar, X, TrendingUp,
} from 'lucide-react';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'people', label: 'People' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'departments', label: 'Departments' },
  { value: 'posts', label: 'Posts' },
] as const;

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  student: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  department_admin: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  super_admin: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  club_admin: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  principal: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
};

function UserCard({ result }: { result: any }) {
  const navigate = useNavigate();
  const badge = ROLE_BADGE[result.role] || ROLE_BADGE.student;
  return (
    <div
      onClick={() => navigate(`/profile/${result.id}`)}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
    >
      {result.avatar_url ? (
        <img src={result.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-bold text-white">
          {result.full_name?.charAt(0) || '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{result.full_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${badge.bg} ${badge.text}`}>
            {result.role?.replace(/_/g, ' ')}
          </span>
          {result.year && <span className="text-xs text-gray-400">Year {result.year}</span>}
        </div>
        {result.department_name && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{result.department_name}</p>
        )}
        {result.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{result.bio}</p>}
      </div>
    </div>
  );
}

function ClubCard({ result }: { result: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/clubs/${result.id}`)}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
    >
      {result.icon_url ? (
        <img src={result.icon_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-white">
          {result.name?.charAt(0) || '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{result.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {result.category && (
            <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300">
              {result.category}
            </span>
          )}
          <span className="text-xs text-gray-400">{result.member_count || 0} members</span>
        </div>
        {result.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{result.description}</p>
        )}
      </div>
    </div>
  );
}

function DepartmentCard({ result }: { result: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/departments/${result.id}`)}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 text-lg font-bold text-white">
        {result.name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{result.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300 font-mono">
            {result.code}
          </span>
          <span className="text-xs text-gray-400">{result.student_count || 0} students</span>
        </div>
        {result.hod_name && (
          <p className="text-xs text-gray-500 truncate mt-0.5">HOD: {result.hod_name}</p>
        )}
      </div>
    </div>
  );
}

function PostCard({ result }: { result: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/posts/${result.id}`)}
      className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-3 mb-2">
        {result.author_avatar ? (
          <img src={result.author_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
            {result.author_name?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{result.author_name || 'Unknown'}</p>
          {result.created_at && (
            <p className="text-xs text-gray-400">{new Date(result.created_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{result.content}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{result.like_count || 0}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{result.comment_count || 0}</span>
      </div>
    </div>
  );
}

function ResultSection({ title, icon: Icon, children, total, filterTab, onSeeAll }: {
  title: string; icon: any; children: React.ReactNode; total: number;
  filterTab: string; onSeeAll: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
          <span className="text-xs text-gray-400">({total})</span>
        </div>
        {total > 0 && (
          <button onClick={onSeeAll} className="text-xs text-sky-500 hover:underline">See all</button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const EMPTY_SUGGESTIONS = [
  { icon: TrendingUp, text: 'Try searching for departments like "CSE" or "ECE"' },
  { icon: Users, text: 'Search for people by name, email, or register number' },
  { icon: ClubIcon, text: 'Find clubs by name, category, or domain' },
  { icon: FileText, text: 'Search posts by content, hashtags, or title' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = searchParams.get('tab') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState(initialTab);
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 300);

  const isValidTab = (v: string): v is typeof FILTER_TABS[number]['value'] =>
    FILTER_TABS.some((t) => t.value === v);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && isValidTab(tab)) setFilterType(tab);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filterType]);

  const fetchResults = useCallback(async () => {
    if (!debouncedQuery) { setResults({}); return; }
    setLoading(true);
    try {
      const res = await searchService.search(debouncedQuery, filterType, page);
      setResults(res.data.data || {});
    } catch { setResults({}); } finally { setLoading(false); }
  }, [debouncedQuery, filterType, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleTabChange = (tab: string) => {
    setFilterType(tab);
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${tab}`, { replace: true });
  };

  const allData = results as Record<string, { data: any[]; total: number }>;
  const users = allData.users?.data || [];
  const clubs = allData.clubs?.data || [];
  const departments = allData.departments?.data || [];
  const posts = allData.posts?.data || [];
  const totalResults = (allData.users?.total || 0) + (allData.clubs?.total || 0) +
    (allData.departments?.total || 0) + (allData.posts?.total || 0);

  const renderAllResults = () => (
    <div className="space-y-6">
      {users.length > 0 && (
        <ResultSection title="People" icon={Users} total={allData.users?.total || 0}
          filterTab="people" onSeeAll={() => handleTabChange('people')}
        >
          {users.map((u: any) => <UserCard key={u.id} result={u} />)}
        </ResultSection>
      )}
      {clubs.length > 0 && (
        <ResultSection title="Clubs" icon={ClubIcon} total={allData.clubs?.total || 0}
          filterTab="clubs" onSeeAll={() => handleTabChange('clubs')}
        >
          {clubs.map((c: any) => <ClubCard key={c.id} result={c} />)}
        </ResultSection>
      )}
      {departments.length > 0 && (
        <ResultSection title="Departments" icon={Building2} total={allData.departments?.total || 0}
          filterTab="departments" onSeeAll={() => handleTabChange('departments')}
        >
          {departments.map((d: any) => <DepartmentCard key={d.id} result={d} />)}
        </ResultSection>
      )}
      {posts.length > 0 && (
        <ResultSection title="Posts" icon={FileText} total={allData.posts?.total || 0}
          filterTab="posts" onSeeAll={() => handleTabChange('posts')}
        >
          {posts.map((p: any) => <PostCard key={p.id} result={p} />)}
        </ResultSection>
      )}
    </div>
  );

  const renderFilteredResults = () => {
    switch (filterType) {
      case 'people':
        return users.map((u: any) => <UserCard key={u.id} result={u} />);
      case 'clubs':
        return clubs.map((c: any) => <ClubCard key={c.id} result={c} />);
      case 'departments':
        return departments.map((d: any) => <DepartmentCard key={d.id} result={d} />);
      case 'posts':
        return posts.map((p: any) => <PostCard key={p.id} result={p} />);
      default:
        return renderAllResults();
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Search input */}
      <div className="relative mb-5">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-12 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-700 dark:bg-gray-800/50"
          placeholder="Search people, clubs, departments, posts..."
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {query && (
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filterType === tab.value
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : debouncedQuery && totalResults === 0 ? (
        <div className="py-16 text-center">
          <SearchIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-lg font-medium text-gray-500">No results found</p>
          <p className="mt-1 text-sm text-gray-400">Try a different search term or filter</p>
        </div>
      ) : debouncedQuery ? (
        <>
          <p className="text-sm text-gray-500 mb-4">{totalResults} result{totalResults !== 1 ? 's' : ''}</p>
          {renderFilteredResults()}
        </>
      ) : (
        <div className="py-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Suggestions</h3>
            <div className="space-y-3">
              {EMPTY_SUGGESTIONS.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-500">
                  <s.icon className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
