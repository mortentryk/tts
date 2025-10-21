import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest) {
  try {
    const { storySlug } = await request.json();

    if (!storySlug) {
      return NextResponse.json({ error: 'Story slug required' }, { status: 400 });
    }

    // Delete story (cascades to nodes and choices automatically)
    const { error: deleteError } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('slug', storySlug);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
    }

    console.log(`✅ Story ${storySlug} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `Story "${storySlug}" deleted successfully`
    });

  } catch (error) {
    console.error('❌ Delete story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
