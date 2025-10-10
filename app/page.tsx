'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStorySelect = (storyId: string) => {
    router.push(`/story/${storyId}`);
  };

  return (
    <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Adventure</h1>
        <p className="text-dungeon-text text-lg mb-8">
          Select a story to begin your interactive adventure with voice narration
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          <div 
            className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105"
            onClick={() => handleStorySelect('cave-adventure')}
          >
            <h3 className="text-xl font-bold text-white mb-2">The Dark Cave</h3>
            <p className="text-dungeon-text mb-4">Explore a mysterious cave filled with treasures and dangers.</p>
            <div className="text-sm text-dungeon-text">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-400">
                🟡 MEDIUM
              </span>
              <span className="ml-4">⏱️ 15-20 min</span>
            </div>
          </div>
          
          <div 
            className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105"
            onClick={() => handleStorySelect('forest-quest')}
          >
            <h3 className="text-xl font-bold text-white mb-2">The Enchanted Forest</h3>
            <p className="text-dungeon-text mb-4">Journey through magical woods where ancient trees whisper secrets.</p>
            <div className="text-sm text-dungeon-text">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-900 text-green-400">
                🟢 EASY
              </span>
              <span className="ml-4">⏱️ 10-15 min</span>
            </div>
          </div>
          
          <div 
            className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105"
            onClick={() => handleStorySelect('dragon-lair')}
          >
            <h3 className="text-xl font-bold text-white mb-2">Dragon's Lair</h3>
            <p className="text-dungeon-text mb-4">Face the ultimate challenge in the dragon's lair.</p>
            <div className="text-sm text-dungeon-text">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-900 text-red-400">
                🔴 HARD
              </span>
              <span className="ml-4">⏱️ 20-30 min</span>
            </div>
          </div>
          
          <div 
            className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 cursor-pointer hover:bg-dungeon-accent transition-all duration-300 transform hover:scale-105"
            onClick={() => handleStorySelect('skonhedenogudyret')}
          >
            <h3 className="text-xl font-bold text-white mb-2">Skønhed og Udyret</h3>
            <p className="text-dungeon-text mb-4">En dansk fortælling om skønhed, mod og forvandling med stemmestyring.</p>
            <div className="text-sm text-dungeon-text">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-900 text-yellow-400">
                🟡 MEDIUM
              </span>
              <span className="ml-4">⏱️ 20-30 min</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-dungeon-text text-sm">
          🎙️ All stories feature voice narration and voice commands
        </div>
      </div>
    </div>
  );
}