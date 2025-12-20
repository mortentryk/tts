import { NextRequest, NextResponse } from 'next/server';
import { CreateSocialPostInput, SocialPost } from '@/types/social';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerUser } from '@/lib/authServer';

type ListResponse = {
  data: SocialPost[];
  nextCursor: string | null;
};

// Helper function to load starter posts from actual stories
async function loadStarterPostsFromStories(): Promise<SocialPost[]> {
  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, title, slug, cover_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !stories || stories.length === 0) {
      console.warn('Could not load stories for starter posts, using fallback');
      return [];
    }

    const posts: SocialPost[] = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(stories.length, 8); i++) {
      const story = stories[i];
      
      // Get first node with image
      const { data: nodes } = await supabase
        .from('story_nodes')
        .select('image_url, text_md, sort_index')
        .eq('story_id', story.id)
        .not('image_url', 'is', null)
        .order('sort_index', { ascending: true })
        .limit(1);

      let imageUrl = story.cover_image_url;
      let textPreview = '';

      if (nodes && nodes.length > 0 && nodes[0].image_url) {
        imageUrl = nodes[0].image_url;
        textPreview = nodes[0].text_md?.substring(0, 100) || '';
      }

      // Only use if URL contains /tts-books (required validation)
      if (!imageUrl || !imageUrl.includes('/tts-books')) {
        continue;
      }

      const captions = [
        `Udforsk ${story.title} – hvor vil din rejse føre dig?`,
        `Træd ind i ${story.title} og opdag eventyret`,
        `Start din rejse i ${story.title} – hvert valg tæller`,
        `${story.title} venter på dig – klar til at begynde?`,
        `Tag første skridt i ${story.title} og se hvor det fører`,
      ];

      posts.push({
        id: `starter-${story.id}-${i}`,
        title: story.title,
        caption: captions[i % captions.length],
        media_url: imageUrl,
        media_type: 'image',
        story_slug: story.slug,
        created_at: new Date(now - 1000 * 60 * 60 * (i + 1) * 2).toISOString(),
        author: null,
        likes: Math.floor(Math.random() * 30) + 5,
        tags: ['eventyr', 'interaktiv'],
      });
    }

    return posts;
  } catch (error) {
    console.warn('Error loading starter posts from stories:', error);
    return [];
  }
}

// Fallback mock data if stories can't be loaded
const FALLBACK_MOCK_DATA: SocialPost[] = [
  {
    id: 'fallback-1',
    title: 'Velkommen til Storific',
    caption: 'Udforsk magiske historier med interaktive valg og fantastiske billeder!',
    media_url: 'https://res.cloudinary.com/demo/image/upload/v1/tts-books/welcome.jpg',
    media_type: 'image',
    story_slug: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    author: null,
    likes: 12,
    tags: ['velkommen'],
  },
];

let MOCK_DATA: SocialPost[] = FALLBACK_MOCK_DATA;

// Initialize starter posts on module load (only in server context)
if (typeof window === 'undefined') {
  loadStarterPostsFromStories()
    .then((posts) => {
      if (posts.length > 0) {
        MOCK_DATA = posts;
      }
    })
    .catch(() => {
      // Keep fallback data
    });
}

// Initialize mock posts - will be populated from Supabase or use MOCK_DATA
let mockPosts: SocialPost[] = [];

async function getSupabasePosts(limit: number, cursor: string | null) {
  try {
    let query = supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase query error, using mock data:', error);
      return null;
    }

    // If no posts in Supabase, initialize with starter posts
    if (!data || data.length === 0) {
      if (mockPosts.length === 0) {
        const starterPosts = await loadStarterPostsFromStories();
        mockPosts = starterPosts.length > 0 ? starterPosts : MOCK_DATA;
      }
      return null; // Will use mock data
    }

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
  } catch (error) {
    console.warn('Error fetching from Supabase, using mock data:', error);
    return null;
  }
}

function getMockPosts(limit: number, cursor: string | null) {
  const sorted = [...mockPosts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filtered = cursor
    ? sorted.filter((p) => new Date(p.created_at).getTime() < new Date(cursor).getTime())
    : sorted;

  const data = filtered.slice(0, limit);
  const nextCursor =
    filtered.length > limit ? data[data.length - 1]?.created_at ?? null : null;

  return { data, nextCursor };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 6, 30);
  const cursor = searchParams.get('cursor');

  // Try Supabase first, fallback to mock
  const supabaseResult = await getSupabasePosts(limit, cursor);
  if (supabaseResult) {
    return NextResponse.json(supabaseResult);
  }

  // Initialize mock posts if empty
  if (mockPosts.length === 0) {
    const starterPosts = await loadStarterPostsFromStories();
    mockPosts = starterPosts.length > 0 ? starterPosts : MOCK_DATA;
  }

  // Fallback to mock data
  const mockResult = getMockPosts(limit, cursor);
  return NextResponse.json(mockResult);
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as Partial<CreateSocialPostInput>;

  if (!payload.title || !payload.caption || !payload.media_url || !payload.media_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate media URL contains /tts-books
  if (!payload.media_url.includes('/tts-books')) {
    return NextResponse.json(
      { error: 'Media URL must contain "/tts-books" in the path' },
      { status: 400 }
    );
  }

  const authUser = await getServerUser();

  try {
    // Try Supabase first
    const { data: newPost, error } = await supabaseAdmin
      .from('social_posts')
      .insert({
        title: payload.title,
        caption: payload.caption,
        media_url: payload.media_url,
        media_type: payload.media_type,
        story_slug: payload.story_slug || null,
        tags: payload.tags || [],
        author_id: authUser?.id || null,
        author_email: authUser?.email || null,
        likes: 0,
      })
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert error, using mock:', error);
      throw error;
    }

    const formattedPost: SocialPost = {
      id: newPost.id,
      title: newPost.title,
      caption: newPost.caption,
      media_url: newPost.media_url,
      media_type: newPost.media_type as 'image' | 'video',
      story_slug: newPost.story_slug || null,
      created_at: newPost.created_at,
      author: newPost.author_email || null,
      likes: newPost.likes || 0,
      tags: newPost.tags || [],
    };

    return NextResponse.json(formattedPost, { status: 201 });
  } catch (error) {
    // Fallback to mock
    console.log('Using mock storage for new post');
    const newPost: SocialPost = {
      id: crypto.randomUUID(),
      title: payload.title,
      caption: payload.caption,
      media_url: payload.media_url,
      media_type: payload.media_type,
      story_slug: payload.story_slug || null,
      tags: payload.tags || [],
      created_at: new Date().toISOString(),
      likes: 0,
      author: authUser?.email || null,
    };

    mockPosts = [newPost, ...mockPosts];
    return NextResponse.json(newPost, { status: 201 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; delta?: number };
  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const delta = typeof body.delta === 'number' ? body.delta : 1;

  try {
    // Try Supabase first
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('likes')
      .eq('id', body.id)
      .single();

    if (fetchError || !post) {
      throw fetchError;
    }

    const nextLikes = Math.max(0, (post.likes || 0) + delta);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('social_posts')
      .update({ likes: nextLikes })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const formattedPost: SocialPost = {
      id: updated.id,
      title: updated.title,
      caption: updated.caption,
      media_url: updated.media_url,
      media_type: updated.media_type as 'image' | 'video',
      story_slug: updated.story_slug || null,
      created_at: updated.created_at,
      author: updated.author_email || null,
      likes: updated.likes || 0,
      tags: updated.tags || [],
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    // Fallback to mock
    console.log('Using mock storage for like update');
    const idx = mockPosts.findIndex((p) => p.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const nextLikes = Math.max(0, (mockPosts[idx].likes || 0) + delta);
    mockPosts[idx] = { ...mockPosts[idx], likes: nextLikes };

    return NextResponse.json(mockPosts[idx]);
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const authUser = await getServerUser();

  try {
    // Try Supabase first
    // Check if post exists and user has permission
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user owns the post (or is admin via service role)
    if (authUser && post.author_id !== authUser.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('social_posts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fallback to mock
    console.log('Using mock storage for delete');
    const idx = mockPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    mockPosts = mockPosts.filter((p) => p.id !== id);
    return NextResponse.json({ success: true });
  }
}
