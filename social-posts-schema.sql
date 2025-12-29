-- Create social_posts table for feed/reels feature
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  story_slug TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email TEXT,
  likes INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_story_slug ON social_posts(story_slug);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_id ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_tags ON social_posts USING GIN(tags);

-- Add RLS policies
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access for social posts"
  ON social_posts
  FOR SELECT
  USING (true);

-- Allow authenticated users to create posts
CREATE POLICY "Allow authenticated users to create posts"
  ON social_posts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own posts or service role
CREATE POLICY "Allow users to update own posts"
  ON social_posts
  FOR UPDATE
  USING (
    auth.uid() = author_id OR
    auth.role() = 'service_role'
  );

-- Allow users to delete their own posts or service role
CREATE POLICY "Allow users to delete own posts"
  ON social_posts
  FOR DELETE
  USING (
    auth.uid() = author_id OR
    auth.role() = 'service_role'
  );

-- Add comment
COMMENT ON TABLE social_posts IS 'Stores social media posts/reels for the feed feature';

