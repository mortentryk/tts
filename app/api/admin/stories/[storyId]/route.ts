import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
    const { storyId } = await params;
    const updates = await request.json();

    console.log('Updating story:', storyId, updates);

      // Update the story
      const { data, error } = await supabaseAdmin
        .from('stories')
        .update(updates)
        .eq('id', storyId)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
      }

      console.log('✅ Story updated:', data);
      return NextResponse.json(data[0]);
    } catch (error) {
      console.error('❌ API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
