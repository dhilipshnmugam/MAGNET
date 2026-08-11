import { useState, useEffect } from 'react';
import { analyticsService, DeptPerformance } from '../../services/analyticsService';
import { PageLoader } from '../../components/common/Loader';
import { ChartCard, SimpleBarChart } from '../../components/charts';
import { Building2, Users, GraduationCap, Activity, ArrowLeft, ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrincipalDepartmentsPage() {
  const [departments, setDepartments] = useState<DeptPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getDepartmentPerformance()
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const maxPoints = Math.max(1, ...departments.map((d) => d.total_points));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Building2 className="h-6 w-6 text-sky-600" />
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-gray-500">Monitor department performance across campus</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Building2 className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-2xl font-bold">{departments.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students</p>
              <p className="text-2xl font-bold">{departments.reduce((s, d) => s + d.student_count, 0)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <GraduationCap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Faculty</p>
              <p className="text-2xl font-bold">{departments.reduce((s, d) => s + d.faculty_count, 0)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active (30d)</p>
              <p className="text-2xl font-bold">{departments.reduce((s, d) => s + d.active_users, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ChartCard title="Department Points Comparison" subtitle="All departments ranked by total points">
        {departments.length > 0 ? (
          <SimpleBarChart
            data={departments}
            xKey="department_code"
            yKey="total_points"
            color="#0ea5e9"
            height={320}
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center text-gray-400">No data</div>
        )}
      </ChartCard>

      {/* Department Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <div key={d.department_id} className="card p-5 transition-all hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 font-bold text-sky-600 text-lg">
                  {d.department_code?.charAt(0) || 'D'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{d.department_name}</h3>
                  <p className="text-xs text-gray-500">{d.department_code}</p>
                </div>
              </div>
              <span className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold text-white ${
                d.rank === 1 ? 'bg-yellow-500' : d.rank === 2 ? 'bg-gray-400' : d.rank === 3 ? 'bg-amber-700' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                #{d.rank}
              </span>
            </div>

            {/* Activity Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-sky-500" /> Points
                </span>
                <span className="font-bold text-sky-600">{d.total_points.toLocaleString()}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all"
                  style={{ width: `${Math.max(3, Math.round((d.total_points / maxPoints) * 100))}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{d.student_count}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
              <div>
                <p className="text-lg font-bold">{d.post_count}</p>
                <p className="text-xs text-gray-500">Posts</p>
              </div>
              <div>
                <p className="text-lg font-bold">{d.club_count}</p>
                <p className="text-xs text-gray-500">Clubs</p>
              </div>
            </div>

            <Link
              to={`/principal/departments/${d.department_id}`}
              className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-sky-600 transition-colors hover:bg-sky-50 dark:bg-gray-800 dark:text-sky-400 dark:hover:bg-gray-700"
            >
              View Details <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
      {departments.length === 0 && (
        <div className="py-12 text-center text-gray-400">No departments found</div>
      )}
    </div>
  );
}
