import { supabase } from './supabase';
import { StoryNode, StoryMetadata } from '../types/game';

export interface SupabaseStory {
  id: string;
  slug: string;
  title: string;
  lang: string;
  description?: string;
  cover_image_url?: string;
  is_published: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  is_free?: boolean;
  price?: number;
}

export interface SupabaseStoryNode {
  id: string;
  story_id: string;
  node_key: string;
  text_md: string;
  tts_ssml?: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  text_hash?: string;
  dice_check?: {
    stat: string;
    dc: number;
    success: string;
    fail: string;
  };
  sort_index: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseStoryChoice {
  id: string;
  story_id: string;
  from_node_key: string;
  label: string;
  to_node_key: string;
  conditions?: any;
  effect?: any;
  sort_index: number;
}

export async function loadStoryList(): Promise<StoryMetadata[]> {
  console.log('🔍 loadStoryList: Starting...');
  try {
    console.log('🔍 loadStoryList: Calling Supabase...');
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    console.log('🔍 loadStoryList: Supabase response:', { data: stories, error });

    if (error) {
      console.error('❌ loadStoryList: Supabase error:', error);
      return [];
    }

    console.log('✅ loadStoryList: Found', stories.length, 'stories');
    return stories.map(story => ({
      id: story.slug,
      title: story.title,
      description: story.description || '',
      author: 'Story Author', // You can add author field to stories table
      difficulty: 'medium', // You can add difficulty field
      estimatedTime: '15-20 minutes' // You can add estimated_time field
    }));
  } catch (error) {
    console.error('❌ loadStoryList: Exception:', error);
    return [];
  }
}

export async function loadStoryById(storyId: string): Promise<Record<string, StoryNode>> {
  try {
    console.log(`🔍 Loading story ${storyId} from Supabase...`);

    // First, get the story to verify it exists and is published
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, slug, is_published')
      .eq('slug', storyId)
      .eq('is_published', true)
      .single();

    if (storyError || !story) {
      console.error(`❌ Story not found or not published: ${storyId}`, storyError);
      throw new Error(`Story not found: ${storyId}`);
    }

    // Load all nodes for this story
    const { data: nodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select('*')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (nodesError) {
      console.error('Error loading story nodes:', nodesError);
      throw new Error('Failed to load story nodes');
    }

    // Load all choices for this story
    const { data: choices, error: choicesError } = await supabase
      .from('story_choices')
      .select('*')
      .eq('story_id', story.id)
      .order('sort_index', { ascending: true });

    if (choicesError) {
      console.error('Error loading story choices:', choicesError);
      throw new Error('Failed to load story choices');
    }

    // Transform to the expected format
    const storyData: Record<string, StoryNode> = {};

    for (const node of nodes) {
      const nodeChoices = choices
        .filter(choice => choice.from_node_key === node.node_key)
        .map(choice => ({
          label: choice.label,
          goto: choice.to_node_key,
          ...(choice.conditions && { conditions: choice.conditions }),
          ...(choice.effect && { effect: choice.effect })
        }));

      storyData[node.node_key] = {
        id: node.node_key,
        text: node.text_md,
        ...(node.image_url && { image: node.image_url }),
        ...(node.dice_check && {
          check: {
            stat: node.dice_check.stat as keyof import('../types/game').GameStats,
            dc: node.dice_check.dc,
            success: node.dice_check.success,
            fail: node.dice_check.fail
          }
        }),
        choices: nodeChoices
      };
    }

    console.log(`✅ Loaded story ${storyId} with ${Object.keys(storyData).length} nodes`);
    return storyData;

  } catch (error) {
    console.error(`Failed to load story ${storyId}:`, error);
    throw error;
  }
}

// Helper function to load a single node with its choices
export async function loadStoryNode(storyId: string, nodeKey: string): Promise<StoryNode | null> {
  try {
    const { data, error } = await supabase
      .from('story_nodes')
      .select(`
        *,
        story_choices (
          label,
          to_node_key,
          conditions,
          effect,
          sort_index
        )
      `)
      .eq('story_id', storyId)
      .eq('node_key', nodeKey)
      .single();

    if (error || !data) {
      console.error(`Node not found: ${storyId}/${nodeKey}`, error);
      return null;
    }

    const choices = data.story_choices
      .sort((a: any, b: any) => a.sort_index - b.sort_index)
      .map((choice: any) => ({
        label: choice.label,
        goto: choice.to_node_key,
        ...(choice.conditions && { conditions: choice.conditions }),
        ...(choice.effect && { effect: choice.effect })
      }));

    return {
      id: data.node_key,
      text: data.text_md,
      ...(data.image_url && { image: data.image_url }),
      ...(data.dice_check && {
        check: {
          stat: data.dice_check.stat as keyof import('../types/game').GameStats,
          dc: data.dice_check.dc,
          success: data.dice_check.success,
          fail: data.dice_check.fail
        }
      }),
      choices
    };

  } catch (error) {
    console.error(`Failed to load node ${storyId}/${nodeKey}:`, error);
    return null;
  }
}
