import type { Metadata } from 'next';
import { SITE_URL } from './env';

export interface StorySEOData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_image_url?: string;
  seo_category?: string;
  age_rating?: string;
  duration_minutes?: number;
  language?: string;
  price?: number;
  is_free?: boolean;
}

/**
 * Ensures an image URL is absolute (has protocol)
 */
function ensureAbsoluteUrl(url: string | undefined, fallback?: string): string | undefined {
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const siteUrl = SITE_URL || 'https://storific.app';
  return url.startsWith('/') ? `${siteUrl}${url}` : `${siteUrl}/${url}`;
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validates SEO fields and returns validation results
 */
export function validateSEOFields(story: StorySEOData): {
  meta_title?: { valid: boolean; length: number; message?: string };
  meta_description?: { valid: boolean; length: number; message?: string };
} {
  const results: {
    meta_title?: { valid: boolean; length: number; message?: string };
    meta_description?: { valid: boolean; length: number; message?: string };
  } = {};

  if (story.meta_title !== undefined && story.meta_title !== null) {
    const length = story.meta_title.length;
    results.meta_title = {
      valid: length >= 30 && length <= 60,
      length,
      message: length < 30
        ? 'Title too short (recommended: 50-60 chars)'
        : length > 60
        ? 'Title too long (recommended: 50-60 chars)'
        : undefined,
    };
  }

  if (story.meta_description !== undefined && story.meta_description !== null) {
    const length = story.meta_description.length;
    results.meta_description = {
      valid: length >= 120 && length <= 160,
      length,
      message: length < 120
        ? 'Description too short (recommended: 150-160 chars)'
        : length > 160
        ? 'Description too long (recommended: 150-160 chars)'
        : undefined,
    };
  }

  return results;
}

/**
 * Generates Next.js Metadata object for a story
 */
export function generateStoryMetadata(story: StorySEOData): Metadata {
  const siteUrl = SITE_URL || 'https://storific.app';
  
  // Use SEO fields with fallbacks
  const title = story.meta_title || story.title || 'Interactive Story';
  const description = story.meta_description || story.description || 'An interactive story adventure with voice narration for kids';
  
  // Ensure title and description are within recommended limits
  const finalTitle = title.length > 60 ? truncateText(title, 60) : title;
  const finalDescription = description.length > 160 ? truncateText(description, 160) : description;
  
  // Build canonical URL
  const canonicalUrl = `${siteUrl}/story/${story.slug || story.id}`;
  
  // Determine image URL (prefer og_image_url, fallback to cover_image_url)
  const imageUrl = ensureAbsoluteUrl(
    story.og_image_url || story.cover_image_url,
    undefined
  );

  // Build keywords string
  const keywords = story.meta_keywords && story.meta_keywords.length > 0
    ? story.meta_keywords.join(', ')
    : undefined;

  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      type: 'website',
      url: canonicalUrl,
      siteName: 'Storific Stories',
      ...(imageUrl && { images: [{ url: imageUrl }] }),
      ...(story.language && { locale: story.language }),
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };

  // Add keywords if available
  if (keywords) {
    metadata.keywords = keywords;
  }

  return metadata;
}

/**
 * Generates JSON-LD structured data for Google Shopping / Product schema
 */
export function generateStructuredData(story: StorySEOData): object {
  const siteUrl = SITE_URL || 'https://storific.app';
  const canonicalUrl = `${siteUrl}/story/${story.slug || story.id}`;
  
  // Determine image URL
  const imageUrl = ensureAbsoluteUrl(
    story.og_image_url || story.cover_image_url,
    undefined
  );

  // Build product schema
  const productSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: story.title,
    description: story.meta_description || story.description || 'An interactive story adventure with voice narration for kids',
    ...(imageUrl && { image: imageUrl }),
    url: canonicalUrl,
    ...(story.seo_category && { category: story.seo_category }),
    ...(story.age_rating && { audience: { '@type': 'Audience', audienceType: story.age_rating } }),
    ...(story.duration_minutes && { 
      timeRequired: `PT${story.duration_minutes}M`,
    }),
    ...(story.language && { inLanguage: story.language }),
  };

  // Add offers if price is set
  if (story.price !== undefined && story.price !== null && !story.is_free) {
    productSchema.offers = {
      '@type': 'Offer',
      price: story.price.toString(),
      priceCurrency: 'DKK', // Default to DKK, can be made configurable
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  } else if (story.is_free) {
    productSchema.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'DKK',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  }

  // Add aggregate rating if available (can be extended later)
  // productSchema.aggregateRating = {
  //   '@type': 'AggregateRating',
  //   ratingValue: '4.5',
  //   reviewCount: '10',
  // };

  return productSchema;
}

/**
 * Auto-generates SEO title from story title
 */
export function autoGenerateTitle(story: StorySEOData): string {
  const baseTitle = story.title || 'Interactive Story';
  const maxLength = 60;
  const suffix = ' | Storific Stories';
  const suffixLength = suffix.length;
  
  if (baseTitle.length + suffixLength <= maxLength) {
    return `${baseTitle}${suffix}`;
  }
  
  // Truncate base title to fit with suffix
  const truncatedBase = truncateText(baseTitle, maxLength - suffixLength);
  return `${truncatedBase}${suffix}`;
}

/**
 * Auto-generates SEO description from story description
 */
export function autoGenerateDescription(story: StorySEOData): string {
  const baseDescription = story.description || 'An interactive story adventure';
  const maxLength = 160;
  
  // Try to create a compelling description
  let description = baseDescription;
  
  // Add call-to-action if there's room
  const cta = ' Play now with voice narration!';
  if (description.length + cta.length <= maxLength) {
    description = description + cta;
  }
  
  // Ensure it's within limits
  if (description.length > maxLength) {
    description = truncateText(description, maxLength);
  }
  
  return description;
}
