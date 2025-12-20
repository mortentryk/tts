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

    // Get first node (default to node_key "1")
    const { data: firstNode, error: nodeError } = await supabaseAdmin
      .from('story_nodes')
      .select(`
        node_key,
        text_md,
        image_url,
        video_url,
        story_choices (
          label,
          to_node_key,
          sort_index
        )
      `)
      .eq('story_id', storyBySlug.id)
      .eq('node_key', '1')
      .order('sort_index', { foreignTable: 'story_choices' })
      .single();

    if (nodeError || !firstNode) {
      // If node "1" doesn't exist, try to get the first node by sort_index
      const { data: firstNodeBySort } = await supabaseAdmin
        .from('story_nodes')
        .select(`
          node_key,
          text_md,
          image_url,
          video_url,
          story_choices (
            label,
            to_node_key,
            sort_index
          )
        `)
        .eq('story_id', storyBySlug.id)
        .order('sort_index', { ascending: true })
        .order('sort_index', { foreignTable: 'story_choices', ascending: true })
        .limit(1)
        .single();

      if (firstNodeBySort) {
        return {
          story: storyBySlug,
          firstNode: {
            node_key: firstNodeBySort.node_key,
            text_md: firstNodeBySort.text_md,
            image_url: firstNodeBySort.image_url,
            video_url: firstNodeBySort.video_url,
            choices: (firstNodeBySort.story_choices || []).map((choice: any) => ({
            label: choice.label,
              to_node_key: choice.to_node_key,
            })),
          },
        };
      }
      // Return story metadata even if no nodes found
      return {
        story: storyBySlug,
        firstNode: null,
      };
    }

    return {
      story: storyBySlug,
      firstNode: {
        node_key: firstNode.node_key,
        text_md: firstNode.text_md,
        image_url: firstNode.image_url,
        video_url: firstNode.video_url,
        choices: (firstNode.story_choices || []).map((choice: any) => ({
          label: choice.label,
          to_node_key: choice.to_node_key,
        })),
      },
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
