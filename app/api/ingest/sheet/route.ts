import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { z } from 'zod';

// Validation schema for incoming sheet data
const SheetRow = z.object({
  node_key: z.string().min(1),
  text_md: z.string().min(1),
  image_url: z.string().optional(), // Remove .url() validation to allow empty strings
  tts_ssml: z.string().optional(),
  dice_check: z.string().optional(), // JSON string in sheet
  choices: z.string().optional(), // JSON string in sheet
  sort_index: z.coerce.number().optional()
});

const IngestRequest = z.object({
  storySlug: z.string().min(1),
  rows: z.array(SheetRow),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    estimated_time: z.string().optional(),
    difficulty: z.string().optional(),
    author: z.string().optional(),
    cover_image_url: z.string().optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    // Verify authorization token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (token !== process.env.INGEST_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { storySlug, rows, metadata } = IngestRequest.parse(body);

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

    // Prepare nodes for upsert
    const nodes = rows.map(row => ({
      story_id: story.id,
      node_key: row.node_key,
      text_md: row.text_md,
      image_url: row.image_url && row.image_url.trim() !== '' ? row.image_url : null,
      tts_ssml: row.tts_ssml || null,
      dice_check: row.dice_check ? JSON.parse(row.dice_check) : null,
      sort_index: row.sort_index || 0
    }));

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

    // Process choices
    const choicesToInsert: any[] = [];
    
    for (const row of rows) {
      if (row.choices) {
        try {
          const choicesData = JSON.parse(row.choices);
          if (Array.isArray(choicesData)) {
            choicesData.forEach((choice, index) => {
              if (choice.label && choice.to) {
                choicesToInsert.push({
                  story_id: story.id,
                  from_node_key: row.node_key,
                  label: choice.label,
                  to_node_key: choice.to,
                  conditions: choice.conditions || null,
                  effect: choice.effect || null,
                  sort_index: choice.sort_index || index
                });
              }
            });
          }
        } catch (parseError) {
          console.error(`Failed to parse choices for node ${row.node_key}:`, parseError);
        }
      }
    }

    // Delete existing choices for this story
    const { error: deleteError } = await supabaseAdmin
      .from('story_choices')
      .delete()
      .eq('story_id', story.id);

    if (deleteError) {
      console.error('Error deleting existing choices:', deleteError);
      return NextResponse.json({ error: 'Failed to delete existing choices' }, { status: 500 });
    }

    // Insert new choices
    if (choicesToInsert.length > 0) {
      const { error: choicesError } = await supabaseAdmin
        .from('story_choices')
        .insert(choicesToInsert);

      if (choicesError) {
        console.error('Error inserting choices:', choicesError);
        return NextResponse.json({ error: 'Failed to insert choices' }, { status: 500 });
      }
    }

    // Bump version
    const { error: versionError } = await supabaseAdmin
      .from('stories')
      .update({ 
        version: (story.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', story.id);

    if (versionError) {
      console.error('Error updating version:', versionError);
    }

    console.log(`✅ Successfully ingested story ${storySlug}`);
    console.log(`   - Nodes: ${nodes.length}`);
    console.log(`   - Choices: ${choicesToInsert.length}`);

    return NextResponse.json({ 
      success: true, 
      storyId: story.id,
      nodesCount: nodes.length,
      choicesCount: choicesToInsert.length
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
