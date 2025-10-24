'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VideoBackgroundProps {
  videoUrl?: string;
  fallbackImage?: string;
  children?: React.ReactNode;
  useAIGeneratedMap?: boolean;
}

export default function VideoBackground({ 
  videoUrl, 
  fallbackImage = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop",
  children,
  useAIGeneratedMap = true
}: VideoBackgroundProps) {
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [aiGeneratedMap, setAiGeneratedMap] = useState<string | null>(null);
  const [aiGeneratedVideo, setAiGeneratedVideo] = useState<string | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [mapGenerationTimeout, setMapGenerationTimeout] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
    }
  }, [videoUrl]);

  // Generate AI map on component mount (only once)
  useEffect(() => {
    if (useAIGeneratedMap && !aiGeneratedMap && !isGeneratingMap) {
      // Show fallback image immediately while generating
      setAiGeneratedMap(fallbackImage);
      generateFantasyMap();
    }
  }, []); // Empty dependency array to run only once

  const generateFantasyMap = async () => {
    if (isGeneratingMap) return; // Prevent multiple calls
    
    setIsGeneratingMap(true);
    try {
      const response = await fetch('/api/admin/generate-map-video', {
        method: 'POST',
      });
      const result = await response.json();
      console.log('Map generation result:', result);
      if (result.success && result.mapImageUrl) {
        setAiGeneratedMap(result.mapImageUrl);
        if (result.videoUrl) {
          setAiGeneratedVideo(result.videoUrl);
        }
      } else {
        console.log('Generation failed, keeping fallback image');
      }
    } catch (error) {
      console.error('Failed to generate fantasy map:', error);
      // Keep the fallback image that's already showing
    } finally {
      setIsGeneratingMap(false);
    }
  };

  const handleVideoError = () => {
    console.log('Video failed to load, falling back to image');
    setVideoError(true);
  };

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Video Background */}
      {(videoUrl || aiGeneratedVideo) && !videoError && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
        >
          <source src={aiGeneratedVideo || videoUrl} type="video/mp4" />
          <source src={aiGeneratedVideo || videoUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* AI Generated Fantasy Map Background */}
      {isGeneratingMap ? (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-xl">🎨 Generating your fantasy map with AI...</p>
            <p className="text-sm opacity-80 mt-2">This may take a few moments</p>
          </div>
        </div>
      ) : (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${aiGeneratedMap || fallbackImage}")`,
            filter: 'brightness(0.9) contrast(1.1) saturate(1.2)'
          }}
        />
      )}

      {/* Subtle overlay to enhance the AI-generated map */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10" />
      
      {/* Subtle floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Children Content */}
      {children}
    </div>
  );
}
