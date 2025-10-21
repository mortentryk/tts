-- Character consistency system for TTS stories
-- Run this in your Supabase SQL Editor

-- Characters table
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  appearance_prompt TEXT, -- AI prompt for character appearance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character assignments to story nodes
CREATE TABLE IF NOT EXISTS public.character_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  role TEXT, -- 'main', 'secondary', 'background', etc.
  emotion TEXT, -- 'happy', 'sad', 'angry', etc.
  action TEXT, -- 'standing', 'running', 'talking', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, node_key, character_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_story_id ON public.characters(story_id);
CREATE INDEX IF NOT EXISTS idx_character_assignments_story_node ON public.character_assignments(story_id, node_key);
CREATE INDEX IF NOT EXISTS idx_character_assignments_character_id ON public.character_assignments(character_id);

-- RLS policies
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_assignments ENABLE ROW LEVEL SECURITY;

-- Allow public read for published stories
CREATE POLICY "public read characters of published stories" ON public.characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s 
      WHERE s.id = story_id AND s.is_published = true
    )
  );

CREATE POLICY "public read character assignments of published stories" ON public.character_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s 
      WHERE s.id = story_id AND s.is_published = true
    )
  );

-- Allow admin access (service role)
CREATE POLICY "admin full access to characters" ON public.characters
  FOR ALL USING (true);

CREATE POLICY "admin full access to character assignments" ON public.character_assignments
  FOR ALL USING (true);
