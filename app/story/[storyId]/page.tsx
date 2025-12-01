'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameStats, StoryNode, SaveData } from '../../../types/game';
import { getUserEmail } from '@/lib/purchaseVerification';
// import { loadStoryById } from '../../../lib/supabaseStoryManager';

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

function formatChoicesForNarration(choices?: StoryNode['choices'] | null): string {
  if (!choices || choices.length === 0) return '';
  const choicesText = choices
    .map((choice, index) => `Valg ${index + 1}: ${choice.label}.`)
    .join(' ');
  return `Valgmuligheder: ${choicesText} Hvad vælger du?`;
}


// Cloud TTS for web — OpenAI only
async function speakViaCloud(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>, onComplete?: () => void, preGeneratedAudioUrl?: string, abortControllerRef?: React.MutableRefObject<AbortController | null>, nodeKey?: string, storyId?: string): Promise<void> {
  if (!text || !text.trim()) return;

  // Stop any existing audio first
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }

  // If we have pre-generated audio URL, use it directly
  if (preGeneratedAudioUrl && preGeneratedAudioUrl.includes('cloudinary.com')) {
      const audio = new Audio(preGeneratedAudioUrl);
    // Mobile-specific: configure audio for iOS Safari
    audio.preload = 'auto';
    audio.volume = 1.0; // Ensure volume is set
    audioRef.current = audio;
    
    console.log('🎵 Mobile: Loading pre-generated audio from Cloudinary');
    
    try {
      // For mobile: ensure audio is loaded before playing
      // Check if audio is already loaded
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        console.log('🎵 Mobile: Audio already loaded, readyState:', audio.readyState);
      } else {
        console.log('🎵 Mobile: Waiting for audio to load, current readyState:', audio.readyState);
        // Wait for audio to load (with timeout for mobile networks)
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            // Check if audio was stopped
            if (audioRef.current !== audio) {
              reject(new Error('Audio stopped by user'));
              return;
            }
            // If audio has some data, proceed anyway (mobile networks can be slow)
            if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
              console.log('🎵 Mobile: Audio loading timeout but has data, readyState:', audio.readyState);
              resolve();
            } else {
              console.error('🎵 Mobile: Audio loading timeout, readyState:', audio.readyState);
              reject(new Error('Audio loading timeout - network may be slow'));
            }
          }, 10000); // 10 second timeout for mobile networks
          
          // Check if audio was stopped (audioRef.current is null or different)
          const checkStopped = () => {
            if (audioRef.current !== audio) {
              clearTimeout(timeout);
              reject(new Error('Audio stopped by user'));
            }
          };
          
          audio.oncanplaythrough = () => {
            checkStopped();
            if (audioRef.current !== audio) return;
            console.log('🎵 Mobile: Audio can play through');
            clearTimeout(timeout);
            resolve();
          };
          audio.oncanplay = () => {
            checkStopped();
            if (audioRef.current !== audio) return;
            // For mobile, canplay is often enough
            if (audio.readyState >= 2) {
              console.log('🎵 Mobile: Audio can play, readyState:', audio.readyState);
              clearTimeout(timeout);
              resolve();
            }
          };
          audio.onerror = (e) => {
            console.error('🎵 Mobile: Audio loading error:', e);
            clearTimeout(timeout);
            reject(new Error('Failed to load audio'));
          };
          audio.load(); // Explicitly load the audio
        });
      }
      
      // Check if audio was stopped before playing
      if (audioRef.current !== audio) {
        return; // Audio was stopped, exit silently
      }
      
      console.log('🎵 Mobile: Attempting to play audio, readyState:', audio.readyState);
      await audio.play();
      console.log('🎵 Mobile: Audio playback started successfully');
      return new Promise<void>((resolve) => {
        // Check if audio was stopped
        if (audioRef.current !== audio) {
          resolve();
          return;
        }
        
        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          onComplete?.();
          resolve();
        };
        audio.onerror = (e) => {
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          onComplete?.();
          resolve();
        };
      });
    } catch (playError: any) {
      audioRef.current = null;
      // Handle autoplay policy errors - but button clicks should not trigger this
      if (playError.name === 'NotAllowedError' || playError.message.includes('autoplay')) {
        // For button clicks, we should still try to play - user interaction should allow it
        // Fall through to generate TTS as fallback
      }
      // Fall through to generate TTS if pre-generated audio fails
    }
  }

  const key = `elevenlabs-${hashText(text)}`;
  if (audioCache.has(key)) {
    const cached = audioCache.get(key);
    if (cached) {
      const audio = new Audio(cached);
      // Mobile-specific: configure audio for iOS Safari
      audio.preload = 'auto';
      audio.volume = 1.0;
      
      // Store the audio element in the ref
      audioRef.current = audio;
      
      try { 
        await audio.play();
        // Wait for audio to finish playing - ONLY set handlers here to avoid duplicates
        return new Promise<void>((resolve) => {
          audio.onended = () => {
            audioRef.current = null;
            onComplete?.();
            resolve();
          };
          audio.onerror = () => {
            audioRef.current = null;
            onComplete?.();
            resolve();
          };
        });
      } catch (playError: any) {
        audioRef.current = null;
        try { 
          URL.revokeObjectURL(cached); 
        } catch {}
        audioCache.delete(key);
        
        // Handle autoplay policy errors
        if (playError.name === 'NotAllowedError' || playError.message.includes('autoplay')) {
          console.log('⚠️ Autoplay blocked (non-critical):', playError);
          return; // Don't throw, just return silently
        }
        console.log('⚠️ Failed to play cached audio (non-critical):', playError);
        return; // Don't throw, just return silently
      }
    }
  }

  // Add timeout for mobile networks (30 seconds)
  const controller = new AbortController();
  if (abortControllerRef) {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = controller;
  }
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  let res: Response;
  try {
    res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider: 'elevenlabs', nodeKey, storyId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      // Clear the abort controller ref if it was aborted
      if (abortControllerRef && abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      // Don't throw error if aborted - user intentionally stopped
      return;
    }
    throw fetchError;
  }
  
  // Clear the abort controller ref after successful fetch
  if (abortControllerRef && abortControllerRef.current === controller) {
    abortControllerRef.current = null;
  }

  if (!res.ok) {
    let msg = "";
    let errorDetails: any = null;
    try {
      // Try to parse as JSON first (API returns JSON errors)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorDetails = await res.json();
        msg = errorDetails.error || errorDetails.message || JSON.stringify(errorDetails);
      } else {
        msg = await res.text();
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      msg = `HTTP ${res.status} ${res.statusText}`;
    }
    
    console.error('TTS API Error:', {
      status: res.status,
      statusText: res.statusText,
      message: msg,
      details: errorDetails
    });
    
    const e = new Error(`TTS failed (${res.status})${msg ? `: ${msg.slice(0,300)}` : ""}`);
    (e as any).status = res.status;
    (e as any).details = errorDetails;
    throw e;
  }

  // Get the blob from response (Content-Type is preserved automatically)
  const blob = await res.blob();
  
  // Verify blob has content
  if (blob.size === 0) {
    throw new Error('TTS Error: Received empty audio response');
  }
  
  // Create object URL for the blob
  const url = URL.createObjectURL(blob);
  audioCache.set(key, url);

  const audio = new Audio(url);
  // Mobile-specific: configure audio for iOS Safari
  audio.preload = 'auto';
  audio.volume = 1.0;
  
  // Store the audio element in the ref
  audioRef.current = audio;
  
  // Wait for audio to be ready before playing
  return new Promise<void>((resolve, reject) => {
    // Handle audio loading errors
    audio.onerror = (e) => {
      console.error('Audio loading error:', e, audio.error);
      const errorMsg = audio.error?.message || 'Failed to load audio';
      audioRef.current = null;
      URL.revokeObjectURL(url);
      audioCache.delete(key);
      reject(new Error(`TTS Error: ${errorMsg}`));
    };
    
    // Wait for audio to be ready
    const handleCanPlay = async () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      
      try {
        await audio.play();
        
        // Set up completion handlers
        audio.onended = () => {
          audioRef.current = null;
          URL.revokeObjectURL(url);
          onComplete?.();
          resolve();
        };
        
        // Handle play errors
        audio.onerror = (e) => {
          console.error('Audio play error:', e, audio.error);
          audioRef.current = null;
          URL.revokeObjectURL(url);
          audioCache.delete(key);
          const errorMsg = audio.error?.message || 'Failed to play audio';
          reject(new Error(`TTS Error: ${errorMsg}`));
        };
      } catch (playError: any) {
        audioRef.current = null;
        URL.revokeObjectURL(url);
        audioCache.delete(key);
        
        // Handle autoplay policy errors
        if (playError.name === 'NotAllowedError' || playError.message.includes('autoplay')) {
          const e = new Error("Autoplay blokeret – klik på knappen og prøv igen.");
          (e as any).code = "AUTOPLAY";
          reject(e);
          return;
        }
        reject(playError);
      }
    };
    
    // Listen for when audio is ready to play
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // Fallback: if audio doesn't load within 10 seconds, reject
    setTimeout(() => {
      if (audio.readyState < 2) { // HAVE_CURRENT_DATA
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('canplaythrough', handleCanPlay);
        audioRef.current = null;
        URL.revokeObjectURL(url);
        audioCache.delete(key);
        reject(new Error('TTS Error: Audio failed to load within timeout'));
      }
    }, 10000);
  });
}

export default function Game({ params }: { params: Promise<{ storyId: string }> }) {
  const [storyId, setStoryId] = useState<string>('');
  const [currentId, setCurrentId] = useState(START_ID);
  const [stats, setStats] = useState<GameStats>({ Evner: 10, Udholdenhed: 18, Held: 10 });
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [story, setStory] = useState<Record<string, StoryNode>>({});
  const [loading, setLoading] = useState(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<{ title?: string; description?: string; cover_image_url?: string } | null>(null);
  
  // Audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTTSRunningRef = useRef<boolean>(false);
  const lastTTSFinishTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAutoReadSceneIdRef = useRef<string | null>(null);
  const autoPlayActionInFlightRef = useRef<boolean>(false);
  const skipAutoReadCooldownRef = useRef<boolean>(false);
  
  // Dice roll state
  const [pendingDiceRoll, setPendingDiceRoll] = useState<{
    stat: keyof GameStats;
    roll: number;
    total: number;
    success: boolean;
    successPassage: string;
    failurePassage: string;
  } | null>(null);
  
  // Dice roll UI state
  const [showDiceRollButton, setShowDiceRollButton] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  
  // Voice command state
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [voiceNotification, setVoiceNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningSessionRef = useRef<number>(0);
  const voiceMatchedRef = useRef<boolean>(false);
  const [showControls, setShowControls] = useState(false);
  
  const router = useRouter();
  const passage = story[currentId];

  const autoReadBlockingReason = useMemo(() => {
    if (!autoRead) return null;
    if (pendingDiceRoll) return 'Afventer terningkast';
    if (listening) return 'Lytter efter stemmekommandoer';
    if (speaking) return 'Oplæsning i gang';
    return null;
  }, [autoRead, pendingDiceRoll, listening, speaking]);

  const autoReadStatusLabel = useMemo(() => {
    if (!autoRead) return 'Auto-læs: Fra';
    if (autoReadBlockingReason) {
      return `Auto-læs pauser – ${autoReadBlockingReason.toLowerCase()}`;
    }
    return 'Auto-læs: Aktiv';
  }, [autoRead, autoReadBlockingReason]);

  const autoPlayBlockingReason = useMemo(() => {
    if (!autoPlay) return null;
    if (!autoRead) return 'Auto-læs slået fra';
    if (pendingDiceRoll) return 'Afventer terningresultat';
    if (showDiceRollButton && passage?.check) return 'Afventer terningkast';
    if (speaking) return 'Oplæsning i gang';
    if (listening) return 'Stemme-lytning aktiv';
    if (!passage?.choices?.length) return 'Ingen valg i denne scene';
    return null;
  }, [autoPlay, autoRead, pendingDiceRoll, showDiceRollButton, passage?.check, passage?.choices?.length, speaking, listening]);

  const autoPlayStatusLabel = useMemo(() => {
    if (!autoPlay) return 'Auto-play: Fra';
    if (autoPlayBlockingReason) {
      return `Auto-play pauser – ${autoPlayBlockingReason.toLowerCase()}`;
    }
    return 'Auto-play: Aktiv';
  }, [autoPlay, autoPlayBlockingReason]);

  // Load params
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setStoryId(resolvedParams.storyId);
    };
    loadParams();
  }, [params]);

  // --- TTS Controls ---
  const stopSpeak = useCallback(() => {
    try {
      // Abort any in-flight fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // Note: We don't revoke the ObjectURL here as it might be cached for replays
      }
      audioRef.current = null;
      setSpeaking(false);
      isTTSRunningRef.current = false; // Reset the TTS running flag
    } catch (error) {
      console.log('⚠️ Error stopping audio (non-critical):', error);
      // Reset state even if audio cleanup fails
      audioRef.current = null;
      setSpeaking(false);
      isTTSRunningRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  // --- Voice Recognition Helpers ---
  // Voice notification helper
  const showVoiceNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setVoiceNotification({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setVoiceNotification(null);
    }, 3000);
  }, []);

  const startVoiceListening: (timeoutMs?: number) => void = useCallback((timeoutMs: number = 10000) => {
    // Stop any ongoing narration so auto-read doesn't keep talking while commands are used
    stopSpeak();

    // Clear any existing timeout
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
    }

    // Start listening
    setListening(true);
    setSpeechError(null);
    voiceMatchedRef.current = false;
    const mySession = ++listeningSessionRef.current;

    // Set timeout to stop listening
    voiceTimeoutRef.current = setTimeout(async () => {
      if (listeningSessionRef.current !== mySession) return;
      setListening(false);
      console.log('Voice listening timeout - stopping recognition');
      // Don't automatically re-read choices - let user manually trigger TTS if needed
    }, timeoutMs);
  }, [stopSpeak]);

  // Simple TTS - just reads the text (for autoplay/audiobook mode)
  const speakSimple: (text: string, onDone?: () => void) => Promise<void> = useCallback(async (text: string, onDone?: () => void) => {
    if (!text || !text.trim()) return;

    // Prevent multiple simultaneous TTS calls
    if (isTTSRunningRef.current) {
      return;
    }

    try {
      isTTSRunningRef.current = true;
      setSpeaking(true);
      
      // Capture passage state at TTS start to prevent stale closure issues
      const passageIdAtStart = currentId;
      const audioUrlAtStart = passage?.audio;
      
      await speakViaCloud(text, audioRef, () => {
        // Validate passage hasn't changed during TTS playback
        if (currentId !== passageIdAtStart) {
          console.warn('⚠️ Passage changed during TTS');
          setSpeaking(false);
          isTTSRunningRef.current = false;
          lastTTSFinishTimeRef.current = Date.now();
          abortControllerRef.current = null;
          onDone?.();
          return;
        }
        
        // Just complete - no button reading for simple/autoplay mode
        setSpeaking(false);
        isTTSRunningRef.current = false;
        lastTTSFinishTimeRef.current = Date.now();
        abortControllerRef.current = null;
        onDone?.();
      }, audioUrlAtStart, abortControllerRef, passageIdAtStart, storyId);
    } catch (e: any) {
      audioRef.current = null;
      setSpeaking(false);
      isTTSRunningRef.current = false;
      abortControllerRef.current = null;
      
      // Don't show error if it was aborted or stopped by user
      if (e?.message?.includes('aborted') || e?.message?.includes('stopped by user') || e?.name === 'AbortError') {
        return;
      }
      
      // Log error but don't show alert for autoplay failures
      console.error('TTS Error (autoplay):', e?.message);
    }
  }, [passage?.audio, currentId, storyId]);

  // Enhanced TTS with voice listening and button reading (for manual button clicks)
  const speakWithVoiceListening: (text: string, onDone?: () => void) => Promise<void> = useCallback(async (text: string, onDone?: () => void) => {
    if (!text || !text.trim()) return;

    // Prevent multiple simultaneous TTS calls
    if (isTTSRunningRef.current) {
      return;
    }

    try {
      isTTSRunningRef.current = true;
      setSpeaking(true);
      
      // Capture passage state at TTS start to prevent stale closure issues
      const passageIdAtStart = currentId;
      const choicesAtStart = passage?.choices ? [...passage.choices] : null;
      const audioUrlAtStart = passage?.audio;
      
      await speakViaCloud(text, audioRef, async () => {
        // Validate passage hasn't changed during TTS playback
        if (currentId !== passageIdAtStart) {
          console.warn('⚠️ Passage changed during TTS, skipping button reading');
          setSpeaking(false);
          isTTSRunningRef.current = false;
          lastTTSFinishTimeRef.current = Date.now();
          abortControllerRef.current = null;
          onDone?.();
          return;
        }
        
        // After main text finishes, read buttons separately if they exist (only for manual button clicks)
        if (choicesAtStart && choicesAtStart.length > 0) {
          const buttonsText = formatChoicesForNarration(choicesAtStart);
          
          // Read buttons separately after main text
          try {
            await speakViaCloud(buttonsText, audioRef, () => {
              // Validate passage still hasn't changed during button TTS
              if (currentId !== passageIdAtStart) {
                console.warn('⚠️ Passage changed during button TTS');
                setSpeaking(false);
                isTTSRunningRef.current = false;
                lastTTSFinishTimeRef.current = Date.now();
                abortControllerRef.current = null;
                onDone?.();
                return;
              }
              
              // Auto-start voice listening after buttons are read
              startVoiceListening(10000);
              // Set speaking to false only after buttons TTS actually completes
              setSpeaking(false);
              isTTSRunningRef.current = false;
              lastTTSFinishTimeRef.current = Date.now();
              // Clear abort controller when TTS completes
              abortControllerRef.current = null;
              onDone?.();
            }, undefined, abortControllerRef, passageIdAtStart, storyId);
          } catch (buttonError) {
            // If button reading fails, still start voice listening and complete
            console.error('Failed to read buttons:', buttonError);
            startVoiceListening(10000);
            setSpeaking(false);
            isTTSRunningRef.current = false;
            lastTTSFinishTimeRef.current = Date.now();
            abortControllerRef.current = null;
            onDone?.();
          }
        } else {
          // No choices, just complete normally
          setSpeaking(false);
          isTTSRunningRef.current = false;
          lastTTSFinishTimeRef.current = Date.now();
          abortControllerRef.current = null;
          onDone?.();
        }
      }, audioUrlAtStart, abortControllerRef, passageIdAtStart, storyId); // Pass pre-generated audio URL, abort controller ref, nodeKey, and storyId
      // Don't set speaking to false here - let the callback handle it
    } catch (e: any) {
      audioRef.current = null; // Clear ref on error
      setSpeaking(false);
      isTTSRunningRef.current = false;
      abortControllerRef.current = null; // Clear abort controller on error
      
      // Don't show error if it was aborted or stopped by user
      if (e?.message?.includes('aborted') || e?.message?.includes('stopped by user') || e?.name === 'AbortError') {
        return;
      }
      
      // Log full error details for debugging
      console.error('TTS Error Details:', {
        message: e?.message,
        status: e?.status,
        details: e?.details,
        stack: e?.stack
      });
      
      // Show a more user-friendly error message
      if (e?.message?.includes("API key not configured") || e?.message?.includes("ELEVENLABS_API_KEY")) {
        alert("TTS er ikke konfigureret. Indstil venligst din ElevenLabs API-nøgle for at aktivere stemme-fortælling.");
      } else if (e?.message?.includes("Incorrect API key") || e?.message?.includes("invalid") || e?.message?.includes("unauthorized")) {
        alert("TTS API-nøgle er ugyldig eller udløbet. Opdater venligst din ElevenLabs API-nøgle for at aktivere stemme-fortælling.");
      } else if (e?.code === "AUTOPLAY") {
        // Mobile browsers sometimes block autoplay even with user interaction
        alert("Lydafspilning blev blokeret. Prøv venligst at klikke på afspil-knappen igen.");
      } else if (e?.message?.includes("timeout") || e?.message?.includes("network")) {
        // Mobile network issues
        alert("Netværksfejl. Tjek venligst din forbindelse og prøv igen.");
      } else if (e?.status === 500) {
        // Server error - show more details if available
        const errorMsg = e?.details?.error || e?.message || "Serverfejl opstod";
        alert(`TTS Serverfejl: ${errorMsg}\n\nTjek venligst konsollen for flere detaljer.`);
      } else {
        alert(`TTS Fejl: ${e?.message || "Kunne ikke afspille stemme-fortælling. Prøv venligst igen."}`);
      }
    }
  }, [passage?.choices, passage?.audio, startVoiceListening, speaking, currentId, storyId]);

  const stopVoiceListening = useCallback(() => {
    setListening(false);
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    // Also stop the speech recognition immediately
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        console.log('Speech recognition already stopped');
      }
      speechRecognitionRef.current = null;
    }
  }, []);

  // Load story by ID
  useEffect(() => {
    if (!storyId) {
      console.log('⚠️ StoryId not ready yet:', storyId);
      return;
    }
    
    const loadStory = async () => {
      try {
        console.log('🚀 Loading story with ID:', storyId);
        // Stop any existing audio when loading new story
        stopSpeak();
        stopVoiceListening();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }
        setSpeaking(false);
        isTTSRunningRef.current = false;
        
        // Load story metadata
        console.log('📡 Fetching story metadata from:', `/api/stories/${storyId}`);
        const userEmail = getUserEmail();
        const headers: HeadersInit = {};
        if (userEmail) {
          headers['user-email'] = userEmail;
        }
        const storyResponse = await fetch(`/api/stories/${storyId}`, {
          headers
        });
        
        if (!storyResponse.ok) {
          let errorMessage = 'Story not found';
          try {
            const errorData = await storyResponse.json();
            // Use the message if available, otherwise use error
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
            // Handle purchase required case
            if (errorData.requiresPurchase) {
              console.log('💰 Story requires purchase, redirecting...');
              router.push(`/purchase/${errorData.storyId || storyId}`);
              return;
            }
          } catch (e) {
            // If we can't parse the error, use status-based message
            if (storyResponse.status === 404) {
              errorMessage = 'Historie ikke fundet. Den eksisterer muligvis ikke eller er endnu ikke offentliggjort.';
            } else if (storyResponse.status === 403) {
              errorMessage = 'Adgang nægtet. Denne historie kræver muligvis et køb.';
            } else if (storyResponse.status === 500) {
              errorMessage = 'Serverfejl. Prøv venligst igen senere.';
            } else {
              errorMessage = `Kunne ikke indlæse historie (${storyResponse.status})`;
            }
          }
          throw new Error(errorMessage);
        }
        
        const storyData = await storyResponse.json();
        console.log('✅ Story metadata loaded:', storyData);
        
        // Store story metadata for SEO and display
        setStoryMetadata({
          title: storyData.title,
          description: storyData.description,
          cover_image_url: storyData.cover_image_url
        });
        
        // Update document title for SEO
        if (storyData.title) {
          document.title = `${storyData.title} - Storific Stories`;
        }
        
        // Load first node
        console.log('📡 Fetching story node from:', `/api/stories/${storyId}/nodes/1`);
        const nodeResponse = await fetch(`/api/stories/${storyId}/nodes/1`, {
          headers: userEmail ? { 'user-email': userEmail } : {}
        });
        
        if (!nodeResponse.ok) {
          let errorMessage = 'Story content not found';
          try {
            const errorData = await nodeResponse.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            if (nodeResponse.status === 404) {
              errorMessage = 'Historie-node ikke fundet. Historien mangler muligvis indhold.';
            } else {
              errorMessage = `Kunne ikke indlæse historieindhold (${nodeResponse.status})`;
            }
          }
          throw new Error(errorMessage);
        }
        
        const nodeData = await nodeResponse.json();
        console.log('✅ Story node loaded:', nodeData);
        console.log('🎬 Node media data:', {
          node_key: nodeData.node_key,
          has_video_url: !!nodeData.video_url,
          video_url: nodeData.video_url,
          has_image_url: !!nodeData.image_url,
          image_url: nodeData.image_url
        });
        
        // Convert to the format expected by the component
        const story = {
          [nodeData.node_key]: {
            id: nodeData.node_key,
            text: nodeData.text_md,
            choices: (nodeData.choices || []).map((choice: any) => ({
              label: choice.label,
              goto: choice.to_node_key,
              match: choice.match
            })),
            check: nodeData.dice_check,
            image: nodeData.image_url,
            video: nodeData.video_url,
            backgroundImage: undefined,
            audio: nodeData.audio_url
          }
        };
        
        console.log('📦 Story object created:', {
          node_key: nodeData.node_key,
          has_video: !!story[nodeData.node_key].video,
          video: story[nodeData.node_key].video,
          has_image: !!story[nodeData.node_key].image,
          image: story[nodeData.node_key].image
        });
        
        setStory(story as Record<string, StoryNode>);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to load story:', error);
        const errorMessage = error?.message || String(error) || 'Ukendt fejl opstod';
        setStoryError(`Kunne ikke indlæse historie: ${errorMessage}`);
        setLoading(false);
      }
    };
    loadStory();
  }, [storyId, stopSpeak, stopVoiceListening, router]);

  // --- Save/Load ---
  const saveGame = useCallback(async (storyId: string, id: string, s: GameStats) => {
    try { 
      localStorage.setItem(SAVE_KEY, JSON.stringify({ storyId, id, s })); 
    } catch {}
  }, []);

  const loadGame = useCallback(async () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const auto = localStorage.getItem("svt_autoread_v1");
      const autoPlayStored = localStorage.getItem("svt_autoplay_v1");
      // Default to false - TTS should only play when user clicks button
      if (auto !== null) {
        setAutoRead(auto === "1");
      } else {
        setAutoRead(false); // Explicitly set to false if not in localStorage
      }
      if (autoPlayStored !== null) {
        setAutoPlay(autoPlayStored === "1");
      } else {
        setAutoPlay(false);
      }
      if (raw) {
        const { storyId: loadedStoryId, id, s }: SaveData = JSON.parse(raw);
        if (loadedStoryId === storyId && id && s) { 
          setCurrentId(id); 
          setStats(s); 
        }
      }
    } catch {}
  }, [storyId]);

  useEffect(() => { 
    loadGame(); 
  }, [loadGame]);
  
  useEffect(() => { 
    saveGame(storyId, currentId, stats); 
  }, [currentId, stats, saveGame, storyId]);

  // Persist autoRead toggle
  useEffect(() => {
    try {
      localStorage.setItem("svt_autoread_v1", autoRead ? "1" : "0");
    } catch {}
  }, [autoRead]);

  useEffect(() => {
    try {
      localStorage.setItem("svt_autoplay_v1", autoPlay ? "1" : "0");
    } catch {}
  }, [autoPlay]);

  // Auto-open controls when speaking starts
  useEffect(() => {
    if (speaking && !showControls) {
      setShowControls(true);
    }
  }, [speaking, showControls]);

  // --- Dice / checks ---
  const rolledForPassageRef = useRef<string | null>(null);
  const roll2d6 = () => Math.floor(Math.random()*6+1) + Math.floor(Math.random()*6+1);

  useEffect(() => {
    if (!passage || !passage.check) { 
      rolledForPassageRef.current = null; 
      setPendingDiceRoll(null);
      setShowDiceRollButton(false);
      return; 
    }
    if (rolledForPassageRef.current === passage.id) return;

    // Show dice roll button instead of auto-rolling
    setShowDiceRollButton(true);
    setPendingDiceRoll(null);
  }, [currentId, passage]);

  const goTo = useCallback(async (id: string) => {
    console.log('🚀 goTo called with ID:', id);
    const isSameNode = id === currentId;
    // Stop all audio and voice recognition immediately
    stopSpeak();
    stopVoiceListening();
    
    // Clear any pending TTS
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Reset TTS state
    setSpeaking(false);
    isTTSRunningRef.current = false;
    voiceMatchedRef.current = true;
    
    try {
      // Load the new node from API
      const userEmail = getUserEmail();
      const nodeResponse = await fetch(`/api/stories/${storyId}/nodes/${id}`, {
        headers: userEmail ? { 'user-email': userEmail } : {}
      });
      if (!nodeResponse.ok) {
        throw new Error('Node not found');
      }
      const nodeData = await nodeResponse.json();
      console.log('🎬 Node data for navigation:', {
        node_key: nodeData.node_key,
        has_video_url: !!nodeData.video_url,
        video_url: nodeData.video_url,
        has_image_url: !!nodeData.image_url,
        image_url: nodeData.image_url
      });
      
      // Update the story with the new node
      const newNode = {
        id: nodeData.node_key,
        text: nodeData.text_md,
        choices: (nodeData.choices || []).map((choice: any) => ({
          label: choice.label,
          goto: choice.to_node_key,
          match: choice.match
        })),
        check: nodeData.dice_check,
        image: nodeData.image_url,
        video: nodeData.video_url,
        backgroundImage: undefined,
        audio: nodeData.audio_url
      };
      
      console.log('📦 New node object:', {
        node_key: newNode.id,
        has_video: !!newNode.video,
        video: newNode.video,
        has_image: !!newNode.image,
        image: newNode.image
      });
      
      setStory(prevStory => ({
        ...prevStory,
        [nodeData.node_key]: newNode
      }));
      
      if (isSameNode) {
        lastAutoReadSceneIdRef.current = null;
      }
      setCurrentId(id);
      console.log('✅ Navigation completed to:', id);
    } catch (error) {
      console.error('Failed to load node:', error);
    } finally {
      autoPlayActionInFlightRef.current = false;
    }
  }, [stopSpeak, stopVoiceListening, storyId, currentId]);

  // Handle choice selection
  const handleChoice = useCallback((choice: any) => {
    console.log('🎯 Choice clicked:', choice);
    // Check for both goto (old format) and to_node_key (API format)
    const targetNode = choice?.goto || choice?.to_node_key;
    if (!targetNode) {
      console.error('❌ Choice missing goto/to_node_key property:', choice);
      return;
    }
    goTo(targetNode);
  }, [goTo]);

  const handleDiceRoll = useCallback(async () => {
    if (!passage?.check || diceRolling) return;
    
    setDiceRolling(true);
    rolledForPassageRef.current = passage.id;
    setShowDiceRollButton(false);
    
    const { stat, dc, success, fail } = passage.check;
    const shouldPromptVoiceAfterDice = !passage?.choices?.length;
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

    // Set pending dice roll state
    setPendingDiceRoll({
      stat,
      roll,
      total,
      success: ok,
      successPassage: success,
      failurePassage: fail
    });
    
    setDiceRolling(false);
    
    // Create TTS narration for dice roll result
    const diceResultText = `Du kaster terningerne og får ${roll}. Med din ${stat} på ${stats[stat]} bliver det i alt ${total}. ${ok ? 'Det lykkes!' : 'Det mislykkes!'} ${ok ? 'Du kan fortsætte.' : 'Du mister 2 point i ' + stat + '.'}`;
    
    // Allow the next auto-read to trigger immediately after dice narration
    skipAutoReadCooldownRef.current = true;
    
    // Speak the dice result
    const narrationFn = autoPlay ? speakSimple : speakWithVoiceListening;
    try {
      await narrationFn(diceResultText, () => {
        if (!autoPlay && shouldPromptVoiceAfterDice) {
          startVoiceListening(10000);
        }
      });
    } catch (error) {
      console.error('Failed to speak dice result:', error);
    }
  }, [autoPlay, passage, diceRolling, stats, speakSimple, speakWithVoiceListening, startVoiceListening]);

  const handleDiceRollContinue = useCallback(() => {
    if (!pendingDiceRoll) return;
    
    const targetPassage = pendingDiceRoll.success ? pendingDiceRoll.successPassage : pendingDiceRoll.failurePassage;
    setPendingDiceRoll(null);
    goTo(targetPassage);
  }, [pendingDiceRoll, goTo]);

  // --- Cloud TTS throttle (avoid spamming server) ---
  const ttsCooldownRef = useRef(0);
  const COOL_DOWN_MS = 1000; // Reduced from 2500ms to 1000ms for better UX

  // Build narration string - main text only (buttons will be read separately)
  const getNarrationText = useCallback(() => {
    if (!passage?.text) return '';
    return passage.text;
  }, [passage]);


  const speakCloudThrottled = useCallback(async () => {
    const narration = getNarrationText();
    if (!narration) return;
    
    // Prevent multiple simultaneous calls
    if (isTTSRunningRef.current) {
      return;
    }
    
    const now = Date.now();
    if (now - ttsCooldownRef.current < COOL_DOWN_MS) {
        const remainingTime = Math.ceil((COOL_DOWN_MS - (now - ttsCooldownRef.current)) / 1000);
      showVoiceNotification(`⏳ Vent venligst ${remainingTime} sekund${remainingTime > 1 ? 'er' : ''} før du afspiller igen`, 'info');
      return;
    }
    ttsCooldownRef.current = now;

    // Stop any existing voice listening immediately
    stopVoiceListening();
    
    // Use enhanced TTS with voice listening - it will handle starting voice listening automatically
    // Pass pre-generated audio URL if available
    await speakWithVoiceListening(narration);
  }, [getNarrationText, speakWithVoiceListening, stopVoiceListening, passage?.audio]);

  const runAutoPlayNarration = useCallback(async () => {
    const narration = getNarrationText();
    if (!narration) {
      return false;
    }
    try {
      stopVoiceListening();
      await speakSimple(narration);
      return true;
    } catch (error) {
      console.error('Auto-play narration failed:', error);
      return false;
    }
  }, [getNarrationText, speakSimple, stopVoiceListening]);

  const activateAutoReadIfPossible = useCallback(() => {
    lastAutoReadSceneIdRef.current = null;
    const timeSinceLastTTS = Date.now() - lastTTSFinishTimeRef.current;
    if (timeSinceLastTTS < 3000) {
      return;
    }
    if (passage?.text && !pendingDiceRoll && !speaking && !isTTSRunningRef.current && !listening) {
      if (autoPlay) {
        runAutoPlayNarration();
      } else {
        speakCloudThrottled();
      }
    }
  }, [autoPlay, passage?.text, pendingDiceRoll, speaking, listening, speakCloudThrottled, runAutoPlayNarration]);

  const handleManualSpeak = useCallback(() => {
    if (autoRead) {
      lastAutoReadSceneIdRef.current = currentId;
    }
    speakCloudThrottled();
  }, [autoRead, currentId, speakCloudThrottled]);

  // Auto-read new scenes when enabled
  useEffect(() => {
    if (!autoRead) return;
    if (!passage?.text) return;
    if (pendingDiceRoll) return; // hold during dice overlays
    if (speaking) return; // don't start TTS if already speaking
    if (isTTSRunningRef.current) return; // don't start if TTS is already running
    if (listening) return; // don't start TTS if voice listening is active
    
    // Prevent duplicate triggers - only read each scene once
    if (lastAutoReadSceneIdRef.current === currentId) {
      return;
    }
    
    // Add a delay after TTS finishes to allow voice commands to work
    const shouldSkipCooldown = skipAutoReadCooldownRef.current;
    const timeSinceLastTTS = Date.now() - lastTTSFinishTimeRef.current;
    if (!shouldSkipCooldown && timeSinceLastTTS < 3000) { // 3 second delay after TTS finishes
      return;
    }
    
    if (shouldSkipCooldown) {
      skipAutoReadCooldownRef.current = false;
    }
    
    const passageIdAtReadStart = currentId;
    lastAutoReadSceneIdRef.current = currentId;
    const shouldAutoRollAfterNarration = !!(passage?.check && showDiceRollButton);
    let cancelled = false;
    
    const runAutoRead = async () => {
      try {
        let completed = false;
        if (autoPlay) {
          completed = await runAutoPlayNarration();
        } else {
          await speakCloudThrottled();
          completed = true;
        }
        if (!completed) {
          lastAutoReadSceneIdRef.current = null;
          return;
        }
      } catch (error) {
        console.error('Auto-read TTS failed:', error);
        lastAutoReadSceneIdRef.current = null;
        return;
      }
      
      if (cancelled) {
        lastAutoReadSceneIdRef.current = null;
        return;
      }
      if (!autoRead) return;
      if (!shouldAutoRollAfterNarration) return;
      if (passageIdAtReadStart !== currentId) {
        lastAutoReadSceneIdRef.current = null;
        return; // user navigated away
      }
      
      await handleDiceRoll();
    };
    
    runAutoRead();
    
    return () => {
      cancelled = true;
    };
  }, [autoRead, autoPlay, currentId, passage, pendingDiceRoll, speaking, listening, runAutoPlayNarration, speakCloudThrottled, handleDiceRoll, showDiceRollButton]);

  useEffect(() => {
    if (!autoPlay) return;
    if (!autoRead) return;
    if (autoPlayActionInFlightRef.current) return;
    if (speaking || listening) return;
    if (pendingDiceRoll) return;
    if (showDiceRollButton && passage?.check) return;
    const choices = passage?.choices;
    if (!choices || choices.length === 0) return;
    if (lastAutoReadSceneIdRef.current !== currentId) return;

    let actionTriggered = false;
    autoPlayActionInFlightRef.current = true;
    const timeout = setTimeout(() => {
      actionTriggered = true;
      const randomChoice = choices[Math.floor(Math.random() * choices.length)];
      handleChoice(randomChoice);
    }, 800);

    return () => {
      clearTimeout(timeout);
      if (!actionTriggered) {
        autoPlayActionInFlightRef.current = false;
      }
    };
  }, [
    autoPlay,
    autoRead,
    speaking,
    listening,
    pendingDiceRoll,
    showDiceRollButton,
    passage?.check,
    passage?.choices,
    currentId,
    handleChoice
  ]);

  useEffect(() => {
    if (!autoPlay) return;
    if (!pendingDiceRoll) return;
    if (speaking || diceRolling || listening) return;
    if (autoPlayActionInFlightRef.current) return;

    let actionTriggered = false;
    autoPlayActionInFlightRef.current = true;
    const timeout = setTimeout(() => {
      actionTriggered = true;
      handleDiceRollContinue();
    }, 900);

    return () => {
      clearTimeout(timeout);
      if (!actionTriggered) {
        autoPlayActionInFlightRef.current = false;
      }
    };
  }, [autoPlay, pendingDiceRoll, speaking, diceRolling, listening, handleDiceRollContinue]);

  // --- Speech Recognition ---
  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Stemmeigenkendelse understøttes ikke i denne browser");
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

      if (pendingDiceRoll) {
        const continueKeywords = [
          'fortsæt',
          'fortsaet',
          'fortsætter',
          'continue',
          'videre',
          'næste',
          'naeste',
          'next',
          'go on',
          'gå videre',
          'ga videre'
        ];
        const buttonMatch = transcript.match(/(knap|button)\s*(1|en|et)/);
        const wantsContinue =
          continueKeywords.some(keyword => transcript.includes(keyword)) || !!buttonMatch || transcript.includes('forts');

        if (wantsContinue) {
          showVoiceNotification(`🎤 "${transcript}" → Fortsæt`, 'success');
          stopVoiceListening();
          handleDiceRollContinue();
          return;
        }
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
        stopVoiceListening(); // Stop voice listening immediately
        goTo(passage.choices[0].goto);
        return;
      }
      if ((transcript.includes('right') || transcript.includes('write') || transcript.includes('second') || 
           transcript.includes('højre') || transcript.includes('hø') || transcript.includes('anden')) && passage.choices[1]) {
        console.log('🎯 Matched "right/højre" - going to:', passage.choices[1].goto);
        showVoiceNotification(`🎤 "${transcript}" → ${passage.choices[1].label}`, 'success');
        stopVoiceListening(); // Stop voice listening immediately
        goTo(passage.choices[1].goto);
        return;
      }
      if ((transcript.includes('forward') || transcript.includes('ahead') || transcript.includes('go') || 
           transcript.includes('frem') || transcript.includes('fremad') || transcript.includes('gå')) && passage.choices[0]) {
        console.log('🎯 Matched "forward/frem" - going to:', passage.choices[0].goto);
        showVoiceNotification(`🎤 "${transcript}" → ${passage.choices[0].label}`, 'success');
        stopVoiceListening(); // Stop voice listening immediately
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
          stopVoiceListening(); // Stop voice listening immediately
          goTo(passage.choices[choiceIndex].goto);
          return;
        } else {
          console.log('❌ Choice index out of range:', choiceIndex, 'max:', passage.choices.length - 1);
          showVoiceNotification(`❌ Valg ${choiceIndex + 1} ikke tilgængeligt (maks: ${passage.choices.length})`, 'error');
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
            stopVoiceListening(); // Stop voice listening immediately
            goTo(passage.choices[choiceIndex].goto);
            return;
          } else {
            console.log('❌ Danish number word out of range:', word, '->', number, 'max:', passage.choices.length);
            showVoiceNotification(`❌ Valg ${number} ikke tilgængeligt (maks: ${passage.choices.length})`, 'error');
          }
        }
      }

      // Check for dice roll commands
      if (showDiceRollButton && (transcript.includes('roll') || transcript.includes('kast') || transcript.includes('terning') || transcript.includes('dice'))) {
        console.log('🎯 Matched dice roll command - rolling dice');
        showVoiceNotification(`🎤 "${transcript}" → Rolling dice`, 'success');
        stopVoiceListening();
        handleDiceRoll();
        return;
      }

      // Check for choice keywords and button text matching
      passage.choices.forEach((choice, index) => {
        const choiceText = choice.label.toLowerCase();
        
        // 1. Check if transcript contains the full button text (fuzzy match)
        if (transcript.includes(choiceText) || choiceText.includes(transcript)) {
          console.log('🎯 Matched full button text - going to:', choice.goto);
          showVoiceNotification(`🎤 "${transcript}" → ${choice.label}`, 'success');
          stopVoiceListening(); // Stop voice listening immediately
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
          stopVoiceListening(); // Stop voice listening immediately
          goTo(choice.goto);
          return;
        }
        
        // 3. Check for predefined match keywords if available
        if (choice.match && choice.match.some(keyword => 
          transcript.includes(keyword.toLowerCase())
        )) {
          console.log('🎯 Matched predefined keyword - going to:', choice.goto);
          showVoiceNotification(`🎤 "${transcript}" → ${choice.label}`, 'success');
          stopVoiceListening(); // Stop voice listening immediately
          goTo(choice.goto);
          return;
        }
      });

      // No match found - show feedback
      console.log('❌ Ingen matchende stemmekommando fundet for:', transcript);
      console.log('❌ Tilgængelig knaptekst:', passage.choices.map(c => c.label));
      console.log('❌ Prøv at sige en del af enhver knaptekst eller brug: venstre, højre, 1, 2, osv.');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setSpeechError(`Stemmeigenkendelsesfejl: ${event.error}`);
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
      setSpeechError('Kunne ikke starte stemmeigenkendelse');
      setListening(false);
    }

    // Cleanup function
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, [
    listening,
    passage?.choices,
    goTo,
    showVoiceNotification,
    stopVoiceListening,
    handleDiceRoll,
    handleDiceRollContinue,
    pendingDiceRoll,
    showDiceRollButton
  ]);

  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setCurrentId(START_ID);
    setStats({ Evner: 10, Udholdenhed: 18, Held: 10 });
    // Clear the last auto-read scene ID so autoplay can read from the start
    lastAutoReadSceneIdRef.current = null;
  }, []);

  // Handle auto-read toggle with timing check
  const handleAutoReadToggle = useCallback(() => {
    const newAutoRead = !autoRead;
    setAutoRead(newAutoRead);
    
    if (newAutoRead) {
      activateAutoReadIfPossible();
    } else if (autoPlay) {
      setAutoPlay(false);
    }
  }, [activateAutoReadIfPossible, autoPlay, autoRead]);

  const handleAutoPlayToggle = useCallback(() => {
    const newAutoPlay = !autoPlay;
    setAutoPlay(newAutoPlay);
    autoPlayActionInFlightRef.current = false;
    
    if (newAutoPlay) {
      stopVoiceListening();
      if (!autoRead) {
        setAutoRead(true);
      }
      activateAutoReadIfPossible();
    }
  }, [activateAutoReadIfPossible, autoPlay, autoRead, stopVoiceListening]);

  const goBackToStories = useCallback(() => {
    // Stop all audio and voice recognition when leaving story
    try {
      stopSpeak();
    } catch (error) {
      console.log('⚠️ Error stopping speech (non-critical):', error);
    }
    
    try {
      stopVoiceListening();
    } catch (error) {
      console.log('⚠️ Error stopping voice listening (non-critical):', error);
    }
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    } catch (error) {
      console.log('⚠️ Error stopping audio (non-critical):', error);
      audioRef.current = null;
    }
    
    // Always reset state regardless of errors
    setSpeaking(false);
    isTTSRunningRef.current = false;
    
    // Navigate away - this should happen even if cleanup fails
    router.push('/');
  }, [router, stopSpeak, stopVoiceListening]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      try {
        // Stop all audio and voice recognition on unmount
        stopSpeak();
        stopVoiceListening();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }
      } catch (error) {
        console.log('⚠️ Error during component unmount cleanup (non-critical):', error);
        // Reset state even if cleanup fails
        audioRef.current = null;
      }
    };
  }, [stopSpeak, stopVoiceListening]);

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-dungeon-text">Indlæser historie...</p>
        </div>
      </div>
    );
  }

  if (storyError) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Historie ikke fundet</h2>
          <p className="text-dungeon-text mb-6">{storyError}</p>
          <button 
            onClick={goBackToStories}
            className="bg-dungeon-accent hover:bg-dungeon-accent-active text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Tilbage til Historier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dungeon-bg text-white">
      {/* Voice Notification */}
      {voiceNotification && (
        <div className={`fixed top-2 right-2 sm:top-4 sm:right-4 z-50 p-3 sm:p-4 rounded-lg shadow-lg max-w-xs sm:max-w-sm transition-all duration-300 ${
          voiceNotification.type === 'success' 
            ? 'bg-green-800 border-2 border-green-600' 
            : voiceNotification.type === 'error'
            ? 'bg-red-800 border-2 border-red-600'
            : 'bg-blue-800 border-2 border-blue-600'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="text-base sm:text-lg">
              {voiceNotification.type === 'success' ? '✅' : voiceNotification.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div className="text-xs sm:text-sm font-medium text-white">
              {voiceNotification.message}
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-dungeon-border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {storyMetadata?.title || 'Interactive Story'}
            </h1>
            <p className="text-dungeon-text mt-1.5 text-sm sm:text-base">
              Evner {stats.Evner}  •  HP {stats.Udholdenhed}  •  Held {stats.Held}
            </p>
          </div>
          <button
            onClick={goBackToStories}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            ← Tilbage til Historier
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4">
        {/* Background Image */}
        {passage?.backgroundImage && (
          <div 
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${passage.backgroundImage})` }}
          />
        )}
        
        {/* Main Content */}
        <div className="mb-4">
          {/* Scene Video (prioritize video over image) */}
          {(() => {
            // Debug logging
            if (passage) {
              console.log('🎬 Passage media check:', {
                hasVideo: !!passage.video,
                videoUrl: passage.video,
                hasImage: !!passage.image,
                imageUrl: passage.image,
                nodeId: passage.id
              });
            }
            
            // Check for video - prioritize video over image
            if (passage?.video && typeof passage.video === 'string' && passage.video.trim() !== '') {
              // Create descriptive alt text for video
              const videoAlt = passage.text 
                ? `${storyMetadata?.title || 'Story'} - ${passage.text.substring(0, 100).replace(/\n/g, ' ')}`
                : `${storyMetadata?.title || 'Story'} scene video`;
              
              return (
                <div className="mb-4 sm:mb-6 flex justify-center">
                  <video 
                    src={passage.video}
                    autoPlay
                    muted
                    playsInline
                    loop
                    controls
                    aria-label={videoAlt}
                    className="max-w-full h-auto max-h-64 sm:max-h-96 rounded-lg shadow-lg border-2 border-dungeon-accent"
                    onError={(e) => {
                      console.error('❌ Failed to load video:', passage.video);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoadedData={() => {
                      console.log('✅ Video loaded and playing:', passage.video);
                    }}
                  >
                    Din browser understøtter ikke video-tagget.
                  </video>
                </div>
              );
            }
            
            // Fallback to image if no video
            if (passage?.image && typeof passage.image === 'string' && passage.image.trim() !== '') {
              // Create descriptive alt text for SEO
              const imageAlt = passage.text 
                ? `${storyMetadata?.title || 'Story'} - ${passage.text.substring(0, 100).replace(/\n/g, ' ')}`
                : `${storyMetadata?.title || 'Story'} scene image`;
              
              return (
                <div className="mb-4 sm:mb-6 flex justify-center">
                  <img 
                    src={passage.image} 
                    alt={imageAlt}
                    className="max-w-full h-auto max-h-64 sm:max-h-96 rounded-lg shadow-lg border-2 border-dungeon-accent"
                    onError={(e) => {
                      console.error('Failed to load image:', passage.image);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              );
            }
            
            // No media available
            return null;
          })()}
          
          {/* Background Audio removed - TTS handles audio playback via speakViaCloud function */}
          
          <p className="text-base sm:text-lg leading-relaxed text-white whitespace-pre-wrap">
            {passage?.text || "Historie ikke fundet. Tjek venligst dine historiedata."}
          </p>
        </div>

        {/* Dice Roll Button */}
        {showDiceRollButton && passage?.check && (
          <div className="mb-6 p-4 bg-dungeon-surface border-2 border-dungeon-accent rounded-lg">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-dungeon-accent mb-2">🎲 Evnecheck Påkrævet</h3>
              <p className="text-white mb-2">
                Du skal lave en <span className="font-semibold text-dungeon-accent">{passage.check.stat}</span> check 
                (SV {passage.check.dc}). Din nuværende {passage.check.stat} er <span className="font-semibold">{stats[passage.check.stat]}</span>.
              </p>
              <p className="text-dungeon-text text-sm">
                <span className="font-semibold">2d6</span> = 2 sekssidede terninger (2-12). Dit resultat + din {passage.check.stat} skal være {passage.check.dc} eller højere for at lykkes.
              </p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleDiceRoll}
                disabled={diceRolling}
                className={`px-8 py-4 text-white font-semibold rounded-lg transition-colors text-lg ${
                  diceRolling 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-dungeon-accent hover:bg-dungeon-accent-active'
                }`}
              >
                {diceRolling ? '🎲 Kaster...' : '🎲 Kast Terninger (2d6)'}
              </button>
            </div>
          </div>
        )}

        {/* Dice Roll Result Panel */}
        {pendingDiceRoll && (
          <div className="mb-6 p-4 bg-dungeon-surface border-2 border-dungeon-accent rounded-lg">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-dungeon-accent mb-2">🎲 Terningkast Resultat</h3>
              <div className="text-white space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{pendingDiceRoll.stat}:</span>
                  <span className="text-lg">{stats[pendingDiceRoll.stat]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Terningkast:</span>
                  <span className="text-lg">{pendingDiceRoll.roll}</span>
                </div>
                <div className="flex justify-between items-center border-t border-dungeon-border pt-2">
                  <span className="font-semibold">I alt:</span>
                  <span className="text-xl font-bold">{pendingDiceRoll.total}</span>
                </div>
                <div className={`text-xl font-bold text-center mt-3 ${pendingDiceRoll.success ? 'text-green-400' : 'text-red-400'}`}>
                  {pendingDiceRoll.success ? '✅ Lykkes!' : '❌ Mislykkes!'}
                </div>
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
                {pendingDiceRoll.success ? '✅ Fortsæt (Lykkes)' : '❌ Fortsæt (Mislykkes)'}
              </button>
            </div>
          </div>
        )}

        {(!passage?.check && passage?.choices) && (
          <div className="space-y-2 sm:space-y-3">
            {passage.choices.map((choice, i) => (
              <button
                key={i}
                className="w-full bg-dungeon-surface p-3 sm:p-3.5 rounded-lg border border-dungeon-accent text-center text-white hover:bg-dungeon-accent transition-colors text-sm sm:text-base break-words whitespace-normal"
                onClick={() => handleChoice(choice)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-dungeon-border p-3">
        {/* Collapsible Controls Dropdown */}
        <div className="space-y-3">
          {/* Toggle Button + Auto-read status */}
          <div className="space-y-2">
            <button
              onClick={() => setShowControls(!showControls)}
              className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-center font-semibold text-white transition-colors flex items-center justify-center gap-2"
              aria-expanded={showControls}
            >
              <span className="text-lg">{showControls ? '▼' : '▲'}</span>
              <span>Kontroller</span>
            </button>
            <div 
              className={`text-xs text-center ${autoRead ? 'text-purple-200' : 'text-gray-400'}`}
              aria-live="polite"
            >
              {autoReadStatusLabel}
            </div>
          </div>

          {/* Controls Panel - Always visible when speaking, otherwise toggleable */}
          {(showControls || speaking) && (
            <div className="space-y-3">
              {/* TTS Controls */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                <button 
                  className={`flex-1 bg-green-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-green-700 transition-colors text-sm sm:text-base ${
                    speaking ? 'bg-green-700' : ''
                  }`}
                  onClick={handleManualSpeak}
                  disabled={speaking}
                >
                  {speaking ? "🎙️ Afspiller..." : "🎙️ Læs Historie"}
                </button>

                <button 
                  className="flex-1 bg-red-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  onClick={stopSpeak}
                  disabled={!speaking}
                >
                  ⏹️ Stop
                </button>
              </div>

              {/* Auto Read Toggle */}
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <button
                  className={`p-3 rounded-lg text-center font-semibold text-white transition-colors text-sm sm:text-base ${
                    autoRead ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
                  } ${autoRead && autoReadBlockingReason ? 'border border-yellow-400/60' : ''}`}
                  onClick={handleAutoReadToggle}
                  aria-pressed={autoRead}
                  aria-label={autoRead ? 'Deaktiver auto-læs' : 'Aktiver auto-læs'}
                  title={
                    autoRead && autoReadBlockingReason
                      ? `Auto-læs pauser: ${autoReadBlockingReason}`
                      : autoRead
                        ? 'Deaktiver auto-læs'
                        : 'Aktiver auto-læs'
                  }
                >
                  {autoRead ? '🔁 Auto-læs: Til' : '🔁 Auto-læs: Fra'}
                </button>
                {autoRead && autoReadBlockingReason && (
                  <span className="text-xs text-yellow-200 text-center" aria-live="polite">
                    Auto-læs venter: {autoReadBlockingReason.toLowerCase()}
                  </span>
                )}
              </div>

              {/* Auto Play Toggle */}
              <div className="flex flex-col gap-1 sm:gap-1.5">
                <button
                  className={`p-3 rounded-lg text-center font-semibold text-white transition-colors text-sm sm:text-base ${
                    autoPlay ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600 hover:bg-gray-700'
                  } ${autoPlay && autoPlayBlockingReason ? 'border border-yellow-400/60' : ''}`}
                  onClick={handleAutoPlayToggle}
                  aria-pressed={autoPlay}
                  aria-label={autoPlay ? 'Deaktiver auto-play' : 'Aktiver auto-play'}
                  title={
                    autoPlay && autoPlayBlockingReason
                      ? `Auto-play pauser: ${autoPlayBlockingReason}`
                      : autoPlay
                        ? 'Deaktiver auto-play'
                        : 'Aktiver auto-play'
                  }
                >
                  {autoPlay ? '🤖 Auto-play: Til' : '🤖 Auto-play: Fra'}
                </button>
                <span
                  className={`text-xs text-center ${
                    autoPlay
                      ? (autoPlayBlockingReason ? 'text-yellow-200' : 'text-indigo-100')
                      : 'text-gray-400'
                  }`}
                  aria-live="polite"
                >
                  {autoPlayStatusLabel}
                </span>
              </div>

              {/* Voice Commands */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                  <button 
                    className={`flex-1 p-3 rounded-lg text-center font-semibold text-white transition-colors text-sm sm:text-base ${
                      listening 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={() => listening ? stopVoiceListening() : startVoiceListening(10000)}
                  >
                    {listening ? "🎤 Lytter..." : "🎤 Stemningskommandoer"}
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
                      {showDiceRollButton && (
                        <div className="text-left mb-2">
                          <span className="text-blue-400">•</span> <strong>Terning:</strong> roll, kast, terning, dice
                        </div>
                      )}
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
                  Start Forfra
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
