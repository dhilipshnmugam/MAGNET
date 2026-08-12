import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, Loader2, Users } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { userService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import type { UserListItem } from '../../types';
import toast from 'react-hot-toast';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  mode: 'followers' | 'following';
  onCountChange?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  department_admin: 'Faculty',
  super_admin: 'Admin',
  club_admin: 'Club Admin',
  principal: 'Principal',
};

export default function FollowersModal({ isOpen, onClose, userId, mode, onCountChange }: FollowersModalProps) {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [hasNext, setHasNext] = useState(false);

  const title = mode === 'followers' ? 'Followers' : 'Following';

  const load = useCallback(async (p: number, append: boolean) => {
    if (!userId) return;
    const fn = mode === 'followers' ? userService.getFollowers : userService.getFollowing;
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fn(userId, { page: p, page_size: 20 });
      const data = res.data.data || [];
      setItems((prev) => (append ? [...prev, ...data] : data));
      setTotal(res.data.total || 0);
      setHasNext(!!res.data.has_next);
      setPage(p);
      if (!append) {
        const map: Record<string, boolean> = {};
        data.forEach((u: UserListItem) => { map[u.id] = u.is_following; });
        setFollowMap(map);
      }
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, mode, title]);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setTotal(0);
      setFollowMap({});
      setPage(1);
      load(1, false);
    }
  }, [isOpen, load]);

  const isFollowing = (id: string) => followMap[id] ?? false;

  const handleToggle = async (target: UserListItem) => {
    if (busyId) return;
    setBusyId(target.id);
    const currentlyFollowing = isFollowing(target.id);
    try {
      if (currentlyFollowing) {
        await userService.unfollow(target.id);
        setFollowMap((m) => ({ ...m, [target.id]: false }));
      } else {
        await userService.follow(target.id);
        setFollowMap((m) => ({ ...m, [target.id]: true }));
      }
      onCountChange?.();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const renderButton = (u: UserListItem) => {
    if (authUser && u.id === authUser.id) return null;
    const following = isFollowing(u.id);
    const followBack = u.is_followed_by && !following;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleToggle(u); }}
        disabled={busyId === u.id}
        className={`flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          following
            ? 'border border-gray-300 text-gray-700 hover:border-red-300 hover:text-red-600 dark:border-gray-600 dark:text-gray-200 dark:hover:border-red-500'
            : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
        }`}
      >
        {busyId === u.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : following ? (
          <><Check className="h-3.5 w-3.5" /> Following</>
        ) : followBack ? (
          <><UserPlus className="h-3.5 w-3.5" /> Follow Back</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> Follow</>
        )}
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} (${total})`} size="sm">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <Users className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">{total === 0 ? `No ${title.toLowerCase()} yet` : 'Nothing to show'}</p>
        </div>
      ) : (
        <>
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((u) => (
              <div
                key={u.id}
                onClick={() => { onClose(); navigate(`/profile/${u.id}`); }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={u.avatar_url} name={u.full_name || 'U'} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.full_name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {ROLE_LABEL[u.role] || u.role}
                      {u.department_name ? ` · ${u.department_name}` : ''}
                    </p>
                  </div>
                </div>
                {renderButton(u)}
              </div>
            ))}
          </div>
          {hasNext && (
            <button
              onClick={() => load(page + 1, true)}
              disabled={loadingMore}
              className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
