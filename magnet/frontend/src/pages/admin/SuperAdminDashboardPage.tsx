import { useState, useEffect } from 'react';
import { analyticsService, PrincipalDashboard, MonthlyStats, GrowthData, ActivityDay } from '../../services/analyticsService';
import { adminService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import {
  ChartCard, StatCard, SimpleBarChart, SimpleLineChart, SimpleAreaChart,
  SimplePieChart, MultiBarChart,
} from '../../components/charts';
import {
  Shield, Users, FileText, Hash, Calendar, UserCheck, Clock,
  TrendingUp, Activity, BarChart3,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.dashboard().catch(() => ({ data: { data: null } })),
      analyticsService.getStudentGrowth(12).catch(() => ({ data: { data: [] } })),
      analyticsService.getActivityGraph(30).catch(() => ({ data: { data: [] } })),
      analyticsService.getMonthlyStatistics().catch(() => ({ data: { data: null } })),
    ]).then(([s, g, a, m]) => {
      setStats(s.data.data);
      setGrowth(g.data.data || []);
      setActivity(a.data.data || []);
      setMonthly(m.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;
  if (!stats) return <div className="text-center py-10 text-gray-500">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Total Users', value: stats.total_users, icon: <Users className="h-5 w-5" />, color: 'bg-blue-500', change: monthly?.growth?.students },
    { label: 'Posts', value: stats.total_posts, icon: <FileText className="h-5 w-5" />, color: 'bg-green-500', change: monthly?.growth?.posts },
    { label: 'Clubs', value: stats.total_channels, icon: <Hash className="h-5 w-5" />, color: 'bg-cyan-500' },
    { label: 'Events', value: stats.total_events, icon: <Calendar className="h-5 w-5" />, color: 'bg-pink-500', change: monthly?.growth?.events },
    { label: 'Active Users', value: stats.active_users, icon: <UserCheck className="h-5 w-5" />, color: 'bg-emerald-500' },
    { label: 'Pending Approvals', value: stats.pending_approvals, icon: <Clock className="h-5 w-5" />, color: 'bg-yellow-500' },
  ];

  const userPieData = [
    { name: 'Students', value: stats.total_students || 0 },
    { name: 'Faculty', value: stats.total_faculty || 0 },
    { name: 'Admins', value: stats.total_admins || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-red-500" />
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} change={s.change} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Growth */}
        <ChartCard title="Student Growth" subtitle="Monthly registrations (12 months)">
          <SimpleBarChart data={growth} xKey="month" yKey="count" color="#6366f1" height={280} />
        </ChartCard>

        {/* User Distribution */}
        <ChartCard title="User Distribution" subtitle="By role">
          {userPieData.length > 0 ? (
            <SimplePieChart data={userPieData} dataKey="value" nameKey="name" height={280} />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Graph */}
        <ChartCard title="Activity Graph" subtitle="Daily platform activity (30 days)">
          <MultiBarChart
            data={activity}
            xKey="day"
            bars={[
              { key: 'posts', color: '#6366f1', name: 'Posts' },
              { key: 'comments', color: '#06b6d4', name: 'Comments' },
              { key: 'likes', color: '#f59e0b', name: 'Likes' },
            ]}
            height={280}
          />
        </ChartCard>

        {/* Monthly Comparison */}
        <ChartCard title="Monthly Comparison" subtitle="Current vs Previous month">
          {monthly ? (
            <div className="space-y-4">
              {Object.entries(monthly.current_month).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${Math.min((val as number) / ((monthly.previous_month[key] as number) || 1) * 50, 100)}%` }}
                    />
                  </div>
                  {monthly.growth[key] !== undefined && (
                    <p className={`text-xs mt-0.5 ${monthly.growth[key] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {monthly.growth[key] >= 0 ? '+' : ''}{monthly.growth[key]}% vs last month
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Recent Users */}
      {stats.recent_users?.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" /> Recent Users
          </h2>
          <div className="space-y-2">
            {stats.recent_users.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
                  {u.full_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.full_name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="badge bg-gray-100 text-gray-600 text-xs capitalize dark:bg-gray-700 dark:text-gray-300">{u.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
