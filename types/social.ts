export type MediaType = 'image' | 'video';

export type SocialPost = {
  id: string;
  title: string;
  caption: string;
  media_url: string;
  media_type: MediaType;
  story_slug?: string | null;
  created_at: string;
  author?: string | null;
  likes: number;
  tags?: string[] | null;
};

export type CreateSocialPostInput = {
  title: string;
  caption: string;
  media_url: string;
  media_type: MediaType;
  story_slug?: string | null;
  tags?: string[];
};
