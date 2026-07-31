import { useState, useEffect } from 'react';
import { analyticsService } from '../../services';
import { BarChart3, TrendingUp, Activity, Clock, Eye, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';

function Heatmap({ data, year }: { data: Record<string, { count: number; hours: number }>; year: number }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 3) return 'bg-green-200 dark:bg-green-900';
    if (count <= 6) return 'bg-green-400 dark:bg-green-700';
    if (count <= 10) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const weeks: Date[][] = [];
  let week: Date[] = [];
  const firstDow = startDate.getDay();
  for (let i = 0; i < firstDow; i++) week.push(new Date(year - 1, 11, 31 - firstDow + i + 1));
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      const last = week[week.length - 1];
      week.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    weeks.push(week);
  }

  const key = (d: Date) => d.toISOString().split('T')[0];
  const monthLabels: { index: number; label: string }[] = [];
  weeks.forEach((w, wi) => {
    const first = w.find((d) => d.getFullYear() === year);
    if (first && !monthLabels.some((m) => m.label === months[first.getMonth()])) {
      monthLabels.push({ index: wi, label: months[first.getMonth()] });
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5" style={{ minWidth: weeks.length * 14 }}>
        <div className="mr-1 flex flex-col gap-0.5">
          {['Mon', '', 'Wed', '', 'Fri', ''].map((d) => (
            <div key={d} className="h-3 text-[8px] text-gray-400">{d}</div>
          ))}
        </div>
        <div>
          <div className="mb-1 flex gap-0.5">
            {monthLabels.map((m) => (
              <div key={m.label} className="text-[8px] text-gray-400" style={{ marginLeft: m.index > 0 ? `${(m.index - (monthLabels.findIndex((p) => p.index < m.index))) * 14 - 4}px` : '0' }}>
                {m.label}
              </div>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex gap-0.5">
              {weeks.map((w, wi) => {
                const d = w[row];
                const k = key(d);
                const entry = data[k];
                const count = entry?.count || 0;
                return (
                  <div
                    key={`${wi}-${row}`}
                    className={`h-3 w-3 rounded-sm ${getIntensity(count)}`}
                    title={`${k}: ${count} actions, ${entry?.hours?.toFixed(1) || 0}h`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
        <span>Less</span>
        {[0, 3, 6, 10, 15].map((v) => (
          <div key={v} className={`h-3 w-3 rounded-sm ${getIntensity(v)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

interface AnalyticsTabProps {
  userId?: string;
}

export default function AnalyticsTab({ userId }: AnalyticsTabProps) {
  const [overview, setOverview] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, heatmapRes] = await Promise.allSettled([
        analyticsService.overview(),
        analyticsService.heatmap(),
      ]);
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
      if (heatmapRes.status === 'fulfilled') setHeatmapData(heatmapRes.value.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  const stats = overview || {};
  const hd = heatmapData?.data || {};
  const year = heatmapData?.year || new Date().getFullYear();

  const statCards = [
    { label: 'Posts', value: stats.posts || 0, icon: BarChart3, color: 'text-blue-500' },
    { label: 'Likes', value: stats.total_likes || 0, icon: ThumbsUp, color: 'text-red-500' },
    { label: 'Comments', value: stats.total_comments || 0, icon: MessageSquare, color: 'text-green-500' },
    { label: 'Shares', value: stats.total_shares || 0, icon: Share2, color: 'text-purple-500' },
    { label: 'Views', value: stats.total_views || 0, icon: Eye, color: 'text-amber-500' },
    { label: 'Projects', value: stats.projects || 0, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Clubs', value: stats.clubs || 0, icon: Activity, color: 'text-indigo-500' },
    { label: 'Points', value: stats.points || 0, icon: Clock, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 p-4 text-center dark:border-gray-700">
            <s.icon className={`mx-auto h-5 w-5 ${s.color}`} />
            <p className="mt-1 text-xl font-bold">{s.value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-green-500" />
          Activity Heatmap ({year})
        </h3>
        <Heatmap data={hd} year={year} />
      </div>
    </div>
  );
}
