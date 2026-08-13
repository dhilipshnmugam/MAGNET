import { useState, useEffect } from 'react';
import { announcementService } from '../../services';
import { PageLoader } from '../../components/common/Loader';
import { Megaphone, ArrowLeft, Plus, Trash2, Pin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';
import type { Announcement } from '../../types';
import { formatDateOnly } from '../../utils/helpers';

export default function PrincipalAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const res = await announcementService.list({ page: 1, page_size: 50 });
      setAnnouncements(res.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await announcementService.create({ title, content, target_type: targetType });
      toast.success('Announcement published');
      setTitle('');
      setContent('');
      setShowCreate(false);
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementService.delete(id);
      toast.success('Deleted');
      loadAnnouncements();
    } catch {
      toast.error('Failed to delete');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/principal" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Megaphone className="h-6 w-6 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-sm text-gray-500">Publish campus-wide announcements</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Announcement title"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input min-h-[120px]"
              placeholder="Write your announcement..."
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target Audience</label>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="input">
              <option value="all">All Users</option>
              <option value="department">Department Only</option>
              <option value="users">Specific Users</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="card py-12 text-center text-gray-400">
            <Megaphone className="mx-auto mb-3 h-10 w-10" />
            <p>No announcements yet</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar src={a.author_avatar} name={a.author_name || 'Unknown'} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{a.author_name}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateOnly(a.created_at)}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{a.target_type}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.content}</p>
                  </div>
                </div>
                {a.author_id === user?.id && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
