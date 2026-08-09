import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubManagementService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Search, Filter, Users, Globe, Trophy, Eye, ArrowLeft, X } from 'lucide-react';

const CATEGORIES = [
  'All Clubs', 'Technology', 'Sports', 'Cultural', 'Literary',
  'Social Service', 'Entrepreneurship', 'Research', 'Innovation', 'Other',
];

const CLUB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'literary', label: 'Literary' },
  { value: 'social', label: 'Social Service' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently Created' },
  { value: 'popular', label: 'Most Active' },
];

const CLUB_TYPE_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cultural: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  sports: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  literary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  social: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function StudentClubsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Clubs');
  const [clubType, setClubType] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [joinModalClub, setJoinModalClub] = useState<any>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    import('../services').then(({ departmentService }) => {
      departmentService.list({ page_size: 100 }).then((res) => setDepartments(res.data.data || [])).catch(() => {});
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (category !== 'All Clubs') params.category = category;
    if (clubType) params.club_type = clubType;
    if (departmentId) params.department_id = departmentId;

    clubManagementService.list(params).then((res) => {
      let data = res.data.data || [];
      if (sortBy === 'popular') {
        data = [...data].sort((a: any, b: any) => (b.member_count || 0) - (a.member_count || 0));
      }
      setClubs(data);
      setTotal(res.data.total || 0);
    }).catch(() => toast.error('Failed to load clubs'))
      .finally(() => setLoading(false));
  }, [search, category, clubType, departmentId, sortBy, page]);

  const handleJoin = async () => {
    if (!joinModalClub) return;
    setJoining(true);
    try {
      await clubManagementService.join(joinModalClub.id, joinMessage || undefined);
      toast.success('Join request submitted!');
      setJoinModalClub(null);
      setJoinMessage('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to join club';
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  };

  const activeFilterCount = [category !== 'All Clubs', !!clubType, !!departmentId].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-7 w-7 text-sky-500" />
          <h1 className="text-2xl font-bold">Clubs</h1>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'super_admin' && (
            <button onClick={() => navigate('/super-admin/clubs/create')}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
              + Create Club
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3.5">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${showFilters ? 'border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Club Type</label>
              <select value={clubType} onChange={(e) => { setClubType(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                {CLUB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Department</label>
              <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                <option value="">All Departments</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setClubType(''); setDepartmentId(''); setCategory('All Clubs'); setPage(1); }}
              className="mt-3 text-xs text-sky-500 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Club Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="py-20 text-center">
          <Globe className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-gray-500">No clubs found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <div key={club.id} className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              {/* Image container */}
              <div className="relative h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br from-sky-400 to-blue-600">
                {club.banner_url && (
                  <img src={club.banner_url} alt={`${club.name} banner`} className="h-full w-full object-cover" />
                )}
                {club.club_type && (
                  <span className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${CLUB_TYPE_COLORS[club.club_type] || CLUB_TYPE_COLORS.other}`}>
                    {club.club_type}
                  </span>
                )}
              </div>
              {/* Content container */}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {club.icon_url ? (
                      <img src={club.icon_url} alt={`${club.name} logo`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-sky-100 text-xl font-bold text-sky-600">
                        {club.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold leading-tight">{club.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{club.club_code}</p>
                  </div>
                </div>
                {club.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{club.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {club.category && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.category}</span>
                  )}
                  {club.domain && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.domain}</span>
                  )}
                  {club.department_name && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.department_name}</span>
                  )}
                </div>
                <div className="mt-3 flex min-w-0 items-center gap-4 text-xs text-gray-500">
                  <span className="flex shrink-0 items-center gap-1"><Users className="h-3.5 w-3.5" /> {club.member_count || 0} members</span>
                  {club.faculty_coordinator_name && (
                    <span className="flex min-w-0 items-center gap-1 truncate"><Trophy className="h-3.5 w-3.5 shrink-0" /> {club.faculty_coordinator_name}</span>
                  )}
                </div>
                {/* Actions pinned to the bottom of every card */}
                <div className="mt-auto flex gap-2 pt-4">
                  <button onClick={() => navigate(`/clubs/${club.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                    <Eye className="h-4 w-4" /> View
                  </button>
                  <button onClick={() => setJoinModalClub(club)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600">
                    Join
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-700">
            Previous
          </button>
          <span className="flex items-center px-4 text-sm text-gray-500">Page {page} of {Math.ceil(total / pageSize)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= total}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-40 dark:border-gray-700">
            Next
          </button>
        </div>
      )}

      {/* Join Modal */}
      {joinModalClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setJoinModalClub(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Join {joinModalClub.name}</h3>
              <button onClick={() => setJoinModalClub(null)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-1 text-sm text-gray-500">
              {joinModalClub.approval_mode === 'auto'
                ? 'This club auto-approves members. You will be added immediately.'
                : 'Your request will be sent to the club admin for approval.'}
            </p>
            <textarea
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Why do you want to join? (optional)"
              rows={3}
              className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setJoinModalClub(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700">
                Cancel
              </button>
              <button onClick={handleJoin} disabled={joining}
                className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                {joining ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
