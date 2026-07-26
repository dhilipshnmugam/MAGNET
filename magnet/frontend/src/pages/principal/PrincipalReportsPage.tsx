import { useState, useEffect } from 'react';
import {
  analyticsService, MonthlyStats, GrowthData, ActivityDay, EventParticipation, DeptPerformance,
} from '../../services/analyticsService';
import { PageLoader } from '../../components/common/Loader';
import { ChartCard, SimpleAreaChart, MultiBarChart, SimpleBarChart, SimplePieChart } from '../../components/charts';
import { BarChart3, ArrowLeft, Download, TrendingUp, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrincipalReportsPage() {
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [events, setEvents] = useState<EventParticipation[]>([]);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);
  const [deptPerf, setDeptPerf] = useState<DeptPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.getStudentGrowth(12).catch(() => ({ data: { data: [] } })),
      analyticsService.getActivityGraph(30).catch(() => ({ data: { data: [] } })),
      analyticsService.getEventParticipation(6).catch(() => ({ data: { data: [] } })),
      analyticsService.getMonthlyStatistics().catch(() => ({ data: { data: null } })),
      analyticsService.getDepartmentPerformance().catch(() => ({ data: { data: [] } })),
    ]).then(([g, a, e, m, d]) => {
      setGrowth(g.data.data || []);
      setActivity(a.data.data || []);
      setEvents(e.data.data || []);
      setMonthly(m.data.data);
      setDeptPerf(d.data.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <BarChart3 className="h-6 w-6 text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">In-depth campus analytics and insights</p>
        </div>
      </div>

      {/* Monthly Stats */}
      {monthly && (
        <div className="card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-500" /> Monthly Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(monthly.current_month).map(([key, val]) => (
              <div key={key} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 capitalize">{key.replace('_', ' ')}</span>
                  {monthly.growth[key] !== undefined && (
                    <span className={`text-xs font-semibold ${monthly.growth[key] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {monthly.growth[key] >= 0 ? '+' : ''}{monthly.growth[key]}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold">{val}</p>
                <p className="text-xs text-gray-400">prev: {monthly.previous_month[key]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Student Growth Trend" subtitle="12-month registration trend">
          <SimpleAreaChart
            data={growth}
            xKey="month"
            areas={[{ key: 'count', color: '#0ea5e9', name: 'Students' }]}
            height={300}
          />
        </ChartCard>

        <ChartCard title="Campus Activity" subtitle="Daily breakdown (30 days)">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Event Participation" subtitle="Monthly trends">
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
            <div className="flex h-[300px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>

        <ChartCard title="Department Performance" subtitle="Points by department">
          {deptPerf.length > 0 ? (
            <SimpleBarChart
              data={deptPerf}
              xKey="department_code"
              yKey="total_points"
              color="#0ea5e9"
              height={300}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
