import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import type { ProfileClub } from '../../types';

interface ClubsTabProps {
  clubs: ProfileClub[];
  loading?: boolean;
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  member: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  coordinator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  principal: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export default function ClubsTab({ clubs, loading }: ClubsTabProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm font-medium text-gray-500">No active clubs</p>
        <p className="text-xs text-gray-400">Join a club to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clubs.map((club) => (
        <div
          key={club.id}
          onClick={() => navigate(`/clubs/${club.id}`)}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-[#0095f6] hover:shadow-sm dark:border-gray-700"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0095f6] to-indigo-500 text-lg font-bold text-white">
            {(club.name || '?')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{club.name}</p>
              {club.role && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${ROLE_BADGE[club.role] || ROLE_BADGE.member}`}>
                  {club.role}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">{club.description || club.category || ''}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              {club.member_count > 0 && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {club.member_count} member{club.member_count !== 1 ? 's' : ''}</span>
              )}
              {club.department_name && <span>{club.department_name}</span>}
            </div>
            {club.roles && club.roles.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {club.roles.map((role: string) => (
                  <span key={role} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
        </div>
      ))}
    </div>
  );
}
