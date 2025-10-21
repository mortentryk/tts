import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { storySlug } = await request.json();

    if (!storySlug) {
      return NextResponse.json({ error: 'Story slug required' }, { status: 400 });
    }

    // Increment click count
    const { error } = await supabaseAdmin
      .from('stories')
      .update({ click_count: supabaseAdmin.raw('click_count + 1') })
      .eq('slug', storySlug);

    if (error) {
      console.error('❌ Click tracking error:', error);
      // Don't return error to user - this is fire and forget
    } else {
      console.log(`📊 Click tracked for story: ${storySlug}`);
    }

    // Always return success (fire and forget)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Click tracking error:', error);
    // Don't return error to user - this is fire and forget
    return NextResponse.json({ success: true });
  }
}
