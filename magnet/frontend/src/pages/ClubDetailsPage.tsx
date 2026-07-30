import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubManagementService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, Trophy, Calendar, Image, Award, Info, Mail, Phone,
  Globe as GlobeIcon, Linkedin, Link, X, Clock, MapPin, ChevronRight, Check
} from 'lucide-react';

const TABS = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'posts', label: 'Posts', icon: null },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'members', label: 'Members', icon: Users },
];

const CLUB_TYPE_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700',
  cultural: 'bg-purple-100 text-purple-700',
  sports: 'bg-green-100 text-green-700',
  literary: 'bg-amber-100 text-amber-700',
  social: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function ClubDetailsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('about');
  const [membership, setMembership] = useState<any>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const [joinModal, setJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);

  const loadClub = async () => {
    if (!clubId) return;
    try {
      const res = await clubManagementService.getById(clubId);
      setClub(res.data.data);
    } catch {
      toast.error('Club not found');
      navigate('/clubs/browse');
    } finally {
      setLoading(false);
    }
  };

  const loadMembership = async () => {
    if (!clubId) return;
    try {
      const res = await clubManagementService.getMembership(clubId);
      setMembership(res.data.data);
    } catch { /* not a member */ }
  };

  useEffect(() => { loadClub(); loadMembership(); }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    if (tab === 'members') {
      clubManagementService.getMembers(clubId, { page_size: 100 }).then((res) => setMembers(res.data.data || [])).catch(() => {});
    } else if (tab === 'events') {
      clubManagementService.getEvents(clubId, { page_size: 50 }).then((res) => setEvents(res.data.data || [])).catch(() => {});
    } else if (tab === 'gallery') {
      clubManagementService.getGallery(clubId, { page_size: 50 }).then((res) => setGallery(res.data.data || [])).catch(() => {});
    } else if (tab === 'achievements') {
      clubManagementService.getAchievements(clubId, { page_size: 50 }).then((res) => setAchievements(res.data.data || [])).catch(() => {});
    } else if (tab === 'posts') {
      import('../services').then(({ postService }) => {
        postService.getFeed({ page_size: 20 }).then((res: any) => setPosts(res.data?.data || [])).catch(() => {});
      });
    }
  }, [tab, clubId]);

  const handleJoin = async () => {
    if (!clubId) return;
    setJoining(true);
    try {
      await clubManagementService.join(clubId, joinMessage || undefined);
      toast.success('Request submitted!');
      setJoinModal(false);
      setJoinMessage('');
      loadMembership();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!clubId) return;
    if (!confirm('Are you sure you want to leave this club?')) return;
    try {
      await clubManagementService.leave(clubId);
      toast.success('Left the club');
      setMembership(null);
      loadClub();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to leave');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  if (!club) return null;

  const isMember = membership?.is_member;
  const isClubAdmin = user?.id === club.club_admin_id;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Banner */}
      <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600">
        {club.banner_url && <img src={club.banner_url} alt="" className="h-full w-full object-cover" />}
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="-mt-12 h-20 w-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden dark:border-gray-800">
          {club.icon_url ? (
            <img src={club.icon_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sky-100 text-2xl font-bold text-sky-600">{club.name.charAt(0)}</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <span className="text-sm text-gray-400">{club.club_code}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {club.club_type && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CLUB_TYPE_COLORS[club.club_type] || 'bg-gray-100 text-gray-700'}`}>{club.club_type}</span>
            )}
            {club.category && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.category}</span>}
            {club.domain && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.domain}</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <Users className="mr-1 inline h-3.5 w-3.5" /> {club.member_count || 0} members
            {club.approval_mode === 'auto' && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Auto-join</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {isClubAdmin && (
            <button onClick={() => navigate('/clubs/admin-dashboard')}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700">
              Admin Dashboard
            </button>
          )}
          {isMember ? (
            <button onClick={handleLeave}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
              Leave Club
            </button>
          ) : (
            <button onClick={() => setJoinModal(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
              {club.approval_mode === 'auto' ? 'Join Club' : 'Request to Join'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {tab === 'about' && (
          <div className="space-y-6">
            {club.description && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold">About</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{club.description}</p>
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-semibold">Details</h3>
              <div className="grid gap-3 text-sm">
                {club.department_name && <div className="flex justify-between"><span className="text-gray-500">Department</span><span>{club.department_name}</span></div>}
                {club.faculty_coordinator_name && <div className="flex justify-between"><span className="text-gray-500">Faculty Coordinator</span><span>{club.faculty_coordinator_name}</span></div>}
                {club.club_admin_name && <div className="flex justify-between"><span className="text-gray-500">Club Admin</span><span>{club.club_admin_name}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Approval</span><span className="capitalize">{club.approval_mode === 'auto' ? 'Auto-join' : 'Manual approval'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{new Date(club.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
            {(club.official_email || club.official_phone || club.website || club.instagram || club.linkedin) && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-3 font-semibold">Contact</h3>
                <div className="space-y-2 text-sm">
                  {club.official_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {club.official_email}</div>}
                  {club.official_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {club.official_phone}</div>}
                  {club.website && <div className="flex items-center gap-2"><GlobeIcon className="h-4 w-4 text-gray-400" /> <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">{club.website}</a></div>}
                   {club.instagram && <div className="flex items-center gap-2"><Link className="h-4 w-4 text-gray-400" /> {club.instagram}</div>}
                  {club.linkedin && <div className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-gray-400" /> <a href={club.linkedin} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">LinkedIn</a></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No posts yet</div>
            ) : (
              posts.map((post: any) => (
                <div key={post.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">{post.author_name?.charAt(0) || '?'}</div>
                    <div>
                      <p className="text-sm font-medium">{post.author_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {post.content && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>}
                  {post.image_url && <img src={post.image_url} alt="" className="mt-2 max-h-80 rounded-lg object-cover" />}
                  <div className="mt-3 flex gap-4 text-xs text-gray-500">
                    <span>{post.like_count || 0} likes</span>
                    <span>{post.comment_count || 0} comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No events yet</div>
            ) : events.map((ev: any) => (
              <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <span className="text-[10px] font-bold uppercase">{new Date(ev.event_date).toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-lg font-bold leading-none">{new Date(ev.event_date).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{ev.title}</h4>
                    {ev.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{ev.description}</p>}
                    <div className="mt-2 flex gap-3 text-xs text-gray-500">
                      {ev.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.venue}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ev.event_date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'gallery' && (
          <div className="space-y-4">
            {gallery.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No gallery items yet</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((item: any) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-xl">
                    <img src={item.image_url} alt="" className="aspect-square w-full object-cover" />
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white">{item.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="space-y-4">
            {achievements.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No achievements yet</div>
            ) : achievements.map((ach: any) => (
              <div key={ach.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold">{ach.title}</h4>
                  {ach.description && <p className="mt-1 text-sm text-gray-500">{ach.description}</p>}
                  <div className="mt-1 flex gap-3 text-xs text-gray-400">
                    {ach.achievement_type && <span className="capitalize">{ach.achievement_type}</span>}
                    {ach.achieved_date && <span>{new Date(ach.achieved_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No members yet</div>
            ) : members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sm font-bold text-sky-600">
                  {m.user_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.user_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{m.user_email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  m.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                  m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{m.role}</span>
                <span className="text-xs text-gray-400">Joined {new Date(m.joined_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Modal */}
      {joinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setJoinModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Join {club.name}</h3>
              <button onClick={() => setJoinModal(false)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500">
              {club.approval_mode === 'auto' ? 'You will be added immediately.' : 'Your request will be sent to the club admin for approval.'}
            </p>
            {club.approval_mode === 'manual' && (
              <textarea value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Why do you want to join? (optional)" rows={3}
                className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900" />
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setJoinModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700">Cancel</button>
              <button onClick={handleJoin} disabled={joining} className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                {joining ? 'Submitting...' : club.approval_mode === 'auto' ? 'Join Now' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
