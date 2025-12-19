'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SocialPost } from '@/types/social';
import { shareContent } from '@/lib/share';

type SocialPostCardProps = {
  post: SocialPost;
  onLike?: (id: string, delta: number) => Promise<void> | void;
  onShareUrl?: (url: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
};

export default function SocialPostCard({ post, onLike, onShareUrl, onDelete }: SocialPostCardProps) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const storyHref = useMemo(
    () => (post.story_slug ? `/story/${post.story_slug}` : undefined),
    [post.story_slug],
  );

  const handleLike = async () => {
    const delta = liked ? -1 : 1;
    setLiked((prev) => !prev);
    setLocalLikes((prev) => Math.max(0, prev + delta));
    try {
      await onLike?.(post.id, delta);
    } catch (err) {
      // rollback if API fails
      setLiked((prev) => !prev);
      setLocalLikes((prev) => Math.max(0, prev - delta));
      console.error('Failed to like post', err);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin + '/feed' : '/feed';
    const shared = await shareContent({
      title: post.title,
      text: post.caption,
      url,
    });
    if (!shared && onShareUrl) {
      await onShareUrl(url);
    }
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments((prev) => [...prev, commentText.trim()]);
    setCommentText('');
  };

  const handleDelete = async () => {
    if (!confirm('Er du sikker på, at du vil slette dette opslag?')) {
      return;
    }
    try {
      await onDelete?.(post.id);
    } catch (err) {
      console.error('Failed to delete post', err);
      alert('Kunne ikke slette opslag');
    }
  };

  return (
    <article className="min-h-screen w-full flex flex-col bg-indigo-900">
      <div className="flex-1 flex flex-col px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-200 rounded-full border border-yellow-500/30">
            Reel
          </div>
          <span className="text-sm text-gray-300">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        <div className="flex-1 flex items-center justify-center mb-4">
          <div className="w-full max-w-lg h-full max-h-[60vh] overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {post.media_type === 'video' ? (
              <video
                className="w-full h-full object-cover"
                src={post.media_url}
                controls
                muted
                loop
                playsInline
              />
            ) : (
              <img
                className="w-full h-full object-cover"
                src={post.media_url}
                alt={post.title}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>

        <div className="w-full max-w-lg mx-auto flex flex-col gap-2 mb-4">
          <h3 className="text-2xl font-bold">{post.title}</h3>
          <p className="text-gray-200">{post.caption}</p>
          {storyHref && (
            <Link
              href={storyHref}
              className="inline-flex items-center gap-2 text-sm text-yellow-200 hover:text-yellow-100 underline"
            >
              Gå til historien
            </Link>
          )}
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 pb-6 flex items-center gap-3">
        <button
          onClick={handleLike}
          aria-label={liked ? 'Fjern like' : 'Synes godt om'}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
            liked
              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200'
              : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span className="text-sm">{localLikes}</span>
        </button>

        <button
          onClick={handleShare}
          aria-label="Del reel"
          className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white/5 border-white/10 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <span>🔗</span>
          <span className="text-sm">Del</span>
        </button>

        <button
          onClick={() => setShowComments((prev) => !prev)}
          aria-expanded={showComments}
          aria-controls={`comments-${post.id}`}
          className="ml-auto text-sm text-gray-200 underline hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
        >
          Kommentarer ({comments.length})
        </button>

        {onDelete && (
          <button
            onClick={handleDelete}
            aria-label="Slet opslag"
            className="px-3 py-2 rounded-full border bg-red-500/20 border-red-500/30 hover:border-red-500/50 text-red-200 hover:text-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            🗑️ Slet
          </button>
        )}
      </div>

      {showComments && (
        <div id={`comments-${post.id}`} className="w-full max-w-md mx-auto px-4 pb-6 border-t border-white/10 pt-3 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen kommentarer endnu.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-200">
              {comments.map((c, idx) => (
                <li key={`${post.id}-comment-${idx}`} className="bg-white/5 rounded px-3 py-2">
                  {c}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Skriv en kommentar..."
              rows={2}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-60"
                disabled={!commentText.trim()}
              >
                Tilføj
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
