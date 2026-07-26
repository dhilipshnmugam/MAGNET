import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { Users, Search, Trash2, Shield, ShieldCheck } from 'lucide-react';

const ROLES = ['student', 'department_admin', 'super_admin', 'club_admin', 'principal'];

export default function ManageUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    try {
      const res = await adminService.listUsers({ search, role: roleFilter, page, page_size: 10 });
      const data = res.data.data;
      setUsers(Array.isArray(data) ? data : data?.users || []);
      setTotalPages(data?.total_pages || 1);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);
  useEffect(() => { setPage(1); fetchUsers(); }, [search, roleFilter]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await adminService.changeRole(userId, role);
      toast.success('Role updated');
      fetchUsers();
    } catch { toast.error('Failed to update role'); }
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await adminService.changeStatus(userId, !isActive);
      toast.success('Status updated');
      fetchUsers();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Department</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                        {u.full_name?.charAt(0)}
                      </div>
                      <span className="font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.is_active !== false
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {u.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.department_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleStatusToggle(u.id, u.is_active !== false)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 dark:hover:bg-gray-800"
                        title={u.is_active !== false ? 'Disable' : 'Enable'}>
                        {u.is_active !== false ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(u.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
