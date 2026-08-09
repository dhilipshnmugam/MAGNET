import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Plus } from 'lucide-react';
import { eventService } from '../services';
import { Event } from '../types';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/helpers';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
  { key: 'past', label: 'Past' },
];

const CATEGORY_OPTIONS = [
  'general', 'technical', 'cultural', 'sports', 'workshop',
  'seminar', 'competition', 'fest', 'meeting', 'guest_lecture',
];

const ORGANIZER_TYPES = [
  { key: '', label: 'All Organizers' },
  { key: 'club', label: 'Club' },
  { key: 'department', label: 'Department' },
  { key: 'college', label: 'College' },
];

const CAN_CREATE = ['department_admin', 'super_admin', 'club_admin', 'principal'];

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [tab, setTab] = useState('upcoming');
  const [category, setCategory] = useState('');
  const [organizerType, setOrganizerType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCreate = Boolean(user && CAN_CREATE.includes(user.role));

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await eventService.list({
        scope: tab,
        category: category || undefined,
        organizer_type: organizerType || undefined,
        search: debouncedSearch || undefined,
        page: 1,
        page_size: 100,
      });
      setEvents((res.data?.data as Event[]) || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tab, category, organizerType, debouncedSearch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Events</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Discover campus events, workshops and competitions.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/events/create')} className="btn-primary">
            <Plus className="h-4 w-4" /> Create Event
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, venue or organiser..."
            className="input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'bg-campus-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input w-auto min-w-[9rem] py-2"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
            ))}
          </select>

          <select
            value={organizerType}
            onChange={(e) => setOrganizerType(e.target.value)}
            className="input w-auto min-w-[10rem] py-2"
          >
            {ORGANIZER_TYPES.map((o) => (
              <option key={o.key || 'all'} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="py-16 text-center text-gray-500">Something went wrong loading events.</div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title={search || category || organizerType ? 'No matching events' : 'No events found'}
          description={
            search || category || organizerType
              ? 'Try adjusting your search or filters.'
              : 'No events here yet. Check back soon.'
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
