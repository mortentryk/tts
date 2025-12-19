import { NextRequest, NextResponse } from 'next/server';
import { CreateSocialPostInput, SocialPost } from '@/types/social';

type ListResponse = {
  data: SocialPost[];
  nextCursor: string | null;
};

const MOCK_DATA: SocialPost[] = [
  {
    id: 'storybook-1',
    title: 'Den magiske skov',
    caption: 'Se hvordan eventyret starter – og vælg din vej!',
    media_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    story_slug: 'the-magic-forest',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    author: 'Eva',
    likes: 24,
    tags: ['forest', 'magic'],
  },
  {
    id: 'storybook-2',
    title: 'Søslangens hemmelighed',
    caption: 'Kort klip fra kapitel 2 – tør du dykke ned?',
    media_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    media_type: 'video',
    story_slug: 'sea-serpent',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    author: 'Jonas',
    likes: 42,
    tags: ['adventure'],
  },
  {
    id: 'storybook-3',
    title: 'Robotternes nattevagt',
    caption: 'Når stjernerne tændes, vågner robotterne…',
    media_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    story_slug: 'robot-night',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    author: 'Mia',
    likes: 15,
    tags: ['sci-fi'],
  },
];

let mockPosts: SocialPost[] = [...MOCK_DATA];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 6, 30);
  const cursor = searchParams.get('cursor');

  const sorted = [...mockPosts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filtered = cursor
    ? sorted.filter((p) => new Date(p.created_at).getTime() < new Date(cursor).getTime())
    : sorted;

  const data = filtered.slice(0, limit);
  const nextCursor =
    filtered.length > limit ? data[data.length - 1]?.created_at ?? null : null;

  const body: ListResponse = { data, nextCursor };
  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as Partial<CreateSocialPostInput>;

  if (!payload.title || !payload.caption || !payload.media_url || !payload.media_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

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
    author: null,
  };

  mockPosts = [newPost, ...mockPosts];

  return NextResponse.json(newPost, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; delta?: number };
  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const idx = mockPosts.findIndex((p) => p.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const delta = typeof body.delta === 'number' ? body.delta : 1;
  const nextLikes = Math.max(0, (mockPosts[idx].likes || 0) + delta);
  mockPosts[idx] = { ...mockPosts[idx], likes: nextLikes };

  return NextResponse.json(mockPosts[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const idx = mockPosts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  mockPosts = mockPosts.filter((p) => p.id !== id);
  return NextResponse.json({ success: true });
}
