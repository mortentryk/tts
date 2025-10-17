'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStoryList } from '../lib/supabaseStoryManager';

export default function Home() {
  const router = useRouter();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const storyList = await loadStoryList();
        setStories(storyList);
      } catch (error) {
        console.error('Failed to load stories:', error);
        // Fallback to hardcoded stories if Supabase fails
        setStories([
          { id: 'cave-adventure', title: 'The Dark Cave', description: 'Explore a mysterious cave filled with treasures and dangers.' },
          { id: 'forest-quest', title: 'The Enchanted Forest', description: 'Journey through magical woods where ancient trees whisper secrets.' },
          { id: 'dragon-lair', title: 'Dragon\'s Lair', description: 'Face the ultimate challenge in the dragon\'s lair.' },
          { id: 'skonhedenogudyret', title: 'Skønhed og Udyret', description: 'En dansk fortælling om skønhed, mod og forvandling.' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadStories();
  }, []);

  const handleStorySelect = (storyId: string) => {
    router.push(`/story/${storyId}`);
  };

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
    <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Adventure</h1>
        <p className="text-dungeon-text text-lg mb-8">
          Select a story to begin your interactive adventure with voice narration
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {stories.map((story) => (
            <div 
              key={story.id}
              className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105"
              onClick={() => handleStorySelect(story.id)}
            >
              <h3 className="text-xl font-bold text-white mb-2">{story.title}</h3>
              <p className="text-dungeon-text mb-4">{story.description}</p>
              <div className="text-sm text-dungeon-text">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-400">
                  🟡 MEDIUM
                </span>
                <span className="ml-4">⏱️ {story.estimatedTime || '15-20 min'}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-dungeon-text text-sm">
          🎙️ All stories feature voice narration and voice commands
        </div>
      </div>
    </div>
  );
}