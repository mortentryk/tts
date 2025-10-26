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
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-4">
          <div className="bg-black bg-opacity-90 backdrop-blur-sm border-2 border-yellow-400 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-center">
            {/* Journey Image or Video */}
            {journeyData && (journeyData.video_url || journeyData.image_url) && (
              <div className="mb-6 rounded-lg overflow-hidden border-2 border-yellow-400">
                {journeyData.video_url ? (
                  <video
                    src={journeyData.video_url}
                    autoPlay
                    loop
                    muted
                    className="w-full h-64 object-cover"
                  />
                ) : journeyData.image_url ? (
                  <img
                    src={journeyData.image_url}
                    alt={journeyData.journey_title}
                    className="w-full h-64 object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Landmark Icon (if no custom media) */}
            {!journeyData?.video_url && !journeyData?.image_url && (
              <div className="text-6xl mb-4">
                {currentStory.landmark_type === 'tree' && '🌳'}
                {currentStory.landmark_type === 'sea' && '🌊'}
                {currentStory.landmark_type === 'cave' && '🕳️'}
                {currentStory.landmark_type === 'castle' && '🏰'}
                {currentStory.landmark_type === 'forest' && '🌲'}
                {!['tree', 'sea', 'cave', 'castle', 'forest'].includes(currentStory.landmark_type) && '📍'}
              </div>
            )}

            {/* Journey Title */}
            <h2 className="text-3xl font-bold text-white mb-4">
              {journeyData ? journeyData.journey_title : currentStory.title}
            </h2>

            {/* Journey Story Text */}
            {journeyData && journeyData.journey_text && (
              <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-6 mb-6">
                <p className="text-yellow-100 text-lg leading-relaxed whitespace-pre-wrap text-left">
                  {journeyData.journey_text}
                </p>
              </div>
            )}

            {/* Default description if no journey data */}
            {!journeyData && (
              <p className="text-yellow-200 mb-6">
                <strong>{currentStory.title}</strong>
                <br />
                <span className="text-sm">{currentStory.description}</span>
              </p>
            )}

            {/* Quest Question */}
            <p className="text-white text-xl font-semibold mb-6">
              Will you accept this quest?
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleQuestAccept}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors transform hover:scale-105"
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
