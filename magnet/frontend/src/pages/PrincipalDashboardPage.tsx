import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  analyticsService, PrincipalDashboard as PrincipalDashboardType,
  GrowthData, DeptPerformance, ActivityDay, EventParticipation, MonthlyStats,
} from '../services/analyticsService';
import { PageLoader } from '../components/common/Loader';
import {
  ChartCard, StatCard, SimpleBarChart, SimpleAreaChart,
  SimplePieChart, MultiBarChart,
} from '../components/charts';
import {
  Crown, Users, FileText, Hash, Calendar, TrendingUp,
  Building2, GraduationCap, Trophy, Activity, Megaphone,
  ChevronRight, Eye,
} from 'lucide-react';

export default function PrincipalDashboardPage() {
  const [principal, setPrincipal] = useState<PrincipalDashboardType | null>(null);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [deptPerf, setDeptPerf] = useState<DeptPerformance[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [events, setEvents] = useState<EventParticipation[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.getPrincipalDashboard().catch(() => ({ data: { data: null } })),
      analyticsService.getStudentGrowth(12).catch(() => ({ data: { data: [] } })),
      analyticsService.getDepartmentPerformance().catch(() => ({ data: { data: [] } })),
      analyticsService.getActivityGraph(30).catch(() => ({ data: { data: [] } })),
      analyticsService.getEventParticipation(6).catch(() => ({ data: { data: [] } })),
      analyticsService.getMonthlyStatistics().catch(() => ({ data: { data: null } })),
    ]).then(([p, g, d, a, e, m]) => {
      setPrincipal(p.data.data);
      setGrowth(g.data.data || []);
      setDeptPerf(d.data.data || []);
      setActivity(a.data.data || []);
      setEvents(e.data.data || []);
      setMonthly(m.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;
  if (!principal) return <div className="text-center py-10 text-gray-500">Failed to load dashboard</div>;

  const ov = principal.overview;

  const statCards = [
    { label: 'Total Users', value: ov.total_users, icon: <Users className="h-5 w-5" />, color: 'bg-sky-500', change: monthly?.growth?.students },
    { label: 'Students', value: ov.total_students, icon: <GraduationCap className="h-5 w-5" />, color: 'bg-blue-500' },
    { label: 'Faculty', value: ov.total_faculty, icon: <Users className="h-5 w-5" />, color: 'bg-indigo-500' },
    { label: 'Posts', value: ov.total_posts, icon: <FileText className="h-5 w-5" />, color: 'bg-cyan-500', change: monthly?.growth?.posts },
    { label: 'Events', value: ov.total_events, icon: <Calendar className="h-5 w-5" />, color: 'bg-teal-500', change: monthly?.growth?.events },
    { label: 'Clubs', value: ov.total_clubs, icon: <Trophy className="h-5 w-5" />, color: 'bg-violet-500' },
    { label: 'Departments', value: ov.total_departments, icon: <Building2 className="h-5 w-5" />, color: 'bg-rose-500' },
  ];

  const userPieData = [
    { name: 'Students', value: ov.total_students },
    { name: 'Faculty', value: ov.total_faculty },
    { name: 'Admins', value: ov.total_admins },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Principal Dashboard</h1>
            <p className="text-sm text-gray-500">Campus-wide monitoring & analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            <Eye className="h-3.5 w-3.5" /> Read-only
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/principal/departments', icon: Building2, label: 'Departments', color: 'from-sky-500 to-blue-600' },
          { to: '/principal/clubs', icon: Trophy, label: 'Clubs', color: 'from-indigo-500 to-violet-600' },
          { to: '/principal/announcements', icon: Megaphone, label: 'Announcements', color: 'from-teal-500 to-emerald-600' },
          { to: '/principal/leaderboard', icon: TrendingUp, label: 'Leaderboard', color: 'from-orange-500 to-rose-600' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-sky-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-sky-700"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} text-white`}>
              <link.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{link.label}</span>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-sky-500" />
          </Link>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} change={s.change} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Student Growth" subtitle="Monthly registrations (12 months)">
          <SimpleAreaChart
            data={growth}
            xKey="month"
            areas={[{ key: 'count', color: '#0ea5e9', name: 'Students' }]}
            height={300}
          />
        </ChartCard>

        <ChartCard title="User Distribution" subtitle="By role">
          {userPieData.length > 0 ? (
            <SimplePieChart data={userPieData} dataKey="value" nameKey="name" height={300} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Department Performance" subtitle="Points by department">
          {principal.department_performance.length > 0 ? (
            <SimpleBarChart
              data={principal.department_performance}
              xKey="code"
              yKey="points"
              color="#0ea5e9"
              height={300}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>

        <ChartCard title="Activity Graph" subtitle="Daily activity (30 days)">
          <MultiBarChart
            data={activity}
            xKey="day"
            bars={[
              { key: 'posts', color: '#0ea5e9', name: 'Posts' },
              { key: 'comments', color: '#06b6d4', name: 'Comments' },
              { key: 'likes', color: '#f59e0b', name: 'Likes' },
              { key: 'events', color: '#8b5cf6', name: 'Events' },
            ]}
            height={300}
          />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Event Participation" subtitle="Monthly events and RSVPs (6 months)">
          {events.length > 0 ? (
            <MultiBarChart
              data={events}
              xKey="month"
              bars={[
                { key: 'events_created', color: '#0ea5e9', name: 'Events' },
                { key: 'rsvps_going', color: '#22c55e', name: 'Going' },
                { key: 'rsvps_interested', color: '#f59e0b', name: 'Interested' },
              ]}
              height={300}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-400">No events data</div>
          )}
        </ChartCard>

        <ChartCard title="Monthly Statistics" subtitle="Growth comparison">
          {monthly ? (
            <div className="space-y-4">
              {Object.entries(monthly.current_month).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{monthly.previous_month[key]}</span>
                      <span className="font-medium">{val}</span>
                      {monthly.growth[key] !== undefined && (
                        <span className={`text-xs ${monthly.growth[key] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {monthly.growth[key] >= 0 ? '+' : ''}{monthly.growth[key]}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.min(((val as number) / Math.max(monthly.previous_month[key] as number, 1)) * 50, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Department Table */}
      {principal.department_performance.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-500" /> Department Rankings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="pb-3 text-left font-medium text-gray-500">Rank</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Department</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Students</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Posts</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Points</th>
                </tr>
              </thead>
              <tbody>
                {principal.department_performance.map((d, i) => (
                  <tr key={d.code} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 font-bold text-gray-400">{i + 1}</td>
                    <td className="py-3">
                      <span className="font-medium">{d.name}</span>
                      <span className="ml-2 text-xs text-gray-400">({d.code})</span>
                    </td>
                    <td className="py-3 text-right">{d.students}</td>
                    <td className="py-3 text-right">{d.posts}</td>
                    <td className="py-3 text-right font-semibold text-sky-600">{d.points.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
