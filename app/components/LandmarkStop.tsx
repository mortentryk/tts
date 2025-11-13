'use client';

import React from 'react';

interface Story {
  id: string;
  title: string;
  description?: string;
  landmark_type?: string;
  thumbnail?: string;
}

interface LandmarkStopProps {
  story: Story;
  onExplore: () => void;
  onContinue: () => void;
  onExit: () => void;
  isAnimating: boolean;
}

export default function LandmarkStop({ 
  story, 
  onExplore, 
  onContinue, 
  onExit, 
  isAnimating 
}: LandmarkStopProps) {
  const getLandmarkDescription = (landmarkType?: string) => {
    switch (landmarkType) {
      case 'tree':
        return 'Et magisk træ står foran dig, dets grene når mod himlen...';
      case 'sea':
        return 'Havets bølger slår mod kysten, og du hører en fjern sang...';
      case 'cave':
        return 'En mørk huleåbning lokker, mystiske lyde ekkoer indefra...';
      case 'castle':
        return 'Et storslået slot rejser sig foran dig, dets tårne når mod skyerne...';
      case 'forest':
        return 'En fortryllende skov breder sig foran dig, fyldt med ældgamle træer...';
      default:
        return 'Et interessant landmærke fanger din opmærksomhed...';
    }
  };

  const getLandmarkEmoji = (landmarkType?: string) => {
    switch (landmarkType) {
      case 'tree':
        return '🌳';
      case 'sea':
        return '🌊';
      case 'cave':
        return '🕳️';
      case 'castle':
        return '🏰';
      case 'forest':
        return '🌲';
      default:
        return '📍';
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
      <div className={`
        bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-8 max-w-lg mx-4
        ${isAnimating ? 'animate-pulse' : ''}
        transform transition-all duration-500
      `}>
        {/* Landmark Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">
            {getLandmarkEmoji(story.landmark_type)}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {story.title}
          </h2>
          <p className="text-dungeon-text text-sm">
            {getLandmarkDescription(story.landmark_type)}
          </p>
        </div>

        {/* Story Card */}
        <div className="bg-dungeon-bg border border-dungeon-border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            {story.title}
          </h3>
          <p className="text-dungeon-text text-sm mb-3">
            {story.description}
          </p>
          {story.thumbnail && (
            <div className="w-full h-32 bg-dungeon-accent rounded mb-3 flex items-center justify-center">
              <span className="text-dungeon-text">📖 Historiebillede</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-dungeon-text">
            <span className="px-2 py-1 bg-yellow-900 text-yellow-400 rounded-full">
              🟡 MEDIUM
            </span>
            <span>⏱️ 15-20 min</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onExplore}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors transform hover:scale-105"
          >
            🎯 Udforsk Denne Historie
          </button>
          
          <button
            onClick={onContinue}
            className="w-full bg-dungeon-accent hover:bg-dungeon-accent-active text-white px-6 py-3 rounded-lg transition-colors"
          >
            🗺️ Fortsæt Rejse
          </button>
          
          <button
            onClick={onExit}
            className="w-full bg-dungeon-surface hover:bg-dungeon-accent text-white px-6 py-3 rounded-lg border border-dungeon-border transition-colors"
          >
            📋 Gennemse Alle Historier
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 text-center">
          <div className="text-xs text-dungeon-text mb-2">
            Din Eventyrfremgang
          </div>
          <div className="w-full bg-dungeon-bg rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
              style={{ width: '25%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
