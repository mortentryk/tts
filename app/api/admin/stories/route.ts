import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    // Get all stories with click counts
    const { data: stories, error } = await supabaseAdmin
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
    }

    // Get node counts for each story
    const storiesWithCounts = await Promise.all(
      stories.map(async (story) => {
        const { count: nodeCount } = await supabaseAdmin
          .from('story_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        const { count: choiceCount } = await supabaseAdmin
          .from('story_choices')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        return {
          ...story,
          node_count: nodeCount || 0,
          choice_count: choiceCount || 0
        };
      })
    );

      console.log('✅ Admin stories loaded:', storiesWithCounts.length);
      return NextResponse.json(storiesWithCounts);
    } catch (error) {
      console.error('❌ API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
