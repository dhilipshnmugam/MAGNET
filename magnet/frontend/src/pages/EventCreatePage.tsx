import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, ImagePlus, Loader2, X, Link as LinkIcon, Mail, Phone, Info,
} from 'lucide-react';
import { eventService, uploadService, clubManagementService, departmentService, getApiError } from '../services';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Loader';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'competition', label: 'Competition' },
  { value: 'fest', label: 'Fest' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
];

const EVENT_TYPES = ['general', 'technical', 'cultural', 'sports', 'workshop', 'seminar', 'competition', 'fest', 'meeting', 'guest_lecture'];

interface ClubOption { id: string; name: string; }
interface DeptOption { id: string; name: string; }

export default function EventCreatePage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const isEdit = Boolean(eventId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    category: 'general',
    event_type: 'general',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    description: '',
    registration_url: '',
    contact_email: '',
    contact_phone: '',
    additional_info: '',
    organizer_name: '',
    club_id: '',
    department_id: '',
    banner_url: '',
  });

  const [myClubs, setMyClubs] = useState<ClubOption[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);

  useEffect(() => {
    const loadOrganizerOptions = async () => {
      try {
        if (user?.role === 'club_admin') {
          const res = await clubManagementService.getMyClubs();
          const list: ClubOption[] = (res.data?.data || []).map((c: any) => ({ id: c.id, name: c.name }));
          setMyClubs(list);
        }
        if (user?.role === 'super_admin') {
          const [clubRes, deptRes] = await Promise.all([
            clubManagementService.list({ page_size: 100 }),
            departmentService.list({ page_size: 100 }),
          ]);
          setClubs((clubRes.data?.data || []).map((c: any) => ({ id: c.id, name: c.name })));
          setDepartments((deptRes.data?.data || []).map((d: any) => ({ id: d.id, name: d.name })));
        }
      } catch { /* non-fatal */ }
    };
    loadOrganizerOptions();
  }, [user]);

  useEffect(() => {
    if (!isEdit || !eventId) return;
    setLoading(true);
    eventService.getById(eventId).then((res) => {
      const ev: Event | null = res.data?.data || null;
      if (!ev) { toast.error('Event not found'); navigate('/events'); return; }
      const dt = new Date(ev.event_date);
      setForm({
        title: ev.title || '',
        category: ev.category || 'general',
        event_type: ev.event_type || 'general',
        date: dt.toISOString().slice(0, 10),
        startTime: dt.toTimeString().slice(0, 5),
        endTime: ev.end_date ? new Date(ev.end_date).toTimeString().slice(0, 5) : '',
        venue: ev.venue || '',
        description: ev.description || '',
        registration_url: ev.registration_url || '',
        contact_email: ev.contact_email || '',
        contact_phone: ev.contact_phone || '',
        additional_info: ev.additional_info || '',
        organizer_name: ev.organizer_name || '',
        club_id: ev.club_id || '',
        department_id: ev.department_id || '',
        banner_url: ev.banner_url || '',
      });
      setLoading(false);
    }).catch(() => { toast.error('Could not load event'); navigate('/events'); });
  }, [isEdit, eventId, navigate]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePoster = async (file: File) => {
    setUploadingPoster(true);
    try {
      const res = await uploadService.image(file, 'events');
      const url = res.data?.data?.url;
      if (!url) throw new Error('Upload failed');
      update('banner_url', url);
      toast.success('Poster uploaded');
    } catch (err) {
      toast.error(getApiError(err) || 'Poster upload failed');
    } finally {
      setUploadingPoster(false);
    }
  };

  const combineDate = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`).toISOString();
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.date) return 'Event date is required';
    if (!form.startTime) return 'Start time is required';
    if (!isEdit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const evDate = new Date(`${form.date}T00:00:00`);
      if (evDate < today) return 'Event date cannot be in the past';
    }
    if (form.endTime && form.endTime === form.startTime) return 'End time must be after start time';
    if (form.registration_url && !/^https?:\/\/.+/.test(form.registration_url)) return 'Registration link must start with http:// or https://';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) return 'Enter a valid contact email';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    const eventDate = combineDate(form.date, form.startTime);
    let endDate: string | null = null;
    if (form.endTime) {
      const end = combineDate(form.date, form.endTime);
      if (end && eventDate && end <= eventDate) {
        const nextDay = new Date(`${form.date}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        endDate = combineDate(nextDay.toISOString().slice(0, 10), form.endTime);
      } else {
        endDate = end;
      }
    }

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      event_type: form.event_type,
      event_date: eventDate,
      end_date: endDate,
      venue: form.venue.trim() || undefined,
      registration_url: form.registration_url.trim() || undefined,
      contact_email: form.contact_email.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
      additional_info: form.additional_info.trim() || undefined,
      banner_url: form.banner_url || undefined,
      organizer_name: form.organizer_name.trim() || undefined,
    };

    if (user?.role === 'club_admin') {
      delete payload.club_id;
      delete payload.department_id;
    } else {
      if (form.club_id) payload.club_id = form.club_id;
      if (form.department_id) payload.department_id = form.department_id;
    }

    setSaving(true);
    try {
      if (isEdit && eventId) {
        await eventService.update(eventId, payload);
        toast.success('Event updated');
        navigate(`/events/${eventId}`);
      } else {
        const res = await eventService.create(payload);
        toast.success('Event created');
        navigate(`/events/${res.data?.data?.id || ''}`);
      }
    } catch (err2) {
      toast.error(getApiError(err2) || (isEdit ? 'Failed to update event' : 'Failed to create event'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const showClubSelect = user?.role === 'super_admin';
  const showDeptSelect = user?.role === 'super_admin';
  const organizerLabel = user?.role === 'club_admin'
    ? (myClubs[0]?.name || 'Your club')
    : user?.role === 'department_admin'
      ? (user.department_name || 'Your department')
      : user?.role === 'principal'
        ? 'Office of the Principal (College-wide)'
        : null;

  const inputCls = 'input';
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300';
  const sectionCls = 'space-y-1.5';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 lg:pb-10">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card p-5 sm:p-7">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Event' : 'Create Event'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fill in the event details below. A poster is recommended but optional.
        </p>

        <div className="mt-6 space-y-6">
          <div className={sectionCls}>
            <label className={labelCls}>Poster</label>
            <div className="flex items-center gap-4">
              {form.banner_url ? (
                <div className="relative h-36 w-full max-w-[16rem] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <img src={form.banner_url} alt="Poster" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update('banner_url', '')}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPoster}
                  className="flex h-36 w-full max-w-[16rem] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-campus-400 hover:text-campus-500 dark:border-gray-600"
                >
                  {uploadingPoster ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
                  <span className="text-xs font-medium">{uploadingPoster ? 'Uploading...' : 'Upload Poster'}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePoster(f); e.target.value = ''; }} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Event Title *</label>
              <input className={inputCls} value={form.title} onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. National Level Hackathon 2026" maxLength={255} />
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => update('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.event_type} onChange={(e) => update('event_type', e.target.value)}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Time *</label>
                <input type="time" className={inputCls} value={form.startTime} onChange={(e) => update('startTime', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>End Time</label>
                <input type="time" className={inputCls} value={form.endTime} onChange={(e) => update('endTime', e.target.value)} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Venue</label>
              <input className={inputCls} value={form.venue} onChange={(e) => update('venue', e.target.value)}
                placeholder="e.g. Seminar Hall, Main Block" maxLength={255} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={4} value={form.description} onChange={(e) => update('description', e.target.value)}
              placeholder="What is this event about?" />
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4 text-campus-500" /> Organiser
            </div>
            {organizerLabel ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{organizerLabel}</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className={labelCls}>Organiser Name</label>
                  <input className={inputCls} value={form.organizer_name} onChange={(e) => update('organizer_name', e.target.value)}
                    placeholder={user?.full_name || ''} maxLength={255} />
                </div>
                {showClubSelect && (
                  <div>
                    <label className={labelCls}>Club</label>
                    <select className={inputCls} value={form.club_id} onChange={(e) => update('club_id', e.target.value)}>
                      <option value="">No club (college-level)</option>
                      {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {showDeptSelect && (
                  <div>
                    <label className={labelCls}>Department</label>
                    <select className={inputCls} value={form.department_id} onChange={(e) => update('department_id', e.target.value)}>
                      <option value="">No department (college-level)</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Registration Link</label>
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input className="input pl-9" value={form.registration_url} onChange={(e) => update('registration_url', e.target.value)}
                  placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input className="input pl-9" value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="organiser@college.edu" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input className="input pl-9" value={form.contact_phone} onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Additional Information</label>
            <div className="relative">
              <Info className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <textarea className="input pl-9" rows={3} value={form.additional_info} onChange={(e) => update('additional_info', e.target.value)}
                placeholder="Rules, what to bring, contact desk, etc." />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
