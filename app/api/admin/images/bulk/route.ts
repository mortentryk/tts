import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// POST - Bulk operations on images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      operation, 
      imageIds = [], 
      nodeKey,
      status 
    } = body;

    if (!storySlug || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, operation' },
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

    let results: any = [];

    switch (operation) {
      case 'assign':
        if (!nodeKey || imageIds.length === 0) {
          return NextResponse.json(
            { error: 'Missing required fields for assign: nodeKey, imageIds' },
            { status: 400 }
          );
        }

        // Remove existing assignments for this node
        await supabase
          .from('image_assignments')
          .delete()
          .eq('story_id', story.id)
          .eq('node_key', nodeKey);

        // Create new assignments
        const assignmentData = imageIds.map((imageId: string) => ({
          story_id: story.id,
          node_key: nodeKey,
          image_id: imageId,
        }));

        const { data: assignments, error: assignmentError } = await supabase
          .from('image_assignments')
          .insert(assignmentData)
          .select();

        if (assignmentError) {
          return NextResponse.json(
            { error: `Failed to assign images: ${assignmentError.message}` },
            { status: 500 }
          );
        }

        // Update image statuses
        await supabase
          .from('story_images')
          .update({ 
            status: 'assigned',
            node_key: nodeKey,
          })
          .in('id', imageIds);

        // Update story node with first image URL
        const { data: firstImage, error: firstImageError } = await supabase
          .from('story_images')
          .select('image_url')
          .eq('id', imageIds[0])
          .single();

        if (!firstImageError && firstImage) {
          await supabase
            .from('story_nodes')
            .update({ 
              image_url: firstImage.image_url,
              updated_at: new Date().toISOString()
            })
            .eq('story_id', story.id)
            .eq('node_key', nodeKey);
        }

        results = assignments || [];
        break;

      case 'delete':
        if (imageIds.length === 0) {
          return NextResponse.json(
            { error: 'Missing required field for delete: imageIds' },
            { status: 400 }
          );
        }

        // Delete image assignments first
        await supabase
          .from('image_assignments')
          .delete()
          .in('image_id', imageIds);

        // Delete images
        const { error: deleteError } = await supabase
          .from('story_images')
          .delete()
          .in('id', imageIds);

        if (deleteError) {
          return NextResponse.json(
            { error: `Failed to delete images: ${deleteError.message}` },
            { status: 500 }
          );
        }

        results = { deleted: imageIds.length };
        break;

      case 'update_status':
        if (!status || imageIds.length === 0) {
          return NextResponse.json(
            { error: 'Missing required fields for update_status: status, imageIds' },
            { status: 400 }
          );
        }

        const { data: updatedImages, error: updateError } = await supabase
          .from('story_images')
          .update({ status })
          .in('id', imageIds)
          .select();

        if (updateError) {
          return NextResponse.json(
            { error: `Failed to update image status: ${updateError.message}` },
            { status: 500 }
          );
        }

        results = updatedImages || [];
        break;

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operation,
      results,
    });

  } catch (error) {
    console.error('❌ Bulk operation error:', error);
    return NextResponse.json(
      { error: `Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
