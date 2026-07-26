import { useState, useEffect } from 'react';
import { analyticsService, GrowthData, ActivityDay, MonthlyStats } from '../../services/analyticsService';
import { adminService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import {
  ChartCard, StatCard, SimpleBarChart, SimplePieChart, MultiBarChart,
} from '../../components/charts';
import { BarChart3, Users, FileText, Calendar, Hash } from 'lucide-react';

export default function AdminAnalyticsPage() {
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
  if (!stats) return <div className="py-10 text-center text-gray-500">Failed to load analytics</div>;

  const userPieData = [
    { name: 'Students', value: stats.total_students || 0 },
    { name: 'Faculty', value: stats.total_faculty || 0 },
    { name: 'Admins', value: stats.total_admins || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Users', value: stats.total_users, icon: <Users className="h-5 w-5" />, color: 'bg-blue-500' },
          { label: 'Posts', value: stats.total_posts, icon: <FileText className="h-5 w-5" />, color: 'bg-green-500' },
          { label: 'Channels', value: stats.total_channels, icon: <Hash className="h-5 w-5" />, color: 'bg-cyan-500' },
          { label: 'Events', value: stats.total_events, icon: <Calendar className="h-5 w-5" />, color: 'bg-pink-500' },
        ].map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Student Growth" subtitle="Monthly registrations (12 months)">
          <SimpleBarChart data={growth} xKey="month" yKey="count" color="#0ea5e9" height={280} />
        </ChartCard>
        <ChartCard title="User Distribution" subtitle="By role">
          {userPieData.length > 0 ? (
            <SimplePieChart data={userPieData} dataKey="value" nameKey="name" height={280} />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Activity Graph" subtitle="Daily platform activity (30 days)">
          <MultiBarChart
            data={activity}
            xKey="day"
            bars={[
              { key: 'posts', color: '#0ea5e9', name: 'Posts' },
              { key: 'comments', color: '#06b6d4', name: 'Comments' },
              { key: 'likes', color: '#f59e0b', name: 'Likes' },
            ]}
            height={280}
          />
        </ChartCard>
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
                    <div className="h-2 rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.min((val as number) / ((monthly.previous_month[key] as number) || 1) * 50, 100)}%` }} />
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
    </div>
  );
}
