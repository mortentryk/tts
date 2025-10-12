'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoryMetadata } from '../types/game';
import { loadStoryList } from '../lib/storyManager';

interface StoryCardProps {
  story: StoryMetadata;
  onClick: () => void;
}

function StoryCard({ story, onClick }: StoryCardProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900';
      case 'medium': return 'text-yellow-400 bg-yellow-900';
      case 'hard': return 'text-red-400 bg-red-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  const getDifficultyIcon = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div 
      className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{story.title}</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(story.difficulty)}`}>
          {getDifficultyIcon(story.difficulty)} {story.difficulty?.toUpperCase() || 'UNKNOWN'}
        </div>
      </div>
      
      <p className="text-dungeon-text mb-4 leading-relaxed">{story.description}</p>
      
      <div className="flex items-center justify-between text-sm text-dungeon-text">
        <div className="flex items-center space-x-4">
          {story.author && (
            <span className="flex items-center">
              <span className="mr-1">👤</span>
              {story.author}
            </span>
          )}
          {story.estimatedTime && (
            <span className="flex items-center">
              <span className="mr-1">⏱️</span>
              {story.estimatedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorySelection() {
  const [stories, setStories] = useState<StoryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadStories = async () => {
      try {
        const storyList = await loadStoryList();
        setStories(storyList);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load stories:', err);
        setError('Failed to load stories. Please try again.');
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

  if (error) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Stories</h2>
          <p className="text-dungeon-text mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-dungeon-accent hover:bg-dungeon-accent-active text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dungeon-bg text-white">
      {/* Header */}
      <div className="border-b border-dungeon-border p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Choose Your Adventure</h1>
          <p className="text-dungeon-text text-lg">
            Select a story to begin your interactive adventure with voice narration
          </p>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => handleStorySelect(story.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-dungeon-border p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-dungeon-text text-sm">
            🎙️ All stories feature voice narration and voice commands
          </p>
        </div>
      </div>
    </div>
  );
}
