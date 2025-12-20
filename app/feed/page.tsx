import type { Metadata } from 'next';
import FeedPageClient from './page.client';
import { supabase } from '@/lib/supabase';
import { SocialPost } from '@/types/social';
import { SITE_URL } from '@/lib/env';

async function getInitialPosts(): Promise<{ data: SocialPost[]; nextCursor: string | null }> {
  try {
    const limit = 6;
    
    // Try to get posts from Supabase
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (!error && data && data.length > 0) {
      const hasMore = data.length > limit;
      const posts = hasMore ? data.slice(0, limit) : data;

      const formattedPosts: SocialPost[] = posts.map((p: any) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        media_url: p.media_url,
        media_type: p.media_type as 'image' | 'video',
        story_slug: p.story_slug || null,
        created_at: p.created_at,
        author: p.author_email || null,
        likes: p.likes || 0,
        tags: p.tags || [],
      }));

      const nextCursor = hasMore ? posts[posts.length - 1]?.created_at ?? null : null;
      return { data: formattedPosts, nextCursor };
    }

    // Fallback: load starter posts from stories
    const { data: stories } = await supabase
      .from('stories')
      .select('id, title, slug, cover_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (stories && stories.length > 0) {
      const posts: SocialPost[] = [];
      const now = Date.now();

      for (let i = 0; i < Math.min(stories.length, 6); i++) {
        const story = stories[i];
        
        if (!story.cover_image_url || !story.cover_image_url.includes('/tts-books')) {
          continue;
        }

        const captions = [
          `Udforsk ${story.title} – hvor vil din rejse føre dig?`,
          `Træd ind i ${story.title} og opdag eventyret`,
          `Start din rejse i ${story.title} – hvert valg tæller`,
        ];

        posts.push({
          id: `starter-${story.id}-${i}`,
          title: story.title,
          caption: captions[i % captions.length],
          media_url: story.cover_image_url,
          media_type: 'image',
          story_slug: story.slug,
          created_at: new Date(now - 1000 * 60 * 60 * (i + 1) * 2).toISOString(),
          author: null,
          likes: Math.floor(Math.random() * 30) + 5,
          tags: ['eventyr', 'interaktiv'],
        });
      }

      if (posts.length > 0) {
        return { data: posts, nextCursor: null };
      }
    }

    return { data: [], nextCursor: null };
  } catch (error) {
    console.error('Error fetching initial posts:', error);
    return { data: [], nextCursor: null };
  }
}

export const metadata: Metadata = {
  title: 'Reels - Del og opdag bog-reels',
  description: 'Udforsk og del interaktive historier med fantastiske billeder og videoer. Opdag nye eventyr og del dine favorit-scener.',
  alternates: {
    canonical: '/feed',
  },
  openGraph: {
    title: 'Reels - Del og opdag bog-reels',
    description: 'Udforsk og del interaktive historier med fantastiske billeder og videoer.',
    url: '/feed',
    type: 'website',
    siteName: 'Storific Stories',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reels - Del og opdag bog-reels',
    description: 'Udforsk og del interaktive historier med fantastiske billeder og videoer.',
  },
};

export default async function FeedPage() {
  const initialPosts = await getInitialPosts();
  
  return (
    <>
      {/* Server-rendered content for SEO */}
      <div className="sr-only" aria-hidden="true">
        <h1>Reels - Del og opdag bog-reels</h1>
        <p>Udforsk og del interaktive historier med fantastiske billeder og videoer.</p>
        {initialPosts.data.length > 0 && (
          <div>
            <h2>Seneste reels</h2>
            <ul>
              {initialPosts.data.slice(0, 3).map((post) => (
                <li key={post.id}>
                  <h3>{post.title}</h3>
                  <p>{post.caption}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <FeedPageClient initialPosts={initialPosts.data} initialNextCursor={initialPosts.nextCursor} />
    </>
  );
}
