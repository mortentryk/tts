import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { SITE_URL } from '@/lib/env';

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

    // Try to get story by slug first
    let { data: storyBySlug, error: slugError } = await supabaseAdmin
      .from('stories')
      .select('title, description, cover_image_url, slug')
      .eq('slug', decodedStoryId)
      .eq('is_published', true)
      .single();

    // If not found, try normalized slug
    if (slugError || !storyBySlug) {
      const normalizedSlug = decodedStoryId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (normalizedSlug !== decodedStoryId.toLowerCase()) {
        const { data: normalizedStory } = await supabaseAdmin
          .from('stories')
          .select('title, description, cover_image_url, slug')
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
        .select('title, description, cover_image_url, slug')
        .eq('id', decodedStoryId)
        .eq('is_published', true)
        .single();
      
      if (storyById) {
        storyBySlug = storyById;
      }
    }

    if (storyBySlug) {
      const title = storyBySlug.title || 'Interactive Story';
      const description = storyBySlug.description || 'An interactive story adventure';
      const siteUrl = SITE_URL || 'https://storific.app';
      
      // Build image URL
      const imageUrl = storyBySlug.cover_image_url 
        ? (storyBySlug.cover_image_url.startsWith('http') 
            ? storyBySlug.cover_image_url 
            : `${siteUrl}${storyBySlug.cover_image_url}`)
        : undefined;

      const canonicalUrl = `${siteUrl}/story/${storyBySlug.slug || storyId}`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: imageUrl ? [{ url: imageUrl }] : [],
          type: 'website',
          url: canonicalUrl,
          siteName: 'Storific Stories',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: imageUrl ? [imageUrl] : [],
        },
        alternates: {
          canonical: canonicalUrl,
        },
      };
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

