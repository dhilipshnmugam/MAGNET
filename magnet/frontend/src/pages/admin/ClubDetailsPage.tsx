import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubManagementService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { Trophy, ArrowLeft, Users, FileText, Calendar, Mail, Phone } from 'lucide-react';

export default function ClubDetailsPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    clubManagementService.getById(clubId)
      .then((res) => setClub(res.data.data))
      .catch(() => toast.error('Failed to load club details'))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) return <PageLoader />;
  if (!club) return <div className="py-10 text-center text-gray-500">Club not found</div>;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button onClick={() => navigate('/super-admin/clubs')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="h-4 w-4" /> Back to clubs
      </button>

      {/* Banner */}
      <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600">
        {club.banner_url && <img src={club.banner_url} alt="" className="h-full w-full object-cover" />}
        <div className="absolute bottom-4 left-6 flex items-end gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-sky-500">{club.name?.charAt(0)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Club Info */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{club.club_code} &middot; {club.domain}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            club.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {club.status || 'active'}
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{club.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          {club.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {club.email}</span>}
          {club.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {club.phone}</span>}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Members', value: club.member_count ?? 0, icon: Users, color: 'bg-sky-500' },
          { label: 'Posts', value: club.post_count ?? 0, icon: FileText, color: 'bg-green-500' },
          { label: 'Events', value: club.event_count ?? 0, icon: Calendar, color: 'bg-purple-500' },
          { label: 'Created', value: club.created_at ? new Date(club.created_at).toLocaleDateString() : '—', icon: Calendar, color: 'bg-orange-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin & Faculty Coordinator */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase">Club Admin</h3>
          {club.club_admin_name ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
                {club.club_admin_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{club.club_admin_name}</p>
                <p className="text-xs text-gray-400">{club.club_admin_email || ''}</p>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">No admin assigned</p>}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase">Faculty Coordinator</h3>
          {club.faculty_coordinator_name ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600">
                {club.faculty_coordinator_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{club.faculty_coordinator_name}</p>
                <p className="text-xs text-gray-400">{club.faculty_coordinator_email || ''}</p>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">No coordinator assigned</p>}
        </div>
      </div>
    </div>
  );
}
