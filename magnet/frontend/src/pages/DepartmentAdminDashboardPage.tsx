import { useState, useEffect } from 'react';
import { analyticsService, HodSelfDashboard } from '../services/analyticsService';
import { PageLoader } from '../components/common/Loader';
import { ChartCard, StatCard, SimpleBarChart } from '../components/charts';
import { GraduationCap, Users, Megaphone, Calendar, FileText, Heart, MessageCircle, TrendingUp } from 'lucide-react';

export default function HodDashboardPage() {
  const [data, setData] = useState<HodSelfDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getHodSelfDashboard()
      .then((res) => { setData(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <div className="text-center py-10 text-gray-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-purple-500" />
        <h1 className="text-2xl font-bold">Department Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Posts" value={data.engagement.my_posts} icon={<FileText className="h-5 w-5" />} color="bg-blue-500" />
        <StatCard label="Total Likes" value={data.engagement.total_likes} icon={<Heart className="h-5 w-5" />} color="bg-pink-500" />
        <StatCard label="Total Comments" value={data.engagement.total_comments} icon={<MessageCircle className="h-5 w-5" />} color="bg-cyan-500" />
        <StatCard label="Channels" value={data.channels.length} icon={<Users className="h-5 w-5" />} color="bg-purple-500" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Posts */}
        <ChartCard title="My Posts Trend" subtitle="Posts per month (6 months)">
          {data.monthly_posts.length > 0 ? (
            <SimpleBarChart data={data.monthly_posts} xKey="month" yKey="posts" color="#8b5cf6" height={280} />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-gray-400">No posts yet</div>
          )}
        </ChartCard>

        {/* Engagement Overview */}
        <ChartCard title="Engagement Overview">
          <div className="flex h-[280px] items-center justify-center">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-500">{data.engagement.my_posts}</p>
                <p className="text-sm text-gray-500 mt-1">Posts</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-pink-500">{data.engagement.total_likes}</p>
                <p className="text-sm text-gray-500 mt-1">Likes</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-500">{data.engagement.total_comments}</p>
                <p className="text-sm text-gray-500 mt-1">Comments</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Channels & Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Channels */}
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-cyan-500" /> My Channels
          </h2>
          {data.channels.length === 0 ? (
            <p className="text-sm text-gray-500">No channels yet</p>
          ) : (
            <div className="space-y-2">
              {data.channels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="font-medium text-sm">{ch.name}</p>
                    <p className="text-xs text-gray-500">{ch.member_count} members</p>
                  </div>
                  <span className="badge bg-primary-100 text-primary-700 text-xs">{ch.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Events */}
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Calendar className="h-5 w-5 text-pink-500" /> My Events
          </h2>
          {data.events.length === 0 ? (
            <p className="text-sm text-gray-500">No events created yet</p>
          ) : (
            <div className="space-y-2">
              {data.events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-gray-500">{e.rsvp_count} RSVPs</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
