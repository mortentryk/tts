import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { generateStoryMetadata, type StorySEOData } from '@/lib/seoMetadata';

export async function generateMetadata(
  { params }: { params: Promise<{ storyId: string }> }
): Promise<Metadata> {
  const { storyId } = await params;
  
  try {
    // Decode URL-encoded storyId
    let decodedStoryId: string;
    try {
      decodedStoryId = decodeURIComponent(storyId);
    } catch (e) {
      decodedStoryId = storyId;
    }

    // Try to get story by slug first (with SEO fields)
    let { data: storyBySlug, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('id, title, description, cover_image_url, slug, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
      .eq('slug', decodedStoryId)
      .eq('is_published', true)
      .single();

    // If not found, try normalized slug
    if (slugError || !storyBySlug) {
      const normalizedSlug = decodedStoryId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (normalizedSlug !== decodedStoryId.toLowerCase()) {
        const { data: normalizedStory } = await supabaseAdmin
          .from('stories')
          .select('id, title, description, cover_image_url, slug, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
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
        .select('id, title, description, cover_image_url, slug, meta_title, meta_description, meta_keywords, og_image_url, seo_category, age_rating, duration_minutes, language, price, is_free')
        .eq('id', decodedStoryId)
        .eq('is_published', true)
        .single();
      
      if (storyById) {
        storyBySlug = storyById;
      }
    }

    if (storyBySlug) {
      // Build StorySEOData object
      const storySEOData: StorySEOData = {
        id: storyBySlug.id,
        slug: storyBySlug.slug || storyId,
        title: storyBySlug.title,
        description: storyBySlug.description || undefined,
        cover_image_url: storyBySlug.cover_image_url || undefined,
        meta_title: storyBySlug.meta_title || undefined,
        meta_description: storyBySlug.meta_description || undefined,
        meta_keywords: storyBySlug.meta_keywords || undefined,
        og_image_url: storyBySlug.og_image_url || undefined,
        seo_category: storyBySlug.seo_category || undefined,
        age_rating: storyBySlug.age_rating || undefined,
        duration_minutes: storyBySlug.duration_minutes || undefined,
        language: storyBySlug.language || undefined,
        price: storyBySlug.price ?? undefined,
        is_free: storyBySlug.is_free !== false,
      };

      // Use SEO utility to generate metadata
      return generateStoryMetadata(storySEOData);
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Story',
    description: 'Interactive story adventure with voice narration for kids',
    openGraph: {
      title: 'Story',
      description: 'Interactive story adventure with voice narration for kids',
      type: 'website',
      siteName: 'Storific Stories',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Story',
      description: 'Interactive story adventure with voice narration for kids',
    },
  };
}

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

