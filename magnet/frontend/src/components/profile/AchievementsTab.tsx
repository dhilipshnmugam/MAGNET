import { Trophy, Award, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { ProfileAchievement } from '../../types';

interface AchievementsTabProps {
  achievements: ProfileAchievement[];
  loading?: boolean;
}

export default function AchievementsTab({ achievements, loading }: AchievementsTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="py-16 text-center">
        <Award className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm font-medium text-gray-500">No achievements yet.</p>
        <p className="text-xs text-gray-400">Share an achievement post to showcase it here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((ach) => (
        <div
          key={ach.id}
          className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50/40 dark:border-amber-800 dark:from-amber-900/10 dark:to-transparent"
        >
          {ach.image_url && (
            <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img src={ach.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{ach.title || 'Achievement'}</p>
                {ach.achievement_type && (
                  <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {ach.achievement_type}
                  </span>
                )}
              </div>
            </div>
            {ach.description && (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{ach.description}</p>
            )}
            {ach.date && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar className="h-3 w-3" /> {format(new Date(ach.date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
