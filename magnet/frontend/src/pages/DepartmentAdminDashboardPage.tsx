import { useState, useEffect } from 'react';
import { analyticsService, HodDashboard, HodSelfDashboard } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { departmentService, api } from '../services';
import { PageLoader } from '../components/common/Loader';
import { ChartCard, StatCard, SimpleBarChart } from '../components/charts';
import { GraduationCap, Users, Megaphone, Calendar, FileText, Heart, MessageCircle, TrendingUp, Building2, Trophy, BookOpen, Mail } from 'lucide-react';
import type { User } from '../types';
import { formatDateOnly } from '../utils/helpers';

export default function HodDashboardPage() {
  const { user } = useAuth();
  const [selfData, setSelfData] = useState<HodSelfDashboard | null>(null);
  const [deptData, setDeptData] = useState<HodDashboard | null>(null);
  const [deptInfo, setDeptInfo] = useState<any>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview');
  const [loading, setLoading] = useState(true);

  const fetchStudents = async (page: number = 1) => {
    if (!user?.department_id) return;
    setStudentsLoading(true);
    try {
      const res = await api.get(`/departments/${user.department_id}/students`, { params: { page, page_size: 20 } });
      setStudents(res.data.data || []);
      setStudentsTotal(res.data.total || 0);
      setStudentsPage(page);
    } catch {}
    setStudentsLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const selfRes = await analyticsService.getHodSelfDashboard();
        setSelfData(selfRes.data.data);
      } catch {}

      if (user?.department_id) {
        try {
          const deptRes = await analyticsService.getHodDashboard(user.department_id);
          setDeptData(deptRes.data.data);
        } catch {}

        try {
          const infoRes = await departmentService.getById(user.department_id);
          setDeptInfo(infoRes.data.data);
        } catch {}
      }

      setLoading(false);
    };
    load();
  }, [user?.department_id]);

  if (loading) return <PageLoader />;

  const dept = deptData?.department;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-purple-500" />
        <div>
          <h1 className="text-2xl font-bold">Department Dashboard</h1>
          {deptInfo && <p className="text-sm text-gray-500">{deptInfo.name} ({deptInfo.code})</p>}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'border-b-2 border-[#0095f6] text-[#0095f6]' : 'text-gray-500 hover:text-gray-700'}`}>
          Overview
        </button>
        <button onClick={() => { setActiveTab('students'); fetchStudents(); }} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'students' ? 'border-b-2 border-[#0095f6] text-[#0095f6]' : 'text-gray-500 hover:text-gray-700'}`}>
          Students ({dept?.students ?? studentsTotal})
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Department Overview Stats */}
          {dept && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Students" value={dept.students} icon={<Users className="h-5 w-5" />} color="bg-blue-500" />
              <StatCard label="Posts" value={dept.posts} icon={<FileText className="h-5 w-5" />} color="bg-pink-500" />
              <StatCard label="Clubs" value={dept.clubs} icon={<Building2 className="h-5 w-5" />} color="bg-cyan-500" />
              <StatCard label="Total Points" value={dept.total_points} icon={<Trophy className="h-5 w-5" />} color="bg-amber-500" />
            </div>
          )}

          {/* Personal Engagement Stats */}
          {selfData && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="My Posts" value={selfData.engagement.my_posts} icon={<FileText className="h-5 w-5" />} color="bg-violet-500" />
              <StatCard label="Total Likes" value={selfData.engagement.total_likes} icon={<Heart className="h-5 w-5" />} color="bg-rose-500" />
              <StatCard label="Total Comments" value={selfData.engagement.total_comments} icon={<MessageCircle className="h-5 w-5" />} color="bg-teal-500" />
              <StatCard label="My Clubs" value={selfData.channels.length} icon={<Megaphone className="h-5 w-5" />} color="bg-indigo-500" />
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {selfData && (
              <ChartCard title="My Posts Trend" subtitle="Posts per month (6 months)">
                {selfData.monthly_posts.length > 0 ? (
                  <SimpleBarChart data={selfData.monthly_posts} xKey="month" yKey="posts" color="#8b5cf6" height={280} />
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-gray-400">No posts yet</div>
                )}
              </ChartCard>
            )}

            {/* Top Students */}
            {deptData && deptData.top_students.length > 0 && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Trophy className="h-5 w-5 text-amber-500" /> Top Students
                </h2>
                <div className="space-y-2">
                  {deptData.top_students.slice(0, 5).map((s, i) => (
                    <div key={s.user_id} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                        }`}>{s.rank}</span>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.points} points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clubs & Events */}
          {selfData && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Megaphone className="h-5 w-5 text-cyan-500" /> My Clubs
                </h2>
                {selfData.channels.length === 0 ? (
                  <p className="text-sm text-gray-500">No clubs yet</p>
                ) : (
                  <div className="space-y-2">
                    {selfData.channels.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                          <p className="font-medium text-sm">{ch.name}</p>
                          <p className="text-xs text-gray-500">{ch.member_count} members</p>
                        </div>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{ch.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Calendar className="h-5 w-5 text-pink-500" /> My Events
                </h2>
                {selfData.events.length === 0 ? (
                  <p className="text-sm text-gray-500">No events created yet</p>
                ) : (
                  <div className="space-y-2">
                    {selfData.events.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                          <p className="font-medium text-sm">{e.title}</p>
                          <p className="text-xs text-gray-500">{formatDateOnly(e.event_date)}</p>
                        </div>
                        <span className="text-xs text-gray-500">{e.rsvp_count} RSVPs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Trend */}
          {deptData && deptData.activity_trend.length > 0 && (
            <ChartCard title="Department Activity Trend" subtitle="Daily activities (last 30 days)">
              <SimpleBarChart
                data={deptData.activity_trend.map(d => ({ month: d.day, posts: d.activities }))}
                xKey="month" yKey="posts" color="#8b5cf6" height={280}
              />
            </ChartCard>
          )}
        </>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" /> Department Students
            </h2>
            <p className="text-sm text-gray-500">{studentsTotal} student{studentsTotal !== 1 ? 's' : ''}</p>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="h-12 w-12 mb-3" />
              <p className="text-sm">No students in this department yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Register No</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4">College</th>
                      <th className="pb-3 pr-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 pr-4 font-medium">{s.full_name}</td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{s.register_number || '-'}</td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {s.email}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {s.year || '-'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{s.college_name || '-'}</td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">{formatDateOnly(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {studentsTotal > 20 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-gray-500">
                    Showing {(studentsPage - 1) * 20 + 1}-{Math.min(studentsPage * 20, studentsTotal)} of {studentsTotal}
                  </p>
                  <div className="flex gap-2">
                    <button disabled={studentsPage <= 1} onClick={() => fetchStudents(studentsPage - 1)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-800">
                      Previous
                    </button>
                    <button disabled={studentsPage * 20 >= studentsTotal} onClick={() => fetchStudents(studentsPage + 1)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-800">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
