import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentService, userService } from '../../services';
import toast from 'react-hot-toast';
import { Building2, ArrowLeft } from 'lucide-react';

export default function CreateDepartmentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', code: '', description: '', head_id: '' });

  useEffect(() => {
    userService.list({ role: 'department_admin' }).then((res) => setAdmins(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setLoading(true);
    try {
      await departmentService.create(form);
      toast.success('Department created!');
      navigate('/super-admin/departments');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-5 w-5" /></button>
        <Building2 className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Create Department</h1>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Department Name *</label>
          <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            placeholder="e.g. Computer Science" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Department Code *</label>
          <input type="text" required value={form.code} onChange={(e) => update('code', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            placeholder="e.g. CSE" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            placeholder="Describe the department..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Head of Department</label>
          <select value={form.head_id} onChange={(e) => update('head_id', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
            <option value="">Select HOD</option>
            {admins.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Department'}
          </button>
        </div>
      </form>
    </div>
  );
}
