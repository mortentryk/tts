'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PathAnimationProps {
  isAnimating: boolean;
  currentStopIndex: number;
  totalStops: number;
  onAnimationComplete?: () => void;
}

export default function PathAnimation({ 
  isAnimating, 
  currentStopIndex, 
  totalStops,
  onAnimationComplete 
}: PathAnimationProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, []);

  useEffect(() => {
    if (isAnimating && pathLength > 0) {
      const targetProgress = (currentStopIndex + 1) / totalStops;
      
      const animate = () => {
        setAnimationProgress(prev => {
          const increment = 0.02; // Animation speed
          const newProgress = Math.min(prev + increment, targetProgress);
          
          if (newProgress >= targetProgress) {
            onAnimationComplete?.();
            return targetProgress;
          }
          
          requestAnimationFrame(animate);
          return newProgress;
        });
      };
      
      animate();
    }
  }, [isAnimating, currentStopIndex, totalStops, pathLength, onAnimationComplete]);

  const strokeDasharray = pathLength;
  const strokeDashoffset = pathLength * (1 - animationProgress);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full">
        {/* Main Path */}
        <path
          ref={pathRef}
          d="M 100 400 Q 600 200 1200 300 T 2300 400"
          stroke="#ffd700"
          strokeWidth="8"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Animated Marker */}
        {isAnimating && (
          <circle
            cx={100 + (2200 * animationProgress)}
            cy={400 - (200 * Math.sin(animationProgress * Math.PI))}
            r="12"
            fill="#ffd700"
            className="animate-pulse"
          >
            <animate
              attributeName="r"
              values="8;16;8"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        
        {/* Path Glow Effect */}
        <path
          d="M 100 400 Q 600 200 1200 300 T 2300 400"
          stroke="#ffd700"
          strokeWidth="16"
          fill="none"
          opacity="0.3"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
}
