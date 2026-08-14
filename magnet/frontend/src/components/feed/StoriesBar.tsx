import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Plus, Loader2, X, ImagePlus } from 'lucide-react';
import type { Story } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { storyService, uploadService } from '../../services';
import { getApiError } from '../../services/api';
import { cn } from '../../utils/helpers';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import StoryViewerModal from './StoryViewerModal';
import toast from 'react-hot-toast';

const CAN_CREATE_ROLES = ['principal', 'club_admin', 'department_admin'];

interface StoryGroup {
  creatorId: string;
  indices: number[];
}

function buildGroups(list: Story[]): StoryGroup[] {
  const groups: StoryGroup[] = [];
  const byId = new Map<string, StoryGroup>();
  list.forEach((s, i) => {
    let g = byId.get(s.creator_id);
    if (!g) {
      g = { creatorId: s.creator_id, indices: [] };
      byId.set(s.creator_id, g);
      groups.push(g);
    }
    g.indices.push(i);
  });
  return groups;
}

export default function StoriesBar() {
  const { user } = useAuth();
  const canCreate = !!user && CAN_CREATE_ROLES.includes(user.role);

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => buildGroups(stories), [stories]);

  const myFirstIndex = user ? stories.findIndex((s) => s.creator_id === user.id) : -1;

  const fetchStories = useCallback(async () => {
    try {
      const res = await storyService.getActiveStories();
      setStories(res.data?.data || []);
      setError('');
    } catch (e) {
      setError(getApiError(e) || 'Could not load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    const t = setInterval(fetchStories, 60000);
    return () => clearInterval(t);
  }, [fetchStories]);

  const handleCreateClick = () => {
    if (!canCreate) return;
    if (myFirstIndex >= 0) setViewerIndex(myFirstIndex);
    else fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      toast.error('Please choose an image or video');
      return;
    }
    setFile(f);
    setCaption('');
    setUploadOpen(true);
    e.target.value = '';
  };

  const handlePublish = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const uploadRes = await uploadService.image(file, 'stories');
      const uploaded = uploadRes.data?.data || {};
      const mediaType = uploaded.media_type === 'video' ? 'video' : 'image';
      const res = await storyService.create({
        media_url: uploaded.url,
        media_type: mediaType,
        content: caption.trim() || undefined,
      });
      const created = res.data?.data as Story;
      const nextList = [created, ...stories];
      setStories(nextList);
      setFile(null);
      setCaption('');
      setUploadOpen(false);
      toast.success('Story posted');
      setViewerIndex(0);
    } catch (e) {
      toast.error(getApiError(e) || 'Could not publish story');
    } finally {
      setUploading(false);
    }
  };

  const fileIsVideo = !!file && file.type.startsWith('video/');

  return (
    <>
      <div className="border-b border-gray-200 bg-white py-4 dark:border-gray-800 dark:bg-gray-900 lg:rounded-lg lg:border">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {/* Your story */}
          {canCreate && (
            <button
              onClick={handleCreateClick}
              className="group flex flex-shrink-0 flex-col items-center gap-1 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095f6]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
            >
              <div className="relative transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                <div
                  className={cn(
                    'h-[62px] w-[62px] rounded-full p-[2px]',
                    myFirstIndex >= 0
                      ? 'bg-gradient-to-br from-campus-400 to-campus-600 animate-story-pulse group-hover:shadow-lg group-hover:shadow-[#0095f6]/40'
                      : 'border-2 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-900">
                    <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} className="h-full w-full" />
                  </div>
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#0095f6] text-white transition-transform group-hover:scale-110 dark:border-gray-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="w-[68px] truncate text-center text-[11px] text-gray-500">Your story</span>
            </button>
          )}

          {/* Story groups */}
          {groups.map((group) => {
            const story = stories[group.indices[0]];
            return (
              <button
                key={group.creatorId}
                onClick={() => setViewerIndex(group.indices[0])}
                className="group flex flex-shrink-0 flex-col items-center gap-1 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095f6]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
              >
                <div className="transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                  <div className="h-[62px] w-[62px] animate-story-pulse rounded-full bg-gradient-to-br from-campus-400 to-campus-600 p-[2px] transition-shadow group-hover:shadow-lg group-hover:shadow-[#0095f6]/40">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-900">
                      <Avatar src={story?.creator?.avatar_url} name={story?.creator?.full_name || 'U'} className="h-full w-full" />
                    </div>
                  </div>
                </div>
                <span className="w-[68px] truncate text-center text-[11px] text-gray-500">
                  {story?.creator?.full_name || 'User'}
                </span>
              </button>
            );
          })}

          {/* Skeleton */}
          {loading && stories.length === 0 && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-shrink-0 flex-col items-center gap-1">
                  <div className="h-[62px] w-[62px] animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2.5 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </>
          )}

          {/* Error / empty */}
          {!loading && error && stories.length === 0 && (
            <p className="flex items-center gap-2 self-center text-xs text-gray-400">{error}</p>
          )}
          {!loading && !error && stories.length === 0 && !canCreate && (
            <p className="self-center text-xs text-gray-400">No stories yet</p>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Create story modal */}
      <Modal isOpen={uploadOpen} onClose={() => { if (!uploading) { setUploadOpen(false); setFile(null); setCaption(''); } }} title="Create story" size="sm">
        <div className="space-y-4">
          {file ? (
            <div className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {fileIsVideo ? (
                <video src={URL.createObjectURL(file)} controls className="max-h-72 w-full object-contain" />
              ) : (
                <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-72 w-full object-contain" />
              )}
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 disabled:opacity-50"
                aria-label="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-10 text-gray-400 transition-colors hover:border-[#0095f6] hover:text-[#0095f6] dark:border-gray-700"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Choose an image or video</span>
            </button>
          )}

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            maxLength={500}
            className="input w-full"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setUploadOpen(false); setFile(null); setCaption(''); }}
              disabled={uploading}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={!file || uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0095f6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1877f2] disabled:opacity-40"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? 'Posting…' : 'Post story'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Story viewer */}
      {viewerIndex !== null && (
        <StoryViewerModal
          stories={stories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onStoriesChange={setStories}
          onDelete={async (id) => {
            try {
              await storyService.delete(id);
              toast.success('Story deleted');
              return true;
            } catch (e) {
              toast.error(getApiError(e) || 'Failed to delete story');
              return false;
            }
          }}
        />
      )}
    </>
  );
}
