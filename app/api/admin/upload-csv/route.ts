import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAssetReference } from '../../../../lib/cloudinary';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ooyzdksmeglhocjlaouo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXpka3NtZWdsaG9jamxhb3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYzMzM4OSwiZXhwIjoyMDc2MjA5Mzg5fQ.97T-OTcCNBk0qrs-kdqoGQbhsFDyWCQ5Z_x4bbPPbTI';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('csv') as File;
    const storySlug = formData.get('storySlug') as string;
    const publishStory = formData.get('publishStory') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    if (!storySlug) {
      return NextResponse.json({ error: 'No story slug provided' }, { status: 400 });
    }

    // Parse CSV content
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    // Parse CSV with proper handling of quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote - add one quote to current and skip the next
            current += '"';
            i++; // Skip the next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator - add current field to result
          result.push(current.trim());
          current = '';
        } else {
          // Regular character - add to current field
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      return result;
    };

    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV Headers:', headers);

    // Parse data rows
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    console.log(`📊 Parsed ${rows.length} rows from CSV`);

    // Extract metadata from first row if it contains story info
    let metadata: any = {};
    const firstRow = rows[0];
    console.log('🔍 First row metadata:', {
      story_title: firstRow.story_title,
      story_description: firstRow.story_description,
      front_screen_image: firstRow.front_screen_image,
      length: firstRow.length,
      age: firstRow.age,
      author: firstRow.author
    });
    
    if (firstRow.story_title || firstRow.story_description) {
      metadata = {
        title: firstRow.story_title || storySlug,
        description: firstRow.story_description || null,
        cover_image_url: firstRow.front_screen_image || null,
        estimated_time: firstRow.length || null,
        difficulty: firstRow.age || null,
        author: firstRow.author || null
      };
      console.log('📝 Extracted metadata:', metadata);
    }

    // Process story nodes
    const nodes: any[] = [];
    const choices: any[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row.id || !row.text) continue;

      // Create node
      const node: any = {
        story_id: '', // Will be set after story creation
        node_key: row.id,
        text_md: row.text,
        image_url: null, // Will be set based on image field
        tts_ssml: null,
        dice_check: null,
        sort_index: rowIndex // Use row position in CSV, not parsed node_key
      };

      // Handle image field - check if it's an asset reference or full URL
      if (row.image) {
        if (isAssetReference(row.image)) {
          // It's an asset reference like "image-1" - store as-is for later processing
          node.image_url = row.image;
        } else if (row.image.startsWith('http')) {
          // It's a full URL - use directly
          node.image_url = row.image;
        } else {
          // Empty or invalid - set to null
          node.image_url = null;
        }
      }

      // Add dice check if present
      if (row.check_stat && row.check_dc) {
        node.dice_check = {
          stat: row.check_stat,
          dc: parseInt(row.check_dc) || 10,
          success: row.check_success || null,
          fail: row.check_fail || null
        };
      }

      nodes.push(node);

      // Create choices
      const choiceFields = [
        { label: 'valg1_label', goto: 'valg1_goto' },
        { label: 'valg2_label', goto: 'valg2_goto' },
        { label: 'valg3_label', goto: 'valg3_goto' }
      ];

      choiceFields.forEach((field, index) => {
        if (row[field.label] && row[field.goto]) {
          choices.push({
            story_id: '', // Will be set after story creation
            from_node_key: row.id,
            label: row[field.label],
            to_node_key: row[field.goto],
            sort_index: index
          });
        }
      });
    }

    console.log(`📄 Created ${nodes.length} nodes and ${choices.length} choices`);

    // Upsert story
    const storyData = {
      slug: storySlug,
      title: metadata.title || storySlug,
      description: metadata.description || null,
      cover_image_url: metadata.cover_image_url || null,
      is_published: publishStory,
      version: 1
    };
    
    console.log('📚 Creating story with data:', storyData);
    
    const { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .upsert(storyData, { 
        onConflict: 'slug',
        ignoreDuplicates: false 
      })
      .select('id, version')
      .single();

    if (storyError) {
      console.error('❌ Story error:', storyError);
      return NextResponse.json({ error: `Story error: ${storyError.message}` }, { status: 500 });
    }

    console.log('✅ Story created/updated:', story.id);

    // Update nodes and choices with story_id
    const storyId = story.id;
    nodes.forEach(node => node.story_id = storyId);
    choices.forEach(choice => choice.story_id = storyId);

    // Get existing nodes to preserve their media URLs
    const { data: existingNodes } = await supabaseAdmin
      .from('story_nodes')
      .select('node_key, image_url, video_url, audio_url, image_prompt')
      .eq('story_id', storyId);

    console.log('📦 Found', existingNodes?.length || 0, 'existing nodes');

    // Create a map of existing node media for quick lookup
    const existingMediaMap = new Map(
      (existingNodes || []).map(node => [
        node.node_key,
        {
          image_url: node.image_url,
          video_url: node.video_url,
          audio_url: node.audio_url,
          image_prompt: node.image_prompt
        }
      ])
    );

    // Preserve media URLs for nodes that already exist (only if CSV doesn't specify new ones)
    nodes.forEach(node => {
      const existingMedia = existingMediaMap.get(node.node_key);
      if (existingMedia) {
        // Keep existing media unless CSV explicitly provides new URLs
        if (!node.image_url && existingMedia.image_url) {
          node.image_url = existingMedia.image_url;
          console.log(`✅ Preserving image for node ${node.node_key}`);
        }
        if (!node.video_url && existingMedia.video_url) {
          node.video_url = existingMedia.video_url;
          console.log(`✅ Preserving video for node ${node.node_key}`);
        }
        if (!node.audio_url && existingMedia.audio_url) {
          node.audio_url = existingMedia.audio_url;
          console.log(`✅ Preserving audio for node ${node.node_key}`);
        }
        if (!node.image_prompt && existingMedia.image_prompt) {
          node.image_prompt = existingMedia.image_prompt;
        }
      }
    });

    // Get list of node_keys from CSV
    const csvNodeKeys = nodes.map(n => n.node_key);

    // Delete nodes that are NOT in the new CSV (like old END3)
    if (existingNodes && existingNodes.length > 0) {
      const nodesToDelete = existingNodes
        .filter(n => !csvNodeKeys.includes(n.node_key))
        .map(n => n.node_key);
      
      if (nodesToDelete.length > 0) {
        console.log('🗑️ Deleting removed nodes:', nodesToDelete.join(', '));
        await supabaseAdmin
          .from('story_nodes')
          .delete()
          .eq('story_id', storyId)
          .in('node_key', nodesToDelete);
      }
    }

    // Upsert nodes (update existing, insert new)
    console.log('📝 Upserting', nodes.length, 'nodes from CSV');
    const { error: nodesError } = await supabaseAdmin
      .from('story_nodes')
      .upsert(nodes, { 
        onConflict: 'story_id,node_key',
        ignoreDuplicates: false 
      });

    if (nodesError) {
      console.error('❌ Nodes error:', nodesError);
      return NextResponse.json({ error: `Nodes error: ${nodesError.message}` }, { status: 500 });
    }

    // Delete existing choices and insert new ones
    await supabaseAdmin
      .from('story_choices')
      .delete()
      .eq('story_id', storyId);

    if (choices.length > 0) {
      const { error: choicesError } = await supabaseAdmin
        .from('story_choices')
        .insert(choices);

      if (choicesError) {
        console.error('❌ Choices error:', choicesError);
        return NextResponse.json({ error: `Choices error: ${choicesError.message}` }, { status: 500 });
      }
    }

    console.log('✅ CSV upload successful!');

    return NextResponse.json({
      success: true,
      message: `Story "${storySlug}" uploaded successfully!`,
      story: {
        id: story.id,
        slug: storySlug,
        title: metadata.title || storySlug,
        nodes: nodes.length,
        choices: choices.length,
        published: publishStory
      }
    });

  } catch (error) {
    console.error('❌ CSV upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}