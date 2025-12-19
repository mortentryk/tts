'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SocialPostCard from '@/app/components/SocialPostCard';
import SocialPostEditor from '@/app/components/SocialPostEditor';
import { SocialPost } from '@/types/social';

type ListResponse = {
  data: SocialPost[];
  nextCursor: string | null;
};

export default function FeedPageClient() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => Boolean(nextCursor), [nextCursor]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore) {
          fetchPosts(nextCursor, true);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, nextCursor]);

  const fetchPosts = async (cursor?: string | null, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const url = new URL('/api/social-posts', window.location.origin);
      url.searchParams.set('limit', '6');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Kunne ikke hente posts');
      }
      const data = (await res.json()) as ListResponse;
      setPosts((prev) => (isLoadMore ? [...prev, ...data.data] : data.data));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      setError(err?.message || 'Der skete en fejl');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLike = async (id: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, (p.likes || 0) + delta) } : p)),
    );
    try {
      await fetch('/api/social-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, delta }),
      });
    } catch (err) {
      console.warn('Like failed', err);
    }
  };

  const handleCreated = (post: SocialPost) => {
    setPosts((prev) => [post, ...prev]);
    setShowEditor(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white">
      <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-yellow-200 uppercase tracking-[0.2em]">Reels</p>
            <h1 className="text-4xl font-bold">Del og opdag bog-reels</h1>
            <p className="text-gray-200 mt-2">
              Korte klip og billeder fra historier. Like, del og hop direkte ind i eventyret.
            </p>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
          >
            ➕ Lav opslag
          </button>
        </header>

        {showEditor && (
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Lav en reel</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
              >
                ← Tilbage
              </button>
            </div>
            <SocialPostEditor onCreated={handleCreated} />
          </div>
        )}

        {error && <div className="text-red-300 text-sm">{error}</div>}

        <div className="grid gap-6">
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} onLike={handleLike} />
          ))}
        </div>

        {(loading || loadingMore) && (
          <div className="flex justify-center py-6 text-gray-300">Indlæser reels...</div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12 text-gray-300">
            Ingen reels endnu. Vær den første til at dele!
          </div>
        )}

        <div ref={sentinelRef} className="h-10" aria-hidden />
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-gray-400 pb-6">Det var alle reels for nu.</p>
        )}
      </section>
    </div>
  );
}
