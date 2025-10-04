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
async function speakViaCloud(text: string): Promise<void> {
  if (!text || !text.trim()) return;

  const key = `openai-${hashText(text)}`;
  if (audioCache.has(key)) {
    const cached = audioCache.get(key);
    if (cached) {
      const a = new Audio(cached);
      try { 
        await a.play(); 
        return; 
      } catch {
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
  try { 
    await audio.play(); 
  } catch (err) {
    URL.revokeObjectURL(url);
    audioCache.delete(key);
    const e = new Error("Autoplay blocked – click the button and try again.");
    (e as any).code = "AUTOPLAY";
    throw e;
  }
  audio.onended = () => { /* keep cached for replays */ };
}

export default function Game() {
  const [currentId, setCurrentId] = useState(START_ID);
  const [stats, setStats] = useState<GameStats>({ Evner: 10, Udholdenhed: 18, Held: 10 });
  const [speaking, setSpeaking] = useState(false);
  const [story, setStory] = useState<Record<string, StoryNode>>({});
  const [loading, setLoading] = useState(true);
  
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
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Only OpenAI TTS now

  const passage = story[currentId];

  // --- TTS Controls ---
  const stopSpeak = useCallback(() => {
    setSpeaking(false);
  }, []);

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

    // Apply Udholdenhed penalty before showing the result
    if (!ok && stat === "Udholdenhed") {
      setStats(prev => ({ 
        ...prev, 
        Udholdenhed: Math.max(0, prev.Udholdenhed - 2) 
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
    stopSpeak();
    setCurrentId(id);
  }, [stopSpeak]);

  const handleDiceRollContinue = useCallback((success: boolean) => {
    if (!pendingDiceRoll) return;
    
    const targetPassage = success ? pendingDiceRoll.successPassage : pendingDiceRoll.failurePassage;
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

    try {
      setSpeaking(true);
      await speakViaCloud(passage.text);
      setSpeaking(false);
    } catch (e: any) {
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
  }, [passage?.text]);

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
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handleDiceRollContinue(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                Continue (Success)
              </button>
              <button
                onClick={() => handleDiceRollContinue(false)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Continue (Failure)
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
