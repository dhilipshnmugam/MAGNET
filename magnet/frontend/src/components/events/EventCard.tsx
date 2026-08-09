import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Event } from '../../types';
import { eventDay, eventMonth, formatEventTime, cn } from '../../utils/helpers';

const CATEGORY_STYLES: Record<string, string> = {
  technical: 'from-sky-500 to-blue-600',
  cultural: 'from-fuchsia-500 to-purple-600',
  sports: 'from-emerald-500 to-green-600',
  workshop: 'from-amber-500 to-orange-600',
  seminar: 'from-indigo-500 to-violet-600',
  competition: 'from-rose-500 to-red-600',
  fest: 'from-pink-500 to-rose-600',
  meeting: 'from-slate-500 to-slate-700',
  guest_lecture: 'from-cyan-500 to-sky-600',
  general: 'from-gray-500 to-gray-700',
};

function posterGradient(category: string | null): string {
  return CATEGORY_STYLES[category || 'general'] || CATEGORY_STYLES.general;
}

export default function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();
  const hasPoster = Boolean(event.banner_url);

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className="card-hover group w-full overflow-hidden text-left"
    >
      <div className={`relative aspect-[16/9] w-full overflow-hidden ${!hasPoster ? `bg-gradient-to-br ${posterGradient(event.category)}` : 'bg-gray-100'}`}>
        {hasPoster ? (
          <img
            src={event.banner_url || ''}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="h-12 w-12 text-white/70" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur dark:bg-gray-900/95">
          <span className="text-[10px] font-bold uppercase tracking-wide text-campus-600 dark:text-campus-400">{eventMonth(event.event_date)}</span>
          <span className="-mt-0.5 text-xl font-extrabold leading-none text-gray-900 dark:text-white">{eventDay(event.event_date)}</span>
        </div>

        <span className="absolute right-3 top-3 badge bg-black/50 text-white backdrop-blur">
          {event.category || event.event_type}
        </span>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-base font-bold text-gray-900 dark:text-white">{event.title}</h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <span className="truncate">{event.club_name || event.department_name || event.organizer_name || 'Magnet'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatEventTime(event.event_date)}
          </span>
          {event.venue && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500">
            <Users className="h-3.5 w-3.5" /> {event.rsvp_count} going
          </span>
          {event.user_rsvp_status === 'going' && (
            <span className={cn('badge badge-event')}>You're going</span>
          )}
        </div>
      </div>
    </button>
  );
}
