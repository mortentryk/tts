import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAssetReference } from '../../../../lib/cloudinary';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';

// Initialize Supabase admin client using validated env config
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Parse CSV content with proper handling of multi-line quoted fields
    const csvText = await file.text();
    
    // Parse entire CSV text, handling quoted fields that may contain newlines
    const parseCSV = (text: string): string[][] => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < text.length) {
        const char = text[i];
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote (double quote) - add one quote to field
            currentField += '"';
            i += 2; // Skip both quotes
            continue;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
            continue;
          }
        }
        
        if (inQuotes) {
          // Inside quotes: preserve all characters including newlines
          currentField += char;
          i++;
        } else {
          // Outside quotes: handle field separators and row separators
          if (char === ',') {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
            i++;
          } else if (char === '\n') {
            // Row separator (Unix-style)
            currentRow.push(currentField);
            currentField = '';
            if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
              rows.push(currentRow);
            }
            currentRow = [];
            i++;
          } else if (char === '\r') {
            // Row separator (Windows-style \r\n or old Mac \r)
            currentRow.push(currentField);
            currentField = '';
            if (nextChar === '\n') {
              i += 2; // Skip \r\n
            } else {
              i++; // Skip \r
            }
            if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
              rows.push(currentRow);
            }
            currentRow = [];
          } else {
            // Regular character
            currentField += char;
            i++;
          }
        }
      }
      
      // Add the last field and row
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
      }
      if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
        rows.push(currentRow);
      }
      
      return rows;
    };

    const parsedRows = parseCSV(csvText);
    
    if (parsedRows.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    // Parse header
    const headers = parsedRows[0].map(h => h.trim());
    console.log('📋 CSV Headers:', headers);

    // Parse data rows
    const rows: any[] = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const values = parsedRows[i];
      const row: any = {};
      
      headers.forEach((header, index) => {
        // Preserve newlines in text fields - don't trim, just get the value
        const value = values[index] || '';
        row[header] = value;
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
      
      // Skip rows without ID or text
      if (!row.id || !row.text) continue;
      
      // Validate node ID - should be a simple identifier (not long text)
      // Node IDs should be short (max 50 chars) and not look like paragraph text
      const nodeId = String(row.id).trim();
      const nodeText = String(row.text).trim();
      
      // Skip if ID looks like it's actually text content (longer than 50 chars or contains sentence punctuation)
      if (nodeId.length > 50 || /[.!?]\s/.test(nodeId) || nodeId === nodeText.substring(0, nodeId.length)) {
        console.warn(`⚠️ Skipping row ${rowIndex + 1}: ID "${nodeId.substring(0, 30)}..." looks like text, not a node ID`);
        continue;
      }

      // Create node - don't set image_url initially, let preservation logic handle it
      const node: any = {
        story_id: '', // Will be set after story creation
        node_key: nodeId,
        text_md: nodeText,
        // Don't set image_url here - let preservation logic handle it
        tts_ssml: null,
        dice_check: null,
        sort_index: rowIndex // Use row position in CSV, not parsed node_key
      };

      // Handle image field - check if it's an asset reference or full URL
      // Only update image if CSV explicitly provides a valid image value
      // IMPORTANT: If image field is empty, null, or whitespace, leave node.image_url undefined
      // This ensures existing images are preserved when CSV doesn't provide new ones
      const imageValue = row.image ? String(row.image).trim() : '';
      if (imageValue) {
        if (isAssetReference(imageValue)) {
          // It's an asset reference like "image-1" - store as-is for later processing
          node.image_url = imageValue;
        } else if (imageValue.startsWith('http')) {
          // It's a full URL - use directly
          node.image_url = imageValue;
        }
        // If image field exists but is invalid, leave undefined so existing image is preserved
      }
      // If no image field or empty, leave undefined so existing image is preserved

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

    // Check if story already exists
    const { data: existingStory } = await supabaseAdmin
      .from('stories')
      .select('id, version, is_published')
      .eq('slug', storySlug)
      .single();

    let story;
    let storyError;

    if (existingStory) {
      // Update existing story
      console.log('📝 Updating existing story:', existingStory.id);
      // Preserve existing is_published status unless explicitly publishing
      // This prevents accidentally unpublishing stories when checkbox is unchecked
      const updateData: any = {
        title: metadata.title || storySlug,
        description: metadata.description || null,
        cover_image_url: metadata.cover_image_url || null,
        version: (existingStory.version || 1) + 1,
        updated_at: new Date().toISOString()
      };
      
      // Only update is_published if explicitly publishing (checkbox checked)
      // If unchecked, preserve the existing status to avoid accidental unpublishing
      if (publishStory) {
        updateData.is_published = true;
      }
      // If publishStory is false, we don't set is_published, preserving the existing value
      
      const result = await supabaseAdmin
        .from('stories')
        .update(updateData)
        .eq('id', existingStory.id)
        .select('id, version')
        .single();
      
      story = result.data;
      storyError = result.error;
    } else {
      // Create new story
      console.log('✨ Creating new story with slug:', storySlug);
      const insertData = {
        slug: storySlug,
        title: metadata.title || storySlug,
        description: metadata.description || null,
        cover_image_url: metadata.cover_image_url || null,
        is_published: publishStory,
        version: 1
      };
      
      const result = await supabaseAdmin
        .from('stories')
        .insert(insertData)
        .select('id, version')
        .single();
      
      story = result.data;
      storyError = result.error;
    }

    if (storyError || !story) {
      console.error('❌ Story error:', storyError);
      return NextResponse.json({ error: `Story error: ${storyError?.message || 'Unknown error'}` }, { status: 500 });
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
    // This is critical: if CSV doesn't provide an image URL, keep the existing one
    nodes.forEach(node => {
      const existingMedia = existingMediaMap.get(node.node_key);
      if (existingMedia) {
        // Keep existing media unless CSV explicitly provides new URLs
        // Check for undefined, null, or empty string to ensure we preserve existing images
        const hasImageUrl = node.image_url && String(node.image_url).trim() !== '';
        if (!hasImageUrl && existingMedia.image_url && String(existingMedia.image_url).trim() !== '') {
          node.image_url = existingMedia.image_url;
          console.log(`✅ Preserving image for node ${node.node_key}: ${existingMedia.image_url.substring(0, 60)}...`);
        }
        const hasVideoUrl = node.video_url && String(node.video_url).trim() !== '';
        if (!hasVideoUrl && existingMedia.video_url && String(existingMedia.video_url).trim() !== '') {
          node.video_url = existingMedia.video_url;
          console.log(`✅ Preserving video for node ${node.node_key}`);
        }
        const hasAudioUrl = node.audio_url && String(node.audio_url).trim() !== '';
        if (!hasAudioUrl && existingMedia.audio_url && String(existingMedia.audio_url).trim() !== '') {
          node.audio_url = existingMedia.audio_url;
          console.log(`✅ Preserving audio for node ${node.node_key}`);
        }
        if (!node.image_prompt && existingMedia.image_prompt) {
          node.image_prompt = existingMedia.image_prompt;
        }
      }
    });

    // Deduplicate nodes by story_id,node_key (keep last occurrence)
    // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" error
    // Filter out any nodes with invalid keys first
    const validNodes = nodes.filter(node => node.story_id && node.node_key);
    const nodeMap = new Map<string, typeof nodes[0]>();
    validNodes.forEach(node => {
      const key = `${node.story_id}:${node.node_key}`;
      nodeMap.set(key, node);
    });
    const deduplicatedNodes: typeof nodes = Array.from(nodeMap.values());
    
    if (deduplicatedNodes.length !== validNodes.length) {
      console.log(`⚠️ Removed ${validNodes.length - deduplicatedNodes.length} duplicate nodes`);
    }
    if (nodes.length !== validNodes.length) {
      console.log(`⚠️ Filtered out ${nodes.length - validNodes.length} nodes with invalid story_id or node_key`);
    }

    // Get list of node_keys from CSV (using deduplicated nodes)
    // Normalize to strings for comparison to avoid type mismatch issues
    const csvNodeKeys = new Set(deduplicatedNodes.map(n => String(n.node_key).trim()));

    console.log(`📋 CSV contains ${csvNodeKeys.size} unique node keys`);
    console.log(`📋 Sample CSV keys:`, Array.from(csvNodeKeys).slice(0, 10).join(', '));
    console.log(`📦 Database has ${existingNodes?.length || 0} existing nodes`);
    if (existingNodes && existingNodes.length > 0) {
      console.log(`📦 Sample existing keys:`, existingNodes.slice(0, 10).map(n => String(n.node_key).trim()).join(', '));
    }

    // Delete nodes that are NOT in the new CSV (like old END3)
    // Also delete any nodes with invalid node_keys (text fragments instead of IDs)
    if (existingNodes && existingNodes.length > 0) {
      const nodesToDelete = existingNodes
        .filter(n => {
          const existingKey = String(n.node_key).trim();
          
          // Delete if not in CSV
          if (!csvNodeKeys.has(existingKey)) {
            console.log(`🗑️ Marking for deletion: "${existingKey}" (not in CSV)`);
            return true;
          }
          
          // Delete if node_key looks like text content (invalid ID)
          if (existingKey.length > 50 || /[.!?]\s/.test(existingKey)) {
            console.warn(`🗑️ Deleting invalid node with text-like key: "${existingKey.substring(0, 30)}..."`);
            return true;
          }
          
          return false;
        })
        .map(n => String(n.node_key).trim());
      
      if (nodesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${nodesToDelete.length} removed/invalid nodes:`, nodesToDelete.slice(0, 10).join(', '), nodesToDelete.length > 10 ? `... and ${nodesToDelete.length - 10} more` : '');
        
        // First, delete choices for these nodes (foreign key constraint)
        console.log('🗑️ Deleting choices for nodes to be removed...');
        const { error: choicesDeleteError } = await supabaseAdmin
          .from('story_choices')
          .delete()
          .eq('story_id', storyId)
          .in('from_node_key', nodesToDelete);
        
        if (choicesDeleteError) {
          console.warn(`⚠️ Error deleting choices (may not exist):`, choicesDeleteError.message);
        } else {
          console.log('✅ Deleted choices for removed nodes');
        }
        
        // Delete in batches to avoid query size limits (PostgreSQL has a limit on IN clause size)
        const batchSize = 100;
        let totalDeleted = 0;
        for (let i = 0; i < nodesToDelete.length; i += batchSize) {
          const batch = nodesToDelete.slice(i, i + batchSize);
          const { data: deletedData, error: deleteError } = await supabaseAdmin
            .from('story_nodes')
            .delete()
            .eq('story_id', storyId)
            .in('node_key', batch)
            .select(); // Select to get count of deleted rows
          
          if (deleteError) {
            console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
            console.error(`   Batch keys:`, batch.slice(0, 5).join(', '), '...');
          } else {
            const deletedCount = deletedData?.length || 0;
            totalDeleted += deletedCount;
            console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${deletedCount} nodes deleted, ${batch.length} attempted)`);
          }
        }
        
        console.log(`📊 Total deleted: ${totalDeleted} out of ${nodesToDelete.length} attempted`);
        
        // Verify deletion
        const { data: remainingNodes, error: verifyError } = await supabaseAdmin
          .from('story_nodes')
          .select('node_key')
          .eq('story_id', storyId)
          .in('node_key', nodesToDelete);
        
        if (verifyError) {
          console.warn(`⚠️ Could not verify deletion:`, verifyError.message);
        } else if (remainingNodes && remainingNodes.length > 0) {
          console.warn(`⚠️ ${remainingNodes.length} nodes still exist after deletion attempt:`, remainingNodes.map(n => n.node_key).slice(0, 5).join(', '));
          
          // Fallback: Delete remaining nodes individually (slower but more reliable)
          console.log('🔄 Attempting individual deletion for remaining nodes...');
          let individualDeleted = 0;
          for (const nodeKey of remainingNodes.map(n => n.node_key)) {
            const { error: individualError } = await supabaseAdmin
              .from('story_nodes')
              .delete()
              .eq('story_id', storyId)
              .eq('node_key', nodeKey);
            
            if (!individualError) {
              individualDeleted++;
            }
          }
          console.log(`✅ Individually deleted ${individualDeleted} out of ${remainingNodes.length} remaining nodes`);
          
          // If still failing, use nuclear option: Delete ALL nodes (they'll be reinserted from CSV)
          if (individualDeleted < remainingNodes.length) {
            console.log('⚠️ Some nodes still remain. Using nuclear option: Delete ALL nodes and reinsert from CSV...');
            const { error: nuclearError } = await supabaseAdmin
              .from('story_nodes')
              .delete()
              .eq('story_id', storyId);
            
            if (nuclearError) {
              console.error(`❌ Nuclear deletion failed:`, nuclearError);
            } else {
              console.log('✅ All nodes deleted (will be reinserted from CSV)');
            }
          }
        } else {
          console.log('✅ Verification: All nodes successfully deleted');
        }
      } else {
        console.log('✅ No nodes to delete - all existing nodes are in the CSV');
      }
    }

    // Upsert nodes (update existing, insert new)
    // Remove null/undefined/empty values for media fields to prevent overwriting existing data
    const nodesToUpsert = deduplicatedNodes.map(node => {
      const cleanedNode: any = { ...node };
      // Only include image_url if it's actually set (not null/undefined/empty string)
      // This prevents overwriting existing images when CSV doesn't provide one
      if (!cleanedNode.image_url || cleanedNode.image_url === null || cleanedNode.image_url === undefined || (typeof cleanedNode.image_url === 'string' && cleanedNode.image_url.trim() === '')) {
        delete cleanedNode.image_url;
      }
      if (!cleanedNode.video_url || cleanedNode.video_url === null || cleanedNode.video_url === undefined || (typeof cleanedNode.video_url === 'string' && cleanedNode.video_url.trim() === '')) {
        delete cleanedNode.video_url;
      }
      if (!cleanedNode.audio_url || cleanedNode.audio_url === null || cleanedNode.audio_url === undefined || (typeof cleanedNode.audio_url === 'string' && cleanedNode.audio_url.trim() === '')) {
        delete cleanedNode.audio_url;
      }
      return cleanedNode;
    });
    
    console.log('📝 Upserting', nodesToUpsert.length, 'nodes from CSV');
    const { error: nodesError } = await supabaseAdmin
      .from('story_nodes')
      .upsert(nodesToUpsert, { 
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
        nodes: deduplicatedNodes.length,
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