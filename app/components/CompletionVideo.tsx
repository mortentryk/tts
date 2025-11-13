'use client';

import React, { useState, useEffect } from 'react';

interface CompletionVideoProps {
  onComplete: () => void;
  onReplay: () => void;
}

export default function CompletionVideo({ onComplete, onReplay }: CompletionVideoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Play completion video for 5 seconds
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setShowOptions(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Completion Video Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Generated completion scene */}
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop")',
            filter: 'brightness(0.9) contrast(1.1)'
          }}
        >
          {/* Completion Overlay Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/30 via-orange-900/30 to-red-900/30" />
          
          {/* Celebration Elements */}
          <div className="absolute inset-0">
            {/* Confetti Animation */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              />
            ))}
            
            {/* Sparkles */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Completion Content */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white max-w-4xl mx-auto px-6">
            <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400 border-opacity-30">
              <div className="text-8xl mb-6 animate-bounce">
                🎉
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 animate-fade-in">
                Eventyr Gennemført!
              </h1>
              <p className="text-2xl text-yellow-200 opacity-90 mb-8 animate-fade-in">
                Du har succesfuldt gennemført din magiske rejse gennem alle de fortryllede lande!
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-4">
                <div 
                  className="bg-yellow-400 h-3 rounded-full transition-all duration-5000 ease-linear"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-white text-lg opacity-80">
                🏆 Fejrer dine heltemodige præstationer...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Options */}
      {showOptions && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-6 animate-bounce">
              🏆
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Tillykke!
            </h2>
            <p className="text-dungeon-text mb-6">
              Du har gennemført alle de magiske opgaver og udforsket hvert fortryllede land!
            </p>
            <div className="space-y-3">
              <button
                onClick={onReplay}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🔄 Start Nyt Eventyr
              </button>
              <button
                onClick={onComplete}
                className="w-full bg-dungeon-accent hover:bg-dungeon-accent-active text-white px-6 py-3 rounded-lg transition-colors"
              >
                📋 Gennemse Alle Historier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip overlay */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowOptions(true)}
          className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-70 transition-colors"
        >
          Spring Over
        </button>
      </div>
    </div>
  );
}
