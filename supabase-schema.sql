-- Supabase Schema for Interactive Story App
-- Run this in your Supabase SQL editor

-- Stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  lang text NOT NULL DEFAULT 'da-DK',
  description text,
  cover_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Story nodes (scenes/passages)
CREATE TABLE public.story_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  text_md text NOT NULL,
  tts_ssml text,
  image_url text,
  dice_check jsonb,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (story_id, node_key)
);

-- Story choices (edges between nodes)
CREATE TABLE public.story_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  from_node_key text NOT NULL,
  label text NOT NULL,
  to_node_key text NOT NULL,
  conditions jsonb,
  effect jsonb,
  sort_index integer NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_story_nodes_story_id_node_key ON public.story_nodes (story_id, node_key);
CREATE INDEX idx_story_choices_story_id_from_node ON public.story_choices (story_id, from_node_key, sort_index);

-- Row Level Security (RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_choices ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read for published stories only
CREATE POLICY "public_read_published_stories" ON public.stories
  FOR SELECT USING (is_published = true);

CREATE POLICY "public_read_nodes_of_published_stories" ON public.story_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.is_published = true
    )
  );

CREATE POLICY "public_read_choices_of_published_stories" ON public.story_choices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.is_published = true
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_nodes_updated_at BEFORE UPDATE ON public.story_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
