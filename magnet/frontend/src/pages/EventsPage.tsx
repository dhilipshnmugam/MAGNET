import { useState, useEffect } from 'react';
import { eventService } from '../services';
import { Event } from '../types';
import { PageLoader } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { Calendar, MapPin, Users, Plus } from 'lucide-react';
import { formatEventDate, timeAgo } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    eventService.list().then((res) => { setEvents(res.data.data || []); setLoading(false); });
  }, []);

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await eventService.rsvp(eventId, { status });
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, user_rsvp_status: status, rsvp_count: status === 'going' ? e.rsvp_count + 1 : e.rsvp_count } : e));
      toast.success('RSVP updated');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {(user?.role === 'department_admin' || user?.role === 'super_admin' || user?.role === 'club_admin') && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary"><Plus className="h-4 w-4" /> Create Event</button>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<Calendar className="h-12 w-12" />} title="No events" description="No upcoming events at the moment." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <div key={event.id} className="card overflow-hidden">
              {event.banner_url && <img src={event.banner_url} alt="" className="h-40 w-full object-cover" />}
              <div className="p-5">
                <span className="badge bg-magnet-100 text-magnet-700">{event.event_type}</span>
                <h3 className="mt-2 text-lg font-bold">{event.title}</h3>
                {event.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.description}</p>}
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatEventDate(event.event_date)}</div>
                  {event.venue && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.venue}</div>}
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {event.rsvp_count} going</div>
                </div>
                <div className="mt-4 flex gap-2">
                  {['going', 'interested', 'not_going'].map((s) => (
                    <button key={s} onClick={() => handleRsvp(event.id, s)}
                      className={`badge cursor-pointer ${event.user_rsvp_status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
