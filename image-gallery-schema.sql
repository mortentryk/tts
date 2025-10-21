-- Smart Image Gallery System for TTS Stories
-- Run this in your Supabase SQL Editor

-- Story images table for the gallery system
CREATE TABLE IF NOT EXISTS public.story_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  node_key TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  public_id TEXT, -- Cloudinary public ID
  characters TEXT[], -- Array of character names in the image
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  cost DECIMAL(10,4) DEFAULT 0,
  model TEXT, -- 'dalle3', 'stable-diffusion', etc.
  prompt TEXT,
  status TEXT DEFAULT 'generated', -- 'generated', 'assigned', 'unused'
  width INTEGER,
  height INTEGER,
  file_size INTEGER, -- in bytes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image assignments to story nodes
CREATE TABLE IF NOT EXISTS public.image_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  image_id UUID NOT NULL REFERENCES public.story_images(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, node_key, image_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_images_story_id ON public.story_images(story_id);
CREATE INDEX IF NOT EXISTS idx_story_images_node_key ON public.story_images(node_key);
CREATE INDEX IF NOT EXISTS idx_story_images_status ON public.story_images(status);
CREATE INDEX IF NOT EXISTS idx_story_images_characters ON public.story_images USING GIN(characters);
CREATE INDEX IF NOT EXISTS idx_image_assignments_story_node ON public.image_assignments(story_id, node_key);
CREATE INDEX IF NOT EXISTS idx_image_assignments_image_id ON public.image_assignments(image_id);

-- RLS policies
ALTER TABLE public.story_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_assignments ENABLE ROW LEVEL SECURITY;

-- Allow public read for published stories
CREATE POLICY "public read images of published stories" ON public.story_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s 
      WHERE s.id = story_id AND s.is_published = true
    )
  );

CREATE POLICY "public read image assignments of published stories" ON public.image_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s 
      WHERE s.id = story_id AND s.is_published = true
    )
  );

-- Allow admin access (service role)
CREATE POLICY "admin full access to story images" ON public.story_images
  FOR ALL USING (true);

CREATE POLICY "admin full access to image assignments" ON public.image_assignments
  FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_story_images_updated_at 
  BEFORE UPDATE ON public.story_images 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
