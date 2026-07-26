import { useState, useEffect } from 'react';
import { analyticsService, ClubPerformance, ActivityDay } from '../services/analyticsService';
import { leaderboardService, ClubRankingEntry } from '../services/leaderboardService';
import { PageLoader } from '../components/common/Loader';
import { ChartCard, StatCard, SimpleBarChart, MultiBarChart } from '../components/charts';
import { BookOpen, Users, FileText, Trophy, TrendingUp, Activity, Star, Crown } from 'lucide-react';

export default function ClubDashboardPage() {
  const [clubs, setClubs] = useState<ClubPerformance[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [topClubs, setTopClubs] = useState<ClubRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.getClubPerformance().catch(() => ({ data: { data: [] } })),
      analyticsService.getActivityGraph(30).catch(() => ({ data: { data: [] } })),
      leaderboardService.getTopClubs(10).catch(() => ({ data: { data: [] } })),
    ]).then(([c, a, t]) => {
      setClubs(c.data.data || []);
      setActivity(a.data.data || []);
      setTopClubs(t.data.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  const totalMembers = clubs.reduce((sum, c) => sum + c.member_count, 0);
  const totalPosts = clubs.reduce((sum, c) => sum + c.post_count, 0);
  const totalPoints = clubs.reduce((sum, c) => sum + c.total_points, 0);
  const activeClubs = clubs.filter((c) => c.member_count > 0).length;

  const statCards = [
    { label: 'Total Clubs', value: clubs.length, icon: <BookOpen className="h-5 w-5" />, color: 'bg-emerald-500' },
    { label: 'Active Clubs', value: activeClubs, icon: <Activity className="h-5 w-5" />, color: 'bg-blue-500' },
    { label: 'Total Members', value: totalMembers, icon: <Users className="h-5 w-5" />, color: 'bg-purple-500' },
    { label: 'Total Posts', value: totalPosts, icon: <FileText className="h-5 w-5" />, color: 'bg-orange-500' },
    { label: 'Total Points', value: totalPoints, icon: <Trophy className="h-5 w-5" />, color: 'bg-yellow-500' },
  ];

  const clubBarData = clubs.slice(0, 10).map((c) => ({
    name: c.club_name.length > 12 ? c.club_name.slice(0, 12) + '...' : c.club_name,
    points: c.total_points,
    members: c.member_count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-emerald-500" />
        <h1 className="text-2xl font-bold">Club Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Club Points Ranking" subtitle="Top 10 clubs by total points">
          {clubBarData.length > 0 ? (
            <SimpleBarChart data={clubBarData} xKey="name" yKey="points" color="#10b981" height={320} />
          ) : (
            <div className="flex h-[320px] items-center justify-center text-gray-400">No club data yet</div>
          )}
        </ChartCard>

        <ChartCard title="Platform Activity" subtitle="Daily activity (30 days)">
          <MultiBarChart
            data={activity}
            xKey="day"
            bars={[
              { key: 'club_activities', color: '#10b981', name: 'Club Activities' },
              { key: 'posts', color: '#6366f1', name: 'Posts' },
              { key: 'comments', color: '#06b6d4', name: 'Comments' },
            ]}
            height={320}
          />
        </ChartCard>
      </div>

      {/* Charts Row 2: Club Rankings Table + Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* All Clubs Table */}
        <div className="card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" /> All Clubs
          </h2>
          {clubs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No clubs registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="pb-3 text-left font-medium text-gray-500">#</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Club</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Members</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Posts</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.slice(0, 10).map((c, i) => (
                    <tr key={c.club_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2.5">
                        {i === 0 ? <Crown className="h-4 w-4 text-yellow-500" /> : <span className="text-gray-400">{i + 1}</span>}
                      </td>
                      <td className="py-2.5 font-medium">{c.club_name}</td>
                      <td className="py-2.5 text-right">{c.member_count}</td>
                      <td className="py-2.5 text-right">{c.post_count}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">{c.total_points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard Top Clubs */}
        <div className="card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard Top Clubs
          </h2>
          {topClubs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No leaderboard data yet</p>
          ) : (
            <div className="space-y-2">
              {topClubs.map((entry, i) => (
                <div key={entry.club_id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
                    ${i === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                      i === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                    {i < 3 ? <Star className="h-4 w-4" /> : entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.club_name || 'Unknown Club'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{entry.total_points.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">pts</p>
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
