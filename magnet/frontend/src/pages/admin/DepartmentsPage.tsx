import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { departmentService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { Building2, Plus, Search, Trash2 } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.list();
      setDepartments(res.data.data || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await departmentService.delete(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = departments.filter(
    (d) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-sky-500" />
          <h1 className="text-2xl font-bold">Departments</h1>
        </div>
        <Link to="/super-admin/departments/create" className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
          <Plus className="h-4 w-4" /> Create Department
        </Link>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((dept) => (
              <tr key={dept.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium">{dept.name}</td>
                <td className="px-4 py-3 text-gray-500">{dept.code}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{dept.description || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(dept.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No departments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
