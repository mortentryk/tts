'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StoryNode, StoryChoice } from '../../../types/game';

interface Story {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_published: boolean;
}

export default function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const router = useRouter();
  const [storyId, setStoryId] = useState<string>('');
  
  const [story, setStory] = useState<Story | null>(null);
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isTTSRunningRef = useRef(false);
  const voiceMatchedRef = useRef(false);

  // Load params
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setStoryId(resolvedParams.storyId);
    };
    loadParams();
  }, [params]);

  // Load story data
  useEffect(() => {
    if (!storyId) return;
    
    const loadStory = async () => {
      try {
        setLoading(true);
        
        // Load story metadata
        const storyResponse = await fetch(`/api/stories/${storyId}`);
        if (!storyResponse.ok) {
          throw new Error('Story not found');
        }
        const storyData = await storyResponse.json();
        setStory(storyData);
        
        // Load first node
        const nodeResponse = await fetch(`/api/stories/${storyId}/nodes/1`);
        if (!nodeResponse.ok) {
          throw new Error('Story content not found');
        }
        const nodeData = await nodeResponse.json();
        setCurrentNode(nodeData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };
    
    loadStory();
  }, [storyId]);

  // Navigate to a specific node
  const goToNode = useCallback(async (nodeKey: string) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/nodes/${nodeKey}`);
      if (!response.ok) {
        throw new Error('Node not found');
      }
      const nodeData = await response.json();
      setCurrentNode(nodeData);
    } catch (err) {
      console.error('Failed to load node:', err);
    }
  }, [storyId]);

  // TTS Functions
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'da-DK';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      
      utterance.onstart = () => {
        setSpeaking(true);
        isTTSRunningRef.current = true;
      };
      
      utterance.onend = () => {
        setSpeaking(false);
        isTTSRunningRef.current = false;
      };
      
      speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeak = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setSpeaking(false);
      isTTSRunningRef.current = false;
    }
  }, []);

  // Voice Recognition
  const startVoiceListening = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
      
      recognition.lang = 'da-DK';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        setVoiceListening(true);
        voiceMatchedRef.current = false;
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', transcript);
        
        if (currentNode?.choices) {
          for (const choice of currentNode.choices) {
            if (choice.label.toLowerCase().includes(transcript) || transcript.includes(choice.label.toLowerCase())) {
              console.log('Voice match found:', choice.label);
              voiceMatchedRef.current = true;
              goToNode(choice.goto);
              break;
            }
          }
        }
    };

    recognition.onend = () => {
        setVoiceListening(false);
        if (!voiceMatchedRef.current) {
          console.log('No voice match found');
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [currentNode, goToNode]);

  const stopVoiceListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceListening(false);
    }
  }, []);

  // Handle choice selection
  const handleChoice = useCallback((choice: StoryChoice) => {
    stopSpeak();
    stopVoiceListening();
    goToNode(choice.goto);
  }, [goToNode, stopSpeak, stopVoiceListening]);

  // Auto-speak when node changes
  useEffect(() => {
    if (currentNode && currentNode.text) {
      speak(currentNode.text);
    }
  }, [currentNode, speak]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-dungeon-text">Loading story...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Story Not Found</h1>
          <p className="text-dungeon-text mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-dungeon-accent text-white px-6 py-3 rounded-lg hover:bg-dungeon-accent/80 transition-colors"
          >
            Back to Stories
          </button>
        </div>
      </div>
    );
  }

  if (!story || !currentNode) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-dungeon-text">Loading story content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dungeon-bg text-white">
      {/* Header */}
      <div className="bg-dungeon-surface border-b border-dungeon-accent p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">{story.title}</h1>
            {story.description && (
              <p className="text-dungeon-text text-sm">{story.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
          <button
              onClick={() => router.push('/')}
              className="bg-dungeon-accent text-white px-4 py-2 rounded hover:bg-dungeon-accent/80 transition-colors"
          >
              Back to Stories
          </button>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="max-w-4xl mx-auto p-6">
          {/* Scene Image */}
        {currentNode.image && (
            <div className="mb-6 flex justify-center">
              <img 
              src={currentNode.image} 
                alt="Scene illustration"
                className="max-w-full h-auto max-h-96 rounded-lg shadow-lg border-2 border-dungeon-accent"
              />
            </div>
          )}
          
        {/* Story Text */}
        <div className="bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-6 mb-6">
          <div className="prose prose-invert max-w-none">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{currentNode.text}</p>
            </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-6">
              <button
            onClick={() => speak(currentNode.text)}
            disabled={speaking}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              speaking 
                ? 'bg-yellow-600 text-white' 
                : 'bg-dungeon-accent text-white hover:bg-dungeon-accent/80'
            }`}
          >
            {speaking ? '🔊 Speaking...' : '🔊 Read Aloud'}
              </button>
          
              <button
            onClick={voiceListening ? stopVoiceListening : startVoiceListening}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              voiceListening 
                ? 'bg-red-600 text-white' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {voiceListening ? '🎤 Listening...' : '🎤 Voice Commands'}
              </button>
            </div>

        {/* Choices */}
        {currentNode.choices && currentNode.choices.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">What do you do?</h3>
            {currentNode.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                className="w-full bg-dungeon-surface border-2 border-dungeon-accent rounded-lg p-4 text-left hover:bg-dungeon-accent transition-colors group"
              >
                <span className="text-white font-medium group-hover:text-dungeon-bg">
                {choice.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
