import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ArrowLeft, Search, MapPin, ChevronLeft, ChevronRight, Building2,
} from 'lucide-react';
import { eventService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import EventCard from '../../components/events/EventCard';
import { useDebounce } from '../../hooks';
import type { Event } from '../../types';

const PAGE_SIZE = 12;

export default function PrincipalEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 350);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.list({
        search: debouncedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setEvents((res.data?.data as Event[]) || []);
      setTotal((res.data?.total) || 0);
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clubEvents = events.filter((e) => e.club_name).length;
  const deptEvents = events.filter((e) => !e.club_name && e.department_name).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Calendar className="h-6 w-6 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-gray-500">Monitor events across the campus</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Calendar className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-bold">{total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Club Events (this page)</p>
              <p className="text-2xl font-bold">{clubEvents}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <MapPin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dept Events (this page)</p>
              <p className="text-2xl font-bold">{deptEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by title, venue or organiser..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10 text-gray-400" />}
          title="No events found"
          description="Try adjusting your search."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
