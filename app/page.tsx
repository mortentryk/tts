'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameStats, StoryNode, SaveData } from '../types/game';
import { loadStoryFromSheet } from '../lib/storyLoader';

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

const START_ID = "1";
const SAVE_KEY = "svt_save_v1";

// Your Vercel endpoint (LMNT-backed /api/tts)
const SERVER_URL = "/api/tts";

// --- Helpers ---
function hashText(t: string): string {
  let h = 0;
  for (let i = 0; i < t.length; i++) { 
    h = (h << 5) - h + t.charCodeAt(i); 
    h |= 0; 
  }
  return String(h);
}

// Cache object URLs so we don't re-fetch the same audio
const audioCache = new Map<string, string>(); // key -> objectURL

// Cloud TTS for web — OpenAI only
async function speakViaCloud(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>, onComplete?: () => void): Promise<void> {
  if (!text || !text.trim()) return;

  const key = `openai-${hashText(text)}`;
  if (audioCache.has(key)) {
    const cached = audioCache.get(key);
    if (cached) {
      const audio = new Audio(cached);
      
      // Store the audio element in the ref
      audioRef.current = audio;
      
      // Clear the ref when audio ends or errors
      audio.onended = () => { 
        audioRef.current = null;
        onComplete?.(); // Call completion callback
      };
      
      audio.onerror = () => {
        audioRef.current = null;
        onComplete?.(); // Call completion callback even on error
      };
      
      try { 
        await audio.play(); 
        return; 
      } catch {
        audioRef.current = null;
        try { 
          URL.revokeObjectURL(cached); 
        } catch {}
        audioCache.delete(key);
      }
    }
  }

  const res = await fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider: 'openai' })
  });

  if (!res.ok) {
    let msg = "";
    try { 
      msg = await res.text(); 
    } catch {}
    const e = new Error(`OpenAI TTS failed (${res.status})${msg ? `: ${msg.slice(0,180)}` : ""}`);
    (e as any).status = res.status;
    throw e;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  audioCache.set(key, url);

  const audio = new Audio(url);
  
  // Store the audio element in the ref
  audioRef.current = audio;
  
      // Clear the ref when audio ends or errors
      audio.onended = () => { 
        audioRef.current = null;
        onComplete?.(); // Call completion callback
        /* keep cached for replays */ 
      };
      
      audio.onerror = () => {
        audioRef.current = null;
        onComplete?.(); // Call completion callback even on error
      };
  
  try { 
    await audio.play(); 
  } catch (err) {
    audioRef.current = null;
    URL.revokeObjectURL(url);
    audioCache.delete(key);
    const e = new Error("Autoplay blocked – click the button and try again.");
    (e as any).code = "AUTOPLAY";
    throw e;
  }
}

export default function Game() {
  const [currentId, setCurrentId] = useState(START_ID);
  const [stats, setStats] = useState<GameStats>({ Evner: 10, Udholdenhed: 18, Held: 10 });
  const [speaking, setSpeaking] = useState(false);
  const [story, setStory] = useState<Record<string, StoryNode>>({});
  const [loading, setLoading] = useState(true);
  
  // Audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Dice roll state
  const [pendingDiceRoll, setPendingDiceRoll] = useState<{
    stat: keyof GameStats;
    roll: number;
    total: number;
    success: boolean;
    successPassage: string;
    failurePassage: string;
  } | null>(null);
  
  // Voice command state
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [voiceNotification, setVoiceNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Only OpenAI TTS now

  const passage = story[currentId];

  // --- TTS Controls ---
  const stopSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Note: We don't revoke the ObjectURL here as it might be cached for replays
    }
    audioRef.current = null;
    setSpeaking(false);
  }, []);

  // --- Voice Recognition Helpers ---
  const startVoiceListening = useCallback((timeoutMs: number = 10000) => {
    // Clear any existing timeout
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
    }

    // Start listening
    setListening(true);
    setSpeechError(null);

    // Set timeout to stop listening
    voiceTimeoutRef.current = setTimeout(() => {
      setListening(false);
      console.log('Voice listening timeout - stopping recognition');
    }, timeoutMs);
  }, []);

  const stopVoiceListening = useCallback(() => {
    setListening(false);
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  }, []);

  // Voice notification helper
  const showVoiceNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setVoiceNotification({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setVoiceNotification(null);
    }, 3000);
  }, []);

  // Enhanced TTS with voice listening
  const speakWithVoiceListening = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;

    // Add choice prompt if there are choices available
    const enhancedText = passage?.choices && passage.choices.length > 0 
      ? `${text} What do you choose?`
      : text;

    try {
      setSpeaking(true);
      await speakViaCloud(enhancedText, audioRef, () => {
        // Auto-start voice listening after TTS completes
        if (passage?.choices && passage.choices.length > 0) {
          console.log('TTS finished - starting voice listening for 10 seconds');
          startVoiceListening(10000); // 10 second timeout
        }
      });
      setSpeaking(false);
    } catch (e: any) {
      audioRef.current = null; // Clear ref on error
      setSpeaking(false);
      // Show a more user-friendly error message
      if (e?.message?.includes("API key not configured")) {
        alert("TTS is not configured. Please set up your OpenAI API key to enable voice narration.");
      } else if (e?.message?.includes("Incorrect API key")) {
        alert("TTS API key is invalid or expired. Please update your OpenAI API key to enable voice narration.");
      } else {
        alert(`TTS Error: ${e?.message || "Could not play voice narration."}`);
      }
    }
  }, [passage?.choices, startVoiceListening]);

  // Load story from Google Sheets
  useEffect(() => {
    const loadStory = async () => {
      try {
        const storyData = await loadStoryFromSheet();
        setStory(storyData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load story:', error);
        setLoading(false);
      }
    };
    loadStory();
  }, []);

  // No auto-read - user controls when to play

  // --- Save/Load ---
  const saveGame = useCallback(async (id: string, s: GameStats) => {
    try { 
      localStorage.setItem(SAVE_KEY, JSON.stringify({ id, s })); 
    } catch {}
  }, []);

  const loadGame = useCallback(async () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const { id, s }: SaveData = JSON.parse(raw);
        if (id && s) { 
          setCurrentId(id); 
          setStats(s); 
        }
      }
    } catch {}
  }, []);

  useEffect(() => { 
    loadGame(); 
  }, [loadGame]);
  
  useEffect(() => { 
    saveGame(currentId, stats); 
  }, [currentId, stats, saveGame]);

  // --- Dice / checks ---
  const rolledForPassageRef = useRef<string | null>(null);
  const roll2d6 = () => Math.floor(Math.random()*6+1) + Math.floor(Math.random()*6+1);

  useEffect(() => {
    if (!passage || !passage.check) { 
      rolledForPassageRef.current = null; 
      setPendingDiceRoll(null);
      return; 
    }
    if (rolledForPassageRef.current === passage.id) return;

    rolledForPassageRef.current = passage.id;
    const { stat, dc, success, fail } = passage.check;
    const roll = roll2d6();
    const total = roll + (stats[stat] || 0);
    const ok = total >= dc;

    // Apply stat penalty for failed rolls
    if (!ok) {
      setStats(prev => ({ 
        ...prev, 
        [stat]: Math.max(0, prev[stat] - 2) 
      }));
    }

    // Set pending dice roll state instead of showing popup
    setPendingDiceRoll({
      stat,
      roll,
      total,
      success: ok,
      successPassage: success,
      failurePassage: fail
    });
  }, [currentId, stats]);

  const goTo = useCallback((id: string) => {
    console.log('🚀 goTo called with ID:', id);
    stopSpeak();
    stopVoiceListening(); // Stop voice listening when navigating
    setCurrentId(id);
    console.log('✅ Navigation completed to:', id);
  }, [stopSpeak, stopVoiceListening]);

  const handleDiceRollContinue = useCallback(() => {
    if (!pendingDiceRoll) return;
    
    const targetPassage = pendingDiceRoll.success ? pendingDiceRoll.successPassage : pendingDiceRoll.failurePassage;
    setPendingDiceRoll(null);
    goTo(targetPassage);
  }, [pendingDiceRoll, goTo]);

  // --- Cloud TTS throttle (avoid spamming server) ---
  const ttsCooldownRef = useRef(0);
  const COOL_DOWN_MS = 2500;

  const speakCloudThrottled = useCallback(async () => {
    if (!passage?.text) return;
    const now = Date.now();
    if (now - ttsCooldownRef.current < COOL_DOWN_MS) {
      return alert("Wait a moment - you can play again in a moment.");
    }
    ttsCooldownRef.current = now;

    // Stop any existing voice listening
    stopVoiceListening();
    
    // Use enhanced TTS with voice listening
    await speakWithVoiceListening(passage.text);
  }, [passage?.text, speakWithVoiceListening, stopVoiceListening]);

  // --- Speech Recognition ---
  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition not supported in this browser");
      return;
    }

    if (!listening) {
      // Clean up existing recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      return;
    }

    // Create new recognition instance
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim results to see what it's hearing
    recognition.lang = 'da-DK'; // Danish language

    recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      const transcript = latestResult[0].transcript.toLowerCase().trim();
      const isFinal = latestResult.isFinal;
      
      // Always update the display with what we're hearing
      setLastTranscript(transcript);
      
      console.log('🎤 Voice command received:', transcript, isFinal ? '(FINAL)' : '(INTERIM)');
      console.log('🎤 Current passage:', passage?.id);
      console.log('🎤 Available choices:', passage?.choices?.length || 0);

      // Only process final results for navigation
      if (!isFinal) {
        return; // Wait for final result
      }

      // Parse voice commands
      if (!passage?.choices || passage.choices.length === 0) {
        console.log('❌ No choices available for voice command');
        return; // No choices available
      }

      console.log('✅ Choices available:', passage.choices.map(c => c.label));

      // Check for directional commands (Danish + English)
      if ((transcript.includes('left') || transcript.includes('lift') || transcript.includes('first') || 
           transcript.includes('venstre') || transcript.includes('ven') || transcript.includes('første')) && passage.choices[0]) {
        console.log('🎯 Matched "left/venstre" - going to:', passage.choices[0].goto);
        showVoiceNotification(`🎤 "${transcript}" → ${passage.choices[0].label}`, 'success');
        goTo(passage.choices[0].goto);
        return;
      }
      if ((transcript.includes('right') || transcript.includes('write') || transcript.includes('second') || 
           transcript.includes('højre') || transcript.includes('hø') || transcript.includes('anden')) && passage.choices[1]) {
        console.log('🎯 Matched "right/højre" - going to:', passage.choices[1].goto);
        showVoiceNotification(`🎤 "${transcript}" → ${passage.choices[1].label}`, 'success');
        goTo(passage.choices[1].goto);
        return;
      }
      if ((transcript.includes('forward') || transcript.includes('ahead') || transcript.includes('go') || 
           transcript.includes('frem') || transcript.includes('fremad') || transcript.includes('gå')) && passage.choices[0]) {
        console.log('🎯 Matched "forward/frem" - going to:', passage.choices[0].goto);
        showVoiceNotification(`🎤 "${transcript}" → ${passage.choices[0].label}`, 'success');
        goTo(passage.choices[0].goto);
        return;
      }

      // Check for choice numbers (1, 2, 3, etc.) and Danish number words
      const choiceMatch = transcript.match(/(\d+)/);
      if (choiceMatch) {
        const choiceIndex = parseInt(choiceMatch[1]) - 1;
        console.log('🎯 Matched number:', choiceMatch[1], '-> index:', choiceIndex);
        if (choiceIndex >= 0 && choiceIndex < passage.choices.length) {
          console.log('🎯 Going to choice:', choiceIndex, '->', passage.choices[choiceIndex].goto);
          showVoiceNotification(`🎤 "${choiceMatch[1]}" → Choice ${choiceIndex + 1}`, 'success');
          goTo(passage.choices[choiceIndex].goto);
          return;
        } else {
          console.log('❌ Choice index out of range:', choiceIndex, 'max:', passage.choices.length - 1);
          showVoiceNotification(`❌ Choice ${choiceIndex + 1} not available (max: ${passage.choices.length})`, 'error');
        }
      }

      // Check for Danish number words
      const danishNumbers: { [key: string]: number } = {
        'en': 1, 'et': 1, 'første': 1, 'først': 1,
        'to': 2, 'anden': 2, 'andet': 2,
        'tre': 3, 'tredje': 3,
        'fire': 4, 'fjerde': 4,
        'fem': 5, 'femte': 5,
        'seks': 6, 'sjette': 6,
        'syv': 7, 'syvende': 7,
        'otte': 8, 'ottende': 8,
        'ni': 9, 'niende': 9,
        'ti': 10, 'tiende': 10
      };

      for (const [word, number] of Object.entries(danishNumbers)) {
        if (transcript.includes(word)) {
          const choiceIndex = number - 1;
          console.log('🎯 Matched Danish number word:', word, '->', number, '-> index:', choiceIndex);
          if (choiceIndex >= 0 && choiceIndex < passage.choices.length) {
            console.log('🎯 Going to choice:', choiceIndex, '->', passage.choices[choiceIndex].goto);
            showVoiceNotification(`🎤 "${word}" → Choice ${number}`, 'success');
            goTo(passage.choices[choiceIndex].goto);
            return;
          } else {
            console.log('❌ Danish number word out of range:', word, '->', number, 'max:', passage.choices.length);
            showVoiceNotification(`❌ Choice ${number} not available (max: ${passage.choices.length})`, 'error');
          }
        }
      }

      // Check for choice keywords and button text matching
      passage.choices.forEach((choice, index) => {
        const choiceText = choice.label.toLowerCase();
        
        // 1. Check if transcript contains the full button text (fuzzy match)
        if (transcript.includes(choiceText) || choiceText.includes(transcript)) {
          console.log('🎯 Matched full button text - going to:', choice.goto);
          showVoiceNotification(`🎤 "${transcript}" → ${choice.label}`, 'success');
          goTo(choice.goto);
          return;
        }
        
        // 2. Extract key words from button text and check for matches
        const keyWords = choiceText
          .split(' ')
          .filter(word => word.length > 2) // Only words longer than 2 characters
          .filter(word => !['the', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with', 'by'].includes(word)); // Remove common words
        
        const hasKeywordMatch = keyWords.some(keyword => 
          transcript.includes(keyword) || keyword.includes(transcript)
        );
        
        if (hasKeywordMatch) {
          console.log('🎯 Matched keyword from button text - going to:', choice.goto);
          console.log('🎯 Keywords found:', keyWords);
          showVoiceNotification(`🎤 "${transcript}" → ${choice.label}`, 'success');
          goTo(choice.goto);
          return;
        }
        
        // 3. Check for predefined match keywords if available
        if (choice.match && choice.match.some(keyword => 
          transcript.includes(keyword.toLowerCase())
        )) {
          console.log('🎯 Matched predefined keyword - going to:', choice.goto);
          showVoiceNotification(`🎤 "${transcript}" → ${choice.label}`, 'success');
          goTo(choice.goto);
          return;
        }
      });

      // No match found - show feedback
      console.log('❌ No matching voice command found for:', transcript);
      console.log('❌ Available button text:', passage.choices.map(c => c.label));
      console.log('❌ Try saying part of any button text or use: left, right, 1, 2, etc.');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setSpeechError(`Speech recognition error: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      if (listening) {
        // Restart recognition if we're still supposed to be listening
        setTimeout(() => {
          if (listening && speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart speech recognition:', e);
            }
          }
        }, 100);
      }
    };

    // Start recognition
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setSpeechError('Failed to start speech recognition');
      setListening(false);
    }

    // Cleanup function
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, [listening, passage?.choices, goTo]);

  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setCurrentId(START_ID);
    setStats({ Evner: 10, Udholdenhed: 18, Held: 10 });
  }, []);

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-dungeon-text">Loading story from Google Sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dungeon-bg text-white">
      {/* Voice Notification */}
      {voiceNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
          voiceNotification.type === 'success' 
            ? 'bg-green-800 border-2 border-green-600' 
            : voiceNotification.type === 'error'
            ? 'bg-red-800 border-2 border-red-600'
            : 'bg-blue-800 border-2 border-blue-600'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="text-lg">
              {voiceNotification.type === 'success' ? '✅' : voiceNotification.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div className="text-sm font-medium text-white">
              {voiceNotification.message}
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-dungeon-border p-4">
        <h1 className="text-xl font-bold text-white">Sword & Sorcery (MVP)</h1>
        <p className="text-dungeon-text mt-1.5">
          Evner {stats.Evner}  •  HP {stats.Udholdenhed}  •  Held {stats.Held}
        </p>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-4">
          <p className="text-lg leading-relaxed text-white">
            {passage?.text || "Story not found. Please check your Google Sheets data."}
          </p>
        </div>

        {/* Dice Roll Panel */}
        {pendingDiceRoll && (
          <div className="mb-6 p-4 bg-dungeon-surface border-2 border-dungeon-accent rounded-lg">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-dungeon-accent mb-2">🎲 Dice Roll Result</h3>
              <div className="text-white space-y-1">
                <p className="text-lg">
                  <span className="font-semibold">{pendingDiceRoll.stat}:</span> {stats[pendingDiceRoll.stat]}
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Roll:</span> {pendingDiceRoll.roll}
                </p>
                <p className="text-lg">
                  <span className="font-semibold">Total:</span> {pendingDiceRoll.total}
                </p>
                <p className={`text-xl font-bold ${pendingDiceRoll.success ? 'text-green-400' : 'text-red-400'}`}>
                  {pendingDiceRoll.success ? '✅ Success!' : '❌ Failure!'}
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleDiceRollContinue}
                className={`px-8 py-3 text-white font-semibold rounded-lg transition-colors ${
                  pendingDiceRoll.success 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingDiceRoll.success ? '✅ Continue (Success)' : '❌ Continue (Failure)'}
              </button>
            </div>
          </div>
        )}

        {(!passage?.check && passage?.choices) && (
          <div className="space-y-3">
            {passage.choices.map((choice, i) => (
              <button
                key={i}
                className="w-full bg-dungeon-surface p-3.5 rounded-lg border border-dungeon-accent text-center text-white hover:bg-dungeon-accent transition-colors"
                onClick={() => goTo(choice.goto)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-dungeon-border p-3 space-y-3">
        {/* TTS Controls */}
        <div className="flex gap-2.5">
          <button 
            className={`flex-1 bg-green-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-green-700 transition-colors ${
              speaking ? 'bg-green-700' : ''
            }`}
            onClick={speakCloudThrottled}
            disabled={speaking}
          >
            {speaking ? "🎙️ Playing..." : "🎙️ Read Story"}
          </button>

          <button 
            className="flex-1 bg-red-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-red-700 transition-colors disabled:bg-gray-600"
            onClick={stopSpeak}
            disabled={!speaking}
          >
            ⏹️ Stop
          </button>
        </div>

        {/* Voice Commands */}
        <div className="space-y-2">
          <div className="flex gap-2.5">
            <button 
              className={`flex-1 p-3 rounded-lg text-center font-semibold text-white transition-colors ${
                listening 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              onClick={() => listening ? stopVoiceListening() : startVoiceListening(10000)}
            >
              {listening ? "🎤 Listening..." : "🎤 Voice Commands"}
            </button>
            
            {speechError && (
              <div className="flex-1 bg-red-800 p-3 rounded-lg text-center text-sm">
                {speechError}
              </div>
            )}
          </div>
          
          {/* Speech Recognition Display */}
          {listening && (
            <div className="bg-blue-900 p-3 rounded-lg text-center">
              <div className="text-sm text-blue-200 mb-1">🎤 Lytter efter stemmekommandoer...</div>
              <div className="text-lg font-mono text-white">
                {lastTranscript || "Sig en del af knapteksten..."}
              </div>
              <div className="text-xs text-blue-300 mt-1">
                Tilgængelige kommandoer:
              </div>
              <div className="text-xs text-blue-200 mt-1 space-y-1">
                <div className="text-left mb-2">
                  <span className="text-blue-400">•</span> <strong>Retninger:</strong> venstre, højre, frem, gå
                </div>
                <div className="text-left mb-2">
                  <span className="text-blue-400">•</span> <strong>Tal:</strong> 1, 2, 3... eller en, to, tre, første, anden...
                </div>
                {passage?.choices?.map((choice, index) => (
                  <div key={index} className="text-left">
                    <span className="text-blue-400">•</span> "{choice.label}" 
                    <span className="text-blue-500 ml-1">(eller sig: {choice.label.toLowerCase().split(' ').filter(w => w.length > 2).slice(0, 2).join(', ')})</span>
                  </div>
                )) || <div>Ingen valg tilgængelige</div>}
              </div>
            </div>
          )}
        </div>

        {/* Game Controls */}
        <div className="flex gap-2.5">
          <button
            className="flex-1 bg-dungeon-accent p-3 rounded-lg text-center font-semibold text-white hover:bg-dungeon-accent-active transition-colors"
            onClick={resetGame}
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
