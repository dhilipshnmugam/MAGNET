import { useState, useEffect } from 'react';
import {
  leaderboardService,
  LeaderboardEntry,
  ClubRankingEntry,
  DepartmentRankingEntry,
  EntityType,
} from '../../services/leaderboardService';
import { PageLoader } from '../../components/common/Loader';
import { Trophy, Medal, Users, Building2, Crown, ArrowLeft, TrendingUp } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import { Link } from 'react-router-dom';

type Tab = 'students' | 'clubs' | 'departments';

export default function PrincipalLeaderboardPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [tab]);

  async function loadRankings() {
    setLoading(true);
    try {
      const entityType: EntityType = tab === 'students' ? 'user' : tab === 'clubs' ? 'club' : 'department';
      const res = await leaderboardService.getOverall(entityType, 50);
      setEntries(res.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <TrendingUp className="h-6 w-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-gray-500">Campus-wide rankings overview</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {(['students', 'clubs', 'departments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {t === 'students' && <Users className="h-4 w-4" />}
              {t === 'clubs' && <Trophy className="h-4 w-4" />}
              {t === 'departments' && <Building2 className="h-4 w-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div className="card overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No rankings available</div>
        ) : tab === 'students' ? (
          <div className="divide-y dark:divide-gray-800">
            {entries.map((entry: LeaderboardEntry, i: number) => (
              <div key={entry.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>{i + 1}</span>
                  ) : (
                    <span className="text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <Avatar src={entry.user_avatar} name={entry.user_name || 'Unknown'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.user_name}</p>
                  <p className="text-xs text-gray-500">{entry.streak_days} day streak</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">{entry.total_points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'clubs' ? (
          <div className="divide-y dark:divide-gray-800">
            {entries.map((entry: ClubRankingEntry, i: number) => (
              <div key={entry.club_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>{i + 1}</span>
                  ) : (
                    <span className="text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 font-bold">
                  {entry.club_name?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.club_name}</p>
                  <p className="text-xs text-gray-500">{entry.active_members || entry.member_count || 0} active members</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">{entry.total_points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{entry.total_posts} posts</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-800">
            {entries.map((entry: DepartmentRankingEntry, i: number) => (
              <div key={entry.department_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>{i + 1}</span>
                  ) : (
                    <span className="text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 font-bold">
                  {entry.department_code?.charAt(0) || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.department_name}</p>
                  <p className="text-xs text-gray-500">{entry.student_count || 0} students · {entry.club_count || 0} clubs</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">{entry.total_points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{entry.post_count || 0} posts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
