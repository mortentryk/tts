'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VideoBackground from './VideoBackground';

interface Story {
  id: string;
  slug: string;
  title: string;
  description?: string;
  journey_order?: number | null;
  landmark_type?: string;
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
  audio_url?: string;
  duration_seconds: number;
}

interface JourneyIntroProps {
  stories: Story[];
  onStorySelect: (story: Story) => void;
  onExit: () => void;
}

const SCREEN_GUARD_DURATION_MS = 30 * 60 * 1000;

type ScreenWakeLock = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
  removeEventListener?: (type: 'release', listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLock>;
  };
};

const LANDMARK_ICON_MAP: Record<string, string> = {
  tree: '🌳',
  sea: '🌊',
  cave: '🕳️',
  castle: '🏰',
  forest: '🌲'
};

const getLandmarkIcon = (landmarkType?: string) => {
  if (!landmarkType) {
    return '⚔️';
  }
  return LANDMARK_ICON_MAP[landmarkType] ?? '⚔️';
};

export default function JourneyIntro({ stories, onStorySelect, onExit }: JourneyIntroProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Start false to prevent flash
  const [showJourneyStory, setShowJourneyStory] = useState(false);
  const [showQuestPopup, setShowQuestPopup] = useState(false);
  const [journeySegments, setJourneySegments] = useState<JourneySegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [loadingJourney, setLoadingJourney] = useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = React.useRef<ScreenWakeLock | null>(null);
  const screenGuardTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isScreenGuardActive, setIsScreenGuardActive] = useState(false);
  const [screenGuardEndTime, setScreenGuardEndTime] = useState<number | null>(null);
  const [screenGuardRemainingSeconds, setScreenGuardRemainingSeconds] = useState<number | null>(null);
  const [screenGuardMessage, setScreenGuardMessage] = useState<string | null>(null);
  const navigatorSupportsWakeLock =
    typeof navigator !== 'undefined' && Boolean((navigator as NavigatorWithWakeLock).wakeLock);

  const acquireWakeLock = useCallback(async () => {
    if (!navigatorSupportsWakeLock || wakeLockRef.current) {
      return;
    }

    try {
      const nav = navigator as NavigatorWithWakeLock;
      const sentinel = await nav.wakeLock?.request('screen');
      if (sentinel) {
        wakeLockRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (error) {
      console.warn('Wake lock request failed', error);
      setScreenGuardMessage('Kan ikke holde skærmen vågen');
      throw error;
    }
  }, [navigatorSupportsWakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) {
      return;
    }

    try {
      await wakeLockRef.current.release();
    } catch (error) {
      console.warn('Wake lock release failed', error);
    } finally {
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!(isVideoPlaying || isScreenGuardActive)) {
      releaseWakeLock();
      return;
    }

    acquireWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (!isScreenGuardActive) {
        releaseWakeLock();
      }
    };
  }, [acquireWakeLock, releaseWakeLock, isScreenGuardActive, isVideoPlaying]);

  useEffect(() => {
    return () => {
      if (screenGuardTimerRef.current) {
        clearTimeout(screenGuardTimerRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  useEffect(() => {
    if (!isScreenGuardActive || !screenGuardEndTime) {
      setScreenGuardRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = screenGuardEndTime - Date.now();
      setScreenGuardRemainingSeconds(Math.max(0, Math.ceil(remaining / 1000)));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isScreenGuardActive, screenGuardEndTime]);

  const handleScreenGuardToggle = useCallback(async () => {
    if (screenGuardTimerRef.current) {
      clearTimeout(screenGuardTimerRef.current);
      screenGuardTimerRef.current = null;
    }

    if (isScreenGuardActive) {
      setIsScreenGuardActive(false);
      setScreenGuardEndTime(null);
      setScreenGuardMessage('Skærmvagt stoppet');
      if (!isVideoPlaying) {
        await releaseWakeLock();
      }
      return;
    }

    if (!navigatorSupportsWakeLock) {
      setScreenGuardMessage('Wake Lock API er ikke understøttet på denne enhed.');
      return;
    }

    try {
      await acquireWakeLock();
      const endTime = Date.now() + SCREEN_GUARD_DURATION_MS;
      setIsScreenGuardActive(true);
      setScreenGuardEndTime(endTime);
      setScreenGuardMessage(null);

      screenGuardTimerRef.current = setTimeout(async () => {
        screenGuardTimerRef.current = null;
        setIsScreenGuardActive(false);
        setScreenGuardEndTime(null);
        await releaseWakeLock();

        // Only try to exit app if running in Capacitor (native app)
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor?.isNativePlatform?.()) {
            const { App } = await import('@capacitor/app');
            await App.exitApp();
          }
        } catch (error) {
          // Not in Capacitor environment or exit failed - ignore silently
          // In PWA/web, we can't exit the app anyway
        }
      }, SCREEN_GUARD_DURATION_MS);
    } catch (error) {
      console.warn('Kunne ikke aktivere skærmvagt', error);
      setScreenGuardMessage('Kunne ikke holde skærmen vågen.');
    }
  }, [
    acquireWakeLock,
    isScreenGuardActive,
    isVideoPlaying,
    navigatorSupportsWakeLock,
    releaseWakeLock
  ]);

  // Get journey stories sorted by order
  const journeyStories = stories
    .filter(story => story.journey_order !== null && story.journey_order !== undefined)
    .sort((a, b) => (a.journey_order ?? 0) - (b.journey_order ?? 0));

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

  // Play audio for current segment
  useEffect(() => {
    if (!isVideoPlaying) return;
    
    const currentSegment = journeySegments[currentSegmentIndex];
    if (currentSegment?.audio_url) {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Play new audio
      audioRef.current = new Audio(currentSegment.audio_url);
      audioRef.current.volume = 0.7;
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
    }

    // Cleanup: stop audio when component unmounts or segment changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isVideoPlaying, currentSegmentIndex, journeySegments]);

  // Segment playback timer
  useEffect(() => {
    if (!isVideoPlaying) return;

    const currentSegment = journeySegments[currentSegmentIndex];
    const duration = currentSegment ? currentSegment.duration_seconds * 1000 : 5000;

    const timer = setTimeout(() => {
      // Stop audio before moving to next segment
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Check if there are more segments to play
      if (currentSegmentIndex < journeySegments.length - 1) {
        // Move to next segment
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        // All segments played, go directly to quest popup
        setIsVideoPlaying(false);
        setShowQuestPopup(true);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isVideoPlaying, currentSegmentIndex, journeySegments]);

  const handleJourneyStoryRead = () => {
    onStorySelect(currentStory);
  };

  const handleQuestAccept = () => {
    onStorySelect(currentStory);
  };

  const handleQuestDecline = () => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
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
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onExit();
  };

  if (!currentStory) {
    return (
      <div className="fixed inset-0 z-50 bg-dungeon-bg flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Ingen Historier Tilgængelige</h1>
          <button
            onClick={onExit}
            className="bg-dungeon-accent hover:bg-dungeon-accent-active text-white px-6 py-3 rounded-lg transition-colors"
          >
            Gå Tilbage
          </button>
        </div>
      </div>
    );
  }

  const currentSegment = journeySegments[currentSegmentIndex];
  const hasJourneyContent = journeySegments.length > 0;
  const showSegmentOverlay = isVideoPlaying && hasJourneyContent && !!currentSegment;
  const fallbackBackgroundImage =
    currentSegment?.image_url ||
    currentStory.thumbnail ||
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop';
  const segmentPreviewText = currentSegment
    ? `${currentSegment.journey_text.substring(0, 220)}${
        currentSegment.journey_text.length > 220 ? '...' : ''
      }`
    : '';
  const storyIcon = getLandmarkIcon(currentStory.landmark_type);
  const storyDescription = currentStory.description || 'Et nyt eventyr venter på dig...';
  const progressBarKey = `${currentSegment?.id ?? 'idle'}-${currentSegmentIndex}`;
  const screenGuardButtonLabel = isScreenGuardActive
    ? 'Stop 30 min auto-luk'
    : 'Hold skærmen vågen (30 min)';
  const screenGuardButtonClasses = isScreenGuardActive
    ? 'bg-red-600 hover:bg-red-500'
    : 'bg-green-600 hover:bg-green-500';
  const screenGuardButtonDisabled = !navigatorSupportsWakeLock && !isScreenGuardActive;
  const formattedScreenGuardCountdown =
    screenGuardRemainingSeconds !== null
      ? `${String(Math.floor(screenGuardRemainingSeconds / 60)).padStart(2, '0')}:${String(
          screenGuardRemainingSeconds % 60
        ).padStart(2, '0')}`
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <VideoBackground
        videoUrl={showSegmentOverlay ? currentSegment?.video_url : undefined}
        fallbackImage={fallbackBackgroundImage}
        useAIGeneratedMap={false}
      >
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black/90" />
          {showSegmentOverlay && currentSegment ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 py-12">
              <div className="w-full max-w-6xl grid gap-6 md:grid-cols-[1.2fr,0.8fr] items-stretch text-white">
                <div className="bg-black/70 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
                  <div className="text-sm font-semibold tracking-[0.4em] text-yellow-300 uppercase">
                    Segment {currentSegmentIndex + 1} / {journeySegments.length}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                    {currentSegment.journey_title}
                  </h1>
                  <p className="text-lg text-gray-200 leading-relaxed">
                    {segmentPreviewText}
                  </p>
                  <div className="space-y-3">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        key={progressBarKey}
                        className="h-full rounded-full bg-yellow-400"
                        style={{
                          animation: `progressFill ${currentSegment.duration_seconds}s linear forwards`
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-300 font-medium">
                      {currentSegment.duration_seconds} sekunder til næste stop
                    </p>
                  </div>
                </div>
                <div className="bg-black/60 border border-yellow-500/40 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
                  <div className="text-5xl">{storyIcon}</div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-yellow-300 mb-2">
                      Næste Historie
                    </p>
                    <h2 className="text-3xl font-bold">{currentStory.title}</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    {storyDescription}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="bg-yellow-600/20 border border-yellow-500/40 text-yellow-200 px-4 py-2 rounded-full font-semibold">
                      🟡 MEDIUM
                    </span>
                    <span className="bg-blue-600/20 border border-blue-500/40 text-blue-100 px-4 py-2 rounded-full font-semibold">
                      ⏱️ 15-20 min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="bg-black/70 border border-white/10 rounded-3xl px-8 py-12 text-center text-white max-w-md w-full space-y-4 shadow-2xl">
                {loadingJourney ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent mx-auto"></div>
                    <p className="text-lg font-semibold">Henter din Eventyrrejse...</p>
                    <p className="text-sm text-white/70">
                      Magien er på vej – forbliv på stien.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold">Ingen rejseindhold endnu</p>
                    <p className="text-sm text-white/70">
                      Vi kunne ikke finde nogen segmenter til denne historie.
                    </p>
                    <button
                      onClick={onExit}
                      className="mt-2 inline-flex items-center justify-center rounded-full bg-yellow-600 px-6 py-3 font-semibold text-white hover:bg-yellow-500 transition-colors"
                    >
                      Tilbage til kortet
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      </VideoBackground>

      {/* Quest Acceptance Popup - Enhanced with story info */}
      {showQuestPopup && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-20 p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black border-4 border-yellow-500 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
            
            {/* Hero Image - First segment's image */}
            {journeySegments.length > 0 && journeySegments[0].image_url && (
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={journeySegments[0].image_url} 
                  alt={currentStory.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900"></div>
              </div>
            )}

            <div className="p-8 text-center">
              {/* Icon */}
              <div className="text-7xl mb-4">
                {storyIcon}
              </div>

              {/* Quest Title */}
              <h2 className="text-4xl font-bold text-yellow-400 mb-3">
                {currentStory.title}
              </h2>

              {/* Story Description */}
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {storyDescription}
              </p>

              {/* Metadata badges */}
              <div className="flex justify-center gap-4 mb-8">
                <span className="bg-yellow-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🟡 MEDIUM
                </span>
                <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  ⏱️ 15-20 min
                </span>
              </div>

              {/* Quest Question */}
              <p className="text-white text-2xl font-semibold mb-6">
                Vil du acceptere denne opgave?
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleQuestAccept}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ✅ Ja, jeg tager denne opgave!
                </button>
                <button
                  onClick={handleQuestDecline}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors border-2 border-gray-500"
                >
                  ❌ Nej, vis mig en anden opgave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip overlay */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={handleScreenGuardToggle}
          disabled={screenGuardButtonDisabled}
          className={`text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${screenGuardButtonClasses} disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {screenGuardButtonLabel}
        </button>
        {formattedScreenGuardCountdown && (
          <div className="text-xs text-yellow-200 font-semibold">
            Lukker om {formattedScreenGuardCountdown}
          </div>
        )}
        {screenGuardMessage && (
          <div className="text-xs text-red-300 max-w-[240px] text-right">{screenGuardMessage}</div>
        )}
        <button
          onClick={handleSkip}
          className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-70 transition-colors"
        >
          Afslut
        </button>
      </div>
    </div>
  );
}
