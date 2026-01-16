-- Add SEO fields to stories table
-- Run this in your Supabase SQL Editor

-- Meta tags
ALTER TABLE stories ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS meta_keywords TEXT[];

-- Open Graph image
ALTER TABLE stories ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Google Shopping / Structured Data fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS seo_category TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS age_rating TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'da';

-- Add comments for documentation
COMMENT ON COLUMN stories.meta_title IS 'Custom SEO title (50-60 chars recommended). Falls back to title if not set.';
COMMENT ON COLUMN stories.meta_description IS 'Custom SEO description (150-160 chars recommended). Falls back to description if not set.';
COMMENT ON COLUMN stories.meta_keywords IS 'Array of keywords for SEO. Used in meta keywords tag.';
COMMENT ON COLUMN stories.og_image_url IS 'Open Graph image URL for social media sharing (1200x630px recommended). Falls back to cover_image_url if not set.';
COMMENT ON COLUMN stories.seo_category IS 'Category for Google Shopping (e.g., "Adventure", "Fantasy", "Educational")';
COMMENT ON COLUMN stories.age_rating IS 'Age rating (e.g., "3+", "6+", "All Ages")';
COMMENT ON COLUMN stories.duration_minutes IS 'Estimated reading/play time in minutes';
COMMENT ON COLUMN stories.language IS 'Language code (e.g., "da", "en"). Defaults to "da".';

-- Create index for SEO category filtering (useful for Google Shopping)
CREATE INDEX IF NOT EXISTS idx_stories_seo_category ON stories(seo_category) WHERE seo_category IS NOT NULL;
