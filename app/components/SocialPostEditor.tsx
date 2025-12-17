'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreateSocialPostInput, SocialPost } from '@/types/social';

type StoryOption = { id: string; slug?: string; title: string };

type Props = {
  defaultStorySlug?: string | null;
  onCreated?: (post: SocialPost) => void;
};

export default function SocialPostEditor({ defaultStorySlug, onCreated }: Props) {
  const [stories, setStories] = useState<StoryOption[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateSocialPostInput>({
    title: '',
    caption: '',
    media_url: '',
    media_type: 'image',
    story_slug: defaultStorySlug || '',
    tags: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, story_slug: defaultStorySlug || '' }));
  }, [defaultStorySlug]);

  useEffect(() => {
    const loadStories = async () => {
      setLoadingStories(true);
      try {
        const res = await fetch('/api/stories');
        if (res.ok) {
          const data = await res.json();
          setStories(
            data.map((s: any) => ({
              id: s.id,
              slug: s.slug,
              title: s.title,
            })),
          );
        }
      } catch (err) {
        console.warn('Failed to load stories', err);
      } finally {
        setLoadingStories(false);
      }
    };
    loadStories();
  }, []);

  const isValid = useMemo(
    () =>
      form.title.trim().length > 0 &&
      form.caption.trim().length > 0 &&
      form.media_url.trim().length > 0 &&
      form.caption.length <= 280,
    [form],
  );

  const handleChange = (key: keyof CreateSocialPostInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);

    const payload: CreateSocialPostInput = {
      ...form,
      story_slug: form.story_slug || undefined,
      tags: form.tags,
    };

    try {
      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunne ikke oprette post');
      }
      const created = (await res.json()) as SocialPost;
      onCreated?.(created);
      setForm({
        title: '',
        caption: '',
        media_url: '',
        media_type: 'image',
        story_slug: defaultStorySlug || '',
        tags: [],
      });
    } catch (err: any) {
      setError(err?.message || 'Der skete en fejl');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">Lav en reel</h3>
          <p className="text-sm text-gray-300">Del et kort klip eller billede fra en historie.</p>
        </div>
        <span className="text-xs text-gray-400">Max 280 tegn i caption</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-200">Titel *</span>
            <input
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Eventyrets navn"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-200">Medie URL *</span>
            <input
              value={form.media_url}
              onChange={(e) => handleChange('media_url', e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="https://..."
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-200">Caption *</span>
            <textarea
              value={form.caption}
              onChange={(e) => handleChange('caption', e.target.value)}
              maxLength={280}
              rows={3}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Kort beskrivelse af reel"
              required
            />
            <span className="text-xs text-gray-400">{form.caption.length}/280</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-gray-200">Medietype *</span>
              <select
                value={form.media_type}
                onChange={(e) => handleChange('media_type', e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="image">Billede</option>
                <option value="video">Video</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-gray-200">Historie</span>
              <select
                value={form.story_slug || ''}
                onChange={(e) => handleChange('story_slug', e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={loadingStories}
              >
                <option value="">Ingen</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.slug || story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-gray-200">Tags (kommasepareret)</span>
          <input
            value={form.tags?.join(', ') || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="eventyr, skov, magi"
          />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isValid || saving}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? 'Gemmer...' : 'Del reel'}
          </button>
        </div>
      </form>
    </div>
  );
}
