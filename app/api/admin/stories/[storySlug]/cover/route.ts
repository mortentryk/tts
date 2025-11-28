import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storySlug: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
      const { storySlug } = await params;
      const body = await request.json();
      const { coverImageUrl, nodeKey, action } = body || {};

      if (!storySlug) {
        return NextResponse.json({ error: 'Missing story slug' }, { status: 400 });
      }

      const { data: story, error: storyError } = await supabaseAdmin
        .from('stories')
        .select('id, slug')
        .eq('slug', storySlug)
        .single();

      if (storyError || !story) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      let nextCover: string | null = null;

      if (action === 'clear') {
        nextCover = null;
      } else if (typeof coverImageUrl === 'string' && coverImageUrl.trim() !== '') {
        nextCover = coverImageUrl.trim();
      } else if (nodeKey) {
        const { data: node, error: nodeError } = await supabaseAdmin
          .from('story_nodes')
          .select('image_url')
          .eq('story_id', story.id)
          .eq('node_key', nodeKey)
          .single();

        if (nodeError || !node || !node.image_url) {
          return NextResponse.json(
            { error: 'Node image not found for cover' },
            { status: 400 }
          );
        }

        nextCover = node.image_url;
      } else {
        return NextResponse.json(
          { error: 'Provide coverImageUrl, nodeKey, or action=clear' },
          { status: 400 }
        );
      }

      const { data: updatedStory, error: updateError } = await supabaseAdmin
        .from('stories')
        .update({
          cover_image_url: nextCover,
          updated_at: new Date().toISOString(),
        })
        .eq('id', story.id)
        .select('*')
        .single();

      if (updateError || !updatedStory) {
        return NextResponse.json(
          { error: 'Failed to update cover image' },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedStory);
    } catch (error) {
      console.error('❌ Cover image update error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

