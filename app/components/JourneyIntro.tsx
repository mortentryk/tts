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

interface JourneyStory {
  id: string;
  story_id: string;
  node_key: string;
  journey_title: string;
  journey_text: string;
  image_url?: string;
  video_url?: string;
}

interface JourneyIntroProps {
  stories: Story[];
  onStorySelect: (story: Story) => void;
  onExit: () => void;
}

export default function JourneyIntro({ stories, onStorySelect, onExit }: JourneyIntroProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [showJourneyStory, setShowJourneyStory] = useState(false);
  const [showQuestPopup, setShowQuestPopup] = useState(false);
  const [journeyData, setJourneyData] = useState<JourneyStory | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);

  // Get journey stories sorted by order
  const journeyStories = stories
    .filter(story => story.journey_order !== null)
    .sort((a, b) => a.journey_order - b.journey_order);

  const currentStory = journeyStories[currentStoryIndex];

  // Fetch journey data for current story
  useEffect(() => {
    if (!currentStory) return;

    const fetchJourneyData = async () => {
      setLoadingJourney(true);
      try {
        const response = await fetch(`/api/stories/${currentStory.id}/journey`);
        if (response.ok) {
          const data = await response.json();
          // Get the first journey story for this story (could be for a specific node)
          if (data && data.length > 0) {
            setJourneyData(data[0]);
          } else {
            setJourneyData(null);
          }
        }
      } catch (error) {
        console.error('Failed to load journey data:', error);
        setJourneyData(null);
      } finally {
        setLoadingJourney(false);
      }
    };

    fetchJourneyData();
  }, [currentStory]);

  // 5-second video/image cycle
  useEffect(() => {
    if (!isVideoPlaying) return;

    const timer = setTimeout(() => {
      setIsVideoPlaying(false);
      // If we have journey data with custom text, show story modal first
      if (journeyData?.journey_text) {
        setShowJourneyStory(true);
      } else {
        // Otherwise go straight to quest popup
        setShowQuestPopup(true);
      }
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [isVideoPlaying, currentStoryIndex, journeyData]);

  const handleJourneyStoryRead = () => {
    setShowJourneyStory(false);
    setShowQuestPopup(true);
  };

  const handleQuestAccept = () => {
    onStorySelect(currentStory);
  };

  const handleQuestDecline = () => {
    setShowQuestPopup(false);
    setShowJourneyStory(false);
    setJourneyData(null); // Reset journey data
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
      {/* Journey Image/Video Background (if custom media exists) */}
      {isVideoPlaying && journeyData && (journeyData.video_url || journeyData.image_url) ? (
        <div className="absolute inset-0">
          {journeyData.video_url ? (
            <video
              src={journeyData.video_url}
              autoPlay
              loop
              muted
              className="w-full h-full object-cover"
            />
          ) : journeyData.image_url ? (
            <img
              src={journeyData.image_url}
              alt={journeyData.journey_title}
              className="w-full h-full object-cover"
            />
          ) : null}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          
          {/* Title overlay on image/video */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-white max-w-4xl mx-auto px-6">
              <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400 border-opacity-50">
                <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 animate-fade-in">
                  {journeyData.journey_title}
                </h1>
                
                {/* Progress Timer */}
                <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-4">
                  <div 
                    className="bg-yellow-400 h-3 rounded-full transition-all duration-5000 ease-linear"
                    style={{ width: '100%' }}
                  />
                </div>
                <p className="text-white text-lg opacity-80">
                  📖 Preparing your quest story...
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : isVideoPlaying ? (
        /* Default background with map animation */
        <VideoBackground useAIGeneratedMap={true}>
          {/* Video Content Overlay */}
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
        </VideoBackground>
      ) : null}

      {/* Journey Story Modal - Shows AFTER video/image */}
      {showJourneyStory && journeyData && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-30 p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-yellow-900 to-yellow-950 border-4 border-yellow-500 rounded-xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Decorative header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📜</div>
              <h2 className="text-4xl font-bold text-yellow-100 mb-2">
                {journeyData.journey_title}
              </h2>
              <div className="w-24 h-1 bg-yellow-400 mx-auto"></div>
            </div>

            {/* Story text in parchment-style box */}
            <div className="bg-amber-50 bg-opacity-95 rounded-lg p-8 mb-6 border-2 border-yellow-600 shadow-inner">
              <p className="text-gray-900 text-xl leading-relaxed whitespace-pre-wrap font-serif">
                {journeyData.journey_text}
              </p>
            </div>

            {/* Continue button */}
            <button
              onClick={handleJourneyStoryRead}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              ⚔️ Continue to Quest
            </button>
          </div>
        </div>
      )}

      {/* Quest Acceptance Popup - Simple decision */}
      {showQuestPopup && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-20 p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black border-4 border-yellow-500 rounded-xl p-8 max-w-lg w-full text-center shadow-2xl">
            {/* Icon */}
            <div className="text-7xl mb-4">
              {currentStory.landmark_type === 'tree' && '🌳'}
              {currentStory.landmark_type === 'sea' && '🌊'}
              {currentStory.landmark_type === 'cave' && '🕳️'}
              {currentStory.landmark_type === 'castle' && '🏰'}
              {currentStory.landmark_type === 'forest' && '🌲'}
              {!['tree', 'sea', 'cave', 'castle', 'forest'].includes(currentStory.landmark_type) && '⚔️'}
            </div>

            {/* Quest Title */}
            <h2 className="text-3xl font-bold text-yellow-400 mb-3">
              {journeyData ? journeyData.journey_title : currentStory.title}
            </h2>

            {/* Quest Question */}
            <p className="text-white text-2xl font-semibold mb-8">
              Will you accept this quest?
            </p>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleQuestAccept}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ✅ Yes, I'll take this quest!
              </button>
              <button
                onClick={handleQuestDecline}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors border-2 border-gray-500"
              >
                ❌ No, show me another quest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip overlay */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={handleSkip}
          className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-70 transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
