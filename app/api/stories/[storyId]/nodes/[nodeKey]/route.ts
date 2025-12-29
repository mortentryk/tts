import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteCloudinaryAsset, extractPublicIdFromUrl } from '@/lib/cloudinary';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; nodeKey: string }> }
) {
  // Rate limit: 100 requests per minute
  return withRateLimit(request, 100, 60000, async () => {
    try {
    const { storyId, nodeKey } = await params;

    // Try to get story by slug first
    let { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('id')
      .eq('slug', storyId)
      .eq('is_published', true)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabaseAdmin
        .from('stories')
        .select('id')
        .eq('id', storyId)
        .eq('is_published', true)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.error('❌ Story not found or not published:', storyError);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get the story node (fetch separately to avoid relationship schema issues)
    const { data: nodeData, error: nodeError } = await supabaseAdmin
      .from('story_nodes')
      .select('*')
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on no rows

    if (nodeError) {
      console.error('❌ Node query error:', nodeError);
      console.error('   Story ID:', story.id);
      console.error('   Node Key:', nodeKey);
      return NextResponse.json({ error: 'Node not found', details: nodeError.message }, { status: 404 });
    }
    
    if (!nodeData) {
      console.error('❌ Node not found:', { storyId: story.id, nodeKey });
      // Check if any nodes exist for this story
      const { data: anyNodes } = await supabaseAdmin
        .from('story_nodes')
        .select('node_key, sort_index')
        .eq('story_id', story.id)
        .limit(5);
      console.error('   Available nodes for this story:', anyNodes?.map(n => `${n.node_key} (sort: ${n.sort_index})`).join(', ') || 'none');
      return NextResponse.json({ error: 'Node not found', availableNodes: anyNodes?.map(n => n.node_key) || [] }, { status: 404 });
    }

    // Get choices separately (fetch separately to avoid relationship schema issues)
    const { data: choicesData, error: choicesError } = await supabaseAdmin
      .from('story_choices')
      .select('label, to_node_key, conditions, effect, sort_index, match')
      .eq('story_id', story.id)
      .eq('from_node_key', nodeKey)
      .order('sort_index', { ascending: true });

    if (choicesError) {
      console.error('❌ Choices query error:', choicesError);
      console.error('   Story ID:', story.id);
      console.error('   Node Key:', nodeKey);
      // Continue without choices rather than failing completely
    }

    // Map choices to the expected format
    const choices = (choicesData || []).map((choice: any) => ({
      label: choice.label,
      to_node_key: choice.to_node_key,
      conditions: choice.conditions,
      effect: choice.effect,
      sort_index: choice.sort_index,
      match: choice.match
    }));

    const node = nodeData;

    const result = {
      ...node,
      choices: choices
    };

    console.log('✅ Node loaded:', nodeKey, 'with', choices?.length || 0, 'choices');
    if (choices.length > 0) {
      console.log('   Choices:', choices.map(c => `${c.label} -> ${c.to_node_key}`).join(', '));
    } else {
      console.log('   ⚠️ No choices found for node:', nodeKey);
    }
    return NextResponse.json(result);

    } catch (error) {
      console.error('❌ API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; nodeKey: string }> }
) {
  try {
    const { storyId, nodeKey } = await params;
    const body = await request.json();

    // Try to get story by slug first
    let { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('id, slug')
      .eq('slug', storyId)
      .single();

    // If not found by slug, try by id (UUID)
    if (storyError || !story) {
      const result = await supabaseAdmin
        .from('stories')
        .select('id, slug')
        .eq('id', storyId)
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get existing node to check for Cloudinary URLs to delete
    const { data: existingNode, error: fetchError } = await supabaseAdmin
      .from('story_nodes')
      .select('image_url, video_url, audio_url, choices_audio_url')
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Delete from Cloudinary if URLs are being set to null
    const deletions: Promise<boolean>[] = [];

    // Delete image if being removed
    if (body.image_url === null && existingNode?.image_url) {
      const publicId = extractPublicIdFromUrl(existingNode.image_url);
      if (publicId) {
        console.log(`🗑️ Deleting image from Cloudinary: ${publicId}`);
        deletions.push(deleteCloudinaryAsset(publicId, 'image'));
      }
    }

    // Delete video if being removed
    if (body.video_url === null && existingNode?.video_url) {
      const publicId = extractPublicIdFromUrl(existingNode.video_url);
      if (publicId) {
        console.log(`🗑️ Deleting video from Cloudinary: ${publicId}`);
        deletions.push(deleteCloudinaryAsset(publicId, 'video'));
      }
    }

    // Delete audio if being removed
    if (body.audio_url === null && existingNode?.audio_url) {
      const publicId = extractPublicIdFromUrl(existingNode.audio_url);
      if (publicId) {
        console.log(`🗑️ Deleting audio from Cloudinary: ${publicId}`);
        // Audio uses 'video' resource type in Cloudinary
        deletions.push(deleteCloudinaryAsset(publicId, 'video'));
      }
    }

    // Delete choices audio if being removed
    if (body.choices_audio_url === null && existingNode?.choices_audio_url) {
      const publicId = extractPublicIdFromUrl(existingNode.choices_audio_url);
      if (publicId) {
        console.log(`🗑️ Deleting choices audio from Cloudinary: ${publicId}`);
        deletions.push(deleteCloudinaryAsset(publicId, 'video'));
      }
    }

    // Wait for all deletions to complete (don't fail if some fail)
    const deleteResults = await Promise.allSettled(deletions);
    deleteResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`⚠️ Cloudinary deletion ${index} failed:`, result.reason);
      } else if (result.status === 'fulfilled' && result.value === false) {
        console.warn(`⚠️ Cloudinary deletion ${index} returned false`);
      }
    });

    // Update the story node in database
    const { data, error } = await supabaseAdmin
      .from('story_nodes')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', story.id)
      .eq('node_key', nodeKey)
      .select();

    if (error) {
      console.error('Failed to update story node:', error);
      return NextResponse.json(
        { error: `Failed to update story node: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Update story node error:', error);
    return NextResponse.json(
      { error: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
