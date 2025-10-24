'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameStats, StoryNode, SaveData } from '../../../types/game';
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

// Cloud TTS for web — OpenAI only
async function speakViaCloud(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>, onComplete?: () => void): Promise<void> {
  if (!text || !text.trim()) return;

  // Stop any existing audio first
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }

  const key = `elevenlabs-${hashText(text)}`;
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
        // Wait for audio to finish playing
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

  const res = await fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider: 'elevenlabs' })
  });

  if (!res.ok) {
    let msg = "";
    try { 
      msg = await res.text(); 
    } catch {}
    const e = new Error(`TTS failed (${res.status})${msg ? `: ${msg.slice(0,180)}` : ""}`);
    (e as any).status = res.status;
    throw e;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  audioCache.set(key, url);

  const audio = new Audio(url);
  
  // Store the audio element in the ref
  audioRef.current = audio;
  
  try { 
    await audio.play();
    // Wait for audio to finish playing
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
    URL.revokeObjectURL(url);
    audioCache.delete(key);
    
    // Handle autoplay policy errors
    if (playError.name === 'NotAllowedError' || playError.message.includes('autoplay')) {
      const e = new Error("Autoplay blocked – click the button and try again.");
      (e as any).code = "AUTOPLAY";
      throw e;
    }
    throw playError;
  }
}

export default function Game({ params }: { params: Promise<{ storyId: string }> }) {
  const [storyId, setStoryId] = useState<string>('');
  const [currentId, setCurrentId] = useState(START_ID);
  const [stats, setStats] = useState<GameStats>({ Evner: 10, Udholdenhed: 18, Held: 10 });
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState<boolean>(false);
  const [story, setStory] = useState<Record<string, StoryNode>>({});
  const [loading, setLoading] = useState(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  
  // Audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTTSRunningRef = useRef<boolean>(false);
  const lastTTSFinishTimeRef = useRef<number>(0);
  
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
  
  const router = useRouter();
  const passage = story[currentId];

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
  }, []);

  // Enhanced TTS with voice listening
  const speakWithVoiceListening: (text: string, onDone?: () => void) => Promise<void> = useCallback(async (text: string, onDone?: () => void) => {
    if (!text || !text.trim()) return;

    // Prevent multiple simultaneous TTS calls
    if (isTTSRunningRef.current) {
      console.log('🎙️ TTS already running, skipping duplicate call');
      return;
    }

    // Caller supplies final text; do not modify here to avoid duplicate reading
    console.log('🎙️ speakWithVoiceListening called with text:', text.substring(0, 50) + '...');
    console.log('🎙️ Current speaking state:', speaking);

    try {
      isTTSRunningRef.current = true;
      setSpeaking(true);
      console.log('🎙️ Starting TTS, isTTSRunningRef set to true');
      await speakViaCloud(text, audioRef, () => {
        // Auto-start voice listening after TTS completes
        if (passage?.choices && passage.choices.length > 0) {
          console.log('TTS finished - starting voice listening for 10 seconds');
          startVoiceListening(10000);
        }
        // Set speaking to false only after TTS actually completes
        setSpeaking(false);
        isTTSRunningRef.current = false;
        lastTTSFinishTimeRef.current = Date.now();
        console.log('🎙️ TTS completed, isTTSRunningRef set to false');
      });
      // Don't set speaking to false here - let the callback handle it
    } catch (e: any) {
      audioRef.current = null; // Clear ref on error
      setSpeaking(false);
      isTTSRunningRef.current = false;
      console.log('🎙️ TTS error, isTTSRunningRef set to false');
      // Show a more user-friendly error message
      if (e?.message?.includes("API key not configured")) {
        alert("TTS is not configured. Please set up your OpenAI API key to enable voice narration.");
      } else if (e?.message?.includes("Incorrect API key")) {
        alert("TTS API key is invalid or expired. Please update your OpenAI API key to enable voice narration.");
      } else {
        alert(`TTS Error: ${e?.message || "Could not play voice narration."}`);
      }
    }
  }, [passage?.choices, startVoiceListening, speaking]);

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
        const storyResponse = await fetch(`/api/stories/${storyId}`);
        if (!storyResponse.ok) {
          throw new Error('Story not found');
        }
        const storyData = await storyResponse.json();
        console.log('✅ Story metadata loaded:', storyData);
        
        // Load first node
        console.log('📡 Fetching story node from:', `/api/stories/${storyId}/nodes/1`);
        const nodeResponse = await fetch(`/api/stories/${storyId}/nodes/1`);
        if (!nodeResponse.ok) {
          throw new Error('Story content not found');
        }
        const nodeData = await nodeResponse.json();
        console.log('✅ Story node loaded:', nodeData);
        
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
            video: undefined,
            backgroundImage: undefined,
            audio: undefined
          }
        };
        
        setStory(story as Record<string, StoryNode>);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load story:', error);
        setStoryError(`Failed to load story: ${error}`);
        setLoading(false);
      }
    };
    loadStory();
  }, [storyId, stopSpeak, stopVoiceListening]);

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
      if (auto !== null) setAutoRead(auto === "1");
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
      const nodeResponse = await fetch(`/api/stories/${storyId}/nodes/${id}`);
      if (!nodeResponse.ok) {
        throw new Error('Node not found');
      }
      const nodeData = await nodeResponse.json();
      
      // Update the story with the new node
      setStory(prevStory => ({
        ...prevStory,
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
          video: undefined,
          backgroundImage: undefined,
          audio: undefined
        }
      }));
      
      setCurrentId(id);
      console.log('✅ Navigation completed to:', id);
    } catch (error) {
      console.error('Failed to load node:', error);
    }
  }, [stopSpeak, stopVoiceListening, storyId]);

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
    
    // Speak the dice result
    try {
      await speakWithVoiceListening(diceResultText);
    } catch (error) {
      console.error('Failed to speak dice result:', error);
    }
  }, [passage, diceRolling, stats, speakWithVoiceListening]);

  const handleDiceRollContinue = useCallback(() => {
    if (!pendingDiceRoll) return;
    
    const targetPassage = pendingDiceRoll.success ? pendingDiceRoll.successPassage : pendingDiceRoll.failurePassage;
    setPendingDiceRoll(null);
    goTo(targetPassage);
  }, [pendingDiceRoll, goTo]);

  // --- Cloud TTS throttle (avoid spamming server) ---
  const ttsCooldownRef = useRef(0);
  const COOL_DOWN_MS = 1000; // Reduced from 2500ms to 1000ms for better UX

  // Build narration string including choices so buttons are read aloud
  const getNarrationText = useCallback(() => {
    if (!passage?.text) return '';
    let text = passage.text;
    if (passage?.choices && passage.choices.length > 0) {
      const choicesText = passage.choices
        .map((c, i) => `Valg ${i + 1}: ${c.label}.`)
        .join(' ');
      text = `${text} Valgmuligheder: ${choicesText} Hvad vælger du?`;
    }
    return text;
  }, [passage]);

  const speakCloudThrottled = useCallback(async () => {
    const narration = getNarrationText();
    if (!narration) return;
    
    // Prevent multiple simultaneous calls
    if (isTTSRunningRef.current) {
      console.log('🚫 TTS already running, skipping speakCloudThrottled');
      return;
    }
    
    const now = Date.now();
    if (now - ttsCooldownRef.current < COOL_DOWN_MS) {
      console.log('🚫 TTS cooldown active, skipping');
      const remainingTime = Math.ceil((COOL_DOWN_MS - (now - ttsCooldownRef.current)) / 1000);
      showVoiceNotification(`⏳ Please wait ${remainingTime} second${remainingTime > 1 ? 's' : ''} before playing again`, 'info');
      return;
    }
    ttsCooldownRef.current = now;

    console.log('🎙️ speakCloudThrottled called, TTS running:', isTTSRunningRef.current);
    
    // Stop any existing voice listening immediately
    stopVoiceListening();
    
    // Use enhanced TTS with voice listening - it will handle starting voice listening automatically
    await speakWithVoiceListening(narration);
  }, [getNarrationText, speakWithVoiceListening, stopVoiceListening]);

  // Auto-read new scenes when enabled
  useEffect(() => {
    if (!autoRead) return;
    if (!passage?.text) return;
    if (pendingDiceRoll) return; // hold during dice overlays
    if (speaking) return; // don't start TTS if already speaking
    if (isTTSRunningRef.current) return; // don't start if TTS is already running
    if (listening) return; // don't start TTS if voice listening is active
    
    // Add a delay after TTS finishes to allow voice commands to work
    const timeSinceLastTTS = Date.now() - lastTTSFinishTimeRef.current;
    if (timeSinceLastTTS < 3000) { // 3 second delay after TTS finishes
      console.log('🎯 Auto-read delayed, TTS finished recently:', timeSinceLastTTS + 'ms ago');
      return;
    }
    
    console.log('🎯 Auto-read triggered for passage:', passage.id);
    speakCloudThrottled();
  }, [autoRead, currentId, passage, pendingDiceRoll, speaking, listening, speakCloudThrottled]);

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
            stopVoiceListening(); // Stop voice listening immediately
            goTo(passage.choices[choiceIndex].goto);
            return;
          } else {
            console.log('❌ Danish number word out of range:', word, '->', number, 'max:', passage.choices.length);
            showVoiceNotification(`❌ Choice ${number} not available (max: ${passage.choices.length})`, 'error');
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

  // Handle auto-read toggle with timing check
  const handleAutoReadToggle = useCallback(() => {
    const newAutoRead = !autoRead;
    setAutoRead(newAutoRead);
    
    // If turning on auto-read, check if we should start immediately
    if (newAutoRead) {
      const timeSinceLastTTS = Date.now() - lastTTSFinishTimeRef.current;
      if (timeSinceLastTTS < 3000) {
        console.log('🎯 Auto-read enabled but delayed, TTS finished recently:', timeSinceLastTTS + 'ms ago');
        return;
      }
      
      // Start reading immediately if conditions are met
      if (passage?.text && !pendingDiceRoll && !speaking && !isTTSRunningRef.current && !listening) {
        console.log('🎯 Auto-read enabled, starting TTS immediately');
        speakCloudThrottled();
      }
    }
  }, [autoRead, passage?.text, pendingDiceRoll, speaking, listening, speakCloudThrottled]);

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
          <p className="text-dungeon-text">Loading story...</p>
        </div>
      </div>
    );
  }

  if (storyError) {
    return (
      <div className="min-h-screen bg-dungeon-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Story Not Found</h2>
          <p className="text-dungeon-text mb-6">{storyError}</p>
          <button 
            onClick={goBackToStories}
            className="bg-dungeon-accent hover:bg-dungeon-accent-active text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Stories
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
            <h1 className="text-lg sm:text-xl font-bold text-white">Sword & Sorcery (MVP)</h1>
            <p className="text-dungeon-text mt-1.5 text-sm sm:text-base">
              Evner {stats.Evner}  •  HP {stats.Udholdenhed}  •  Held {stats.Held}
            </p>
          </div>
          <button
            onClick={goBackToStories}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            ← Back to Stories
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
          {/* Scene Image */}
          {passage?.image && passage.image.includes('cloudinary.com') && (
            <div className="mb-4 sm:mb-6 flex justify-center">
              <img 
                src={passage.image} 
                alt="Scene illustration"
                className="max-w-full h-auto max-h-64 sm:max-h-96 rounded-lg shadow-lg border-2 border-dungeon-accent"
                onError={(e) => {
                  console.error('Failed to load image:', passage.image);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Scene Video */}
          {passage?.video && passage.video.includes('cloudinary.com') && (
            <div className="mb-4 sm:mb-6 flex justify-center">
              <video 
                src={passage.video}
                controls
                className="max-w-full h-auto max-h-64 sm:max-h-96 rounded-lg shadow-lg border-2 border-dungeon-accent"
                onError={(e) => {
                  console.error('Failed to load video:', passage.video);
                  e.currentTarget.style.display = 'none';
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          
          {/* Background Audio */}
          {passage?.audio && (
            <audio 
              src={passage.audio}
              autoPlay
              loop
              className="hidden"
              onError={(e) => {
                console.error('Failed to load audio:', passage.audio);
              }}
            />
          )}
          
          <p className="text-base sm:text-lg leading-relaxed text-white">
            {passage?.text || "Story not found. Please check your story data."}
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
                className="w-full bg-dungeon-surface p-3 sm:p-3.5 rounded-lg border border-dungeon-accent text-center text-white hover:bg-dungeon-accent transition-colors text-sm sm:text-base"
                onClick={() => handleChoice(choice)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-dungeon-border p-3 space-y-3">
        {/* TTS Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
          <button 
            className={`flex-1 bg-green-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-green-700 transition-colors text-sm sm:text-base ${
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

        {/* Auto Read Toggle */}
        <div className="flex gap-2 sm:gap-2.5">
          <button
            className={`flex-1 p-3 rounded-lg text-center font-semibold text-white transition-colors text-sm sm:text-base ${
              autoRead ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
            onClick={handleAutoReadToggle}
            aria-pressed={autoRead}
            aria-label={autoRead ? 'Disable auto read' : 'Enable auto read'}
            title={autoRead ? 'Disable auto read' : 'Enable auto read'}
          >
            {autoRead ? '🔁 Auto-Read: On' : '🔁 Auto-Read: Off'}
          </button>
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
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
