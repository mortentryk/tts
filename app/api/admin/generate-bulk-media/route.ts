import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt, generateVideoWithReplicate } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, uploadVideoToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      mediaType = 'image', // 'image', 'video', 'both'
      model = 'dalle3',
      style = 'fantasy adventure book illustration',
      size = '1024x1024',
      quality = 'standard',
      replaceExisting = false
    } = body;

    if (!storySlug) {
      return NextResponse.json(
        { error: 'Missing required field: storySlug' },
        { status: 400 }
      );
    }

    console.log(`🎨 Starting bulk ${mediaType} generation for story: ${storySlug}`);

    // Get the story and its nodes
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title, default_media_type, video_enabled')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('node_key, text_md, image_url, video_url, media_type')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (nodesError) {
      return NextResponse.json({ error: 'Failed to load story nodes' }, { status: 500 });
    }

    console.log(`📚 Found ${nodes.length} nodes to process`);

    const results = [];
    const errors = [];

    // Get character assignments for all nodes
    const { data: characterAssignments } = await supabase
      .from('character_assignments')
      .select(`
        node_key,
        role,
        emotion,
        action,
        characters (
          id,
          name,
          description,
          appearance_prompt
        )
      `)
      .eq('story_id', story.id);

    // Process each node
    for (const node of nodes) {
      try {
        const nodeMediaType = node.media_type || mediaType;
        
        // Skip if media already exists and not replacing
        const hasImage = node.image_url && (nodeMediaType === 'image' || nodeMediaType === 'both');
        const hasVideo = node.video_url && (nodeMediaType === 'video' || nodeMediaType === 'both');
        
        if ((hasImage || hasVideo) && !replaceExisting) {
          console.log(`⏭️ Skipping node ${node.node_key} - media already exists`);
          results.push({
            nodeId: node.node_key,
            status: 'skipped',
            reason: 'Media already exists',
            imageUrl: node.image_url,
            videoUrl: node.video_url,
          });
          continue;
        }

        console.log(`🎨 Generating ${nodeMediaType} for node ${node.node_key}...`);

        const nodeResult: any = {
          nodeId: node.node_key,
          status: 'processing',
        };

        // Get character assignments for this node
        const nodeCharacters = characterAssignments
          ?.filter(assignment => assignment.node_key === node.node_key)
          .map(assignment => {
            const character = assignment.characters as any;
            return {
              name: character?.name || '',
              description: character?.description || '',
              appearancePrompt: character?.appearance_prompt || '',
              role: assignment.role,
              emotion: assignment.emotion,
              action: assignment.action,
            };
          }) || [];

        // Generate image if needed
        if (nodeMediaType === 'image' || nodeMediaType === 'both') {
          // Get previous images for visual consistency
          const currentNodeIndex = parseInt(node.node_key) || 0;
          const previousNodeKeys = [];
          for (let i = Math.max(1, currentNodeIndex - 2); i < currentNodeIndex; i++) {
            previousNodeKeys.push(i.toString());
          }
          
          let previousImageUrls: string[] = [];
          if (previousNodeKeys.length > 0) {
            const { data: previousNodes } = await supabase
              .from('story_nodes')
              .select('image_url')
              .eq('story_id', story.id)
              .in('node_key', previousNodeKeys)
              .order('sort_index', { ascending: true });
            
            previousImageUrls = (previousNodes || [])
              .filter(n => n.image_url && n.image_url.includes('cloudinary.com'))
              .map(n => n.image_url)
              .slice(-2);
          }
          
          const prompt = await createStoryImagePrompt(node.text_md, story.title, style, nodeCharacters, previousImageUrls);
          const generatedImage = await generateImage(prompt, {
            model: model as any,
            size: size as any,
            quality: quality as any,
          });

          // Upload to Cloudinary
          const imageResponse = await fetch(generatedImage.url);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          const imagePublicId = generateStoryAssetId(storySlug, node.node_key, 'image');
          const imageUploadResult = await uploadImageToCloudinary(
            imageBuffer,
            `tts-books/${storySlug}`,
            imagePublicId,
            {
              width: 1024,
              height: 1024,
              quality: 'auto',
            }
          );

          nodeResult.imageUrl = imageUploadResult.secure_url;
          nodeResult.imageCost = generatedImage.cost;
        }

        // Generate video if needed
        if (nodeMediaType === 'video' || nodeMediaType === 'both') {
          if (!story.video_enabled) {
            console.warn(`⚠️ Video generation disabled for story ${storySlug}`);
            nodeResult.videoError = 'Video generation disabled for this story';
          } else {
            const imageUrl = nodeResult.imageUrl || node.image_url;
            
            if (!imageUrl) {
              nodeResult.videoError = 'No image available for video generation';
            } else {
              const generatedVideo = await generateVideoWithReplicate(node.text_md, imageUrl);

              // Upload to Cloudinary
              const videoResponse = await fetch(generatedVideo.url);
              const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
              
              const videoPublicId = generateStoryAssetId(storySlug, node.node_key, 'video');
              const videoUploadResult = await uploadVideoToCloudinary(
                videoBuffer,
                `tts-books/${storySlug}`,
                videoPublicId,
                {
                  width: 1920,
                  height: 1080,
                  quality: 'auto',
                }
              );

              nodeResult.videoUrl = videoUploadResult.secure_url;
              nodeResult.videoCost = generatedVideo.cost;
            }
          }
        }

        // Update the story node
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (nodeResult.imageUrl) {
          updateData.image_url = nodeResult.imageUrl;
        }
        if (nodeResult.videoUrl) {
          updateData.video_url = nodeResult.videoUrl;
        }

        const { error: updateError } = await supabase
          .from('story_nodes')
          .update(updateData)
          .eq('story_id', story.id)
          .eq('node_key', node.node_key);

        if (updateError) {
          throw new Error(`Failed to update node: ${updateError.message}`);
        }

        nodeResult.status = 'completed';
        results.push(nodeResult);

        console.log(`✅ Completed node ${node.node_key}`);

      } catch (error) {
        console.error(`❌ Error processing node ${node.node_key}:`, error);
        errors.push({
          nodeId: node.node_key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`🎉 Bulk generation completed: ${results.length} successful, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: nodes.length,
        successful: results.length,
        failed: errors.length,
        mediaType,
      },
    });

  } catch (error) {
    console.error('❌ Bulk media generation error:', error);
    return NextResponse.json(
      { error: `Bulk media generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
