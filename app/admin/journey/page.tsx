'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Story {
  id: string;
  title: string;
  description: string;
  journey_order: number | null;
  landmark_type: string | null;
  in_journey: boolean;
}

export default function JourneyAdmin() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStoryJourney = async (storyId: string, updates: Partial<Story>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setStories(prev => 
          prev.map(story => 
            story.id === storyId ? { ...story, ...updates } : story
          )
        );
      }
    } catch (error) {
      console.error('Failed to update story:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleJourney = (storyId: string, inJourney: boolean) => {
    const updates = {
      in_journey: inJourney,
      journey_order: inJourney ? (stories.filter(s => s.in_journey).length + 1) : null,
      landmark_type: inJourney ? 'tree' : null
    };
    updateStoryJourney(storyId, updates);
  };

  const updateJourneyOrder = (storyId: string, newOrder: number) => {
    updateStoryJourney(storyId, { journey_order: newOrder });
  };

  const updateLandmarkType = (storyId: string, landmarkType: string) => {
    updateStoryJourney(storyId, { landmark_type: landmarkType });
  };

  const journeyStories = stories
    .filter(story => story.in_journey)
    .sort((a, b) => (a.journey_order || 0) - (b.journey_order || 0));

  const landmarkTypes = [
    { value: 'tree', label: '🌳 Tree', description: 'Magical tree' },
    { value: 'sea', label: '🌊 Sea', description: 'Ocean with rocks' },
    { value: 'cave', label: '🕳️ Cave', description: 'Dark cave entrance' },
    { value: 'castle', label: '🏰 Castle', description: 'Castle on hill' },
    { value: 'forest', label: '🌲 Forest', description: 'Enchanted forest' },
    { value: 'village', label: '🏘️ Village', description: 'Small village' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-dungeon-text">Loading stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dungeon-bg text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="mb-4 bg-dungeon-surface hover:bg-dungeon-accent text-white px-4 py-2 rounded-lg border border-dungeon-border transition-colors"
          >
            ← Back to Admin
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Journey Adventure Map</h1>
          <p className="text-dungeon-text">
            Configure which stories appear in the journey and their order
          </p>
        </div>

        {/* Journey Preview */}
        <div className="bg-dungeon-surface border border-dungeon-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Journey Preview</h2>
          {journeyStories.length === 0 ? (
            <p className="text-dungeon-text">No stories in journey yet. Add some below!</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {journeyStories.map((story, index) => (
                <div key={story.id} className="flex items-center bg-dungeon-bg rounded-lg p-3">
                  <span className="text-yellow-400 font-bold mr-2">{index + 1}.</span>
                  <span className="mr-2">
                    {landmarkTypes.find(t => t.value === story.landmark_type)?.label || '📍'}
                  </span>
                  <span className="text-white">{story.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stories List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">All Stories</h2>
          
          {stories.map((story) => (
            <div key={story.id} className="bg-dungeon-surface border border-dungeon-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{story.title}</h3>
                  <p className="text-dungeon-text text-sm">{story.description}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={story.in_journey}
                      onChange={(e) => toggleJourney(story.id, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white">Include in Journey</span>
                  </label>
                </div>
              </div>

              {story.in_journey && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Journey Order */}
                  <div>
                    <label className="block text-sm font-medium text-dungeon-text mb-2">
                      Journey Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={stories.filter(s => s.in_journey).length}
                      value={story.journey_order || 1}
                      onChange={(e) => updateJourneyOrder(story.id, parseInt(e.target.value))}
                      className="w-full bg-dungeon-bg border border-dungeon-border rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  {/* Landmark Type */}
                  <div>
                    <label className="block text-sm font-medium text-dungeon-text mb-2">
                      Landmark Type
                    </label>
                    <select
                      value={story.landmark_type || 'tree'}
                      onChange={(e) => updateLandmarkType(story.id, e.target.value)}
                      className="w-full bg-dungeon-bg border border-dungeon-border rounded-lg px-3 py-2 text-white"
                    >
                      {landmarkTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} {type.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Status */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg">
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}
