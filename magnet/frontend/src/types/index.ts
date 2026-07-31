export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'department_admin' | 'super_admin' | 'club_admin' | 'principal';
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  department_id: string | null;
  department_name: string | null;
  year: string | null;
  register_number: string | null;
  college_name: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProfileView {
  user: User;
  student: Student | null;
  hod: Hod | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following: boolean;
  is_self: boolean;
}

export interface Student {
  id: string;
  user_id: string;
  college_id: string;
  roll_number: string | null;
  year_of_study: number | null;
  semester: number | null;
  section: string | null;
  phone: string | null;
  admission_year: number | null;
  graduation_year: number | null;
}

export interface Hod {
  id: string;
  user_id: string;
  employee_id: string;
  designation: string | null;
  qualification: string | null;
  specialization: string | null;
  join_date: string | null;
  office_room: string | null;
  phone: string | null;
}

export type PostType = 'general' | 'achievement' | 'event' | 'club_announcement' | 'academic_resource' | 'internship' | 'placement' | 'collaboration';
export type Visibility = 'public' | 'department' | 'club_members' | 'private';
export type MediaType = 'image' | 'video' | 'document';

export interface PostMedia {
  id: string;
  media_url: string;
  media_type: MediaType;
  thumbnail_url: string | null;
  sort_order: number;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  role: string | null;
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  post_type: PostType;
  channel_id: string | null;
  club_id: string | null;
  visibility: Visibility;
  location: string | null;
  hashtags: string | null;
  is_pinned: boolean;
  is_approved: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  bookmark_count: number;

  achievement_type: string | null;
  achievement_score: number | null;
  certificate_url: string | null;

  event_name: string | null;
  event_date: string | null;
  event_end_date: string | null;
  event_time: string | null;
  event_location: string | null;
  registration_url: string | null;
  participant_count: number;

  resource_type: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;

  collaboration_type: string | null;
  required_skills: string | null;
  team_size: number | null;

  media: PostMedia[];
  author: User | null;
  is_liked_by_user: boolean;
  is_bookmarked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostAnalytics {
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  engagement_rate: number;
}

export interface TrendingTag {
  tag: string;
  post_count: number;
}

export interface PostImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_deleted: boolean;
  author: User | null;
  reply_count: number;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: 'public' | 'private';
  icon_url: string | null;
  owner_id: string;
  department_id: string | null;
  member_count: number;
  is_active: boolean;
  is_member: boolean;
  user_role: string | null;
  created_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  is_deleted: boolean;
  sender_name: string | null;
  sender_avatar: string | null;
  created_at: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'post' | 'deleted';

export interface MessageAttachment {
  id: string;
  file_type: 'image' | 'video' | 'audio' | 'pdf' | 'gif' | 'document' | 'file';
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface MessageReaction {
  id: string;
  user_id: string;
  emoji: string;
}

export interface MessageReplyPreview {
  id: string;
  content: string | null;
  message_type: string;
  sender_name?: string | null;
}

export interface Message {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url?: string | null;
  message_type: MessageType;
  reply_to_id?: string | null;
  forwarded_from_id?: string | null;
  is_forwarded?: boolean;
  is_edited?: boolean;
  is_starred?: boolean;
  is_pinned?: boolean;
  is_read: boolean;
  is_deleted: boolean;
  deleted_for_me?: boolean;
  share_type?: string | null;
  share_id?: string | null;
  share_preview?: any | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
  delivered_at?: string | null;
  edited_at?: string | null;
  created_at: string;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  reply_to?: MessageReplyPreview | null;
}

export interface Conversation {
  conversation_id?: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_role?: string | null;
  other_user_register_number?: string | null;
  other_user_department?: string | null;
  last_message: string | null;
  last_message_type?: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_muted?: boolean;
  is_online?: boolean;
  last_seen_at?: string | null;
}

export interface UserSearchResult {
  id: string;
  full_name: string;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  register_number?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  year?: string | null;
  is_online: boolean;
  is_blocked?: boolean;
  has_conversation?: boolean;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  target_type: string;
  target_value: string | null;
  is_pinned: boolean;
  is_active: boolean;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  event_type: string;
  banner_url: string | null;
  rsvp_count: number;
  creator_name: string | null;
  user_rsvp_status: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
  type: string;
  title: string;
  body: string;
  ref_type: string | null;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  total_points: number;
  rank: number | null;
  streak_days: number;
}

export interface ClubRankingEntry {
  club_id: string;
  club_name: string | null;
  club_icon: string | null;
  total_points: number;
  total_posts: number;
  total_events: number;
  total_members_active: number;
  rank: number | null;
}

export interface DepartmentRankingEntry {
  department_id: string;
  department_name: string | null;
  department_code: string | null;
  total_points: number;
  total_students: number;
  total_posts: number;
  total_clubs: number;
  rank: number | null;
}

export interface PointActivity {
  activity_type: string;
  points_value: number;
  description: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  department_type: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  head_id: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  student_count: number;
  club_count: number;
  hod_name: string | null;
  hod_email: string | null;
}

export interface Club {
  id: string;
  name: string;
  club_code: string;
  description: string | null;
  category: string | null;
  domain: string | null;
  club_type: string | null;
  icon_url: string | null;
  banner_url: string | null;
  owner_id: string;
  department_id: string | null;
  faculty_coordinator_id: string | null;
  club_admin_id: string | null;
  created_by: string | null;
  official_email: string | null;
  official_phone: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  approval_mode: string;
  is_active: boolean;
  status: string;
  member_count: number;
  created_at: string;
  faculty_coordinator_name: string | null;
  club_admin_name: string | null;
  department_name: string | null;
  post_count?: number;
  event_count?: number;
  user_role?: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
}

export interface ClubJoinRequest {
  id: string;
  club_id: string;
  user_id: string;
  status: string;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  reviewer_name: string | null;
}

export interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  event_type: string;
  banner_url: string | null;
  rsvp_count: number;
  is_active: boolean;
  created_at: string;
  creator_name: string | null;
}

export interface ClubGalleryItem {
  id: string;
  club_id: string;
  image_url: string;
  caption: string | null;
  event_name: string | null;
  created_at: string;
  uploader_name: string | null;
}

export interface ClubAchievement {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  achievement_type: string;
  achieved_date: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
