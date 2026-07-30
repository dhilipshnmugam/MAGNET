import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { departmentService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { Building2, Plus, Search, Trash2, ShieldCheck, Users } from 'lucide-react';
import type { Department } from '../../types';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.list({ search: search || undefined, status: statusFilter || undefined, page, page_size: pageSize });
      setDepartments(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); fetchDepartments(); }, [search, statusFilter, page]);

  const handleToggle = async (id: string) => {
    try {
      await departmentService.toggleStatus(id);
      toast.success('Status updated');
      fetchDepartments();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department? This will also remove the HOD account.')) return;
    try {
      await departmentService.delete(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-sky-500" />
          <h1 className="text-2xl font-bold">Departments</h1>
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{total}</span>
        </div>
        <Link to="/super-admin/departments/create" className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> Create Department
        </Link>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search departments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">HOD</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Students</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium">{dept.name}</td>
                <td className="px-4 py-3 text-gray-500">{dept.code}</td>
                <td className="px-4 py-3 text-gray-500">{dept.department_type || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{dept.hod_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Users className="h-3.5 w-3.5" /> {dept.student_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    dept.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(dept.id)} title="Toggle status"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-800">
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} title="Delete"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No departments found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Previous
          </button>
          <span className="flex items-center px-4 text-sm text-gray-500">Page {page} of {Math.ceil(total / pageSize)}</span>
          <button disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
