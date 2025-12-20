import { supabaseAdmin } from '@/lib/supabase';
import StoryPageClient from './page.client';
import { notFound } from 'next/navigation';

interface StoryPageProps {
  params: Promise<{ storyId: string; nodeKey?: string }>;
}

async function getStoryData(storyId: string) {
  try {
    // Decode URL-encoded storyId
    let decodedStoryId: string;
    try {
      decodedStoryId = decodeURIComponent(storyId);
    } catch (e) {
      decodedStoryId = storyId;
    }

    // Try to get story by slug first
    let { data: storyBySlug, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('id, title, description, cover_image_url, slug, is_published')
      .eq('slug', decodedStoryId)
      .eq('is_published', true)
      .single();

    // If not found, try normalized slug
    if (slugError || !storyBySlug) {
      const normalizedSlug = decodedStoryId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (normalizedSlug !== decodedStoryId.toLowerCase()) {
        const { data: normalizedStory } = await supabaseAdmin
          .from('stories')
          .select('id, title, description, cover_image_url, slug, is_published')
          .eq('slug', normalizedSlug)
          .eq('is_published', true)
          .single();
        
        if (normalizedStory) {
          storyBySlug = normalizedStory;
        }
      }
    }

    // If still not found, try by ID (UUID)
    if (!storyBySlug) {
      const { data: storyById } = await supabaseAdmin
        .from('stories')
        .select('id, title, description, cover_image_url, slug, is_published')
        .eq('id', decodedStoryId)
        .eq('is_published', true)
        .single();
      
      if (storyById) {
        storyBySlug = storyById;
      }
    }

    if (!storyBySlug) {
    return null;
    }

    // Get first node - try node_key "1" first, then first by sort_index
    // Use try-catch to handle any query errors gracefully
    let firstNodeData = null;
    
    try {
      // Try node_key "1" first
      const { data: nodeByKey, error: nodeKeyError } = await supabaseAdmin
        .from('story_nodes')
        .select(`
          *,
          story_choices (
            label,
            to_node_key,
            sort_index
          )
        `)
        .eq('story_id', storyBySlug.id)
        .eq('node_key', '1')
        .order('sort_index', { foreignTable: 'story_choices', ascending: true })
        .single();

      if (!nodeKeyError && nodeByKey) {
        firstNodeData = nodeByKey;
      } else {
        // If node "1" doesn't exist, get the first node by sort_index
        const { data: nodesBySort, error: sortError } = await supabaseAdmin
          .from('story_nodes')
          .select(`
            *,
            story_choices (
              label,
              to_node_key,
              sort_index
            )
          `)
          .eq('story_id', storyBySlug.id)
          .order('sort_index', { ascending: true })
          .order('sort_index', { foreignTable: 'story_choices', ascending: true })
          .limit(1);

        if (!sortError && nodesBySort && nodesBySort.length > 0) {
          firstNodeData = nodesBySort[0];
        } else {
          // Log but don't fail - client will fetch via API
          console.warn('⚠️ Could not load first node server-side for story:', storyBySlug.id);
          console.warn('   Node key "1" error:', nodeKeyError?.message);
          console.warn('   Sort query error:', sortError?.message);
          console.warn('   Client will fetch via API route');
        }
      }
    } catch (nodeQueryError) {
      // Catch any unexpected errors in node query
      console.warn('⚠️ Error querying nodes (non-fatal):', nodeQueryError);
      // Continue - client will fetch via API
    }

    // Build response
    if (firstNodeData) {
      // Extract choices from nested structure
      const choices = (firstNodeData.story_choices || []).map((choice: any) => ({
        label: choice.label,
        to_node_key: choice.to_node_key,
      }));

      return {
        story: storyBySlug,
        firstNode: {
          node_key: firstNodeData.node_key,
          text_md: firstNodeData.text_md || '',
          image_url: firstNodeData.image_url || null,
          video_url: firstNodeData.video_url || null,
          choices: choices,
        },
      };
    }

    // Return story metadata even if no nodes found
    // The client component will handle loading the first node via API
    console.warn('⚠️ No nodes found for story, returning metadata only:', storyBySlug.id);
    return {
      story: storyBySlug,
      firstNode: null,
    };
    } catch (error) {
    console.error('Error fetching story data:', error);
    return null;
  }
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { storyId } = await params;
  
  const storyData = await getStoryData(storyId);

  if (!storyData) {
    notFound();
  }

  const { story, firstNode } = storyData;

    return (
    <>
      {/* Server-rendered content for SEO */}
      <div className="sr-only" aria-hidden="true">
        <h1>{story.title}</h1>
        {story.description && <p>{story.description}</p>}
        {firstNode && firstNode.text_md && (
          <div>
            <h2>Start af historien</h2>
            <p>{firstNode.text_md}</p>
        </div>
      )}
      </div>

      {/* Client component handles all interactivity */}
      <StoryPageClient 
        params={params}
        initialStoryMetadata={{
          title: story.title,
          description: story.description || undefined,
          cover_image_url: story.cover_image_url || undefined,
        }}
        initialNode={firstNode ? {
          id: firstNode.node_key,
          text: firstNode.text_md || '',
          choices: (firstNode.choices || []).map((choice: any) => ({
            label: choice.label,
            goto: choice.to_node_key,
          })),
          image: firstNode.image_url || undefined,
          video: firstNode.video_url || undefined,
        } : undefined}
      />
    </>
  );
}
