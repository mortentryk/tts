'use client';

import React, { useState, useEffect } from 'react';
import VideoBackground from './VideoBackground';

interface Story {
  id: string;
  title: string;
  description: string;
  journey_order: number;
  landmark_type: string;
  thumbnail?: string;
}

interface JourneyIntroProps {
  stories: Story[];
  onStorySelect: (story: Story) => void;
  onExit: () => void;
}

export default function JourneyIntro({ stories, onStorySelect, onExit }: JourneyIntroProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [showQuestPopup, setShowQuestPopup] = useState(false);

  // Get journey stories sorted by order
  const journeyStories = stories
    .filter(story => story.journey_order !== null)
    .sort((a, b) => a.journey_order - b.journey_order);

  const currentStory = journeyStories[currentStoryIndex];

  // 5-second video cycle
  useEffect(() => {
    if (!isVideoPlaying) return;

    const timer = setTimeout(() => {
      setIsVideoPlaying(false);
      setShowQuestPopup(true);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [isVideoPlaying, currentStoryIndex]);

  const handleQuestAccept = () => {
    onStorySelect(currentStory);
  };

  const handleQuestDecline = () => {
    setShowQuestPopup(false);
    // Move to next story or loop back to first
    const nextIndex = (currentStoryIndex + 1) % journeyStories.length;
    setCurrentStoryIndex(nextIndex);
    setIsVideoPlaying(true);
  };

  const handleSkip = () => {
    onExit();
  };

  if (!currentStory) {
    return (
      <div className="fixed inset-0 z-50 bg-dungeon-bg flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">No Stories Available</h1>
          <button
            onClick={onExit}
            className="bg-dungeon-accent hover:bg-dungeon-accent-active text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <VideoBackground useAIGeneratedMap={true}>

      {/* Video Content Overlay */}
      {isVideoPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white max-w-4xl mx-auto px-6">
            {/* Story Title Overlay */}
            <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400 border-opacity-30">
              <div className="text-8xl mb-6">
                {currentStory.landmark_type === 'tree' && '🌳'}
                {currentStory.landmark_type === 'sea' && '🌊'}
                {currentStory.landmark_type === 'cave' && '🕳️'}
                {currentStory.landmark_type === 'castle' && '🏰'}
                {currentStory.landmark_type === 'forest' && '🌲'}
                {!['tree', 'sea', 'cave', 'castle', 'forest'].includes(currentStory.landmark_type) && '📍'}
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 animate-fade-in">
                {currentStory.title}
              </h1>
              <p className="text-2xl text-yellow-200 opacity-90 mb-8 animate-fade-in">
                {currentStory.description}
              </p>
              
              {/* Video Progress Timer */}
              <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-4">
                <div 
                  className="bg-yellow-400 h-3 rounded-full transition-all duration-5000 ease-linear"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-white text-lg opacity-80">
                🚶‍♂️ Following the magical path to your destination...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quest Popup */}
      {showQuestPopup && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-black bg-opacity-80 backdrop-blur-sm border-2 border-yellow-400 rounded-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">
              {currentStory.landmark_type === 'tree' && '🌳'}
              {currentStory.landmark_type === 'sea' && '🌊'}
              {currentStory.landmark_type === 'cave' && '🕳️'}
              {currentStory.landmark_type === 'castle' && '🏰'}
              {currentStory.landmark_type === 'forest' && '🌲'}
              {!['tree', 'sea', 'cave', 'castle', 'forest'].includes(currentStory.landmark_type) && '📍'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Want to take this quest?
            </h2>
            <p className="text-yellow-200 mb-6">
              <strong>{currentStory.title}</strong>
            </p>
            <div className="space-y-3">
              <button
                onClick={handleQuestAccept}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                ✅ Yes, I'll take this quest!
              </button>
              <button
                onClick={handleQuestDecline}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                ❌ No, show me another quest
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Skip overlay */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleSkip}
            className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-70 transition-colors"
          >
            Exit
          </button>
        </div>
      </VideoBackground>
    </div>
  );
}
