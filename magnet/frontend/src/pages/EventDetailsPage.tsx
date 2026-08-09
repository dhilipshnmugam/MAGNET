import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users,
  ExternalLink, Mail, Phone, Info, Edit2, Trash2,
} from 'lucide-react';
import { eventService } from '../services';
import { Event } from '../types';
import { PageLoader } from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatEventDate, cn, getInitials } from '../utils/helpers';

const CATEGORY_BADGE: Record<string, string> = {
  technical: 'badge-internship',
  cultural: 'badge-event',
  sports: 'badge-achievement',
  workshop: 'badge-resource',
  seminar: 'badge-collaboration',
  competition: 'badge-club',
  fest: 'badge-event',
  meeting: 'badge-general',
  guest_lecture: 'badge-placement',
  general: 'badge-general',
};

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_going', label: "Can't Go" },
];

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.getById(eventId).then((res) => {
      setEvent(res.data.data || null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.error('Could not load event');
    });
  }, [eventId]);

  const handleRsvp = async (status: string) => {
    if (!event || !user) return;
    setRsvpLoading(true);
    try {
      await eventService.rsvp(event.id, { status });
      setEvent((prev) => prev ? {
        ...prev,
        user_rsvp_status: status,
        rsvp_count: status === 'going'
          ? (prev.user_rsvp_status === 'going' ? prev.rsvp_count : prev.rsvp_count + 1)
          : (prev.user_rsvp_status === 'going' ? Math.max(0, prev.rsvp_count - 1) : prev.rsvp_count),
      } : prev);
      toast.success(status === 'going' ? "You're going!" : 'RSVP updated');
    } catch {
      toast.error('Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm('Delete this event permanently?')) return;
    setDeleting(true);
    try {
      await eventService.delete(event.id);
      toast.success('Event deleted');
      navigate('/events');
    } catch {
      toast.error('Failed to delete event');
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!event) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-gray-500">Event not found.</p>
      <Link to="/events" className="btn-primary mt-4">Back to Events</Link>
    </div>
  );

  const canManage = Boolean(user && (user.role === 'super_admin' || event.creator_id === user.id));
  const organizerName = event.club_name || event.department_name || event.organizer_name || 'Magnet';
  const badgeClass = CATEGORY_BADGE[event.category || 'general'] || CATEGORY_BADGE.general;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-24 lg:pb-10">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card overflow-hidden">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.title} className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-campus-500 to-primary-700 sm:h-72">
            <Calendar className="h-16 w-16 text-white/70" />
          </div>
        )}

        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('badge', badgeClass)}>{event.category || event.event_type}</span>
                <span className="badge badge-general">{organizerName}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">{event.title}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-campus-100 font-bold text-campus-700 dark:bg-campus-900/40 dark:text-campus-300">
                  {getInitials(event.creator_name || event.organizer_name || 'Magnet')}
                </span>
                Organised by {event.organizer_name || event.creator_name || organizerName}
              </div>
            </div>

            {canManage && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate(`/events/${event.id}/edit`)} className="btn-secondary">
                  <Edit2 className="h-4 w-4" /> Edit
                </button>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                  <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Date</div>
              <div className="mt-1 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <Calendar className="h-4 w-4 text-campus-500" /> {formatEventDate(event.event_date)}
              </div>
            </div>
            {event.end_date && (
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ends</div>
                <div className="mt-1 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Clock className="h-4 w-4 text-campus-500" /> {formatEventDate(event.end_date)}
                </div>
              </div>
            )}
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Venue</div>
              <div className="mt-1 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <MapPin className="h-4 w-4 text-campus-500" /> {event.venue || 'TBA'}
              </div>
            </div>
          </div>

          {event.description && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">About</h2>
              <p className="mt-2 whitespace-pre-line text-gray-700 dark:text-gray-300">{event.description}</p>
            </div>
          )}

          {event.additional_info && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                <Info className="h-4 w-4" /> Additional Information
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-amber-800 dark:text-amber-200">{event.additional_info}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noreferrer" className="btn-primary">
                <ExternalLink className="h-4 w-4" /> Register Now
              </a>
            )}
            {event.contact_email && (
              <a href={`mailto:${event.contact_email}`} className="btn-secondary">
                <Mail className="h-4 w-4" /> {event.contact_email}
              </a>
            )}
            {event.contact_phone && (
              <a href={`tel:${event.contact_phone}`} className="btn-secondary">
                <Phone className="h-4 w-4" /> {event.contact_phone}
              </a>
            )}
          </div>

          {user && (
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                <Users className="h-4 w-4 text-campus-500" /> {event.rsvp_count} going
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {RSVP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    disabled={rsvpLoading}
                    onClick={() => handleRsvp(opt.value)}
                    className={cn(
                      'badge cursor-pointer border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50',
                      event.user_rsvp_status === opt.value
                        ? 'border-campus-500 bg-campus-500 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-campus-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    )}
                  >
                    {opt.label}
                    {event.user_rsvp_status === opt.value && (
                      <span className="ml-1.5">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
