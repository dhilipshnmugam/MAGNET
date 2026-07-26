import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, uploadService, postService, leaderboardService } from '../services';
import { SimpleAreaChart, ChartCard } from '../components/charts';
import Avatar from '../components/common/Avatar';
import { ProfileSkeleton } from '../components/common/Skeleton';
import PostCard from '../components/feed/PostCard';
import PostCreator from '../components/feed/PostCreator';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import {
  Camera, Share2, Grid3X3, Bookmark, Award, Calendar, TrendingUp, Users,
  BookOpen, Trophy, Zap, Clock, Star, Edit3, BarChart3, Crown, Plus,
  Trash2, ArrowUpRight, Mail, MapPin, Flame, Sparkles, GraduationCap,
  Shield, BadgeCheck, Play, Heart, MessageCircle, Eye, ChevronRight, Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Post } from '../types';

interface ProfileStats {
  total_posts: number;
  campus_score: number;
  department_rank: number;
}

export default function ProfilePage() {
  const { user, student, hod, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'achievements' | 'analytics' | 'clubs'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [showCreator, setShowCreator] = useState(false);

  const [stats, setStats] = useState<ProfileStats>({
    total_posts: 0, campus_score: 0, department_rank: 0,
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [rankData, setRankData] = useState<any>(null);

  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [studentForm, setStudentForm] = useState({ phone: '', section: '' });

  const canCreatePost = user && user.role !== 'super_admin';

  useEffect(() => {
    if (!user) return;
    const viewingOther = userId && userId !== user.id;
    setIsOwnProfile(!viewingOther);
    if (viewingOther) {
      loadOtherUserProfile(userId!);
    } else {
      setProfileUser(user);
      setForm({ full_name: user.full_name, bio: user.bio || '' });
      if (student) {
        setStudentForm({ phone: student.phone || '', section: student.section || '' });
      }
      loadProfileData();
    }
  }, [user, student, userId]);

  const loadOtherUserProfile = async (uid: string) => {
    setLoading(true);
    try {
      const [userRes, postsRes] = await Promise.allSettled([
        userService.getById(uid),
        postService.getUserPosts(uid, { page: 1, page_size: 50 }),
      ]);
      if (userRes.status === 'fulfilled') setProfileUser(userRes.value.data.data);
      if (postsRes.status === 'fulfilled') {
        const p = postsRes.value.data.data || [];
        setPosts(p);
        setStats(s => ({ ...s, total_posts: p.length }));
      }
    } catch {} finally { setLoading(false); }
  };

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [postsRes, savedRes, rankRes] = await Promise.allSettled([
        postService.getFeed({ filter_type: 'my_posts', page: 1, page_size: 50 }),
        postService.getSavedPosts({ page: 1, page_size: 50 }),
        leaderboardService.getMyRanking(),
      ]);
      if (postsRes.status === 'fulfilled') {
        const p = postsRes.value.data.data || [];
        setPosts(p);
        setStats(s => ({ ...s, total_posts: p.length }));
      }
      if (savedRes.status === 'fulfilled') {
        setSavedPosts(savedRes.value.data.data || []);
      }
      if (rankRes.status === 'fulfilled') {
        const r = rankRes.value.data.data;
        setRankData(r);
        setStats(s => ({ ...s, campus_score: r.total_points || 0, department_rank: r.student_rank || 0 }));
      }
    } catch {} finally { setLoading(false); }
  };

  const handlePostCreated = useCallback(() => {
    loadProfileData();
  }, []);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setStats(s => ({ ...s, total_posts: Math.max(0, s.total_posts - 1) }));
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadService.image(file, 'magnet/avatars');
      await userService.updateMe({ avatar_url: res.data.data.url });
      await refreshUser();
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
      toast.success('Cover photo updated');
    } catch { toast.error('Upload failed'); } finally { setUploadingCover(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userService.updateMe(form);
      if (user?.role === 'student') await userService.updateStudent(studentForm);
      await refreshUser();
      setIsEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); } finally { setSaving(false); }
  };

  if (loading) return <ProfileSkeleton />;
  const displayUser = profileUser || user;
  if (!displayUser) return null;

  const username = displayUser.full_name.toLowerCase().replace(/\s+/g, '.');
  const memberSince = format(new Date(displayUser.created_at), 'MMM yyyy');

  const tabs = [
    { key: 'posts', label: 'My Posts', icon: Grid3X3 },
    { key: 'saved', label: 'Saved', icon: Bookmark },
    { key: 'achievements', label: 'Achievements', icon: Award },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'clubs', label: 'Clubs', icon: Users },
  ] as const;

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'department_admin': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'club_admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'principal': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 lg:pb-6">
      {/* HERO / COVER */}
      <div className="card overflow-hidden animate-fade-in">
        <div className="relative h-48 bg-gradient-to-r from-[#0095f6] via-indigo-500 to-purple-600 sm:h-56 md:h-64">
          <div className="absolute inset-0 bg-black/10" />
          {isOwnProfile && (
            <button onClick={() => coverInputRef.current?.click()} className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/60">
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
              {isOwnProfile && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 rounded-full bg-[#0095f6] p-2 text-white shadow-lg transition-all hover:bg-[#1877f2] hover:scale-105">
                  <Camera className="h-4 w-4" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex items-center gap-2 pb-2">
              {isOwnProfile ? (
                <>
                  {canCreatePost && (
                    <button onClick={() => setShowCreator(true)} className="flex items-center gap-1.5 rounded-lg bg-[#0095f6] px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-[#1877f2]">
                      <Plus className="h-4 w-4" /> Create Post
                    </button>
                  )}
                  <button onClick={() => setIsEditing(!isEditing)} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold transition-all hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                    <Edit3 className="mr-1 inline h-3.5 w-3.5" />{isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </>
              ) : (
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold transition-all hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                  <Share2 className="mr-1 inline h-4 w-4" /> Share
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold sm:text-2xl">{displayUser.full_name}</h1>
              {displayUser.is_verified && <BadgeCheck className="h-5 w-5 text-[#0095f6]" />}
              <span className={`badge text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(displayUser.role)}`}>
                {displayUser.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">@{username}</p>
            {displayUser.bio && <p className="mt-2 max-w-lg text-sm leading-relaxed">{displayUser.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              {student && (
                <>
                  <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Year {student.year_of_study} · Sem {student.semester}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Section {student.section || '-'}</span>
                </>
              )}
              {hod && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {hod.designation || 'HOD'}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Joined {memberSince}</span>
              {stats.department_rank > 0 && (
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <Trophy className="h-3.5 w-3.5" /> Rank #{stats.department_rank}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{stats.total_posts}</p>
          <p className="text-xs text-gray-500">Posts</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{stats.campus_score}</p>
          <p className="text-xs text-gray-500">Campus Score</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">#{stats.department_rank || '-'}</p>
          <p className="text-xs text-gray-500">Rank</p>
        </div>
      </div>

      {/* TABS */}
      <div className="card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all sm:text-sm ${
                activeTab === tab.key
                  ? 'border-[#0095f6] text-[#0095f6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* MY POSTS TAB */}
          {activeTab === 'posts' && (
            <div className="animate-fade-in">
              {canCreatePost && (
                <button onClick={() => setShowCreator(true)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm font-semibold text-gray-500 transition-all hover:border-[#0095f6] hover:text-[#0095f6] hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
                  <Plus className="h-5 w-5" /> Create New Post
                </button>
              )}
              {posts.length === 0 ? (
                <div className="py-16 text-center">
                  <Grid3X3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No posts yet</p>
                  <p className="text-xs text-gray-400">{canCreatePost ? 'Share your first campus moment' : 'No posts to show'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SAVED POSTS TAB */}
          {activeTab === 'saved' && (
            <div className="animate-fade-in">
              {savedPosts.length === 0 ? (
                <div className="py-16 text-center">
                  <Bookmark className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No saved posts</p>
                  <p className="text-xs text-gray-400">Posts you bookmark will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACHIEVEMENTS TAB */}
          {activeTab === 'achievements' && (
            <div className="animate-fade-in py-16 text-center">
              <Trophy className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500">Achievements coming soon</p>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in space-y-6">
              {rankData && (
                <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
                  <h3 className="mb-4 font-semibold">Campus Score Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'All-Time Points', value: rankData.all_time_points || 0, max: 5000 },
                      { label: 'Weekly Points', value: rankData.weekly_points || 0, max: 500 },
                      { label: 'Monthly Points', value: rankData.monthly_points || 0, max: 2000 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                          <span className="font-bold">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#0095f6] to-indigo-500" style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CLUBS TAB */}
          {activeTab === 'clubs' && (
            <div className="animate-fade-in py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500">Club memberships coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT PROFILE */}
      {isEditing && (
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
              <input value={user?.email || ''} disabled className="input opacity-50 cursor-not-allowed" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="input resize-none" placeholder="Tell us about yourself..." />
          </div>
          {user?.role === 'student' && (
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
