import { useState, useEffect } from 'react';
import { clubManagementService } from '../services';
import toast from 'react-hot-toast';
import { Users, Clock, Check, X, Trophy, Image, Award, Calendar, Settings, ChevronRight } from 'lucide-react';

export default function ClubAdminDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'requests' | 'members' | 'events' | 'gallery' | 'achievements'>('overview');

  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  const [eventModal, setEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', venue: '', event_type: 'general' });
  const [achievementModal, setAchievementModal] = useState(false);
  const [achievementForm, setAchievementForm] = useState({ title: '', description: '', achievement_type: 'general', achieved_date: '' });
  const [galleryModal, setGalleryModal] = useState(false);
  const [galleryUrl, setGalleryUrl] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');

  useEffect(() => {
    clubManagementService.getMyClubs().then((res) => {
      const myClubs = res.data.data || [];
      if (myClubs.length > 0) {
        const cid = myClubs[0].id;
        setClubId(cid);
        clubManagementService.getDashboard(cid).then((r) => setDashboard(r.data.data)).catch(() => toast.error('Failed to load dashboard'));
      }
    }).catch(() => toast.error('Failed to load clubs')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!clubId) return;
    if (tab === 'requests') {
      clubManagementService.getJoinRequests(clubId, { page_size: 50 }).then((res) => setRequests(res.data.data || [])).catch(() => {});
    } else if (tab === 'members') {
      clubManagementService.getMembers(clubId, { page_size: 100 }).then((res) => setMembers(res.data.data || [])).catch(() => {});
    } else if (tab === 'events') {
      clubManagementService.getEvents(clubId, { page_size: 50 }).then((res) => setEvents(res.data.data || [])).catch(() => {});
    } else if (tab === 'gallery') {
      clubManagementService.getGallery(clubId, { page_size: 50 }).then((res) => setGallery(res.data.data || [])).catch(() => {});
    } else if (tab === 'achievements') {
      clubManagementService.getAchievements(clubId, { page_size: 50 }).then((res) => setAchievements(res.data.data || [])).catch(() => {});
    }
  }, [tab, clubId]);

  const handleReviewRequest = async (requestId: string, status: string) => {
    try {
      await clubManagementService.reviewJoinRequest(requestId, status);
      toast.success(`Request ${status}`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (clubId) clubManagementService.getDashboard(clubId).then((r) => setDashboard(r.data.data));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!clubId || !confirm('Remove this member?')) return;
    try {
      await clubManagementService.removeMember(clubId, userId);
      toast.success('Member removed');
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed');
    }
  };

  const handleCreateEvent = async () => {
    if (!clubId) return;
    try {
      await clubManagementService.createEvent(clubId, { ...eventForm, event_date: new Date(eventForm.event_date).toISOString() });
      toast.success('Event created');
      setEventModal(false);
      setEventForm({ title: '', description: '', event_date: '', venue: '', event_type: 'general' });
      if (tab === 'events') clubManagementService.getEvents(clubId, { page_size: 50 }).then((res) => setEvents(res.data.data || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed');
    }
  };

  const handleCreateAchievement = async () => {
    if (!clubId) return;
    try {
      await clubManagementService.createAchievement(clubId, {
        ...achievementForm,
        achieved_date: achievementForm.achieved_date ? new Date(achievementForm.achieved_date).toISOString() : undefined,
      });
      toast.success('Achievement added');
      setAchievementModal(false);
      setAchievementForm({ title: '', description: '', achievement_type: 'general', achieved_date: '' });
      if (tab === 'achievements') clubManagementService.getAchievements(clubId, { page_size: 50 }).then((res) => setAchievements(res.data.data || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed');
    }
  };

  const handleAddGallery = async () => {
    if (!clubId || !galleryUrl) return;
    try {
      await clubManagementService.addGallery(clubId, { image_url: galleryUrl, caption: galleryCaption || undefined });
      toast.success('Gallery item added');
      setGalleryModal(false);
      setGalleryUrl('');
      setGalleryCaption('');
      if (tab === 'gallery') clubManagementService.getGallery(clubId, { page_size: 50 }).then((res) => setGallery(res.data.data || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  if (!dashboard) return <div className="py-20 text-center text-gray-500">No club found. You need to be assigned as a club admin.</div>;

  const club = dashboard.club;
  const stats = [
    { label: 'Members', value: dashboard.member_count, icon: Users, color: 'text-sky-500' },
    { label: 'Pending Requests', value: dashboard.pending_requests, icon: Clock, color: 'text-amber-500' },
    { label: 'Posts', value: dashboard.post_count, icon: Trophy, color: 'text-purple-500' },
  ];

  const TAB_ITEMS = [
    { id: 'overview' as const, label: 'Overview', icon: Settings },
    { id: 'requests' as const, label: `Join Requests${dashboard.pending_requests > 0 ? ` (${dashboard.pending_requests})` : ''}`, icon: Clock },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'gallery' as const, label: 'Gallery', icon: Image },
    { id: 'achievements' as const, label: 'Achievements', icon: Award },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">{club.name} - Admin</h1>
        <p className="text-sm text-gray-500">{club.club_code}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value || 0}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {TAB_ITEMS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-semibold">Recent Members</h3>
              {(dashboard.recent_members || []).length === 0 ? (
                <p className="text-sm text-gray-500">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recent_members.map((m: any) => (
                    <div key={m.user_id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">{m.user_name?.charAt(0) || '?'}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.user_name}</p>
                        <p className="text-xs text-gray-400">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No pending requests</div>
            ) : requests.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-600">{r.user_name?.charAt(0) || '?'}</div>
                <div className="flex-1">
                  <p className="font-medium">{r.user_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{r.user_email}</p>
                  {r.message && <p className="mt-1 text-sm text-gray-500 italic">"{r.message}"</p>}
                  <p className="mt-0.5 text-xs text-gray-400">Applied {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReviewRequest(r.id, 'approved')}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600">
                    <Check className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => handleReviewRequest(r.id, 'rejected')}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">
                    <X className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-600">{m.user_name?.charAt(0) || '?'}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.user_name}</p>
                  <p className="text-xs text-gray-400">{m.user_email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.role === 'owner' ? 'bg-amber-100 text-amber-700' : m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{m.role}</span>
                {m.role !== 'owner' && m.role !== 'admin' && (
                  <button onClick={() => handleRemoveMember(m.user_id)} className="text-xs text-red-500 hover:underline">Remove</button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            <button onClick={() => setEventModal(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">+ Create Event</button>
            {events.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No events yet</div>
            ) : events.map((ev: any) => (
              <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="font-semibold">{ev.title}</h4>
                {ev.description && <p className="mt-1 text-sm text-gray-500">{ev.description}</p>}
                <div className="mt-2 flex gap-3 text-xs text-gray-500">
                  <span>{new Date(ev.event_date).toLocaleString()}</span>
                  {ev.venue && <span>{ev.venue}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'gallery' && (
          <div className="space-y-4">
            <button onClick={() => setGalleryModal(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">+ Add Photo</button>
            {gallery.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No gallery items</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((item: any) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-xl">
                    <img src={item.image_url} alt="" className="aspect-square w-full object-cover" />
                    {item.caption && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100"><p className="text-xs text-white">{item.caption}</p></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="space-y-4">
            <button onClick={() => setAchievementModal(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">+ Add Achievement</button>
            {achievements.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No achievements yet</div>
            ) : achievements.map((ach: any) => (
              <div key={ach.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <Award className="h-8 w-8 flex-shrink-0 text-amber-500" />
                <div>
                  <h4 className="font-semibold">{ach.title}</h4>
                  {ach.description && <p className="mt-1 text-sm text-gray-500">{ach.description}</p>}
                  {ach.achieved_date && <p className="mt-1 text-xs text-gray-400">{new Date(ach.achieved_date).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Modal */}
      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEventModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">Create Event</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Event Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <textarea placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <input type="datetime-local" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <input type="text" placeholder="Venue" value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setEventModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-gray-700">Cancel</button>
              <button onClick={handleCreateEvent} className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Modal */}
      {achievementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAchievementModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">Add Achievement</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={achievementForm.title} onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <textarea placeholder="Description" value={achievementForm.description} onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
                rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <select value={achievementForm.achievement_type} onChange={(e) => setAchievementForm({ ...achievementForm, achievement_type: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                <option value="general">General</option>
                <option value="competition">Competition</option>
                <option value="hackathon">Hackathon</option>
                <option value="paper">Paper/Research</option>
                <option value="certification">Certification</option>
              </select>
              <input type="date" value={achievementForm.achieved_date} onChange={(e) => setAchievementForm({ ...achievementForm, achieved_date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setAchievementModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-gray-700">Cancel</button>
              <button onClick={handleCreateAchievement} className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setGalleryModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">Add Photo</h3>
            <div className="space-y-3">
              <input type="url" placeholder="Image URL" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <input type="text" placeholder="Caption (optional)" value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setGalleryModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-gray-700">Cancel</button>
              <button onClick={handleAddGallery} disabled={!galleryUrl} className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
