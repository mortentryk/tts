'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LandmarkStop from './LandmarkStop';
import PathAnimation from './PathAnimation';
import JourneyIntro from './JourneyIntro';
import CompletionVideo from './CompletionVideo';

interface Story {
  id: string;
  slug: string;
  title: string;
  description: string;
  journey_order: number;
  landmark_type: string;
  thumbnail?: string;
}

interface JourneyState {
  currentStopIndex: number;
  visitedStops: string[];
  isAnimating: boolean;
  completedStories: string[];
}

interface JourneyMapProps {
  stories: Story[];
  onExit: () => void;
  showIntro?: boolean;
}

export default function JourneyMap({ stories, onExit, showIntro = true }: JourneyMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [journeyState, setJourneyState] = useState<JourneyState>({
    currentStopIndex: 0,
    visitedStops: [],
    isAnimating: false,
    completedStories: []
  });
  const [showIntroVideo, setShowIntroVideo] = useState(showIntro);
  const [showCompletionVideo, setShowCompletionVideo] = useState(false);

  // Get journey stories sorted by order
  const journeyStories = stories
    .filter(story => story.journey_order !== null)
    .sort((a, b) => a.journey_order - b.journey_order);

  // Load journey state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('journeyState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setJourneyState(parsed);
      } catch (error) {
        console.log('Could not load journey state:', error);
      }
    }
  }, []);

  // Save journey state to localStorage
  useEffect(() => {
    localStorage.setItem('journeyState', JSON.stringify(journeyState));
  }, [journeyState]);

  const handleExploreStory = async (story: Story) => {
    // Track click analytics
    try {
      await fetch('/api/stories/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storySlug: story.id }),
      });
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }

    // Navigate to story
    router.push(`/story/${story.id}`);
  };

  const handleContinueJourney = () => {
    if (journeyState.currentStopIndex < journeyStories.length - 1) {
      setJourneyState(prev => ({
        ...prev,
        currentStopIndex: prev.currentStopIndex + 1,
        visitedStops: [...prev.visitedStops, journeyStories[prev.currentStopIndex].id],
        isAnimating: true
      }));

      // Auto-scroll to next position
      setTimeout(() => {
        if (mapRef.current) {
          const scrollPosition = (journeyState.currentStopIndex + 1) * (2400 / journeyStories.length);
          mapRef.current.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
        }
        setJourneyState(prev => ({ ...prev, isAnimating: false }));
      }, 1000);
    } else {
      // End of journey - show completion video
      setJourneyState(prev => ({
        ...prev,
        visitedStops: [...prev.visitedStops, journeyStories[prev.currentStopIndex].id]
      }));
      setShowCompletionVideo(true);
    }
  };

  const handleExitJourney = () => {
    onExit();
  };

  const currentStory = journeyStories[journeyState.currentStopIndex];
  const isJourneyComplete = journeyState.currentStopIndex >= journeyStories.length - 1;

  // Show completion video
  if (showCompletionVideo) {
    return (
      <CompletionVideo
        onComplete={onExit}
        onReplay={() => {
          setShowCompletionVideo(false);
          setJourneyState({
            currentStopIndex: 0,
            visitedStops: [],
            isAnimating: false,
            completedStories: []
          });
        }}
      />
    );
  }

  // Show intro video first
  if (showIntroVideo) {
    return (
      <JourneyIntro
        stories={stories}
        onStorySelect={handleExploreStory}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-dungeon-bg">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <div className="text-white">
          <h1 className="text-2xl font-bold">Dit Eventyr Rejse</h1>
          <p className="text-dungeon-text">
            Stop {journeyState.currentStopIndex + 1} af {journeyStories.length}
          </p>
        </div>
        <button
          onClick={handleExitJourney}
          className="bg-dungeon-surface hover:bg-dungeon-accent text-white px-4 py-2 rounded-lg border border-dungeon-border transition-colors"
        >
          Afslut Rejse
        </button>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef}
        className="journey-map w-full h-full overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="relative" style={{ width: '2400px', height: '100vh' }}>
          {/* Map Background - Placeholder for now */}
          <div 
            className="w-full h-full bg-gradient-to-r from-green-900 via-blue-900 to-purple-900 relative"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=2400&h=800&fit=crop")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Path Animation */}
            <PathAnimation
              isAnimating={journeyState.isAnimating}
              currentStopIndex={journeyState.currentStopIndex}
              totalStops={journeyStories.length}
              onAnimationComplete={() => setJourneyState(prev => ({ ...prev, isAnimating: false }))}
            />

            {/* Story Landmarks */}
            {journeyStories.map((story, index) => {
              const position = (index / (journeyStories.length - 1)) * 2000 + 200;
              const isVisited = journeyState.visitedStops.includes(story.id);
              const isCurrent = index === journeyState.currentStopIndex;
              
              return (
                <div
                  key={story.id}
                  className="absolute"
                  style={{
                    left: `${position}px`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Landmark Icon */}
                  <div className={`
                    w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl journey-landmark
                    ${isCurrent ? 'border-yellow-400 bg-yellow-100 animate-pulse' : 
                      isVisited ? 'border-green-400 bg-green-100' : 
                      'border-gray-400 bg-gray-100'}
                  `}>
                    {story.landmark_type === 'tree' && '🌳'}
                    {story.landmark_type === 'sea' && '🌊'}
                    {story.landmark_type === 'cave' && '🕳️'}
                    {story.landmark_type === 'castle' && '🏰'}
                    {story.landmark_type === 'forest' && '🌲'}
                    {!['tree', 'sea', 'cave', 'castle', 'forest'].includes(story.landmark_type) && '📍'}
                  </div>
                  
                  {/* Story Title */}
                  <div className="text-center mt-2">
                    <p className="text-white text-sm font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
                      {story.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Story Stop Modal */}
      {currentStory && !isJourneyComplete && (
        <LandmarkStop
          story={currentStory}
          onExplore={() => handleExploreStory(currentStory)}
          onContinue={handleContinueJourney}
          onExit={handleExitJourney}
          isAnimating={journeyState.isAnimating}
        />
      )}

      {/* Journey Complete Modal */}
      {isJourneyComplete && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-4">🎉 Journey Complete!</h2>
            <p className="text-dungeon-text mb-6">
              You've explored all the magical lands! You can replay any adventure or explore more stories.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExitJourney}
                className="w-full bg-dungeon-accent hover:bg-dungeon-accent-active text-white px-6 py-3 rounded-lg transition-colors"
              >
                Browse All Stories
              </button>
              <button
                onClick={() => setJourneyState(prev => ({ ...prev, currentStopIndex: 0, visitedStops: [] }))}
                className="w-full bg-dungeon-surface hover:bg-dungeon-accent text-white px-6 py-3 rounded-lg border border-dungeon-border transition-colors"
              >
                Start Journey Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
