'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStories = async () => {
      console.log('🚀 Starting to load stories...');
      try {
        // Try to load from Supabase first
        const response = await fetch('/api/stories');
        if (response.ok) {
          const data = await response.json();
          setStories(data);
        } else {
          throw new Error('Supabase not available');
        }
      } catch (error) {
        console.error('❌ Failed to load stories:', error);
        console.log('🔄 Using fallback stories...');
        // Fallback to hardcoded stories if Supabase fails
        setStories([
          { id: 'cave-adventure', title: 'Cave Adventure', description: 'Explore a mysterious cave filled with treasures and dangers.' },
          { id: 'forest-quest', title: 'The Enchanted Forest', description: 'Journey through magical woods where ancient trees whisper secrets.' },
          { id: 'dragon-lair', title: 'Dragon\'s Lair', description: 'Face the ultimate challenge in the dragon\'s lair.' },
          { id: 'skonhedenogudyret', title: 'Skønhed og Udyret', description: 'En dansk fortælling om skønhed, mod og forvandling.' }
        ]);
      } finally {
        console.log('🏁 Finished loading stories');
        setLoading(false);
      }
    };
    loadStories();
  }, []);

  const handleStorySelect = async (story: any) => {
    // Use slug for navigation, fallback to id for backwards compatibility
    const storySlug = story.slug || story.id;
    
    // Track click analytics (fire and forget)
    try {
      await fetch('/api/stories/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storySlug }),
      });
    } catch (error) {
      // Ignore analytics errors - don't block navigation
      console.log('Analytics tracking failed:', error);
    }
    
    // Navigate to story
    router.push(`/story/${storySlug}`);
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
    <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center p-4">
      <div className="text-center max-w-6xl w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Choose Your Adventure</h1>
        <p className="text-dungeon-text text-base sm:text-lg mb-8">
          Select a story to begin your interactive adventure with voice narration
        </p>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          {stories.map((story) => (
            <div 
              key={story.id}
              className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg overflow-hidden hover:border-yellow-500 transition-all duration-300 cursor-pointer group"
              onClick={() => handleStorySelect(story)}
            >
              {/* Story Cover Image */}
              {story.cover_image_url && (
                <div className="h-40 sm:h-48 overflow-hidden">
                  <img 
                    src={story.cover_image_url} 
                    alt={`${story.title} cover`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{story.title}</h3>
                <p className="text-dungeon-text mb-4">{story.description}</p>
                <div className="text-sm text-dungeon-text mb-4">
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-400">
                    🟡 MEDIUM
                  </span>
                  <span className="ml-4">⏱️ {story.estimatedTime || '15-20 min'}</span>
                </div>
                
                {/* Click anywhere to start - no button needed */}
                <div className="text-center">
                  <div className="inline-flex items-center text-yellow-400 font-semibold text-sm group-hover:text-yellow-300 transition-colors">
                    <span className="mr-2">▶️</span>
                    <span>Click to Start Story</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-dungeon-text text-sm">
          🎙️ All stories feature voice narration and voice commands
        </div>
        
        {/* Admin Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg border-2 border-gray-600 transition-all duration-300 transform hover:scale-105"
          >
            🔧 Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}