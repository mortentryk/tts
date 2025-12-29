import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { imageAssignSchema, safeValidateBody, validationErrorResponse } from '@/lib/validation';

// POST - Assign image to story node
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    
    // Validate request body
    const validation = safeValidateBody(imageAssignSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { storySlug, nodeKey, imageId } = validation.data;

    // Get story ID
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Check if image exists
    const { data: image, error: imageError } = await supabase
      .from('story_images')
      .select('id, story_id')
      .eq('id', imageId)
      .eq('story_id', story.id)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Remove existing assignment for this node
    await supabase
      .from('image_assignments')
      .delete()
      .eq('story_id', story.id)
      .eq('node_key', nodeKey);

    // Create new assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('image_assignments')
      .insert({
        story_id: story.id,
        node_key: nodeKey,
        image_id: imageId,
      })
      .select()
      .single();

    if (assignmentError) {
      return NextResponse.json(
        { error: `Failed to assign image: ${assignmentError.message}` },
        { status: 500 }
      );
    }

    // Update image status
    await supabase
      .from('story_images')
      .update({ 
        status: 'assigned',
        node_key: nodeKey,
      })
      .eq('id', imageId);

    // Update story node with image URL
    const { data: imageData, error: imageDataError } = await supabase
      .from('story_images')
      .select('image_url')
      .eq('id', imageId)
      .single();

    if (!imageDataError && imageData) {
      await supabase
        .from('story_nodes')
        .update({ 
          image_url: imageData.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('story_id', story.id)
        .eq('node_key', nodeKey);
    }

    return NextResponse.json({
      success: true,
      assignment,
    });

    } catch (error) {
      console.error('❌ Image assignment error:', error);
      return NextResponse.json(
        { error: `Failed to assign image: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}

// DELETE - Remove image assignment
export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const storySlug = searchParams.get('storySlug');
      const nodeKey = searchParams.get('nodeKey');
      const imageId = searchParams.get('imageId');

      if (!storySlug || !nodeKey || !imageId) {
        return NextResponse.json(
          { error: 'Missing required parameters: storySlug, nodeKey, imageId' },
          { status: 400 }
        );
      }

      // Get story ID
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('id')
        .eq('slug', storySlug)
        .single();

      if (storyError || !story) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      // Remove assignment
      const { error: assignmentError } = await supabase
        .from('image_assignments')
        .delete()
        .eq('story_id', story.id)
        .eq('node_key', nodeKey)
        .eq('image_id', imageId);

      if (assignmentError) {
        return NextResponse.json(
          { error: `Failed to remove assignment: ${assignmentError.message}` },
          { status: 500 }
        );
      }

      // Update image status to unused
      await supabase
        .from('story_images')
        .update({ 
          status: 'unused',
          node_key: null,
        })
        .eq('id', imageId);

      // Remove image from story node
      await supabase
        .from('story_nodes')
        .update({ 
          image_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('story_id', story.id)
        .eq('node_key', nodeKey);

      return NextResponse.json({
        success: true,
        message: 'Image assignment removed',
      });

    } catch (error) {
      console.error('❌ Image assignment removal error:', error);
      return NextResponse.json(
        { error: `Failed to remove image assignment: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
