import { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

const BASE_URL = (SITE_URL || 'https://storific.app').replace(/\/+$/, '');

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency?: ChangeFrequency;
  priority?: number;
  lastModified?: Date;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/library', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/login', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cancel', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/success', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/refund', changeFrequency: 'yearly', priority: 0.2 },
];

/**
 * Get story entries for sitemap
 * Uses slugs for SEO-friendly URLs, falls back to ID if slug not available
 * Priority 0.8 indicates stories are important content
 * Weekly changeFrequency reflects that stories are updated periodically
 */
async function getStoryEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, slug, updated_at')
      .eq('is_published', true);

    if (error || !data) {
      console.error('[sitemap] Failed to load stories', error);
      return [];
    }

    return data
      .filter((story) => story.slug || story.id)
      .map((story) => ({
        // Prefer slug for SEO-friendly URLs, fallback to ID
        url: `${BASE_URL}/story/${story.slug || story.id}`,
        lastModified: story.updated_at ? new Date(story.updated_at) : undefined,
        changeFrequency: 'weekly' as ChangeFrequency,
        priority: 0.8, // Stories are important content, but less than homepage
      }));
  } catch (error) {
    console.error('[sitemap] Unexpected error loading stories', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [storyEntries] = await Promise.all([getStoryEntries()]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    lastModified: route.lastModified ?? new Date(),
  }));

  return [...staticEntries, ...storyEntries];
}

export const revalidate = 3600; // 1 hour in seconds // Refresh sitemap every hour

