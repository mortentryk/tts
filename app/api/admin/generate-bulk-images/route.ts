import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt, analyzeImageStyle } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { invalidateStoryCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    const { 
      storySlug, 
      model = 'stable-diffusion', // Default to Stable Diffusion for better style consistency with img2img
      style = 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children',
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

    console.log(`🎨 Starting bulk image generation for story: ${storySlug}`);

    // Get the story and its nodes
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title')
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
      .select('node_key, text_md, image_url')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (nodesError) {
      return NextResponse.json(
        { error: 'Failed to load story nodes' },
        { status: 500 }
      );
    }

    console.log(`📚 Found ${nodes.length} nodes to process`);

    const results = [];
    const errors = [];

    // Get character assignments for all nodes
    const { data: characterAssignments, error: assignmentsError } = await supabase
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
          reference_image_url,
          appearance_prompt
        )
      `)
      .eq('story_id', story.id);

    if (assignmentsError) {
      console.warn('⚠️ Could not load character assignments:', assignmentsError);
    }

    // Get story visual style
    let storyVisualStyle = null;
    try {
      const { data: storyWithStyle } = await supabase
        .from('stories')
        .select('visual_style')
        .eq('id', story.id)
        .single();
      storyVisualStyle = storyWithStyle?.visual_style;
    } catch (error) {
      console.log('Note: visual_style column not yet added to database');
    }

    // Process each node
    for (const node of nodes) {
      try {
        // Skip if image already exists and not replacing
        if (node.image_url && !replaceExisting) {
          console.log(`⏭️ Skipping node ${node.node_key} - image already exists`);
          results.push({
            nodeId: node.node_key,
            status: 'skipped',
            reason: 'Image already exists',
            imageUrl: node.image_url,
          });
          continue;
        }

        console.log(`🎨 Generating image for node ${node.node_key}...`);

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

        // Get PREVIOUS scene as reference (not first scene)
        let referenceImageUrl: string | null = null;
        let extractedStyleDescription: string | undefined = undefined;
        
        // Find previous node with an image
        const currentNodeIndex = nodes.findIndex(n => n.node_key === node.node_key);
        if (currentNodeIndex > 0) {
          // Look backwards for the most recent node with an image
          for (let i = currentNodeIndex - 1; i >= 0; i--) {
            const prevNode = nodes[i];
            if (prevNode.image_url) {
              referenceImageUrl = prevNode.image_url;
              console.log(`🎨 Using previous scene (node ${prevNode.node_key}) as reference for node ${node.node_key}`);
              
              // Only analyze style with GPT-4 Vision if we're NOT using img2img
              // img2img sees the image directly, so text description is redundant
              const willUseImg2Img = referenceImageUrl && model === 'stable-diffusion';
              
              if (!willUseImg2Img && referenceImageUrl) {
                // Only for DALL-E 3 - it can't see images, needs text description
                try {
                  console.log(`🔍 Analyzing previous scene style for DALL-E 3 (node ${node.node_key})...`);
                  extractedStyleDescription = await analyzeImageStyle(referenceImageUrl);
                  if (extractedStyleDescription) {
                    console.log(`✅ Extracted style from previous scene for node ${node.node_key}`);
                  }
                } catch (error) {
                  console.warn(`⚠️ Failed to analyze previous scene style:`, error);
                }
              } else {
                console.log(`⏭️ Skipping GPT-4 Vision analysis for node ${node.node_key} - using img2img which sees image directly`);
              }
              break;
            }
          }
        }
        
        // Use story's visual style or fallback
        const visualStyle = storyVisualStyle || style || 'Disney-style animation, anime-inspired character design, polished and professional, expressive friendly characters, vibrant bright colors, soft rounded shapes, family-friendly aesthetic, cinematic quality, warm inviting lighting, cheerful magical atmosphere, suitable for children';
        
        // Create AI prompt from story text with character consistency and style reference
        const prompt = createStoryImagePrompt(
          node.text_md, 
          story.title, 
          visualStyle, 
          nodeCharacters,
          referenceImageUrl || undefined,
          extractedStyleDescription
        );
        
        // Use img2img if we have a reference image and using stable-diffusion for better style consistency
        const useImg2Img = referenceImageUrl && model === 'stable-diffusion';
        const imageModel = useImg2Img ? 'stable-diffusion-img2img' : (model as any);
        
        if (referenceImageUrl) {
          console.log(`🖼️ Using previous scene image for style consistency on node ${node.node_key}`);
          if (extractedStyleDescription) {
            console.log(`🎭 Using extracted style description for precise matching on node ${node.node_key}`);
          }
          if (useImg2Img) {
            console.log(`🔄 Using img2img mode for better style consistency on node ${node.node_key}`);
          }
        }
        
        // Generate image with AI
        const generatedImage = await generateImage(prompt, {
          model: imageModel,
          size: size as any,
          quality: quality as any,
          referenceImageUrl: useImg2Img ? (referenceImageUrl || undefined) : undefined,
          strength: 0.65, // Good balance: maintains style while allowing scene changes
        });

        // Upload to Cloudinary
        const imageResponse = await fetch(generatedImage.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        const publicId = generateStoryAssetId(storySlug, node.node_key, 'image');
        const uploadResult = await uploadImageToCloudinary(
          imageBuffer,
          `tts-books/${storySlug}`,
          publicId,
          {
            width: 1024,
            height: 1024,
            quality: 'auto',
            format: 'auto',
          }
        );

        // Create gallery entry
        const { data: galleryImage, error: galleryError } = await supabase
          .from('story_images')
          .insert({
            story_id: story.id,
            node_key: node.node_key,
            image_url: uploadResult.secure_url,
            thumbnail_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            characters: nodeCharacters.map(char => char.name),
            cost: generatedImage.cost || 0,
            model: generatedImage.model,
            prompt: generatedImage.revised_prompt || prompt,
            width: uploadResult.width,
            height: uploadResult.height,
            file_size: uploadResult.bytes,
            status: 'generated',
          })
          .select()
          .single();

        if (galleryError) {
          console.warn('⚠️ Could not create gallery entry:', galleryError);
        }

        // Update the story node with the new image URL
        const { error: updateError } = await supabase
          .from('story_nodes')
          .update({ 
            image_url: uploadResult.secure_url,
            updated_at: new Date().toISOString()
          })
          .eq('story_id', story.id)
          .eq('node_key', node.node_key);

        if (updateError) {
          throw new Error(`Failed to update story node: ${updateError.message}`);
        }

        results.push({
          nodeId: node.node_key,
          status: 'success',
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          model: generatedImage.model,
          cost: generatedImage.cost,
          prompt: generatedImage.revised_prompt || prompt,
        });

        console.log(`✅ Generated image for node ${node.node_key}`);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to generate image for node ${node.node_key}:`, error);
        errors.push({
          nodeId: node.node_key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (results.length > 0) {
      await invalidateStoryCache(story.id);
    }
    const totalCost = results
      .filter(r => r.status === 'success' && r.cost)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalNodes: nodes.length,
        successful: results.filter(r => r.status === 'success').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: errors.length,
        totalCost: totalCost.toFixed(4),
      },
      results,
      errors,
    });

    } catch (error) {
      console.error('❌ Bulk image generation error:', error);
      return NextResponse.json(
        { error: `Bulk image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
