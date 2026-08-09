import { useState } from 'react';
import { Heart, MessageCircle, Play, Award, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../../types';
import PostDetailModal from './PostDetailModal';

interface PostGridProps {
  posts: Post[];
  isOwn?: boolean;
  onDelete?: (id: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function PostTile({ post, onClick }: { post: Post; onClick: () => void }) {
  const images = post.media.filter((m) => m.media_type === 'image');
  const videos = post.media.filter((m) => m.media_type === 'video');
  const cover =
    images[0] ||
    (post.image_url ? { media_url: post.image_url } : null) ||
    videos[0] ||
    (post.video_url ? { media_url: post.video_url, thumbnail_url: null } : null);
  const hasVideo = videos.length > 0 || Boolean(post.video_url);
  const hasMedia = cover != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square w-full overflow-hidden bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095f6] dark:bg-gray-800"
    >
      {hasMedia ? (
        <img
          src={(cover as any).thumbnail_url || cover!.media_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2">
          <p className="line-clamp-4 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {post.content}
          </p>
        </div>
      )}

      {hasVideo && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1.5 text-white">
          <Play className="h-3.5 w-3.5 fill-current" />
        </span>
      )}
      {!hasMedia && post.post_type === 'achievement' && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 p-1.5 text-white">
          <Award className="h-3.5 w-3.5" />
        </span>
      )}
      {!hasMedia && post.post_type === 'general' && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/30 p-1.5 text-white">
          <ImageIcon className="h-3.5 w-3.5" />
        </span>
      )}

      <span className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Heart className="h-4 w-4 fill-white" /> {formatCount(post.like_count)}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4 fill-white" /> {formatCount(post.comment_count)}
        </span>
      </span>
    </button>
  );
}

export default function PostGrid({ posts, isOwn, onDelete }: PostGridProps) {
  const [activePost, setActivePost] = useState<Post | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {posts.map((post) => (
          <PostTile key={post.id} post={post} onClick={() => setActivePost(post)} />
        ))}
      </div>
      {activePost && (
        <PostDetailModal
          post={activePost}
          onClose={() => setActivePost(null)}
          isOwn={isOwn}
          onDelete={(id) => {
            onDelete?.(id);
            setActivePost(null);
          }}
        />
      )}
    </>
  );
}
