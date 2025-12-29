import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rateLimit';
import { getCache, setCache, withCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  return withRateLimit(request, 100, 60000, async () => {
    try {
      // Try to get from cache first
      const cacheKey = 'stories:list';
      const cached = await getCache<any[]>(cacheKey, 'api');
      if (cached !== null) {
        console.log('✅ Returning cached stories list');
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            'X-Cache': 'HIT',
          }
        });
      }

      console.log('🔍 Fetching published stories...');
      
      // Get published stories first (without requiring nodes)
      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
        return NextResponse.json({ 
          error: 'Failed to load stories',
          details: error.message 
        }, { status: 500 });
      }

      if (!stories || stories.length === 0) {
        console.log('⚠️ No published stories found');
        return NextResponse.json([]);
      }

      console.log(`✅ Found ${stories.length} published stories`);

      // Optimize: Batch fetch all cover images in a single query
      // Get all story IDs that need cover images
      const storyIdsNeedingCover = stories
        .filter(story => {
          const hasValidCoverImage = story.cover_image_url && 
            typeof story.cover_image_url === 'string' &&
            story.cover_image_url.trim() !== '' &&
            (story.cover_image_url.startsWith('http://') || story.cover_image_url.startsWith('https://'));
          return !hasValidCoverImage;
        })
        .map(story => story.id);

      // Batch fetch first node images for stories that need them
      let nodeImageMap: Record<string, string> = {};
      if (storyIdsNeedingCover.length > 0) {
        const { data: nodes, error: nodeError } = await supabase
          .from('story_nodes')
          .select('story_id, image_url, sort_index')
          .in('story_id', storyIdsNeedingCover)
          .not('image_url', 'is', null)
          .order('story_id', { ascending: true })
          .order('sort_index', { ascending: true });

        if (!nodeError && nodes) {
          // Group by story_id and take first image for each story
          const storyImageMap = new Map<string, string>();
          for (const node of nodes) {
            if (!storyImageMap.has(node.story_id)) {
              const imageUrl = node.image_url;
              if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                storyImageMap.set(node.story_id, imageUrl);
              }
            }
          }
          nodeImageMap = Object.fromEntries(storyImageMap);
        }
      }

      // Process stories and assign cover images
      const processedStories = stories.map((story) => {
        // Validate cover_image_url
        const hasValidCoverImage = story.cover_image_url && 
          typeof story.cover_image_url === 'string' &&
          story.cover_image_url.trim() !== '' &&
          (story.cover_image_url.startsWith('http://') || story.cover_image_url.startsWith('https://'));
        
        // If story already has a valid cover image, return it as is
        if (hasValidCoverImage) {
          return story;
        }

        // Use first node image as fallback if available
        const nodeImageUrl = nodeImageMap[story.id];
        if (nodeImageUrl) {
          story.cover_image_url = nodeImageUrl;
          console.log(`✅ Using first node image as cover for story ${story.slug}`);
        }

        return story;
      });

      console.log('✅ Stories processed:', processedStories.length);
      
      // Cache the result for 5 minutes
      await setCache(cacheKey, processedStories, { 
        ttl: 300, // 5 minutes
        prefix: 'api' 
      });

      return NextResponse.json(processedStories, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          'X-Cache': 'MISS',
        }
      });

    } catch (error: any) {
      console.error('❌ API error:', error);
      console.error('   Stack:', error?.stack);
      return NextResponse.json({ 
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred'
      }, { status: 500 });
    }
  });
}
