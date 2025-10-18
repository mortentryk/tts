import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verify authorization token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (token !== process.env.INGEST_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body without strict validation
    const body = await req.json();
    const { storySlug, rows, metadata } = body;

    if (!storySlug || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🔄 Ingesting story: ${storySlug} with ${rows.length} rows`);
    if (metadata) {
      console.log('📊 Metadata:', metadata);
    }

    // Upsert story with metadata
    const { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .upsert({
        slug: storySlug,
        title: metadata?.title || storySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: metadata?.description || null,
        cover_image_url: metadata?.cover_image_url || null,
        is_published: false, // Keep as draft until manually published
        version: 1
      }, { 
        onConflict: 'slug',
        ignoreDuplicates: false 
      })
      .select('id, version')
      .single();

    if (storyError) {
      console.error('Error upserting story:', storyError);
      return NextResponse.json({ error: 'Failed to upsert story' }, { status: 500 });
    }

    // Prepare nodes for upsert with robust data cleaning
    const nodes = rows.map((row: any) => {
      // Clean image_url - handle any format
      let imageUrl = null;
      if (row.image_url && typeof row.image_url === 'string' && row.image_url.trim() !== '') {
        imageUrl = row.image_url.trim();
      }
      
      // Clean dice_check - handle any format
      let diceCheck = null;
      if (row.dice_check) {
        try {
          if (typeof row.dice_check === 'string') {
            diceCheck = JSON.parse(row.dice_check);
          } else if (typeof row.dice_check === 'object') {
            diceCheck = row.dice_check;
          }
        } catch (e) {
          console.warn('Invalid dice_check format:', row.dice_check);
        }
      }
      
      return {
        story_id: story.id,
        node_key: row.node_key,
        text_md: row.text_md,
        image_url: imageUrl,
        tts_ssml: row.tts_ssml || null,
        dice_check: diceCheck,
        sort_index: parseInt(row.sort_index) || 0
      };
    });

    // Upsert nodes
    const { error: nodesError } = await supabaseAdmin
      .from('story_nodes')
      .upsert(nodes, { 
        onConflict: 'story_id,node_key',
        ignoreDuplicates: false 
      });

    if (nodesError) {
      console.error('Error upserting nodes:', nodesError);
      return NextResponse.json({ error: 'Failed to upsert nodes' }, { status: 500 });
    }

    // Handle choices - delete existing and insert new ones
    const { error: deleteChoicesError } = await supabaseAdmin
      .from('story_choices')
      .delete()
      .eq('story_id', story.id);

    if (deleteChoicesError) {
      console.error('Error deleting choices:', deleteChoicesError);
      return NextResponse.json({ error: 'Failed to delete choices' }, { status: 500 });
    }

    // Insert new choices
    const choicesToInsert: any[] = [];
    rows.forEach((row: any) => {
      if (row.choices) {
        try {
          const parsedChoices = typeof row.choices === 'string' 
            ? JSON.parse(row.choices) 
            : row.choices;
          
          if (Array.isArray(parsedChoices)) {
            parsedChoices.forEach((choice: any, i: number) => {
              choicesToInsert.push({
                story_id: story.id,
                from_node_key: row.node_key,
                label: choice.label,
                to_node_key: choice.to,
                conditions: choice.conditions || null,
                effect: choice.effect || null,
                sort_index: choice.sort_index ?? i
              });
            });
          }
        } catch (jsonParseError) {
          console.warn(`Could not parse choices for node_key ${row.node_key}:`, jsonParseError);
        }
      }
    });

    if (choicesToInsert.length > 0) {
      const { error: choicesInsertError } = await supabaseAdmin
        .from('story_choices')
        .insert(choicesToInsert);

      if (choicesInsertError) {
        console.error('Error inserting choices:', choicesInsertError);
        return NextResponse.json({ error: 'Failed to insert choices' }, { status: 500 });
      }
    }

    // Update story version
    const { error: versionUpdateError } = await supabaseAdmin
      .from('stories')
      .update({ 
        version: (story.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', story.id);

    if (versionUpdateError) {
      console.warn('Could not update story version:', versionUpdateError);
    }

    return NextResponse.json({ 
      message: 'Story successfully synced to Supabase',
      storyId: story.id,
      nodesCount: nodes.length,
      choicesCount: choicesToInsert.length
    });

  } catch (error) {
    console.error('Unexpected error during Supabase sync:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
