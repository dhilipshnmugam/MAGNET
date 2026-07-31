import { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, Zap, Award } from 'lucide-react';

interface AchievementsTabProps {
  userId?: string;
}

const MOCK_ACHIEVEMENTS = [
  { icon: Trophy, label: 'First Post', desc: 'Published your first post', unlocked: true, color: 'text-amber-500' },
  { icon: Medal, label: 'Popular', desc: 'Get 100 likes on a post', unlocked: false, color: 'text-blue-500' },
  { icon: Star, label: 'Commenter', desc: 'Leave 50 comments', unlocked: false, color: 'text-purple-500' },
  { icon: Target, label: 'Sharp Shooter', desc: 'Get 90%+ engagement rate', unlocked: false, color: 'text-red-500' },
  { icon: Zap, label: 'Consistent', desc: 'Post 7 days in a row', unlocked: false, color: 'text-green-500' },
  { icon: Award, label: 'Collaborator', desc: 'Join 3 projects', unlocked: false, color: 'text-indigo-500' },
];

export default function AchievementsTab({ userId }: AchievementsTabProps) {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOCK_ACHIEVEMENTS.map((ach) => (
          <div
            key={ach.label}
            className={`rounded-xl border p-4 text-center transition-all ${
              ach.unlocked
                ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'
                : 'border-gray-200 opacity-50 dark:border-gray-700'
            }`}
          >
            <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
              ach.unlocked ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <ach.icon className={`h-5 w-5 ${ach.unlocked ? ach.color : 'text-gray-400'}`} />
            </div>
            <p className={`text-sm font-semibold ${ach.unlocked ? '' : 'text-gray-400'}`}>{ach.label}</p>
            <p className="mt-0.5 text-[10px] text-gray-500">{ach.desc}</p>
            {!ach.unlocked && <p className="mt-1 text-[10px] font-medium text-gray-400">🔒 Locked</p>}
            {ach.unlocked && <p className="mt-1 text-[10px] font-medium text-amber-600">✅ Unlocked</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
