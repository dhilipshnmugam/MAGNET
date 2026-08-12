import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { searchService, userService } from '../../services';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuggestionsSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await searchService.search('a', 'people', 1, 10);
        const data = res.data?.data?.users?.data || [];
        const others = data.filter((u: any) => u.id !== user?.id).slice(0, 5);
        setSuggestions(others);
      } catch {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [user?.id]);

  const handleToggle = async (s: any) => {
    if (busyId) return;
    setBusyId(s.id);
    const following = followMap[s.id] ?? false;
    try {
      if (following) {
        await userService.unfollow(s.id);
        setFollowMap((m) => ({ ...m, [s.id]: false }));
      } else {
        await userService.follow(s.id);
        setFollowMap((m) => ({ ...m, [s.id]: true }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="sticky top-[76px] py-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="md" />
          <div>
            <p className="text-sm font-semibold">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button className="text-xs font-semibold text-[#0095f6] hover:text-[#00376b]">
          Switch
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">Suggested for you</p>
        <button onClick={() => navigate('/search')} className="text-xs font-semibold text-gray-900 hover:text-gray-500 dark:text-white">See All</button>
      </div>

      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-xs text-gray-400">No suggestions yet</p>
        ) : (
          suggestions.map((s: any) => {
            const following = followMap[s.id] ?? false;
            return (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={s.avatar_url} name={s.full_name || 'U'} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{s.full_name}</p>
                    <p className="text-xs text-gray-500">{s.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(s)}
                  disabled={busyId === s.id}
                  className="text-xs font-semibold text-[#0095f6] hover:text-[#00376b]"
                >
                  {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 text-[11px] text-gray-300 dark:text-gray-600">
        <p className="flex flex-wrap gap-x-1">
          <span>About</span> · <span>Help</span> · <span>Press</span> · <span>API</span> · <span>Jobs</span> · <span>Privacy</span> · <span>Terms</span>
        </p>
        <p className="mt-3 uppercase">© 2026 Magnet from College</p>
      </div>
    </div>
  );
}
