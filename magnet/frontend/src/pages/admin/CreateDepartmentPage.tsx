import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentService } from '../../services';
import toast from 'react-hot-toast';
import { Building2, ArrowLeft, User, Lock, Info } from 'lucide-react';

const DEPT_TYPES = ['Engineering', 'Science', 'Arts', 'Commerce', 'Management', 'Law', 'Medical', 'Other'];

export default function CreateDepartmentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'dept' | 'hod' | 'creds'>('dept');
  const [form, setForm] = useState({
    name: '', code: '', department_type: '', description: '', logo_url: '', cover_image_url: '', status: 'active',
    hod_full_name: '', hod_email: '', hod_employee_id: '', hod_designation: '', hod_qualification: '', hod_specialization: '', hod_phone: '', hod_office_room: '',
    hod_password: '',
  });

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const sections = [
    { key: 'dept' as const, label: 'Department Info', icon: <Building2 className="h-4 w-4" /> },
    { key: 'hod' as const, label: 'HOD Details', icon: <User className="h-4 w-4" /> },
    { key: 'creds' as const, label: 'Login Credentials', icon: <Lock className="h-4 w-4" /> },
  ];

  const validateSection = (s: string): boolean => {
    if (s === 'dept') return !!(form.name && form.code);
    if (s === 'hod') return !!(form.hod_full_name && form.hod_email && form.hod_employee_id);
    if (s === 'creds') return !!(form.hod_password && form.hod_password.length >= 8);
    return true;
  };

  const handleNext = () => {
    if (!validateSection(activeSection)) { toast.error('Please fill required fields'); return; }
    const idx = sections.findIndex((s) => s.key === activeSection);
    if (idx < sections.length - 1) setActiveSection(sections[idx + 1].key);
  };

  const handleBack = () => {
    const idx = sections.findIndex((s) => s.key === activeSection);
    if (idx > 0) setActiveSection(sections[idx - 1].key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSection('dept') || !validateSection('hod') || !validateSection('creds')) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await departmentService.create(form);
      toast.success('Department and admin account created!');
      navigate('/super-admin/departments');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-5 w-5" /></button>
        <Building2 className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Create Department</h1>
      </div>

      {/* Step Indicator */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          {sections.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === s.key
                    ? 'bg-sky-500 text-white'
                    : validateSection(s.key)
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < sections.length - 1 && <div className="mx-2 h-px w-8 bg-gray-200 dark:bg-gray-700" />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card space-y-5 p-6">
          {/* Section 1: Department Info */}
          {activeSection === 'dept' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5 text-sky-500" /> Department Information
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Department Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)}
                    className={inputCls} placeholder="e.g. Computer Science & Engineering" />
                </div>
                <div>
                  <label className={labelCls}>Department Code *</label>
                  <input type="text" required value={form.code} onChange={(e) => update('code', e.target.value)}
                    className={inputCls} placeholder="e.g. CSE" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Department Type</label>
                  <select value={form.department_type} onChange={(e) => update('department_type', e.target.value)} className={inputCls}>
                    <option value="">Select type</option>
                    {DEPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)}
                  className={inputCls} placeholder="Describe the department..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Logo URL</label>
                  <input type="url" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)}
                    className={inputCls} placeholder="https://..." />
                </div>
                <div>
                  <label className={labelCls}>Cover Image URL</label>
                  <input type="url" value={form.cover_image_url} onChange={(e) => update('cover_image_url', e.target.value)}
                    className={inputCls} placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: HOD Details */}
          {activeSection === 'hod' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-purple-500" /> HOD Information
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input type="text" required value={form.hod_full_name} onChange={(e) => update('hod_full_name', e.target.value)}
                    className={inputCls} placeholder="Dr. John Doe" />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" required value={form.hod_email} onChange={(e) => update('hod_email', e.target.value)}
                    className={inputCls} placeholder="hod@magnet.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Employee ID *</label>
                  <input type="text" required value={form.hod_employee_id} onChange={(e) => update('hod_employee_id', e.target.value)}
                    className={inputCls} placeholder="EMP001" />
                </div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <input type="text" value={form.hod_designation} onChange={(e) => update('hod_designation', e.target.value)}
                    className={inputCls} placeholder="Head of Department" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Qualification</label>
                  <input type="text" value={form.hod_qualification} onChange={(e) => update('hod_qualification', e.target.value)}
                    className={inputCls} placeholder="Ph.D. in Computer Science" />
                </div>
                <div>
                  <label className={labelCls}>Specialization</label>
                  <input type="text" value={form.hod_specialization} onChange={(e) => update('hod_specialization', e.target.value)}
                    className={inputCls} placeholder="AI & Machine Learning" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.hod_phone} onChange={(e) => update('hod_phone', e.target.value)}
                    className={inputCls} placeholder="+1234567890" />
                </div>
                <div>
                  <label className={labelCls}>Office Room</label>
                  <input type="text" value={form.hod_office_room} onChange={(e) => update('hod_office_room', e.target.value)}
                    className={inputCls} placeholder="Room 301" />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Login Credentials */}
          {activeSection === 'creds' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Lock className="h-5 w-5 text-amber-500" /> Login Credentials
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <Info className="mb-1 inline h-4 w-4" /> These credentials will be used by the HOD to login as Department Admin.
              </div>
              <div>
                <label className={labelCls}>Login Email *</label>
                <input type="email" required value={form.hod_email} onChange={(e) => update('hod_email', e.target.value)}
                  className={inputCls} placeholder="hod@magnet.com" disabled />
                <p className="mt-1 text-xs text-gray-400">Same as HOD email from previous step</p>
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input type="password" required minLength={8} value={form.hod_password} onChange={(e) => update('hod_password', e.target.value)}
                  className={inputCls} placeholder="Min 8 characters" />
                <p className="mt-1 text-xs text-gray-400">The HOD will use this to login at /login/department-admin</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary</p>
                <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p>Department: <span className="font-medium text-gray-700 dark:text-gray-300">{form.name || '—'}</span> ({form.code || '—'})</p>
                  <p>HOD: <span className="font-medium text-gray-700 dark:text-gray-300">{form.hod_full_name || '—'}</span></p>
                  <p>Login: <span className="font-medium text-gray-700 dark:text-gray-300">{form.hod_email || '—'}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <div>
            {activeSection !== 'dept' && (
              <button type="button" onClick={handleBack} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              Cancel
            </button>
            {activeSection !== 'creds' ? (
              <button type="button" onClick={handleNext} className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors">
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors">
                {loading ? 'Creating...' : 'Create Department'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
