import { NextRequest, NextResponse } from 'next/server';
import { generateImage, createStoryImagePrompt, analyzeImageStyle } from '../../../../lib/aiImageGenerator';
import { uploadImageToCloudinary, generateStoryAssetId } from '../../../../lib/cloudinary';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      storySlug, 
      nodeId, 
      storyText, 
      storyTitle, 
      model = 'nano-banana', // Default to Stable Diffusion for better style consistency with img2img and reference images
      style, // No hard-coded default - use story's visual_style or let createStoryImagePrompt use its default
      size = '1024x1024',
      quality = 'standard',
      referenceImageNodeKey,
      useCustomPrompt = false // If true, use storyText directly as prompt without story context
    } = body;

    if (!storySlug || !nodeId || !storyText) {
      return NextResponse.json(
        { error: 'Missing required fields: storySlug, nodeId, storyText' },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating image for story: ${storySlug}, node: ${nodeId}`);
    console.log(`📋 DEBUG: Request parameters - storySlug: ${storySlug}, nodeId: ${nodeId}, model: ${model}, useCustomPrompt: ${useCustomPrompt}`);

    // Get story ID first (needed for all paths)
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

    // NANO-BANANA: Simple approach like video generation - use Danish text directly, no complex prompts
    if (model === 'nano-banana') {
      console.log('🍌 Using Nano Banana with simple Danish prompt (no complex prompt building)');
      
      // Get the last couple of images as reference
      let referenceImageUrls: string[] = [];
      try {
        const { data: currentNode } = await supabase
          .from('story_nodes')
          .select('sort_index')
          .eq('story_id', story.id)
          .eq('node_key', nodeId)
          .single();

        if (currentNode && currentNode.sort_index && currentNode.sort_index > 1) {
          // Get the last 2 images (previous nodes with images)
          const { data: previousNodes } = await supabase
            .from('story_nodes')
            .select('image_url, sort_index')
            .eq('story_id', story.id)
            .lt('sort_index', currentNode.sort_index)
            .not('image_url', 'is', null)
            .order('sort_index', { ascending: false })
            .limit(2);
          
          if (previousNodes && previousNodes.length > 0) {
            referenceImageUrls = previousNodes
              .map(node => node.image_url)
              .filter((url): url is string => !!url);
            console.log(`🖼️ Found ${referenceImageUrls.length} reference image(s) for nano-banana`);
            referenceImageUrls.forEach((url, idx) => {
              console.log(`   Reference ${idx + 1}: ${url.substring(0, 80)}...`);
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch reference images, continuing without them:', error);
      }

      // Use simple Danish prompt - just the story text (nano-banana understands Danish)
      const simplePrompt = storyText.trim();
      console.log(`📝 Using simple Danish prompt (${simplePrompt.length} chars): ${simplePrompt.substring(0, 200)}...`);

      // Generate image with nano-banana
      const generatedImage = await generateImage(simplePrompt, {
        model: 'nano-banana',
        size: size as any,
        quality: quality as any,
        referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
      });

      console.log('✅ Image generated with nano-banana:', generatedImage.url);

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
      }

      // Update the story node
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
          prompt: simplePrompt,
        },
      });
    }

    // If using custom prompt, use it as scene description but still apply story's visual style
    if (useCustomPrompt) {
      console.log(`✏️ Using custom prompt with story style: ${storyText.substring(0, 200)}...`);
      
      // Get story's visual style for consistency
      let storyVisualStyle = null;
      try {
        const { data: storyWithStyle } = await supabase
          .from('stories')
          .select('visual_style')
          .eq('id', story.id)
          .single();
        storyVisualStyle = storyWithStyle?.visual_style;
        console.log(`🎨 Custom prompt: Story visual_style: ${storyVisualStyle || 'NOT SET (will use default)'}`);
      } catch (error) {
        console.log('⚠️ Note: visual_style column not yet added to database');
      }

      // Get a reference image for style matching (but not for content)
      let referenceImageUrl: string | null = null;
      try {
        // Get first image from story for style reference
        const { data: firstNode } = await supabase
          .from('story_nodes')
          .select('image_url, node_key')
          .eq('story_id', story.id)
          .not('image_url', 'is', null)
          .neq('node_key', nodeId) // Don't use current node
          .order('sort_index', { ascending: true })
          .limit(1)
          .single();

        if (firstNode && firstNode.image_url) {
          referenceImageUrl = firstNode.image_url;
          console.log(`🎨 Custom prompt: Using reference image from node ${firstNode.node_key} for style matching`);
        }
      } catch (error) {
        console.log('⚠️ No reference image found for style matching');
      }

      // Use custom prompt as scene description, but apply story's visual style
      // IMPORTANT: Custom prompts are ENVIRONMENT-ONLY - no characters should be included
      const customSceneDescription = storyText.trim();
      const visualStyle = storyVisualStyle || style || undefined;
      
      // Build prompt: Style + Custom Scene Description (ENVIRONMENT ONLY - no characters, no previous context)
      let styleSection = '';
      if (referenceImageUrl) {
        styleSection = `STYLE REQUIREMENTS (MUST MATCH EXACTLY): Match the exact same artistic style, color palette, lighting mood, and visual aesthetic as the reference image from this story. `;
      } else if (visualStyle) {
        styleSection = `STYLE REQUIREMENTS: ${visualStyle}. `;
      } else {
        styleSection = `STYLE REQUIREMENTS: Disney-style animation, polished and professional, vibrant colors, soft rounded shapes, family-friendly aesthetic, cinematic quality. `;
      }

      const childFriendlyRequirements = 'CRITICAL: All content must be child-appropriate and family-friendly. Use warm, bright lighting throughout.';
      
      const customPrompt = `${styleSection}

ENVIRONMENT DESCRIPTION (ENVIRONMENT ONLY - NO CHARACTERS): ${customSceneDescription}

CRITICAL: This is an environment-only scene. Do NOT include any characters, people, or living beings. Focus only on the setting, scenery, objects, and atmosphere described above.

${childFriendlyRequirements}

QUALITY REQUIREMENTS: High quality illustration, dynamic composition, expressive and appealing, warm inviting atmosphere, family-friendly, child-appropriate, no text, no words, no writing, no letters, no dialogue boxes, no UI elements, no characters, no people, no living beings.`;

      console.log(`📝 Custom prompt built (${customPrompt.length} chars): ${customPrompt.substring(0, 300)}...`);

      // Use img2img if we have a reference image for better style consistency
      const useImg2Img = referenceImageUrl && model !== 'dalle3';
      const imageModel = useImg2Img ? 'stable-diffusion-img2img' : (model as any);
      
      if (useImg2Img) {
        console.log('🎨 Using img2img with reference image for style consistency');
      }

      // Generate image with custom prompt and style
      const generatedImage = await generateImage(customPrompt, {
        model: imageModel,
        size: size as any,
        quality: quality as any,
        referenceImageUrl: useImg2Img ? (referenceImageUrl || undefined) : undefined,
        strength: useImg2Img ? 0.6 : undefined, // Lower strength to allow more scene variation while keeping style
      });

      console.log('✅ Image generated from custom prompt:', generatedImage.url);

      // Use Cloudinary if configured, otherwise use generated URL directly
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
          prompt: generatedImage.revised_prompt || customPrompt,
        },
      });
    }

    // Story is already fetched at the beginning of the function
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

    // Get character assignments for this node
    const { data: characterAssignments, error: assignmentsError } = await supabase
      .from('character_assignments')
      .select(`
        role,
        emotion,
        action,
        characters (
          name,
          description,
          appearance_prompt
        )
      `)
      .eq('story_id', story.id)
      .eq('node_key', nodeId);

    if (assignmentsError) {
      console.warn('⚠️ Could not load character assignments:', assignmentsError);
    }

    // Format character data for prompt
    const nodeCharacters = characterAssignments?.map(assignment => {
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

    // Get PREVIOUS node's text for context - use sort_index to find the immediate previous node
    let previousNodeText = '';
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
        // Get the immediate previous node (sort_index - 1)
        const { data: previousNode } = await supabase
          .from('story_nodes')
          .select('node_key, text_md, sort_index')
          .eq('story_id', story.id)
          .eq('sort_index', currentNode.sort_index - 1)
          .single();

        if (previousNode && previousNode.text_md) {
          previousNodeText = previousNode.text_md;
          previousNodeKey = previousNode.node_key;
          console.log(`📖 DEBUG: Found previous node ${previousNodeKey} (sort_index: ${previousNode.sort_index})`);
          console.log(`   Previous node text (${previousNodeText.length} chars): ${previousNodeText.substring(0, 150)}...`);
        } else {
          console.log(`⚠️ DEBUG: No previous node found at sort_index ${currentNode.sort_index - 1}`);
        }
      } else {
        console.log(`⚠️ DEBUG: Current node sort_index is ${currentNode?.sort_index || 'null'} (first node or no sort_index)`);
      }
    } catch (error) {
      console.log(`⚠️ DEBUG: Error finding previous node text:`, error);
    }

    // Get the reference image - use PREVIOUS scene (or specified node, or first scene as fallback)
    let referenceImageUrl: string | null = null;
    let extractedStyleDescription: string | undefined = undefined;
    
    console.log(`🔍 DEBUG: Starting reference image search for node ${nodeId} in story ${story.id} (${storySlug})`);
    
    try {
      let referenceNode;
      
      // If a specific reference node is provided, use that
      if (referenceImageNodeKey) {
        console.log(`🔍 DEBUG: Looking for specified reference node: ${referenceImageNodeKey}`);
        const { data: refNode, error: refError } = await supabase
          .from('story_nodes')
          .select('image_url, node_key, sort_index')
          .eq('story_id', story.id)
          .eq('node_key', referenceImageNodeKey)
          .not('image_url', 'is', null)
          .single();
        
        if (refError) {
          console.log(`⚠️ DEBUG: Error finding specified reference node: ${refError.message}`);
        } else if (refNode) {
          console.log(`🔍 DEBUG: Found specified reference node:`, {
            node_key: refNode.node_key,
            sort_index: refNode.sort_index,
            has_image: !!refNode.image_url,
            image_url_preview: refNode.image_url ? refNode.image_url.substring(0, 60) + '...' : 'null'
          });
        }
        
        if (refNode && refNode.image_url && refNode.node_key !== nodeId) {
          referenceNode = refNode;
          console.log(`✅ DEBUG: Using specified reference image from node ${referenceImageNodeKey}`);
        }
      }
      
      // If no specific reference, try to use PREVIOUS scene
      if (!referenceNode) {
        console.log(`🔍 DEBUG: No specified reference, looking for previous scene...`);
        // Get current node's sort_index
        const { data: currentNode, error: currentNodeError } = await supabase
          .from('story_nodes')
          .select('sort_index, node_key, image_url')
          .eq('story_id', story.id)
          .eq('node_key', nodeId)
          .single();

        if (currentNodeError) {
          console.log(`❌ DEBUG: Error finding current node: ${currentNodeError.message}`);
        } else if (currentNode) {
          console.log(`🔍 DEBUG: Current node found:`, {
            node_key: currentNode.node_key,
            sort_index: currentNode.sort_index,
            has_image: !!currentNode.image_url
          });
        }

        if (currentNode && currentNode.sort_index && currentNode.sort_index > 1) {
          console.log(`🔍 DEBUG: Current node sort_index is ${currentNode.sort_index}, searching for previous node with image...`);
          
          // Get the immediate previous node (same one we got text from) - this ensures text and image match
          const { data: prevNodeWithImage, error: prevNodesError } = await supabase
            .from('story_nodes')
            .select('image_url, node_key, sort_index, text_md')
            .eq('story_id', story.id)
            .eq('sort_index', currentNode.sort_index - 1)
            .not('image_url', 'is', null)
            .single();

          if (prevNodesError) {
            console.log(`❌ DEBUG: Error finding previous node with image: ${prevNodesError.message}`);
            // Fallback: search for any previous node with image
            const { data: fallbackNodes } = await supabase
              .from('story_nodes')
              .select('image_url, node_key, sort_index')
              .eq('story_id', story.id)
              .lt('sort_index', currentNode.sort_index)
              .not('image_url', 'is', null)
              .order('sort_index', { ascending: false })
              .limit(1);
            
            if (fallbackNodes && fallbackNodes.length > 0 && fallbackNodes[0].image_url) {
              referenceNode = fallbackNodes[0];
              console.log(`✅ DEBUG: Using fallback previous scene (node ${referenceNode.node_key})`);
            }
          } else if (prevNodeWithImage && prevNodeWithImage.image_url) {
            referenceNode = prevNodeWithImage;
            console.log(`✅ DEBUG: Using previous scene as reference (node ${referenceNode.node_key}, sort_index ${referenceNode.sort_index})`);
            console.log(`   Reference image URL: ${referenceNode.image_url.substring(0, 80)}...`);
            // Verify this matches the previous node we got text from
            if (previousNodeKey && referenceNode.node_key !== previousNodeKey) {
              console.log(`⚠️ DEBUG: WARNING - Previous node for text (${previousNodeKey}) doesn't match previous node for image (${referenceNode.node_key})`);
            }
          } else {
            console.log(`⚠️ DEBUG: Previous node found but has no image`);
          }
        } else {
          console.log(`⚠️ DEBUG: Current node sort_index is ${currentNode?.sort_index || 'null'} (must be > 1 to have previous nodes)`);
        }
      }
      
      // If still no reference (first scene or no previous scene), fall back to first image
      if (!referenceNode) {
        console.log(`🔍 DEBUG: No previous scene found, falling back to first image...`);
        const { data: firstNode, error: firstNodeError } = await supabase
          .from('story_nodes')
          .select('image_url, node_key, sort_index')
          .eq('story_id', story.id)
          .not('image_url', 'is', null)
          .order('sort_index', { ascending: true })
          .limit(1)
          .single();

        if (firstNodeError) {
          console.log(`❌ DEBUG: Error finding first node: ${firstNodeError.message}`);
        } else if (firstNode) {
          console.log(`🔍 DEBUG: First node found:`, {
            node_key: firstNode.node_key,
            sort_index: firstNode.sort_index,
            is_current_node: firstNode.node_key === nodeId,
            image_url_preview: firstNode.image_url ? firstNode.image_url.substring(0, 60) + '...' : 'null'
          });
        }

        if (firstNode && firstNode.image_url && firstNode.node_key !== nodeId) {
          referenceNode = firstNode;
          console.log(`✅ DEBUG: Using first image as fallback reference (node ${firstNode.node_key})`);
        } else {
          console.log(`⚠️ DEBUG: Cannot use first node as reference (is current node or has no image)`);
        }
      }

      if (referenceNode && referenceNode.image_url) {
        referenceImageUrl = referenceNode.image_url;
        console.log(`✅ DEBUG: Reference image selected:`, {
          node_key: referenceNode.node_key,
          sort_index: referenceNode.sort_index,
          image_url: referenceImageUrl ? referenceImageUrl.substring(0, 80) + '...' : 'null'
        });
        
        // Only analyze style with GPT-4 Vision if we're NOT using img2img
        // img2img sees the image directly, so text description is redundant
        const willUseImg2Img = referenceImageUrl && model !== 'dalle3';
        
        if (!willUseImg2Img && referenceImageUrl) {
          // Only for DALL-E 3 - it can't see images, needs text description
          try {
            console.log(`🔍 DEBUG: Analyzing reference image style for DALL-E 3 (img2img would see image directly)...`);
            extractedStyleDescription = await analyzeImageStyle(referenceImageUrl);
            if (extractedStyleDescription) {
              console.log(`✅ DEBUG: Extracted style description (${extractedStyleDescription.length} chars): ${extractedStyleDescription.substring(0, 150)}...`);
            } else {
              console.log(`⚠️ DEBUG: Style analysis returned empty description`);
            }
          } catch (error) {
            console.warn(`⚠️ DEBUG: Failed to analyze reference image style:`, error);
          }
        } else {
          console.log(`⏭️ DEBUG: Skipping GPT-4 Vision analysis - using img2img which sees image directly`);
        }
      } else {
        console.log(`⚠️ DEBUG: No reference node found or reference node has no image_url`);
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
    
    console.log(`🔧 DEBUG: Creating prompt with:`, {
      story_title: story.title || storyTitle || '',
      visual_style_length: visualStyle?.length || 0,
      characters_count: nodeCharacters.length,
      has_reference_image: !!referenceImageUrl,
      has_extracted_style: !!extractedStyleDescription
    });
    
    const prompt = createStoryImagePrompt(
      fullStoryText, 
      story.title || storyTitle || '', 
      visualStyle, 
      nodeCharacters, 
      referenceImageUrl || undefined,
      extractedStyleDescription
    );
    
    console.log(`📝 DEBUG: Generated prompt (${prompt.length} chars):`);
    console.log(`   First 200 chars: ${prompt.substring(0, 200)}...`);
    console.log(`   Last 200 chars: ...${prompt.substring(prompt.length - 200)}`);
    
    if (referenceImageUrl) {
      console.log(`🖼️ DEBUG: Reference image URL: ${referenceImageUrl.substring(0, 80)}...`);
    }
    if (extractedStyleDescription) {
      console.log(`🎭 DEBUG: Extracted style description (${extractedStyleDescription.length} chars): ${extractedStyleDescription.substring(0, 150)}...`);
    }

    // Generate image with AI
    // IMPORTANT: Use stable-diffusion with img2img when we have a reference image for MUCH better style consistency
    // DALL-E 3 doesn't support img2img, so we automatically switch to stable-diffusion-img2img when we have a reference
    const useImg2Img = referenceImageUrl && model !== 'dalle3'; // Use img2img if we have reference and not forcing dalle3
    const shouldUseStableDiffusionImg2Img = referenceImageUrl && model === 'dalle3'; // Switch to SD img2img if we have reference but model is dalle3
    const imageModel = useImg2Img || shouldUseStableDiffusionImg2Img
      ? 'stable-diffusion-img2img' 
      : (model as any);
    
    console.log(`🔧 DEBUG: Model selection:`, {
      requested_model: model,
      has_reference_image: !!referenceImageUrl,
      use_img2img: useImg2Img || shouldUseStableDiffusionImg2Img,
      final_model: imageModel,
      will_use_reference_in_img2img: (useImg2Img || shouldUseStableDiffusionImg2Img) && !!referenceImageUrl
    });
    
    if (shouldUseStableDiffusionImg2Img) {
      console.log('🔄 DEBUG: Auto-switching to stable-diffusion-img2img for better reference image support (DALL-E 3 doesn\'t support img2img)');
    }
    
    console.log(`🚀 DEBUG: Calling generateImage with:`, {
      model: imageModel,
      size,
      quality,
      has_reference_url: !!(useImg2Img || shouldUseStableDiffusionImg2Img) && !!referenceImageUrl,
      strength: 0.65
    });
    
    const generatedImage = await generateImage(prompt, {
      model: imageModel,
      size: size as any,
      quality: quality as any,
      referenceImageUrl: (useImg2Img || shouldUseStableDiffusionImg2Img) ? (referenceImageUrl || undefined) : undefined,
      strength: 0.65, // Good balance: maintains style while allowing scene changes
    });
    
    if (useImg2Img || shouldUseStableDiffusionImg2Img) {
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
}
