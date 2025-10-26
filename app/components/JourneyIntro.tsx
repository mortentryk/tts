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

interface JourneySegment {
  id: string;
  story_id: string;
  node_key: string;
  sequence_number: number;
  journey_title: string;
  journey_text: string;
  image_url?: string;
  video_url?: string;
  duration_seconds: number;
}

interface JourneyIntroProps {
  stories: Story[];
  onStorySelect: (story: Story) => void;
  onExit: () => void;
}

export default function JourneyIntro({ stories, onStorySelect, onExit }: JourneyIntroProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Start false to prevent flash
  const [showJourneyStory, setShowJourneyStory] = useState(false);
  const [showQuestPopup, setShowQuestPopup] = useState(false);
  const [journeySegments, setJourneySegments] = useState<JourneySegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [loadingJourney, setLoadingJourney] = useState(true);

  // Get journey stories sorted by order
  const journeyStories = stories
    .filter(story => story.journey_order !== null)
    .sort((a, b) => a.journey_order - b.journey_order);

  const currentStory = journeyStories[currentStoryIndex];

  // Fetch journey segments for current story
  useEffect(() => {
    if (!currentStory) return;

    const fetchJourneySegments = async () => {
      setLoadingJourney(true);
      setCurrentSegmentIndex(0);
      setIsVideoPlaying(false);
      try {
        const response = await fetch(`/api/stories/${currentStory.id}/journey`);
        if (response.ok) {
          const data = await response.json();
          // data is an array of segments, ordered by sequence_number
          if (data && data.length > 0) {
            setJourneySegments(data);
          } else {
            setJourneySegments([]);
          }
        }
      } catch (error) {
        console.error('Failed to load journey segments:', error);
        setJourneySegments([]);
      } finally {
        setLoadingJourney(false);
        // Start playing after segments loaded
        setIsVideoPlaying(true);
      }
    };

    fetchJourneySegments();
  }, [currentStory]);

  // Segment playback timer
  useEffect(() => {
    if (!isVideoPlaying) return;

    const currentSegment = journeySegments[currentSegmentIndex];
    const duration = currentSegment ? currentSegment.duration_seconds * 1000 : 5000;

    const timer = setTimeout(() => {
      // Check if there are more segments to play
      if (currentSegmentIndex < journeySegments.length - 1) {
        // Move to next segment
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        // All segments played, now show story modal or quest popup
        setIsVideoPlaying(false);
        if (journeySegments.length > 0) {
          setShowJourneyStory(true);
        } else {
          setShowQuestPopup(true);
        }
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isVideoPlaying, currentSegmentIndex, journeySegments]);

  const handleJourneyStoryRead = () => {
    // If we have journey segments, accept quest directly
    // Otherwise, show the quest popup for stories without journey data
    if (journeySegments.length > 0) {
      onStorySelect(currentStory);
    } else {
      setShowJourneyStory(false);
      setShowQuestPopup(true);
    }
  };

  const handleQuestAccept = () => {
    onStorySelect(currentStory);
  };

  const handleQuestDecline = () => {
    setShowQuestPopup(false);
    setShowJourneyStory(false);
    setJourneySegments([]); // Reset journey segments
    setCurrentSegmentIndex(0);
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

  const currentSegment = journeySegments[currentSegmentIndex];
  const hasJourneyContent = journeySegments.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Journey Segment Display (if custom media exists) */}
      {isVideoPlaying && hasJourneyContent && currentSegment && (currentSegment.video_url || currentSegment.image_url) ? (
        <div className="absolute inset-0">
          {currentSegment.video_url ? (
            <video
              key={currentSegment.id}
              src={currentSegment.video_url}
              autoPlay
              loop
              muted
              className="w-full h-full object-cover"
            />
          ) : currentSegment.image_url ? (
            <img
              key={currentSegment.id}
              src={currentSegment.image_url}
              alt={currentSegment.journey_title}
              className="w-full h-full object-cover"
            />
          ) : null}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          
          {/* Title overlay on image/video */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-white max-w-4xl mx-auto px-6">
              <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400 border-opacity-50">
                {/* Segment counter */}
                <div className="text-yellow-400 text-sm font-semibold mb-2">
                  Segment {currentSegmentIndex + 1} of {journeySegments.length}
                </div>
                <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 animate-fade-in">
                  {currentSegment.journey_title}
                </h1>
                
                {/* Progress Timer */}
                <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-4">
                  <div 
                    className="bg-yellow-400 h-3 rounded-full transition-all"
                    style={{ 
                      width: '100%',
                      transition: `width ${currentSegment.duration_seconds}s linear`
                    }}
                  />
                </div>
                <p className="text-white text-lg opacity-80">
                  {currentSegment.video_url ? '🎬' : '🖼️'} {currentSegment.journey_text.substring(0, 80)}...
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

      {/* Journey Story Modal - Shows AFTER all segments */}
      {showJourneyStory && hasJourneyContent && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-30 p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-yellow-900 to-yellow-950 border-4 border-yellow-500 rounded-xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Decorative header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📜</div>
              <h2 className="text-4xl font-bold text-yellow-100 mb-2">
                {currentStory.title}
              </h2>
              <div className="w-24 h-1 bg-yellow-400 mx-auto"></div>
            </div>

            {/* Combined story text from all segments */}
            <div className="bg-amber-50 bg-opacity-95 rounded-lg p-8 mb-6 border-2 border-yellow-600 shadow-inner">
              {journeySegments.map((segment, index) => (
                <div key={segment.id} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{segment.journey_title}</h3>
                  <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                    {segment.journey_text}
                  </p>
                  {index < journeySegments.length - 1 && (
                    <div className="my-4 border-t-2 border-yellow-600"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleJourneyStoryRead}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ⚔️ Accept Quest
              </button>
              <button
                onClick={onExit}
                className="w-full bg-blue-700 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors border-2 border-blue-500"
              >
                📖 Go to Adventure Journal
              </button>
              <button
                onClick={handleQuestDecline}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors border-2 border-gray-500"
              >
                ❌ Decline Quest
              </button>
            </div>
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
              {currentStory.title}
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
