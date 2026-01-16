import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getCloudinaryUrl, parseAssetReference } from '../../../../lib/cloudinary';
import { withAdminAuth } from '@/lib/middleware';
import { invalidateStoryCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    const { storySlug } = body;

    if (!storySlug) {
      return NextResponse.json(
        { error: 'Missing required field: storySlug' },
        { status: 400 }
      );
    }

    console.log(`🔍 Resolving assets for story: ${storySlug}`);

    // Get the story and its nodes
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

    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('id, node_key, image_url')
      .eq('story_id', story.id);

    if (nodesError) {
      return NextResponse.json(
        { error: 'Failed to load story nodes' },
        { status: 500 }
      );
    }

    const results = [];
    const updates = [];

    // Process each node
    for (const node of nodes) {
      if (!node.image_url) continue;

      const assetRef = parseAssetReference(node.image_url);
      if (!assetRef) continue; // Not an asset reference

      try {
        // Generate Cloudinary URL for the asset
        const publicId = `tts-books/${storySlug}/${assetRef.type}-${node.node_key}`;
        const cloudinaryUrl = getCloudinaryUrl(publicId, {
          width: 1024,
          height: 1024,
          quality: 'auto',
          format: 'auto',
        });

        // Update the node with the Cloudinary URL
        const { error: updateError } = await supabase
          .from('story_nodes')
          .update({ 
            image_url: cloudinaryUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', node.id);

        if (updateError) {
          results.push({
            nodeId: node.node_key,
            status: 'error',
            error: updateError.message,
          });
        } else {
          results.push({
            nodeId: node.node_key,
            status: 'success',
            originalReference: node.image_url,
            cloudinaryUrl,
            publicId,
          });
        }

      } catch (error) {
        results.push({
          nodeId: node.node_key,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;

    await invalidateStoryCache(story.id);
    return NextResponse.json({
      success: true,
      summary: {
        totalNodes: nodes.length,
        processed: results.length,
        successful,
        errors,
      },
      results,
    });

    } catch (error) {
      console.error('❌ Asset resolution error:', error);
      return NextResponse.json(
        { error: `Asset resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
