import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Users, GraduationCap, FileText, Calendar, Trophy, Briefcase, ChevronRight, Clock, Award } from 'lucide-react';
import { departmentService } from '../services';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { cn } from '../utils/helpers';

type DeptTab = 'overview' | 'posts' | 'students' | 'faculty' | 'clubs' | 'events' | 'achievements';

const TABS: Array<{ key: DeptTab; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'students', label: 'Students', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', icon: Briefcase },
  { key: 'clubs', label: 'Clubs', icon: Users },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'achievements', label: 'Achievements', icon: Award },
];

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PersonRow({ person, onClick }: { person: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0095f6] to-indigo-500 text-sm font-bold text-white">
        {person.full_name?.[0] || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{person.full_name}</p>
        <p className="text-xs text-gray-500 truncate">
          {[person.register_number, person.year, `${person.points || 0} points`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

function ClubRow({ club, onClick }: { club: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
        {club.name?.[0] || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{club.name}</p>
        <p className="text-xs text-gray-500 truncate">{club.description || club.category || 'Club'}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

function EventRow({ event, onClick }: { event: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
        <Calendar className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{event.title}</p>
        <p className="text-xs text-gray-500 truncate">
          {[event.event_date ? new Date(event.event_date).toLocaleDateString() : null, event.organizer_name || event.creator_name, event.venue].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

export default function DepartmentDetailsPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<any>(null);
  const [tab, setTab] = useState<DeptTab>('overview');

  useEffect(() => {
    if (!departmentId) return;
    setLoading(true);
    departmentService.getById(departmentId)
      .then((res) => setDepartment(res.data.data))
      .catch(() => toast.error('Failed to load department'))
      .finally(() => setLoading(false));
  }, [departmentId]);

  const stats = useMemo(() => {
    if (!department) return [];
    return [
      { label: 'Students', value: department.total_students ?? department.student_count ?? 0, icon: GraduationCap },
      { label: 'Faculty', value: department.total_faculty ?? 0, icon: Briefcase },
      { label: 'Members', value: department.total_members ?? 0, icon: Users },
      { label: 'Posts', value: department.total_posts ?? 0, icon: FileText },
      { label: 'Events', value: department.total_events ?? 0, icon: Calendar },
      { label: 'Clubs', value: department.total_clubs ?? department.club_count ?? 0, icon: Building2 },
      { label: 'Points', value: department.total_points ?? 0, icon: Trophy },
    ];
  }, [department]);

  if (loading) return <PageLoader />;
  if (!department) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="Department not found" description="The department may be inactive or the link is invalid." />
      </div>
    );
  }

  const posts = department.posts || [];
  const students = department.students || [];
  const faculty = department.faculty || [];
  const clubs = department.clubs || [];
  const events = department.events || [];
  const achievements = department.achievements || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white shadow-xl dark:border-gray-800">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-sky-200">
                <Building2 className="h-3.5 w-3.5" /> Department Details
              </div>
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">{department.name}</h1>
                <p className="mt-2 text-sm text-sky-100/80">{department.code}{department.department_type ? ` · ${department.department_type}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-sky-50/90">
                {department.college_name && <span className="rounded-full bg-white/10 px-3 py-1">{department.college_name}</span>}
                {department.description && <span className="max-w-2xl rounded-full bg-white/10 px-3 py-1">{department.description}</span>}
              </div>
            </div>
            {user && (
              <button onClick={() => navigate('/search?tab=departments')} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
                Back to Search
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                tab === item.key ? 'bg-[#0095f6] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-3 font-semibold">Top Numbers</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Students</p><p className="text-xl font-bold">{department.total_students ?? 0}</p></div>
                    <div><p className="text-gray-500">Faculty</p><p className="text-xl font-bold">{department.total_faculty ?? 0}</p></div>
                    <div><p className="text-gray-500">Clubs</p><p className="text-xl font-bold">{department.total_clubs ?? 0}</p></div>
                    <div><p className="text-gray-500">Points</p><p className="text-xl font-bold">{department.total_points ?? 0}</p></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-3 font-semibold">Sections</h3>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>Posts, students, faculty, clubs, events, and achievements are pulled from the real department record.</p>
                    <p>Click any student, club, or event to open the existing profile or detail page.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'posts' && (
            <div className="space-y-3">
              {posts.length === 0 ? (
                <EmptyState icon={<FileText className="h-12 w-12" />} title="No posts yet" description="Posts from this department will appear here." />
              ) : posts.map((post: any) => (
                <div key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    <button onClick={() => post.author?.id && navigate(`/profile/${post.author.id}`)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0095f6] to-indigo-500 text-white">
                      {post.author?.full_name?.[0] || '?'}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => post.author?.id && navigate(`/profile/${post.author.id}`)} className="font-semibold hover:underline">{post.author?.full_name || 'Unknown'}</button>
                        <span className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{post.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div className="space-y-3">
              {students.length === 0 ? (
                <EmptyState icon={<GraduationCap className="h-12 w-12" />} title="No students found" description="Students from this department will appear here." />
              ) : students.map((student: any) => (
                <PersonRow key={student.id} person={student} onClick={() => navigate(`/profile/${student.id}`)} />
              ))}
            </div>
          )}

          {tab === 'faculty' && (
            <div className="space-y-3">
              {faculty.length === 0 ? (
                <EmptyState icon={<Briefcase className="h-12 w-12" />} title="No faculty found" description="Faculty members from this department will appear here." />
              ) : faculty.map((member: any) => (
                <PersonRow key={member.id} person={member} onClick={() => navigate(`/profile/${member.id}`)} />
              ))}
            </div>
          )}

          {tab === 'clubs' && (
            <div className="space-y-3">
              {clubs.length === 0 ? (
                <EmptyState icon={<Users className="h-12 w-12" />} title="No clubs found" description="Department clubs will appear here." />
              ) : clubs.map((club: any) => (
                <ClubRow key={club.id} club={club} onClick={() => navigate(`/clubs/${club.id}`)} />
              ))}
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} title="No events found" description="Department events will appear here." />
              ) : events.map((event: any) => (
                <EventRow key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
              ))}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="space-y-3">
              {achievements.length === 0 ? (
                <EmptyState icon={<Trophy className="h-12 w-12" />} title="No achievements found" description="Department achievements will appear here." />
              ) : achievements.map((post: any) => (
                <div key={post.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <div className="flex items-start gap-3">
                    <Trophy className="mt-1 h-5 w-5 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{post.title || 'Achievement'}</p>
                      {post.content && <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{post.content}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}