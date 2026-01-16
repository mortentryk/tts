import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt, analyzeImageStyle } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { invalidateStoryCache } from '@/lib/cache';
import { generateImageSchema, safeValidateBody, validationErrorResponse } from '@/lib/validation';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async () => {
    try {
    const body = await request.json();
    
    // Validate request body
    const validation = safeValidateBody(generateImageSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { 
      storySlug, 
      nodeId, 
      storyText, 
      storyTitle, 
      model = 'nano-banana',
      style,
      size = '1024x1024',
      quality = 'standard',
      referenceImageNodeKey,
      referenceImageUrl,
      useCustomPrompt = false
    } = validation.data;

    console.log(`🎨 Generating image for story: ${storySlug}, node: ${nodeId}`);
    console.log(`📋 DEBUG: Request parameters - storySlug: ${storySlug}, nodeId: ${nodeId}, model: ${model}, useCustomPrompt: ${useCustomPrompt}`);

    // If using custom prompt, create minimal prompt with just style + custom text + reference images
    if (useCustomPrompt) {
      console.log(`✏️ Using custom prompt (minimal mode): ${storyText.substring(0, 200)}...`);
      
      // Get story ID and visual style
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('id, title')
        .eq('slug', storySlug)
        .single();

      if (storyError || !story) {
        console.error('❌ Story fetch error:', storyError);
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      // Get story's visual style
      let storyVisualStyle = null;
      try {
        const { data: storyWithStyle } = await supabase
          .from('stories')
          .select('visual_style')
          .eq('id', story.id)
          .single();
        storyVisualStyle = storyWithStyle?.visual_style;
        console.log(`🎨 Custom prompt: Story visual_style: ${storyVisualStyle || 'NOT SET'}`);
      } catch (error) {
        console.log('⚠️ Note: visual_style column not yet added to database');
      }

      // Get reference image if provided
      let requestReferenceImageUrl = referenceImageUrl;
      if (referenceImageNodeKey && !requestReferenceImageUrl) {
        try {
          const { data: refNode } = await supabase
            .from('story_nodes')
            .select('image_url')
            .eq('story_id', story.id)
            .eq('node_key', referenceImageNodeKey)
            .not('image_url', 'is', null)
            .single();
          if (refNode?.image_url) {
            requestReferenceImageUrl = refNode.image_url;
            console.log(`🎨 Custom prompt: Using reference image from node ${referenceImageNodeKey}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not find reference node ${referenceImageNodeKey}`);
        }
      }

      // Build minimal prompt: Style + Custom Text + Basic quality
      const visualStyle = storyVisualStyle || style || undefined;
      let promptParts: string[] = [];
      
      if (visualStyle) {
        promptParts.push(`STYLE REQUIREMENTS: ${visualStyle}`);
      }
      
      promptParts.push(storyText.trim());
      
      promptParts.push(`High quality illustration, no text, no words, no writing, no letters, no dialogue boxes, no UI elements.`);
      
      const prompt = promptParts.join('\n\n');
      console.log(`📝 Custom prompt built (${prompt.length} chars): ${prompt.substring(0, 300)}...`);

      // Determine model
      const useImg2Img = requestReferenceImageUrl && model !== 'dalle3' && model !== 'nano-banana';
      const imageModel = useImg2Img ? 'stable-diffusion-img2img' : (model as any);
      
      // Generate image with minimal prompt
      const generateOptions: any = {
        model: imageModel,
        size: size as any,
        quality: quality as any,
      };

      // Add reference images if provided
      if (requestReferenceImageUrl) {
        if (model === 'nano-banana') {
          generateOptions.referenceImageUrls = [requestReferenceImageUrl];
        } else if (useImg2Img) {
          generateOptions.referenceImageUrl = requestReferenceImageUrl;
          generateOptions.strength = 0.6;
        }
      }

      const generatedImage = await generateImage(prompt, generateOptions);
      console.log('✅ Image generated from custom prompt:', generatedImage.url);

      // Upload to Cloudinary if configured
      let finalImageUrl = generatedImage.url;
      let imageWidth = 1024;
      let imageHeight = 1024;
      let publicId = '';

      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        console.log('📤 Uploading to Cloudinary...');
        const imageResponse = await fetch(generatedImage.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        publicId = generateStoryAssetId(storySlug, nodeId, 'image');
        const uploadResult = await uploadImageToCloudinary(
          imageBuffer,
          `tts-books/${storySlug}`,
          publicId,
          {
            width: 1024,
            height: 1024,
            quality: 'auto',
          }
        );

        finalImageUrl = uploadResult.secure_url;
        imageWidth = uploadResult.width;
        imageHeight = uploadResult.height;
        console.log('☁️ Uploaded to Cloudinary:', finalImageUrl);
      } else {
        console.log('⚠️ Cloudinary not configured, using generated URL directly');
      }

      // Update the story node with the new image URL
      const { error: updateError } = await supabase
        .from('story_nodes')
        .update({ 
          image_url: finalImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('story_id', story.id)
        .eq('node_key', nodeId);

      if (updateError) {
        console.error('❌ Failed to update story node:', updateError);
        return NextResponse.json(
          { error: 'Failed to update story node with image URL' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        image: {
          url: finalImageUrl,
          public_id: publicId,
          width: imageWidth,
          height: imageHeight,
          model: generatedImage.model,
          cost: generatedImage.cost,
          prompt: generatedImage.revised_prompt || prompt,
        },
      });
    }

    // Get story ID and title (visual_style is optional)
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, title')
      .eq('slug', storySlug)
      .single();

    if (storyError || !story) {
      console.error('❌ Story fetch error:', storyError);
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    console.log(`✅ DEBUG: Found story - ID: ${story.id}, Title: ${story.title}`);
    
    // Try to get visual_style if the column exists
    let storyVisualStyle = null;
    try {
      const { data: storyWithStyle } = await supabase
        .from('stories')
        .select('visual_style')
        .eq('id', story.id)
        .single();
      storyVisualStyle = storyWithStyle?.visual_style;
      console.log(`🎨 DEBUG: Story visual_style: ${storyVisualStyle || 'NOT SET (will use default)'}`);
    } catch (error) {
      // Column doesn't exist yet, that's okay
      console.log('⚠️ Note: visual_style column not yet added to database');
    }

    // Get character assignments for this node (including reference images)
    const { data: characterAssignments, error: assignmentsError } = await supabase
      .from('character_assignments')
      .select(`
        role,
        emotion,
        action,
        characters (
          name,
          description,
          appearance_prompt,
          reference_image_url
        )
      `)
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (assignmentsError) {
      console.warn('⚠️ Could not load character assignments:', assignmentsError);
    }

    // Format character data for prompt and collect reference images
    const nodeCharacters = characterAssignments?.map(assignment => {
      const character = assignment.characters as any;
      return {
        name: character?.name || '',
        description: character?.description || '',
        appearancePrompt: character?.appearance_prompt || '',
        referenceImageUrl: character?.reference_image_url || null,
        role: assignment.role,
        emotion: assignment.emotion,
        action: assignment.action,
      };
    }) || [];

    // Collect character reference images
    const characterReferenceImages = nodeCharacters
      .filter(char => char.referenceImageUrl)
      .map(char => char.referenceImageUrl!);
    
    if (characterReferenceImages.length > 0) {
      console.log(`🎭 DEBUG: Found ${characterReferenceImages.length} character reference image(s)`);
    }

    console.log(`🎭 DEBUG: Found ${nodeCharacters.length} characters for this node`);
    if (nodeCharacters.length > 0) {
      nodeCharacters.forEach((char, idx) => {
        console.log(`   Character ${idx + 1}: ${char.name} (${char.role || 'no role'}, ${char.emotion || 'no emotion'}, ${char.action || 'no action'})`);
      });
    }

    // DEBUG: List all nodes in this story to see what's available
    const { data: allNodes, error: allNodesError } = await supabase
      .from('story_nodes')
      .select('node_key, sort_index, image_url')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });
    
    if (!allNodesError && allNodes) {
      console.log(`📊 DEBUG: All nodes in story (${allNodes.length} total):`);
      allNodes.forEach(node => {
        const hasImage = node.image_url ? '✅ HAS IMAGE' : '❌ NO IMAGE';
        console.log(`   Node ${node.node_key} (sort_index: ${node.sort_index}): ${hasImage}${node.image_url ? ` - ${node.image_url.substring(0, 50)}...` : ''}`);
      });
    }

    // Get PREVIOUS nodes' text for context - get last 2-3 nodes for better continuity
    let previousNodesText: string[] = [];
    let previousNodeKey: string | null = null;
    
    try {
      // Get current node's sort_index
      const { data: currentNode } = await supabase
        .from('story_nodes')
        .select('sort_index, text_md')
        .eq('story_id', story.id)
        .eq('node_key', nodeId)
        .single();

      if (currentNode && currentNode.sort_index && currentNode.sort_index > 1) {
        // Get the last 3 previous nodes (for better context)
        const startIndex = Math.max(1, currentNode.sort_index - 3);
        const { data: previousNodes, error: prevNodesError } = await supabase
          .from('story_nodes')
          .select('node_key, text_md, sort_index')
          .eq('story_id', story.id)
          .gte('sort_index', startIndex)
          .lt('sort_index', currentNode.sort_index)
          .order('sort_index', { ascending: true });

        if (!prevNodesError && previousNodes && previousNodes.length > 0) {
          previousNodesText = previousNodes
            .filter(node => node.text_md)
            .map(node => node.text_md!);
          
          if (previousNodes.length > 0) {
            previousNodeKey = previousNodes[previousNodes.length - 1].node_key;
            console.log(`📖 DEBUG: Found ${previousNodesText.length} previous node(s) for context`);
            previousNodesText.forEach((text, idx) => {
              console.log(`   Previous node ${idx + 1} (${text.length} chars): ${text.substring(0, 100)}...`);
            });
          }
        } else {
          console.log(`⚠️ DEBUG: No previous nodes found`);
        }
      } else {
        console.log(`⚠️ DEBUG: Current node sort_index is ${currentNode?.sort_index || 'null'} (first node or no sort_index)`);
      }
    } catch (error) {
      console.log(`⚠️ DEBUG: Error finding previous node text:`, error);
    }
    
    // Combine previous nodes text for context
    const previousNodeText = previousNodesText.length > 0 
      ? previousNodesText.join('\n\n')
      : '';

    // Get reference images - for nano-banana, get the last couple of images
    let nodeReferenceImageUrl: string | null = null;
    let referenceImageUrls: string[] = [];
    let extractedStyleDescription: string | undefined = undefined;
    let finalReferenceImageUrl: string | null = null; // Declare outside try block
    
    console.log(`🔍 DEBUG: Starting reference image search for node ${nodeId} in story ${story.id} (${storySlug})`);
    
    try {
      // Get current node's sort_index
      const { data: currentNode, error: currentNodeError } = await supabase
        .from('story_nodes')
        .select('sort_index, node_key, image_url')
        .eq('story_id', story.id)
        .eq('node_key', nodeId)
        .single();

      if (currentNodeError) {
        console.log(`❌ DEBUG: Error finding current node: ${currentNodeError.message}`);
      }

      // For nano-banana, get the last couple of images (up to 2)
      if (currentNode && currentNode.sort_index && currentNode.sort_index > 1) {
        console.log(`🔍 DEBUG: Current node sort_index is ${currentNode.sort_index}, searching for previous images...`);
        
        // Get the last 2 images before current node
        const { data: previousNodes, error: prevNodesError } = await supabase
          .from('story_nodes')
          .select('image_url, node_key, sort_index')
          .eq('story_id', story.id)
          .lt('sort_index', currentNode.sort_index)
          .not('image_url', 'is', null)
          .neq('node_key', nodeId)
          .order('sort_index', { ascending: false })
          .limit(2);

        if (!prevNodesError && previousNodes && previousNodes.length > 0) {
          referenceImageUrls = previousNodes
            .filter(node => node.image_url)
            .map(node => node.image_url!)
            .reverse(); // Reverse to get chronological order (oldest first)
          
          if (referenceImageUrls.length > 0) {
            nodeReferenceImageUrl = referenceImageUrls[referenceImageUrls.length - 1]; // Most recent
            console.log(`✅ DEBUG: Found ${referenceImageUrls.length} previous node image(s)`);
            referenceImageUrls.forEach((url, idx) => {
              console.log(`   Previous image ${idx + 1}: ${url.substring(0, 80)}...`);
            });
          }
        } else {
          console.log(`⚠️ DEBUG: No previous images found`);
        }
      }
      
      // Add character reference images to the array
      if (characterReferenceImages.length > 0) {
        referenceImageUrls = [...characterReferenceImages, ...referenceImageUrls];
        console.log(`✅ DEBUG: Added ${characterReferenceImages.length} character reference image(s)`);
        console.log(`   Total reference images: ${referenceImageUrls.length}`);
      }
      
      if (referenceImageUrls.length > 0) {
        nodeReferenceImageUrl = referenceImageUrls[referenceImageUrls.length - 1]; // Most recent
      }
      
      // If still no reference, try to get first image as fallback
      if (referenceImageUrls.length === 0) {
        console.log(`🔍 DEBUG: No previous images found, falling back to first image...`);
        const { data: firstNode, error: firstNodeError } = await supabase
          .from('story_nodes')
          .select('image_url, node_key, sort_index')
          .eq('story_id', story.id)
          .not('image_url', 'is', null)
          .neq('node_key', nodeId)
          .order('sort_index', { ascending: true })
          .limit(1)
          .single();

        if (!firstNodeError && firstNode && firstNode.image_url) {
          nodeReferenceImageUrl = firstNode.image_url;
          referenceImageUrls = [firstNode.image_url];
          console.log(`✅ DEBUG: Using first image as fallback reference (node ${firstNode.node_key})`);
        }
      }

      // Handle reference image from request (for custom prompts)
      // Priority: 1) Direct URL, 2) Node key, 3) Previous node images
      let requestReferenceImageUrl = referenceImageUrl;
      if (referenceImageNodeKey && !requestReferenceImageUrl) {
        try {
          const { data: refNode } = await supabase
            .from('story_nodes')
            .select('image_url, node_key')
            .eq('story_id', story.id)
            .eq('node_key', referenceImageNodeKey)
            .not('image_url', 'is', null)
            .single();

          if (refNode && refNode.image_url) {
            requestReferenceImageUrl = refNode.image_url;
            console.log(`🎨 Using reference image from node ${referenceImageNodeKey}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not find reference node ${referenceImageNodeKey}`);
        }
      }

      // Use direct URL from request if provided, otherwise use node reference
      finalReferenceImageUrl = requestReferenceImageUrl || nodeReferenceImageUrl;
      if (requestReferenceImageUrl) {
        // Add direct URL to reference images array if provided (prioritize it)
        referenceImageUrls = [requestReferenceImageUrl, ...referenceImageUrls];
      }

      // For non-nano-banana models, still do style analysis if needed
      if (model !== 'nano-banana' && finalReferenceImageUrl) {
        const willUseImg2Img = finalReferenceImageUrl && model !== 'dalle3';
        
        if (!willUseImg2Img && finalReferenceImageUrl) {
          // Only for DALL-E 3 - it can't see images, needs text description
          try {
            console.log(`🔍 DEBUG: Analyzing reference image style for DALL-E 3...`);
            extractedStyleDescription = await analyzeImageStyle(finalReferenceImageUrl);
            if (extractedStyleDescription) {
              console.log(`✅ DEBUG: Extracted style description (${extractedStyleDescription.length} chars): ${extractedStyleDescription.substring(0, 150)}...`);
            }
          } catch (error) {
            console.warn(`⚠️ DEBUG: Failed to analyze reference image style:`, error);
          }
        }
      }
    } catch (error) {
      // No reference image found, that's okay - we'll generate without reference
      console.log(`❌ DEBUG: Exception during reference image search:`, error);
      console.log('📝 No reference image found, generating without style reference');
    }

    // Use story's visual style from database, or provided style, or let createStoryImagePrompt use its default
    // Don't hard-code defaults here - let the prompt function handle it
    const visualStyle = storyVisualStyle || style || undefined;
    
    console.log(`🎨 DEBUG: Visual style to use:`, {
      from_database: !!storyVisualStyle,
      from_request: !!style,
      will_use_default: !visualStyle,
      style_length: visualStyle?.length || 0,
      style_preview: visualStyle ? visualStyle.substring(0, 100) + '...' : 'will use createStoryImagePrompt default'
    });
    
    // Combine previous node text + current node text for full context
    // Previous node text provides continuity, current node text is the scene to depict
    let fullStoryText = storyText;
    if (previousNodeText) {
      // Include previous scene context so the model understands continuity
      const previousContext = previousNodeText.length > 500 
        ? previousNodeText.substring(0, 500) + '...' 
        : previousNodeText;
      fullStoryText = `Previous scene context: ${previousContext}\n\nCurrent scene to depict: ${storyText}`;
      console.log(`📖 DEBUG: Combined previous + current node text (${fullStoryText.length} total chars)`);
    } else {
      console.log(`📖 DEBUG: No previous node text, using only current node text`);
    }
    console.log(`📝 DEBUG: Story text for prompt:`, {
      previous_node_text_length: previousNodeText.length,
      current_node_text_length: storyText.length,
      combined_text_length: fullStoryText.length,
      current_text_preview: storyText.substring(0, 150) + '...',
      previous_text_preview: previousNodeText ? previousNodeText.substring(0, 100) + '...' : '(none)'
    });
    
    // For nano-banana, use simplified prompt (just the Danish text)
    // For other models, use the complex prompt builder
    let prompt: string;
    let imageModel: string;
    
    if (model === 'nano-banana') {
      // Use Danish text with role-based prompt - nano-banana understands Danish
      // Establish the role and context for better image generation
      let promptParts: string[] = [];
      
      // Role and context setting
      promptParts.push(`Du er en professionel børnebogsillustratør. Din opgave er at lave det næste billede til næste side i bogen.`);
      
      // Visual style - CRITICAL for consistency
      // Always include visual style if it's set in the database (from Story Configuration Hub)
      if (visualStyle && visualStyle.trim()) {
        promptParts.push(`VISUEL STIL (SKAL FØLGES NOJAGTIGT): ${visualStyle.trim()}. Denne stil skal anvendes konsekvent i alle billeder.`);
      } else if (storyVisualStyle && storyVisualStyle.trim()) {
        // Fallback: use storyVisualStyle directly if visualStyle wasn't set but database has it
        promptParts.push(`VISUEL STIL (SKAL FØLGES NOJAGTIGT): ${storyVisualStyle.trim()}. Denne stil skal anvendes konsekvent i alle billeder.`);
      }
      
      // Reference images context
      if (referenceImageUrls.length > 0) {
        promptParts.push(`Du har ${referenceImageUrls.length} referencebilleder fra tidligere sider. Brug disse til at matche den visuelle stil, farvepaletten, karakterernes udseende og den overordnede æstetik.`);
      } else {
        promptParts.push(`Dette er det første billede i bogen.`);
      }
      
      // Story context
      if (story.title) {
        promptParts.push(`Historien handler om: ${story.title}`);
      }
      
      // Previous scenes for continuity
      if (previousNodeText) {
        const previousContext = previousNodeText.length > 600 
          ? previousNodeText.substring(previousNodeText.length - 600) // Last 600 chars (most recent context)
          : previousNodeText;
        promptParts.push(`Tidligere scener i historien:\n${previousContext}`);
      }
      
      // Current scene - THIS is what to illustrate
      promptParts.push(`Nuværende scene til illustration:\n${storyText.trim()}\n\nVigtigt: Dette skal være et NYT billede, der viser den nuværende scene, ikke en kopi af de tidligere billeder. Brug samme stil og karakterer, men vis det nye, der sker i historien.`);
      
      prompt = promptParts.join('\n\n');
      imageModel = 'nano-banana';
      console.log(`📝 DEBUG: Using role-based prompt for nano-banana (${prompt.length} chars)`);
      console.log(`   Story title: ${story.title || 'none'}`);
      console.log(`   Previous nodes: ${previousNodesText.length} node(s)`);
      console.log(`   Reference images: ${referenceImageUrls.length}`);
      console.log(`   Current scene: ${storyText.length} chars`);
      console.log(`   Preview: ${prompt.substring(0, 200)}...`);
    } else {
      // Use complex prompt builder for other models
      console.log(`🔧 DEBUG: Creating prompt with:`, {
        story_title: story.title || storyTitle || '',
        visual_style_length: visualStyle?.length || 0,
        characters_count: nodeCharacters.length,
        has_reference_image: !!finalReferenceImageUrl,
        has_extracted_style: !!extractedStyleDescription
      });
      
      prompt = createStoryImagePrompt(
        fullStoryText, 
        story.title || storyTitle || '', 
        visualStyle, 
        nodeCharacters, 
        finalReferenceImageUrl || undefined,
        extractedStyleDescription
      );
      
      console.log(`📝 DEBUG: Generated prompt (${prompt.length} chars):`);
      console.log(`   First 200 chars: ${prompt.substring(0, 200)}...`);
      console.log(`   Last 200 chars: ...${prompt.substring(prompt.length - 200)}`);
      
      // Generate image with AI
      // IMPORTANT: Use stable-diffusion with img2img when we have a reference image for MUCH better style consistency
      // DALL-E 3 doesn't support img2img, so we automatically switch to stable-diffusion-img2img when we have a reference
      const useImg2Img = finalReferenceImageUrl && model !== 'dalle3'; // Use img2img if we have reference and not forcing dalle3
      const shouldUseStableDiffusionImg2Img = finalReferenceImageUrl && model === 'dalle3'; // Switch to SD img2img if we have reference but model is dalle3
      imageModel = useImg2Img || shouldUseStableDiffusionImg2Img
        ? 'stable-diffusion-img2img' 
        : (model as any);
      
      console.log(`🔧 DEBUG: Model selection:`, {
        requested_model: model,
        has_reference_image: !!finalReferenceImageUrl,
        use_img2img: useImg2Img || shouldUseStableDiffusionImg2Img,
        final_model: imageModel,
        will_use_reference_in_img2img: (useImg2Img || shouldUseStableDiffusionImg2Img) && !!finalReferenceImageUrl
      });
      
      if (shouldUseStableDiffusionImg2Img) {
        console.log('🔄 DEBUG: Auto-switching to stable-diffusion-img2img for better reference image support (DALL-E 3 doesn\'t support img2img)');
      }
    }
    
    // Log reference image info
    if (finalReferenceImageUrl) {
      console.log(`🖼️ DEBUG: Reference image URL: ${finalReferenceImageUrl.substring(0, 80)}...`);
    }
    if (referenceImageUrls.length > 0) {
      console.log(`🖼️ DEBUG: Reference image URLs (${referenceImageUrls.length}):`);
      referenceImageUrls.forEach((url, idx) => {
        console.log(`   ${idx + 1}: ${url.substring(0, 80)}...`);
      });
    }
    if (extractedStyleDescription) {
      console.log(`🎭 DEBUG: Extracted style description (${extractedStyleDescription.length} chars): ${extractedStyleDescription.substring(0, 150)}...`);
    }
    
    console.log(`🚀 DEBUG: Calling generateImage with:`, {
      model: imageModel,
      size,
      quality,
      has_reference_url: !!finalReferenceImageUrl,
      has_reference_urls: referenceImageUrls.length,
    });
    
    // Generate image with appropriate options based on model
    const generateOptions: any = {
      model: imageModel,
      size: size as any,
      quality: quality as any,
    };
    
    if (model === 'nano-banana') {
      // For nano-banana, pass reference images
      if (referenceImageUrls.length > 0) {
        generateOptions.referenceImageUrls = referenceImageUrls;
      } else if (finalReferenceImageUrl) {
        generateOptions.referenceImageUrl = finalReferenceImageUrl;
      }
    } else {
      // For other models, use img2img pattern
      const useImg2Img = finalReferenceImageUrl && model !== 'dalle3';
      const shouldUseStableDiffusionImg2Img = finalReferenceImageUrl && model === 'dalle3';
      if (useImg2Img || shouldUseStableDiffusionImg2Img) {
        generateOptions.referenceImageUrl = finalReferenceImageUrl;
        generateOptions.strength = 0.65; // Good balance: maintains style while allowing scene changes
      }
    }
    
    const generatedImage = await generateImage(prompt, generateOptions);
    
    if (model !== 'nano-banana' && (generateOptions.referenceImageUrl || generateOptions.referenceImageUrls)) {
      console.log('✅ DEBUG: Used img2img mode for style consistency');
    }

    console.log('✅ Image generated:', generatedImage.url);

    // Use Cloudinary if configured, otherwise use OpenAI URL directly
    let finalImageUrl = generatedImage.url;
    let imageWidth = 1024;
    let imageHeight = 1024;
    let publicId = '';

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      // Upload to Cloudinary
      console.log('📤 Uploading to Cloudinary...');
      const imageResponse = await fetch(generatedImage.url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      publicId = generateStoryAssetId(storySlug, nodeId, 'image');
      const uploadResult = await uploadImageToCloudinary(
        imageBuffer,
        `tts-books/${storySlug}`,
        publicId,
        {
          width: 1024,
          height: 1024,
          quality: 'auto',
        }
      );

      finalImageUrl = uploadResult.secure_url;
      imageWidth = uploadResult.width;
      imageHeight = uploadResult.height;
      console.log('☁️ Uploaded to Cloudinary:', finalImageUrl);
    } else {
      console.log('⚠️ Cloudinary not configured, using OpenAI URL directly');
    }

    // Update the story node with the new image URL
    const { error: updateError } = await supabase
      .from('story_nodes')
      .update({ 
        image_url: finalImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (updateError) {
      console.error('❌ Failed to update story node:', updateError);
      return NextResponse.json(
        { error: 'Failed to update story node with image URL' },
        { status: 500 }
      );
    }

    await invalidateStoryCache(story.id);
    return NextResponse.json({
      success: true,
      image: {
        url: finalImageUrl,
        public_id: publicId,
        width: imageWidth,
        height: imageHeight,
        model: generatedImage.model,
        cost: generatedImage.cost,
        prompt: generatedImage.revised_prompt || prompt,
      },
    });

    } catch (error) {
      console.error('❌ Image generation error:', error);
      return NextResponse.json(
        { error: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}
