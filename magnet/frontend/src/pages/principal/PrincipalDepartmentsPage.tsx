import { useState, useEffect } from 'react';
import { analyticsService, DeptPerformance } from '../../services/analyticsService';
import { PageLoader } from '../../components/common/Loader';
import { ChartCard, SimpleBarChart } from '../../components/charts';
import { Building2, Users, FileText, Trophy, ArrowLeft, TrendingUp } from 'lucide-react';
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Building2 className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Departments</p>
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
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold">{departments.reduce((s, d) => s + d.student_count, 0)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="text-2xl font-bold">{departments.reduce((s, d) => s + d.total_points, 0).toLocaleString()}</p>
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
            height={350}
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-gray-400">No data</div>
        )}
      </ChartCard>

      {/* Department Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-left font-medium text-gray-500">Rank</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Department</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Students</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Posts</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Events</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Clubs</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Points</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d, i) => (
                <tr key={d.department_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    {i < 3 ? (
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                        i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                      }`}>{i + 1}</span>
                    ) : (
                      <span className="text-gray-400 font-medium">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold">{d.department_name}</span>
                      <span className="ml-2 text-xs text-gray-400">({d.department_code})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">{d.student_count}</td>
                  <td className="px-6 py-4 text-right">{d.post_count}</td>
                  <td className="px-6 py-4 text-right">{d.event_count}</td>
                  <td className="px-6 py-4 text-right">{d.club_count}</td>
                  <td className="px-6 py-4 text-right font-bold text-sky-600">{d.total_points.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {departments.length === 0 && (
          <div className="py-12 text-center text-gray-400">No departments found</div>
        )}
      </div>
    </div>
  );
}
