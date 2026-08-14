import { useState, useEffect, useRef } from 'react';
import {
  leaderboardService,
  LeaderboardEntry,
  ClubRankingEntry,
  DepartmentRankingEntry,
  PeriodRankingEntry,
  EntityType,
  PeriodType,
} from '../services/leaderboardService';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { Trophy, Medal, Flame, Users, Building2, Crown, ChevronDown, Calendar, TrendingUp, BarChart3, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/helpers';

type Tab = 'students' | 'clubs' | 'departments';
type Period = 'overall' | 'weekly' | 'monthly' | 'yearly';

const POINT_RULES = [
  { action: 'Create Post', points: '+10', icon: '📝' },
  { action: 'Event Created', points: '+20', icon: '📅' },
  { action: 'Club Activity', points: '+30', icon: '🏛️' },
  { action: 'Post Liked', points: '+2', icon: '❤️' },
  { action: 'Add Comment', points: '+3', icon: '💬' },
  { action: 'Daily Login', points: '+5', icon: '🔑' },
];

const PERIOD_LABELS: Record<Period, { label: string; icon: any }> = {
  overall: { label: 'All Time', icon: Trophy },
  weekly: { label: 'This Week', icon: Calendar },
  monthly: { label: 'This Month', icon: BarChart3 },
  yearly: { label: 'This Year', icon: TrendingUp },
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('students');
  const [period, setPeriod] = useState<Period>('overall');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const requestKeyRef = useRef('');

  useEffect(() => {
    loadRankings();
  }, [tab, period]);

  async function loadRankings() {
    const key = `${tab}:${period}`;
    if (requestKeyRef.current === key) return;
    requestKeyRef.current = key;
    setLoading(true);
    setEntries([]);
    setError(null);
    try {
      const entityType: EntityType = tab === 'students' ? 'user' : tab === 'clubs' ? 'club' : 'department';
      const limit = 50;

      let res;
      if (period === 'overall') res = await leaderboardService.getOverall(entityType, limit);
      else if (period === 'weekly') res = await leaderboardService.getWeekly(entityType, limit);
      else if (period === 'monthly') res = await leaderboardService.getMonthly(entityType, limit);
      else res = await leaderboardService.getYearly(entityType, limit);

      setEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Leaderboard load failed:', err);
      setError('Could not load the leaderboard. Please check your connection and try again.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  const getMedal = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400 w-5 text-center">{rank}</span>;
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'students', label: 'Students', icon: Users },
    { key: 'clubs', label: 'Clubs', icon: Trophy },
    { key: 'departments', label: 'Departments', icon: Building2 },
  ];

  const periods: Period[] = ['overall', 'weekly', 'monthly', 'yearly'];

  const getPointsLabel = (entry: any): number => {
    const value = period === 'overall' ? entry?.total_points : entry?.points_earned;
    return typeof value === 'number' ? value : 0;
  };

  const getName = (entry: any) => {
    return entry.user_name || entry.club_name || entry.department_name || entry.name || 'Unknown';
  };

  const getIcon = (entry: any) => {
    return entry.user_avatar || entry.club_icon || entry.department_code || entry.icon;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-yellow-500" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <button onClick={() => setShowRules(!showRules)} className="btn-ghost text-sm">
          How Points Work <ChevronDown className={cn('h-4 w-4 transition-transform', showRules && 'rotate-180')} />
        </button>
      </div>

      {/* Point Rules */}
      {showRules && (
        <div className="card p-5 space-y-3 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary-500" /> Point System
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {POINT_RULES.map((rule) => (
              <div key={rule.action} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                <span>{rule.icon}</span>
                <span className="flex-1">{rule.action}</span>
                <span className="font-bold text-primary-600">{rule.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Entity Type */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (tab !== t.key) {
                setTab(t.key);
                setLoading(true);
                setEntries([]);
              }
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabs: Period */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {periods.map((p) => {
          const meta = PERIOD_LABELS[p];
          return (
            <button
              key={p}
              onClick={() => {
                if (period !== p) {
                  setPeriod(p);
                  setLoading(true);
                  setEntries([]);
                }
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                period === p
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
              )}
            >
              <meta.icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-red-500" />}
          title="Something went wrong"
          description={error}
          action={
            <button onClick={loadRankings} className="btn-primary mt-4">
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title="No leaderboard data available for this period."
          description="Points will appear as users engage with the platform."
        />
      ) : (
        <div className="space-y-3">
          {/* Podium (top 3) */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-4 py-6">
              {[1, 0, 2].map((idx) => {
                const entry = entries[idx];
                if (!entry) return null;
                const isTop = idx === 0;
                return (
                  <div key={idx} className={cn('flex flex-col items-center gap-2', isTop && 'order-first')}>
                    <div className={cn('rounded-full p-1', isTop ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                      {getMedal(entry.rank)}
                    </div>
                    <Avatar src={getIcon(entry)} name={getName(entry)} size={isTop ? 'lg' : 'md'} />
                    <p className={cn('text-center text-xs font-semibold max-w-[80px] truncate', isTop && 'text-sm')}>{getName(entry)}</p>
                    <p className="text-sm font-bold text-primary-600">{getPointsLabel(entry)}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          {entries.map((entry, i) => (
            <div
              key={entry.entity_id || entry.user_id || entry.club_id || entry.department_id || i}
              className={cn(
                'card flex items-center gap-4 p-4 transition-all hover:shadow-md',
                (entry.user_id === user?.id) && 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
              )}
            >
              <div className="w-8 flex-shrink-0 text-center">
                {getMedal(entry.rank)}
              </div>

              {tab === 'students' && <Avatar src={entry.user_avatar} name={getName(entry)} />}
              {tab === 'clubs' && (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 text-lg">
                  🏛️
                </div>
              )}
              {tab === 'departments' && (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-magnet-100 text-magnet-600 font-bold text-sm">
                  {entry.department_code || entry.icon || 'D'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{getName(entry)}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {entry.streak_days > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" /> {entry.streak_days}d streak
                    </span>
                  )}
                  {entry.activity_count !== undefined && <span>{entry.activity_count} activities</span>}
                  {entry.active_members !== undefined && <span>{entry.active_members} active</span>}
                  {entry.student_count !== undefined && <span>{entry.student_count} students</span>}
                  {entry.club_count !== undefined && <span>{entry.club_count} clubs</span>}
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-primary-600">{getPointsLabel(entry).toLocaleString()}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
