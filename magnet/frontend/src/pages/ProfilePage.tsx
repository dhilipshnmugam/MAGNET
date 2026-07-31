import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, uploadService, postService } from '../services';
import Avatar from '../components/common/Avatar';
import { ProfileSkeleton } from '../components/common/Skeleton';
import PostCard from '../components/feed/PostCard';
import PostCreator from '../components/feed/PostCreator';
import ClubsTab from '../components/profile/ClubsTab';
import ProjectsTab from '../components/profile/ProjectsTab';
import AnalyticsTab from '../components/profile/AnalyticsTab';
import AchievementsTab from '../components/profile/AchievementsTab';
import toast from 'react-hot-toast';
import {
  Camera, Share2, Grid3X3, Award, Users,
  Edit3, BarChart3, Plus, Clock, UserPlus, Check,
  GraduationCap, MapPin, BadgeCheck, Briefcase, Building2, Code,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Post } from '../types';

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  student: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', label: 'Student' },
  department_admin: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Faculty' },
  super_admin: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Admin' },
  club_admin: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Club Admin' },
  principal: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Principal' },
};

export default function ProfilePage() {
  const { user: authUser, student: authStudent, hod: authHod, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'clubs' | 'projects' | 'analytics' | 'achievements'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [profileHod, setProfileHod] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);

  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [studentForm, setStudentForm] = useState({ phone: '', section: '' });

  const viewingUserId = userId || authUser?.id;
  const isOwn = !userId || userId === authUser?.id;

  useEffect(() => {
    if (!authUser) return;
    if (isOwn) {
      loadOwnProfile();
    } else {
      loadOtherProfile(userId!);
    }
  }, [authUser, userId]);

  const loadOwnProfile = async () => {
    setLoading(true);
    setProfileUser(authUser);
    setProfileStudent(authStudent);
    setProfileHod(authHod);
    setIsOwnProfile(true);
    setForm({ full_name: authUser!.full_name, bio: authUser!.bio || '' });
    if (authStudent) setStudentForm({ phone: authStudent.phone || '', section: authStudent.section || '' });

    try {
      const postsRes = await Promise.allSettled([
        postService.getFeed({ filter_type: 'my_posts', page: 1, page_size: 50 }),
      ]);
      if (postsRes[0].status === 'fulfilled') {
        const p = postsRes[0].value.data.data || [];
        setPosts(p);
        setPostCount(p.length);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadOtherProfile = async (uid: string) => {
    setLoading(true);
    setIsOwnProfile(false);
    try {
      const [profileRes, postsRes] = await Promise.allSettled([
        userService.getProfile(uid),
        postService.getUserPosts(uid, { page: 1, page_size: 50 }),
      ]);
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data.data;
        setProfileUser(d.user);
        setProfileStudent(d.student);
        setProfileHod(d.hod);
        setIsFollowing(d.is_following);
        setFollowerCount(d.follower_count || 0);
        setFollowingCount(d.following_count || 0);
        setPostCount(d.post_count || 0);
      }
      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.data.data || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleFollow = async () => {
    if (!viewingUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await userService.unfollow(viewingUserId);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await userService.follow(viewingUserId);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally { setFollowLoading(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadService.image(file, 'magnet/avatars');
      await userService.updateMe({ avatar_url: res.data.data.url });
      await refreshUser();
      setProfileUser((prev: any) => ({ ...prev, avatar_url: res.data.data.url }));
      toast.success('Avatar updated');
    } catch { toast.error('Upload failed'); } finally { setUploadingAvatar(false); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await uploadService.image(file, 'magnet/covers');
      await userService.updateMe({ cover_url: res.data.data.url });
      await refreshUser();
      setProfileUser((prev: any) => ({ ...prev, cover_url: res.data.data.url }));
      toast.success('Cover photo updated');
    } catch { toast.error('Upload failed'); } finally { setUploadingCover(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userService.updateMe(form);
      if (authUser?.role === 'student') await userService.updateStudent(studentForm);
      await refreshUser();
      setProfileUser((prev: any) => ({ ...prev, ...form }));
      setIsEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); } finally { setSaving(false); }
  };

  const handlePostCreated = useCallback(() => {
    if (isOwn) loadOwnProfile();
  }, [isOwn]);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setPostCount((c) => Math.max(0, c - 1));
  }, []);

  if (loading) return <ProfileSkeleton />;
  const displayUser = profileUser || authUser;
  if (!displayUser) return null;

  const badge = ROLE_BADGE[displayUser.role] || ROLE_BADGE.student;
  const memberSince = format(new Date(displayUser.created_at), 'MMM yyyy');
  const canCreatePost = isOwn && authUser && authUser.role !== 'super_admin';

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 lg:pb-6">
      {/* COVER */}
      <div className="card overflow-hidden animate-fade-in">
        <div className="relative h-48 bg-gradient-to-r from-[#0095f6] via-indigo-500 to-purple-600 sm:h-56 md:h-64">
          {displayUser.cover_url && (
            <img src={displayUser.cover_url} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/10" />
          {isOwn && (
            <button onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/60">
              <Camera className="h-3.5 w-3.5" />{uploadingCover ? 'Uploading...' : 'Cover Photo'}
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
        </div>

        <div className="relative px-4 pb-6 sm:px-8">
          <div className="-mt-16 flex items-end justify-between sm:-mt-20">
            <div className="relative">
              <div className="rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-900 dark:bg-gray-900">
                <Avatar src={displayUser.avatar_url} name={displayUser.full_name} size="xl" className="h-28 w-28 sm:h-32 sm:w-32" />
              </div>
              {isOwn && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 rounded-full bg-[#0095f6] p-2 text-white shadow-lg transition-all hover:bg-[#1877f2] hover:scale-105">
                  <Camera className="h-4 w-4" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex items-center gap-2 pb-2">
              {isOwn ? (
                <>
                  {canCreatePost && (
                    <button onClick={() => setShowCreator(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-[#1877f2]">
                      <Plus className="h-4 w-4" /> Create Post
                    </button>
                  )}
                  <button onClick={() => setIsEditing(!isEditing)}
                    className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold transition-all hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                    <Edit3 className="mr-1 inline h-3.5 w-3.5" />{isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleFollow} disabled={followLoading}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                      isFollowing
                        ? 'border border-gray-300 text-gray-700 hover:border-red-300 hover:text-red-600 dark:border-gray-600 dark:hover:border-red-500'
                        : 'bg-[#0095f6] text-white hover:bg-[#1877f2]'
                    }`}>
                    {isFollowing ? <><Check className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                    className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold transition-all hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                    <Share2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold sm:text-2xl">{displayUser.full_name}</h1>
              {displayUser.is_verified && <BadgeCheck className="h-5 w-5 text-[#0095f6]" />}
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>

            {displayUser.bio && <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-600 dark:text-gray-400">{displayUser.bio}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {profileStudent && (
                <>
                  <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Year {profileStudent.year_of_study} · Sem {profileStudent.semester}</span>
                  {profileStudent.section && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Section {profileStudent.section}</span>}
                  {profileStudent.roll_number && <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Roll #{profileStudent.roll_number}</span>}
                </>
              )}
              {profileHod && (
                <>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {profileHod.designation || 'HOD'}</span>
                  {profileHod.employee_id && <span className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> ID: {profileHod.employee_id}</span>}
                  {profileHod.office_room && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {profileHod.office_room}</span>}
                </>
              )}
              {displayUser.department_name && (
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {displayUser.department_name}</span>
              )}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Joined {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{isOwn ? posts.length : postCount}</p>
          <p className="text-xs text-gray-500">Posts</p>
        </div>
        <div className="card p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <p className="text-2xl font-bold">{followerCount}</p>
          <p className="text-xs text-gray-500">Followers</p>
        </div>
        <div className="card p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <p className="text-2xl font-bold">{followingCount}</p>
          <p className="text-xs text-gray-500">Following</p>
        </div>
      </div>

      {/* TABS */}
      <div className="card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 scrollbar-hide">
          {[
            { key: 'posts' as const, label: isOwn ? 'My Posts' : 'Posts', icon: Grid3X3 },
            { key: 'clubs' as const, label: 'Clubs', icon: Users },
            ...(isOwn ? [
              { key: 'projects' as const, label: 'Projects', icon: Code },
              { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
            ] : []),
            { key: 'achievements' as const, label: 'Achievements', icon: Award },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all sm:text-sm ${
                activeTab === tab.key
                  ? 'border-[#0095f6] text-[#0095f6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'posts' && (
            <div className="animate-fade-in">
              {isOwn && canCreatePost && (
                <button onClick={() => setShowCreator(true)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm font-semibold text-gray-500 transition-all hover:border-[#0095f6] hover:text-[#0095f6] hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
                  <Plus className="h-5 w-5" /> Create New Post
                </button>
              )}
              {posts.length === 0 ? (
                <div className="py-16 text-center">
                  <Grid3X3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={isOwn ? handleDeletePost : undefined} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="animate-fade-in">
              <ClubsTab userId={authUser?.id} />
            </div>
          )}

          {activeTab === 'projects' && isOwn && (
            <div className="animate-fade-in">
              <ProjectsTab userId={authUser?.id} />
            </div>
          )}

          {activeTab === 'analytics' && isOwn && (
            <div className="animate-fade-in">
              <AnalyticsTab userId={authUser?.id} />
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="animate-fade-in">
              <AchievementsTab userId={viewingUserId} />
            </div>
          )}
        </div>
      </div>

      {/* EDIT PROFILE */}
      {isOwn && isEditing && (
        <div className="card p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Edit Profile</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
              <input value={authUser?.email || ''} disabled className="input opacity-50 cursor-not-allowed" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="input resize-none" placeholder="Tell us about yourself..." />
          </div>
          {authUser?.role === 'student' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
                <input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Section</label>
                <input value={studentForm.section} onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })} className="input" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      {/* Post Creator Modal */}
      {canCreatePost && (
        <PostCreator isOpen={showCreator} onClose={() => setShowCreator(false)} onPostCreated={handlePostCreated} />
      )}
    </div>
  );
}
