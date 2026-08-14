import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Users, GraduationCap, Briefcase, ArrowLeft, Search,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { analyticsService, PrincipalUser } from '../../services/analyticsService';
import { PageLoader } from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import { useDebounce } from '../../hooks';
import { cn, timeAgo } from '../../utils/helpers';

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  student: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: 'Student' },
  department_admin: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Faculty' },
  super_admin: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Admin' },
  club_admin: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Club Admin' },
  principal: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Principal' },
  hod: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', label: 'HOD' },
};

const TABS = [
  { key: 'all', label: 'All Users', icon: Users, to: '/principal/users' },
  { key: 'student', label: 'Students', icon: GraduationCap, to: '/principal/students' },
  { key: 'department_admin', label: 'Faculty', icon: Briefcase, to: '/principal/faculty' },
];

const PAGE_SIZE = 15;

interface Props {
  role: string;
  title: string;
  subtitle: string;
}

export default function PrincipalUsersPage({ role, title, subtitle }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<PrincipalUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 350);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getPrincipalUsers(role, {
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setUsers(res.data.data.items || []);
      setTotal(res.data.data.total || 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [role, debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [role, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openProfile = (id: string) => {
    navigate(`/profile/${id}`, { state: { back: location.pathname } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Users className="h-6 w-6 text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={t.to}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                role === t.key
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          ))}
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString()} users</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or register number..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 text-gray-400" />}
          title="No users found"
          description="Try adjusting your search or filter."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="pb-3 text-left font-medium text-gray-500">User</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Role</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Department</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Points</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Posts</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const badge = ROLE_BADGE[u.role] || ROLE_BADGE.student;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => openProfile(u.id)}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar_url} name={u.full_name} size="md" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                            <p className="truncate text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                        {!u.is_active && (
                          <span className="ml-1.5 text-xs text-red-500">(inactive)</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">{u.department_name || '—'}</td>
                      <td className="py-3 text-right font-semibold text-sky-600">{u.points.toLocaleString()}</td>
                      <td className="py-3 text-right">{u.post_count}</td>
                      <td className="py-3 text-right text-xs text-gray-500">
                        {u.last_seen_at ? timeAgo(u.last_seen_at) : 'Never'}
                      </td>
                    </tr>
                  );
                })}
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

      {loading && users.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Updating...
        </div>
      )}
    </div>
  );
}
