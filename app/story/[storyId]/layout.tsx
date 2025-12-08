import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

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
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://storific.dk';
      
      // Build image URL
      const imageUrl = storyBySlug.cover_image_url 
        ? (storyBySlug.cover_image_url.startsWith('http') 
            ? storyBySlug.cover_image_url 
            : `${siteUrl}${storyBySlug.cover_image_url}`)
        : undefined;

      return {
        title: `${title} - Storific Stories`,
        description: description,
        openGraph: {
          title: title,
          description: description,
          images: imageUrl ? [{ url: imageUrl }] : [],
          type: 'website',
          url: `${siteUrl}/story/${storyBySlug.slug || storyId}`,
        },
        twitter: {
          card: 'summary_large_image',
          title: title,
          description: description,
          images: imageUrl ? [imageUrl] : [],
        },
        alternates: {
          canonical: `${siteUrl}/story/${storyBySlug.slug || storyId}`,
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Story - Storific Stories',
    description: 'Interactive story adventure with voice narration for kids',
  };
}

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

