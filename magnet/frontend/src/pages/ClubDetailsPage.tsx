import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubManagementService } from '../services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import PostCard from '../components/feed/PostCard';
import {
  ArrowLeft, Users, Trophy, Calendar, Image as ImageIcon, Award, Info, Mail,
  Phone, Globe as GlobeIcon, Linkedin, Link, X, Clock, MapPin, ChevronRight,
  Check, Sparkles, Building2, ShieldCheck, Target, Activity, MessageSquare,
} from 'lucide-react';
import { cn, timeAgo, eventMonth, eventDay, isPastEvent, formatEventDate, formatDateOnly, formatDateTime } from '../utils/helpers';

const TABS = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'posts', label: 'Posts', icon: null },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'members', label: 'Members', icon: Users },
];

const CLUB_TYPE_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cultural: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  sports: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  literary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  social: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}

function AboutTab({ club }: { club: any }) {
  return (
    <div className="space-y-6">
      {club.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 font-semibold">About</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{club.description}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold">Details</h3>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {club.category && <DetailRow icon={<Target className="h-4 w-4" />} label="Category" value={club.category} />}
          {club.domain && <DetailRow icon={<Activity className="h-4 w-4" />} label="Domain" value={club.domain} />}
          {club.club_type && <DetailRow icon={<Building2 className="h-4 w-4" />} label="Type" value={club.club_type} />}
          {club.department_name && <DetailRow icon={<Building2 className="h-4 w-4" />} label="Department" value={club.department_name} />}
          {club.faculty_coordinator_name && (
            <DetailRow icon={<ShieldCheck className="h-4 w-4" />} label="Faculty Coordinator" value={club.faculty_coordinator_name} />
          )}
          {club.club_admin_name && <DetailRow icon={<Users className="h-4 w-4" />} label="Club Admin" value={club.club_admin_name} />}
          <DetailRow
            icon={<Check className="h-4 w-4" />}
            label="Approval"
            value={club.approval_mode === 'auto' ? 'Auto-join' : 'Manual approval'}
          />
          {club.created_at && (
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Created" value={formatDateOnly(club.created_at)} />
          )}
        </div>
      </div>

      {(club.official_email || club.official_phone || club.website || club.instagram || club.linkedin) && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-semibold">Contact</h3>
          <div className="grid gap-2.5 text-sm">
            {club.official_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-gray-400" /> {club.official_email}</div>}
            {club.official_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-gray-400" /> {club.official_phone}</div>}
            {club.website && (
              <div className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <a href={club.website} target="_blank" rel="noopener noreferrer" className="truncate text-sky-500 hover:underline">{club.website}</a>
              </div>
            )}
            {club.instagram && <div className="flex items-center gap-2"><Link className="h-4 w-4 shrink-0 text-gray-400" /> {club.instagram}</div>}
            {club.linkedin && (
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 shrink-0 text-gray-400" />
                <a href={club.linkedin} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">LinkedIn</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onClick }: { event: any; onClick: () => void }) {
  const end = event.end_date || event.event_date;
  const past = isPastEvent(end);
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-sky-700"
    >
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
        {event.banner_url ? (
          <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase leading-none">{eventMonth(event.event_date)}</span>
            <span className="mt-0.5 text-lg font-bold leading-none">{eventDay(event.event_date)}</span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate font-semibold">{event.title}</h4>
          <span className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            past
              ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          )}>
            {past ? 'Completed' : 'Upcoming'}
          </span>
        </div>
        {event.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {event.venue && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.venue}</span>
          )}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(event.event_date)}</span>
          {event.rsvp_count > 0 && (
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.rsvp_count} attending</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-sky-500 dark:text-gray-600" />
    </button>
  );
}

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
  const [tabLoading, setTabLoading] = useState(false);

  const [joinModal, setJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const loadClub = useCallback(async () => {
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
  }, [clubId, navigate]);

  const loadMembership = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await clubManagementService.getMembership(clubId);
      setMembership(res.data.data);
    } catch {
      setMembership(null);
    }
  }, [clubId]);

  useEffect(() => {
    setClub(null);
    setLoading(true);
    setMembership(null);
    setTab('about');
    setPosts([]);
    setMembers([]);
    setEvents([]);
    setGallery([]);
    setAchievements([]);
    setSelectedEvent(null);
    loadClub();
    loadMembership();
  }, [clubId, loadClub, loadMembership]);

  useEffect(() => {
    if (!clubId || !club || tab === 'about') {
      if (tab === 'about') setTabLoading(false);
      return;
    }
    let cancelled = false;
    setTabLoading(true);
    const load = async () => {
      let res: any;
      if (tab === 'posts') res = await clubManagementService.getClubPosts(clubId, { page_size: 50 });
      else if (tab === 'members') res = await clubManagementService.getMembers(clubId, { page_size: 100 });
      else if (tab === 'events') res = await clubManagementService.getEvents(clubId, { page_size: 50 });
      else if (tab === 'gallery') res = await clubManagementService.getGallery(clubId, { page_size: 100 });
      else if (tab === 'achievements') res = await clubManagementService.getAchievements(clubId, { page_size: 100 });
      if (cancelled || !res) return;
      const data = res.data?.data || [];
      if (tab === 'posts') setPosts(data);
      else if (tab === 'members') setMembers(data);
      else if (tab === 'events') setEvents(data);
      else if (tab === 'gallery') setGallery(data);
      else if (tab === 'achievements') setAchievements(data);
    };
    load()
      .catch(() => {})
      .finally(() => { if (!cancelled) setTabLoading(false); });
    return () => { cancelled = true; };
  }, [tab, clubId, club]);

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
      loadMembership();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to leave');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  }
  if (!club) return null;

  const isMember = membership?.is_member;
  const isClubAdmin = user?.id === club.club_admin_id;
  const requestPending = !isMember && membership?.request_status === 'pending';

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Banner */}
      <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 sm:h-52 md:h-60">
        {club.banner_url ? (
          <img src={club.banner_url} alt="" className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-16 w-16 text-white/30" />
          </div>
        )}
        {club.status === 'inactive' && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            Inactive
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-end gap-3">
          <div className="-mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:-mt-16 sm:h-24 sm:w-24 dark:border-gray-800 dark:bg-gray-800">
            {club.icon_url ? (
              <img src={club.icon_url} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sky-100 text-2xl font-bold text-sky-600 sm:text-3xl">
                {club.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{club.name}</h1>
              {club.club_code && <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{club.club_code}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {club.club_type && (
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', CLUB_TYPE_COLORS[club.club_type] || 'bg-gray-100 text-gray-700')}>
                  {club.club_type}
                </span>
              )}
              {club.category && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.category}</span>}
              {club.domain && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{club.domain}</span>}
            </div>
            {club.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 sm:text-sm dark:text-gray-400">{club.description}</p>
            )}
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
              <Users className="h-3.5 w-3.5" /> {club.member_count || 0} members
              {club.approval_mode === 'auto' && (
                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Auto-join</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 sm:pb-1">
          {isClubAdmin && (
            <button
              onClick={() => navigate('/clubs/admin-dashboard')}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Admin Dashboard
            </button>
          )}
          {isMember ? (
            !isClubAdmin && (
              <button
                onClick={handleLeave}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Leave Club
              </button>
            )
          ) : requestPending ? (
            <button
              disabled
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            >
              <Check className="h-4 w-4" /> Request Pending
            </button>
          ) : (
            <button
              onClick={() => setJoinModal(true)}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              {club.approval_mode === 'auto' ? 'Join Club' : 'Request to Join'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 overflow-x-auto border-b border-gray-200 scrollbar-hide sm:mx-0 dark:border-gray-700">
        <div className="flex min-w-max gap-1 px-4 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {t.icon && <t.icon className="h-4 w-4" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[320px]">
        {tabLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : tab === 'about' ? (
          <AboutTab club={club} />
        ) : tab === 'posts' ? (
          posts.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="No posts yet"
              description="Posts shared by this club will appear here."
            />
          ) : (
            <div className="space-y-5">
              {posts.map((post: any) => (
                <div key={post.id}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <Avatar src={club.icon_url} name={club.name} size="sm" className="h-6 w-6" />
                    <p className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">{club.name}</p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">· {timeAgo(post.created_at)}</span>
                  </div>
                  <PostCard
                    post={post}
                    onDelete={user?.id === post.author_id ? (id) => setPosts((prev) => prev.filter((p) => p.id !== id)) : undefined}
                  />
                </div>
              ))}
            </div>
          )
        ) : tab === 'events' ? (
          events.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-10 w-10" />}
              title="No events yet"
              description="Events organized by this club will appear here."
            />
          ) : (
            <div className="space-y-3">
              {events.map((ev: any) => (
                <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />
              ))}
            </div>
          )
        ) : tab === 'gallery' ? (
          gallery.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-10 w-10" />}
              title="No gallery items yet"
              description="Photos and media from this club will appear here."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((item: any) => (
                <div key={item.id} className="group relative overflow-hidden rounded-xl">
                  <img
                    src={item.image_url}
                    alt={item.caption || club.name}
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-xs text-white">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === 'achievements' ? (
          achievements.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-10 w-10" />}
              title="No achievements yet"
              description="Awards and achievements earned by this club will appear here."
            />
          ) : (
            <div className="space-y-3">
              {achievements.map((ach: any) => (
                <div key={ach.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{ach.title}</h4>
                      {ach.achievement_type && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium capitalize text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {ach.achievement_type}
                        </span>
                      )}
                    </div>
                    {ach.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{ach.description}</p>}
                    {ach.achieved_date && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Achieved {formatDateOnly(ach.achieved_date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'members' ? (
          members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No members yet"
              description="Students who join this club will appear here."
            />
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => {
                const customRoles = Array.isArray(m.roles) ? m.roles : [];
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                    <Avatar src={m.user_avatar} name={m.user_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.user_name || 'Unknown'}</p>
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                        {[m.department_name, m.year ? `${m.year} year` : null, m.register_number].filter(Boolean).join(' · ') || m.user_email || 'Member'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {customRoles.map((r: string) => (
                        <span key={r} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {r}
                        </span>
                      ))}
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        m.role === 'owner'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : m.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : m.role || 'Member'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      {/* Join Modal */}
      {joinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setJoinModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Join {club.name}</h3>
              <button onClick={() => setJoinModal(false)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {club.approval_mode === 'auto' ? 'You will be added immediately.' : 'Your request will be sent to the club admin for approval.'}
            </p>
            {club.approval_mode === 'manual' && (
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Why do you want to join? (optional)"
                rows={3}
                className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
              />
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setJoinModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleJoin} disabled={joining} className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                {joining ? 'Submitting...' : club.approval_mode === 'auto' ? 'Join Now' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedEvent.banner_url ? (
                <img src={selectedEvent.banner_url} alt="" className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-sky-400 to-blue-600">
                  <Calendar className="h-8 w-8 text-white/60" />
                </div>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatEventDate(selectedEvent.event_date)}</span>
                {selectedEvent.end_date && (
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Ends {formatEventDate(selectedEvent.end_date)}</span>
                )}
                {selectedEvent.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedEvent.venue}</span>}
              </div>
              {selectedEvent.event_type && (
                <span className="mt-3 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs capitalize text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  {selectedEvent.event_type}
                </span>
              )}
              {selectedEvent.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{selectedEvent.description}</p>
              )}
              <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700">
                Organized by {club.name}
                {selectedEvent.creator_name ? ` · ${selectedEvent.creator_name}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
