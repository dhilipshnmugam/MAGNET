import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clubManagementService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { Plus, Search, Trophy, Users, Eye, Edit2, Trash2, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

const DOMAINS: Record<string, string[]> = {
  Technology: ['AI', 'ML', 'Data Science', 'Cyber Security', 'Web Dev', 'App Dev', 'Robotics', 'Cloud Computing'],
  Sports: ['Cricket', 'Football', 'Volleyball', 'Basketball', 'Athletics', 'Chess', 'Kabaddi', 'Badminton'],
  Cultural: ['Dance', 'Music', 'Drama', 'Photography', 'Fine Arts'],
  Literary: ['Readers Club', 'Writers Club', 'Debate Club', 'Tamil Mandram', 'English Literary Club'],
  'Social Service': ['NSS', 'NCC', 'Youth Red Cross', 'Environmental Club'],
  Entrepreneurship: ['Startup Club', 'Innovation Club', 'Entrepreneurship Cell'],
  Other: ['Custom Domain'],
};

const ALL_DOMAINS = Object.values(DOMAINS).flat();

export default function ManageClubsPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchClubs = async () => {
    try {
      const res = await clubManagementService.list({ search, domain, status, page, page_size: 10 });
      setClubs(res.data.data?.clubs || res.data.data || []);
      setTotalPages(res.data.data?.total_pages || 1);
    } catch {
      toast.error('Failed to load clubs');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await clubManagementService.getStats();
      setStats(res.data.data);
    } catch {}
  };

  useEffect(() => {
    Promise.all([fetchClubs(), fetchStats()]).then(() => setLoading(false));
  }, [page]);

  useEffect(() => { setPage(1); fetchClubs(); }, [search, domain, status]);

  const handleToggle = async (id: string) => {
    try {
      await clubManagementService.toggleStatus(id);
      toast.success('Club status updated');
      fetchClubs();
      fetchStats();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this club?')) return;
    try {
      await clubManagementService.delete(id);
      toast.success('Club deleted');
      fetchClubs();
      fetchStats();
    } catch {
      toast.error('Failed to delete club');
    }
  };

  if (loading) return <PageLoader />;

  const statCards = [
    { label: 'Total Clubs', value: stats?.total_clubs ?? 0, color: 'bg-sky-500' },
    { label: 'Active Clubs', value: stats?.active_clubs ?? 0, color: 'bg-green-500' },
    { label: 'Inactive Clubs', value: stats?.inactive_clubs ?? 0, color: 'bg-red-500' },
    { label: 'Total Members', value: stats?.total_members ?? 0, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-sky-500" />
          <h1 className="text-2xl font-bold">Club Management</h1>
        </div>
        <Link to="/super-admin/clubs/create" className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> Create Club
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">All Domains</option>
          {ALL_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Club</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Domain</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Club Admin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Faculty Coord.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Members</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clubs.map((club) => (
                <tr key={club.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        {club.logo_url ? (
                          <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-sky-500">
                            {club.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{club.name}</p>
                        <p className="text-xs text-gray-400">{club.club_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{club.domain}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{club.club_admin_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{club.faculty_coordinator_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5" /> {club.member_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      club.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {club.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/super-admin/clubs/${club.id}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-500 dark:hover:bg-gray-800">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link to={`/super-admin/clubs/${club.id}?edit=true`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-500 dark:hover:bg-gray-800">
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleToggle(club.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 dark:hover:bg-gray-800">
                        <Zap className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(club.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No clubs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
