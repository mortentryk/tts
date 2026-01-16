import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware';
import { validateSEOFields } from '@/lib/seoMetadata';

/**
 * GET /api/admin/seo/[storyId]
 * Fetch SEO data for a specific story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
      const { storyId } = await params;

      // Decode URL-encoded storyId
      let decodedStoryId: string;
      try {
        decodedStoryId = decodeURIComponent(storyId);
      } catch (e) {
        decodedStoryId = storyId;
      }

      // Try to get story by slug first
      let { data: story, error: slugError } = await supabaseAdmin
        .from('stories')
        .select('id, slug, title, description, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
        .eq('slug', decodedStoryId)
        .single();

      // If not found, try normalized slug
      if (slugError || !story) {
        const normalizedSlug = decodedStoryId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (normalizedSlug !== decodedStoryId.toLowerCase()) {
          const { data: normalizedStory } = await supabaseAdmin
            .from('stories')
            .select('id, slug, title, description, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
            .eq('slug', normalizedSlug)
            .single();
          
          if (normalizedStory) {
            story = normalizedStory;
          }
        }
      }

      // If still not found, try by ID (UUID)
      if (!story) {
        const { data: storyById } = await supabaseAdmin
          .from('stories')
          .select('id, slug, title, description, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
          .eq('id', decodedStoryId)
          .single();
        
        if (storyById) {
          story = storyById;
        }
      }

      if (!story) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      // Return SEO data with validation
      const validation = validateSEOFields({
        id: story.id,
        slug: story.slug || storyId,
        title: story.title,
        description: story.description || undefined,
        meta_title: story.meta_title || undefined,
        meta_description: story.meta_description || undefined,
        meta_keywords: story.meta_keywords || undefined,
      });

      return NextResponse.json({
        ...story,
        validation,
      });
    } catch (error: any) {
      console.error('❌ Error fetching SEO data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch SEO data', message: error?.message },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/admin/seo/[storyId]
 * Update SEO fields for a specific story
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  return withAdminAuth(request, async () => {
    try {
      const { storyId } = await params;
      const body = await request.json();

      // Decode URL-encoded storyId
      let decodedStoryId: string;
      try {
        decodedStoryId = decodeURIComponent(storyId);
      } catch (e) {
        decodedStoryId = storyId;
      }

      // Validate and prepare updates
      const updates: any = {};

      // Meta fields
      if (body.meta_title !== undefined) {
        updates.meta_title = body.meta_title || null;
      }
      if (body.meta_description !== undefined) {
        updates.meta_description = body.meta_description || null;
      }
      if (body.meta_keywords !== undefined) {
        // Convert comma-separated string to array if needed
        if (typeof body.meta_keywords === 'string') {
          updates.meta_keywords = body.meta_keywords
            .split(',')
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0);
        } else if (Array.isArray(body.meta_keywords)) {
          updates.meta_keywords = body.meta_keywords.filter((k: string) => k && k.trim().length > 0);
        } else {
          updates.meta_keywords = null;
        }
      }

      // OG image
      if (body.og_image_url !== undefined) {
        updates.og_image_url = body.og_image_url || null;
      }

      // Google Shopping fields
      if (body.seo_category !== undefined) {
        updates.seo_category = body.seo_category || null;
      }
      if (body.age_rating !== undefined) {
        updates.age_rating = body.age_rating || null;
      }
      if (body.duration_minutes !== undefined) {
        updates.duration_minutes = body.duration_minutes ? parseInt(body.duration_minutes, 10) : null;
      }
      if (body.language !== undefined) {
        updates.language = body.language || null;
      }

      // Find story by slug or ID
      let storyFound = false;
      let storyIdForUpdate: string | null = null;

      // Try by slug first
      const { data: storyBySlug } = await supabaseAdmin
        .from('stories')
        .select('id, slug')
        .eq('slug', decodedStoryId)
        .single();

      if (storyBySlug) {
        storyFound = true;
        storyIdForUpdate = storyBySlug.id;
      } else {
        // Try normalized slug
        const normalizedSlug = decodedStoryId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (normalizedSlug !== decodedStoryId.toLowerCase()) {
          const { data: normalizedStory } = await supabaseAdmin
            .from('stories')
            .select('id, slug')
            .eq('slug', normalizedSlug)
            .single();
          
          if (normalizedStory) {
            storyFound = true;
            storyIdForUpdate = normalizedStory.id;
          }
        }
      }

      // If still not found, try by ID
      if (!storyFound) {
        const { data: storyById } = await supabaseAdmin
          .from('stories')
          .select('id, slug')
          .eq('id', decodedStoryId)
          .single();
        
        if (storyById) {
          storyFound = true;
          storyIdForUpdate = storyById.id;
        }
      }

      if (!storyFound) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      // Update the story (use slug or ID for the update)
      if (!storyIdForUpdate) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }

      const { data: updatedStory, error } = await supabaseAdmin
        .from('stories')
        .update(updates)
        .eq('id', storyIdForUpdate)
        .select('id, slug, title, description, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to update SEO fields', message: error.message },
          { status: 500 }
        );
      }

      // Return updated story with validation
      const validation = validateSEOFields({
        id: updatedStory.id,
        slug: updatedStory.slug || storyId,
        title: updatedStory.title,
        description: updatedStory.description || undefined,
        meta_title: updatedStory.meta_title || undefined,
        meta_description: updatedStory.meta_description || undefined,
        meta_keywords: updatedStory.meta_keywords || undefined,
      });

      console.log('✅ SEO fields updated for story:', updatedStory.id);
      return NextResponse.json({
        ...updatedStory,
        validation,
      });
    } catch (error: any) {
      console.error('❌ Error updating SEO fields:', error);
      return NextResponse.json(
        { error: 'Failed to update SEO fields', message: error?.message },
        { status: 500 }
      );
    }
  });
}
