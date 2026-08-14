import { useState, useEffect } from 'react';
import { analyticsService, ClubPerformance } from '../../services/analyticsService';
import { PageLoader } from '../../components/common/Loader';
import { ChartCard, SimpleBarChart } from '../../components/charts';
import { Trophy, Users, FileText, ArrowLeft, TrendingUp, Crown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';

export default function PrincipalClubsPage() {
  const [clubs, setClubs] = useState<ClubPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getClubPerformance()
      .then((res) => setClubs(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Trophy className="h-6 w-6 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold">Clubs</h1>
          <p className="text-sm text-gray-500">Monitor club activity and rankings</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Trophy className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Clubs</p>
              <p className="text-2xl font-bold">{clubs.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="text-2xl font-bold">{clubs.reduce((s, c) => s + c.member_count, 0)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="text-2xl font-bold">{clubs.reduce((s, c) => s + c.total_points, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ChartCard title="Club Points Comparison" subtitle="All clubs ranked by total points">
        {clubs.length > 0 ? (
          <SimpleBarChart
            data={clubs}
            xKey="club_name"
            yKey="total_points"
            color="#8b5cf6"
            height={350}
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-gray-400">No data</div>
        )}
      </ChartCard>

      {/* Club Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club, i) => (
          <div key={club.club_id} className="card p-5 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 font-bold text-lg">
                  {club.club_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="font-semibold">{club.club_name}</h3>
                  <p className="text-xs text-gray-500">{club.member_count} members</p>
                </div>
              </div>
              <span className={`inline-flex h-7 items-center justify-center rounded-full px-2 text-xs font-bold text-white ${
                club.rank === 1 ? 'bg-yellow-500' : club.rank === 2 ? 'bg-gray-400' : club.rank === 3 ? 'bg-amber-700' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                #{club.rank}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-violet-600">{club.total_points.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
              </div>
              <div>
                <p className="text-lg font-bold">{club.post_count}</p>
                <p className="text-xs text-gray-500">Posts</p>
              </div>
              <div>
                <p className="text-lg font-bold">{club.active_members}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>

            <Link
              to={`/clubs/${club.club_id}`}
              className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-violet-600 transition-colors hover:bg-violet-50 dark:bg-gray-800 dark:text-violet-400 dark:hover:bg-gray-700"
            >
              View Details <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
      {clubs.length === 0 && (
        <div className="py-12 text-center text-gray-400">No clubs found</div>
      )}
    </div>
  );
}
