import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubManagementService, uploadService, userService } from '../../services';
import toast from 'react-hot-toast';
import { Trophy, Upload, ArrowLeft } from 'lucide-react';

const DOMAINS: Record<string, string[]> = {
  Technology: ['AI', 'ML', 'Data Science', 'Cyber Security', 'Web Dev', 'App Dev', 'Robotics', 'Cloud Computing'],
  Sports: ['Cricket', 'Football', 'Volleyball', 'Basketball', 'Athletics', 'Chess', 'Kabaddi', 'Badminton'],
  Cultural: ['Dance', 'Music', 'Drama', 'Photography', 'Fine Arts'],
  Literary: ['Readers Club', 'Writers Club', 'Debate Club', 'Tamil Mandram', 'English Literary Club'],
  'Social Service': ['NSS', 'NCC', 'Youth Red Cross', 'Environmental Club'],
  Entrepreneurship: ['Startup Club', 'Innovation Club', 'Entrepreneurship Cell'],
  Other: ['Custom Domain'],
};

const CATEGORIES = Object.keys(DOMAINS);

export default function CreateClubPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', category: '', domain: '', description: '', email: '', phone: '',
    status: 'active', faculty_coordinator_id: '', club_admin_id: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    userService.list({ role: 'department_admin' }).then((res) => setAdmins(res.data.data || [])).catch(() => {});
    userService.list({ role: 'student' }).then((res) => {
      const existing = admins;
      setAdmins([...existing, ...res.data.data || []]);
    }).catch(() => {});
  }, []);

  const updateForm = (key: string, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'logo') { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
    else { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.description) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      let logo_url = '';
      let banner_url = '';
      if (logoFile) { const res = await uploadService.image(logoFile, 'clubs/logo'); logo_url = res.data.data?.url || ''; }
      if (bannerFile) { const res = await uploadService.image(bannerFile, 'clubs/banner'); banner_url = res.data.data?.url || ''; }
      await clubManagementService.create({ ...form, logo_url, banner_url });
      toast.success('Club created successfully!');
      navigate('/super-admin/clubs');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const domainsForCategory = form.category ? DOMAINS[form.category] || [] : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Trophy className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Create Club</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        {/* Name & Code */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Club Name *</label>
            <input type="text" required value={form.name} onChange={(e) => updateForm('name', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              placeholder="e.g. Coding Club" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Club Code</label>
            <input type="text" disabled value="Auto-generated on creation"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800" />
          </div>
        </div>

        {/* Category & Domain */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Category *</label>
            <select required value={form.category} onChange={(e) => { updateForm('category', e.target.value); updateForm('domain', ''); }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Domain *</label>
            <select required value={form.domain} onChange={(e) => updateForm('domain', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              disabled={!form.category}>
              <option value="">Select domain</option>
              {domainsForCategory.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium">Description *</label>
          <textarea required rows={3} value={form.description} onChange={(e) => updateForm('description', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            placeholder="Describe the club..." />
        </div>

        {/* Logo & Banner Upload */}
        <div className="grid gap-4 sm:grid-cols-2">
          {['logo', 'banner'].map((type) => (
            <div key={type}>
              <label className="mb-1 block text-sm font-medium capitalize">{type} Image</label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 transition-colors hover:border-sky-400 dark:border-gray-700">
                {(type === 'logo' ? logoPreview : bannerPreview) ? (
                  <img src={(type === 'logo' ? logoPreview : bannerPreview)!} alt="" className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
                <span className="text-xs text-gray-400">Click to upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, type as any)} />
              </label>
            </div>
          ))}
        </div>

        {/* Coordinators */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Faculty Coordinator</label>
            <select value={form.faculty_coordinator_id} onChange={(e) => updateForm('faculty_coordinator_id', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
              <option value="">Select coordinator</option>
              {admins.filter((u) => u.role === 'department_admin').map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Club Admin</label>
            <select value={form.club_admin_id} onChange={(e) => updateForm('club_admin_id', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
              <option value="">Select admin</option>
              {admins.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              placeholder="club@university.edu" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              placeholder="+91 0000000000" />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Status</label>
          <button type="button" onClick={() => updateForm('status', form.status === 'active' ? 'inactive' : 'active')}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.status === 'active' ? 'bg-sky-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.status === 'active' ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm text-gray-500">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Club'}
          </button>
        </div>
      </form>
    </div>
  );
}
