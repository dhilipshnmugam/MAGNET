import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubManagementService, uploadService, departmentService } from '../../services';
import toast from 'react-hot-toast';
import { Trophy, Upload, ArrowLeft, ArrowRight, Check, Info } from 'lucide-react';

const DOMAINS: Record<string, string[]> = {
  Technology: ['AI', 'ML', 'Data Science', 'Cyber Security', 'Web Dev', 'App Dev', 'Robotics', 'Cloud Computing'],
  Sports: ['Cricket', 'Football', 'Volleyball', 'Basketball', 'Athletics', 'Chess', 'Kabaddi', 'Badminton'],
  Cultural: ['Dance', 'Music', 'Drama', 'Photography', 'Fine Arts'],
  Literary: ['Readers Club', 'Writers Club', 'Debate Club', 'Tamil Mandram', 'English Literary Club'],
  'Social Service': ['NSS', 'NCC', 'Youth Red Cross', 'Environmental Club'],
  Entrepreneurship: ['Startup Club', 'Innovation Club', 'Entrepreneurship Cell'],
  Other: ['Custom Domain'],
};

const CLUB_TYPES = [
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'literary', label: 'Literary' },
  { value: 'social', label: 'Social Service' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES = Object.keys(DOMAINS);

const STEPS = [
  { id: 1, label: 'Club Info', description: 'Basic club details' },
  { id: 2, label: 'Club Type', description: 'Category and type' },
  { id: 3, label: 'Images', description: 'Logo and banner' },
  { id: 4, label: 'Faculty Coord.', description: 'Faculty coordinator' },
  { id: 5, label: 'Admin Account', description: 'Club admin credentials' },
  { id: 6, label: 'Contact', description: 'Contact & social links' },
  { id: 7, label: 'Status', description: 'Review and submit' },
];

export default function CreateClubPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    domain: '',
    club_type: 'technical',
    department_id: '',
    faculty_coordinator_id: '',
    official_email: '',
    official_phone: '',
    website: '',
    instagram: '',
    linkedin: '',
    status: 'active',
    admin_email: '',
    admin_password: '',
    admin_full_name: '',
  });
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    departmentService.list({ page_size: 100 }).then((res) => {
      setDepartments(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.department_id) {
      import('../../services').then(({ userService }) => {
        userService.list({ role: 'department_admin', department_id: form.department_id, page_size: 100 })
          .then((res) => setFacultyList(res.data.data || []))
          .catch(() => {});
      });
    } else {
      setFacultyList([]);
    }
  }, [form.department_id]);

  const updateForm = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'icon') {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    } else {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const canNext = () => {
    switch (step) {
      case 1:
        return form.name.trim().length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return form.admin_email.trim().length > 0 && form.admin_password.length >= 8 && form.admin_full_name.trim().length > 0;
      case 6:
        return true;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let icon_url = '';
      let banner_url = '';
      if (iconFile) {
        const res = await uploadService.image(iconFile, 'clubs/icon');
        icon_url = res.data.data?.url || '';
      }
      if (bannerFile) {
        const res = await uploadService.image(bannerFile, 'clubs/banner');
        banner_url = res.data.data?.url || '';
      }

      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        domain: form.domain || undefined,
        club_type: form.club_type,
        department_id: form.department_id || undefined,
        faculty_coordinator_id: form.faculty_coordinator_id || undefined,
        official_email: form.official_email || undefined,
        official_phone: form.official_phone || undefined,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        linkedin: form.linkedin || undefined,
        icon_url: icon_url || undefined,
        banner_url: banner_url || undefined,
        status: form.status,
        admin_email: form.admin_email,
        admin_password: form.admin_password,
        admin_full_name: form.admin_full_name,
      };

      await clubManagementService.create(payload);
      toast.success('Club created successfully!');
      navigate('/super-admin/clubs');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const domainsForCategory = form.category ? DOMAINS[form.category] || [] : [];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Club Information</h3>
            <p className="text-sm text-gray-500">Enter the basic details about the club.</p>
            <div>
              <label className="mb-1 block text-sm font-medium">Club Name *</label>
              <input type="text" required value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="e.g. Coding Club" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Club Code</label>
              <input type="text" disabled value="Auto-generated on creation"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea rows={3} value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="Describe the club's purpose, activities, and goals..." />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Club Type & Category</h3>
            <p className="text-sm text-gray-500">Classify the club by type and domain.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Club Type</label>
                <select value={form.club_type}
                  onChange={(e) => updateForm('club_type', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                  {CLUB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select value={form.category}
                  onChange={(e) => { updateForm('category', e.target.value); updateForm('domain', ''); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Domain</label>
              <select value={form.domain}
                onChange={(e) => updateForm('domain', e.target.value)}
                disabled={!form.category}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50">
                <option value="">Select domain</option>
                {domainsForCategory.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Department</label>
              <select value={form.department_id}
                onChange={(e) => updateForm('department_id', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                <option value="">No department (general)</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Images</h3>
            <p className="text-sm text-gray-500">Upload the club logo and banner image.</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Club Icon/Logo</label>
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-sky-400 dark:border-gray-700">
                  {iconPreview ? (
                    <img src={iconPreview} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  ) : (
                    <Upload className="h-10 w-10 text-gray-400" />
                  )}
                  <div className="text-center">
                    <span className="text-sm text-gray-500">Click to upload icon</span>
                    <p className="text-xs text-gray-400">Recommended: 256x256px</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, 'icon')} />
                </label>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Banner Image</label>
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-sky-400 dark:border-gray-700">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="" className="h-24 w-full rounded-xl object-cover" />
                  ) : (
                    <Upload className="h-10 w-10 text-gray-400" />
                  )}
                  <div className="text-center">
                    <span className="text-sm text-gray-500">Click to upload banner</span>
                    <p className="text-xs text-gray-400">Recommended: 1200x400px</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, 'banner')} />
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Faculty Coordinator</h3>
            <p className="text-sm text-gray-500">Assign a faculty member to coordinate this club.</p>
            <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-900/20">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
                <p className="text-xs text-sky-700 dark:text-sky-300">Select a department first to see available faculty members.</p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Department</label>
              <select value={form.department_id}
                onChange={(e) => { updateForm('department_id', e.target.value); updateForm('faculty_coordinator_id', ''); }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800">
                <option value="">Select department</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Faculty Coordinator</label>
              <select value={form.faculty_coordinator_id}
                onChange={(e) => updateForm('faculty_coordinator_id', e.target.value)}
                disabled={!form.department_id}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50">
                <option value="">Select faculty coordinator</option>
                {facultyList.map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
              </select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Club Admin Account</h3>
            <p className="text-sm text-gray-500">Create login credentials for the club administrator.</p>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-300">The admin will use these credentials to log in via the Club Admin portal.</p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Full Name *</label>
              <input type="text" required value={form.admin_full_name}
                onChange={(e) => updateForm('admin_full_name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="e.g. John Smith" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Email *</label>
              <input type="email" required value={form.admin_email}
                onChange={(e) => updateForm('admin_email', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="admin@magnet.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin Password *</label>
              <input type="password" required value={form.admin_password}
                onChange={(e) => updateForm('admin_password', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="Min 8 characters" />
              {form.admin_password && form.admin_password.length < 8 && (
                <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact & Social Links</h3>
            <p className="text-sm text-gray-500">Add official contact information and social media links.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Official Email</label>
                <input type="email" value={form.official_email}
                  onChange={(e) => updateForm('official_email', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  placeholder="club@university.edu" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Official Phone</label>
                <input type="tel" value={form.official_phone}
                  onChange={(e) => updateForm('official_phone', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  placeholder="+91 0000000000" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Website</label>
              <input type="url" value={form.website}
                onChange={(e) => updateForm('website', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                placeholder="https://club-website.com" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Instagram</label>
                <input type="text" value={form.instagram}
                  onChange={(e) => updateForm('instagram', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  placeholder="@club_handle" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">LinkedIn</label>
                <input type="url" value={form.linkedin}
                  onChange={(e) => updateForm('linkedin', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                  placeholder="https://linkedin.com/company/..." />
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review & Submit</h3>
            <p className="text-sm text-gray-500">Review all details before creating the club.</p>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <h4 className="mb-3 font-medium">Club Details</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{form.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{form.club_type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{form.category || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="font-medium">{form.domain || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{departments.find((d: any) => d.id === form.department_id)?.name || '—'}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <h4 className="mb-3 font-medium">Admin Account</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{form.admin_full_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{form.admin_email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Password</span><span className="font-medium">{'•'.repeat(form.admin_password.length)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <h4 className="mb-3 font-medium">Contact & Links</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{form.official_email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{form.official_phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Website</span><span className="font-medium">{form.website || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Instagram</span><span className="font-medium">{form.instagram || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">LinkedIn</span><span className="font-medium">{form.linkedin || '—'}</span></div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Status</label>
              <button type="button" onClick={() => updateForm('status', form.status === 'active' ? 'inactive' : 'active')}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.status === 'active' ? 'bg-sky-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.status === 'active' ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-gray-500">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Trophy className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Create Club</h1>
      </div>

      {/* Step Indicator */}
      <div className="scrollbar-hide flex items-center justify-between overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex shrink-0 items-center">
            <button
              onClick={() => setStep(s.id)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors sm:h-9 sm:w-9 sm:text-sm ${
                step === s.id
                  ? 'bg-sky-500 text-white'
                  : step > s.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 w-2 sm:mx-1.5 sm:w-10 ${step > s.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{STEPS[step - 1].label}</p>
        <p className="text-xs text-gray-400">{STEPS[step - 1].description}</p>
      </div>

      {/* Step Content */}
      <div className="card p-6">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 7 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(7, s + 1))}
            disabled={!canNext()}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canNext()}
            className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Club'} <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
