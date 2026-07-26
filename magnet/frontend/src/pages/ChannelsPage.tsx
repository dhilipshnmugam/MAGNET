import { useState, useEffect } from 'react';
import { channelService } from '../services';
import { Channel } from '../types';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { Hash, Plus, Users, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ChannelsPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    channelService.list().then((res) => { setChannels(res.data.data || []); setLoading(false); });
  }, []);

  const handleJoin = async (channelId: string) => {
    try {
      await channelService.join(channelId);
      setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
      toast.success('Joined channel');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to join'); }
  };

  const handleLeave = async (channelId: string) => {
    try {
      await channelService.leave(channelId);
      setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) } : c));
      toast.success('Left channel');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to leave'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Channels</h1>
        {(user?.role === 'department_admin' || user?.role === 'super_admin' || user?.role === 'club_admin') && (
          <button className="btn-primary"><Plus className="h-4 w-4" /> Create Channel</button>
        )}
      </div>

      {channels.length === 0 ? (
        <EmptyState icon={<Hash className="h-12 w-12" />} title="No channels" description="Be the first to create a channel!" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch) => (
            <div key={ch.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 font-bold text-lg">
                    {ch.type === 'private' ? <Lock className="h-5 w-5" /> : '#'}
                  </div>
                  <div>
                    <p className="font-semibold">{ch.name}</p>
                    <p className="text-xs text-gray-500">{ch.member_count} members</p>
                  </div>
                </div>
              </div>
              {ch.description && <p className="mt-2 text-sm text-gray-500 line-clamp-2">{ch.description}</p>}
              <div className="mt-4">
                {ch.is_member ? (
                  <button onClick={() => handleLeave(ch.id)} className="btn-secondary w-full text-sm">Leave</button>
                ) : (
                  <button onClick={() => handleJoin(ch.id)} className="btn-primary w-full text-sm">Join</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
