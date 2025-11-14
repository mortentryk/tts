import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
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

        // Create AI prompt from story text with character consistency
        // Get previous images for this node
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
        
        // Generate image with AI
        const generatedImage = await generateImage(prompt, {
          model: model as any,
          size: size as any,
          quality: quality as any,
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
}
