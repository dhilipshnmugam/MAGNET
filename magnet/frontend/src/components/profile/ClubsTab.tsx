import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubManagementService, clubRoleService } from '../../services';
import { Users, Award, Calendar, ExternalLink, ChevronRight, UserPlus } from 'lucide-react';

interface ClubTabProps {
  userId?: string;
}

export default function ClubsTab({ userId }: ClubTabProps) {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClubs();
  }, [userId]);

  const loadClubs = async () => {
    setLoading(true);
    try {
      const res = await clubManagementService.getMyClubs();
      const data = res.data?.data || [];
      const enriched = await Promise.all(
        data.map(async (c: any) => {
          try {
            const r = await clubRoleService.listRoles(c.id);
            const rolesData = r.data?.members || [];
            const myRoles = rolesData.find((m: any) => m.user_id === userId)?.roles || [];
            return { ...c, myRoles: myRoles.map((rl: any) => rl.role) };
          } catch {
            return { ...c, myRoles: [] };
          }
        })
      );
      setClubs(enriched);
    } catch (err) {
      console.error('Failed to load clubs', err);
    } finally {
      setLoading(false);
    }
  };

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
        <p className="mt-3 text-sm font-medium text-gray-500">No clubs yet</p>
        <p className="text-xs text-gray-400">Join a club to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clubs.map((club: any) => (
        <div
          key={club.id}
          onClick={() => navigate(`/clubs/${club.id}`)}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-[#0095f6] hover:shadow-sm dark:border-gray-700"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0095f6] to-indigo-500 text-lg font-bold text-white">
            {(club.name || '?')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{club.name}</p>
            <p className="truncate text-xs text-gray-500">{club.description || club.category || ''}</p>
            {club.myRoles?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {club.myRoles.map((role: string) => (
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
