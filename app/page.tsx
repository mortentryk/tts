'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameStats, StoryNode, SaveData } from '../types/game';
import { loadStoryFromSheet } from '../lib/storyLoader';

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

// Cloud TTS for web — supports multiple providers
async function speakViaCloud(text: string, provider: 'openai' | 'lmnt' = 'openai'): Promise<void> {
  if (!text || !text.trim()) return;

  const key = `${provider}-${hashText(text)}`;
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
    body: JSON.stringify({ text, provider })
  });

  if (!res.ok) {
    let msg = "";
    try { 
      msg = await res.text(); 
    } catch {}
    const e = new Error(`${provider.toUpperCase()} TTS failed (${res.status})${msg ? `: ${msg.slice(0,180)}` : ""}`);
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
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'lmnt'>('openai');

  const passage = story[currentId];

  // --- Web Speech API ---
  const queueRef = useRef<string[]>([]);
  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  
  const stopSpeak = useCallback(() => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    setSpeaking(false);
    queueRef.current = [];
  }, [speechSynthesis]);

  const speakPassage = useCallback((text: string) => {
    if (!text || !speechSynthesis) return;
    stopSpeak();
    queueRef.current = text.split(/(?<=[\.!\?…])\s+/);
    
    const playNext = () => {
      const next = queueRef.current.shift();
      if (!next) { 
        setSpeaking(false); 
        return; 
      }
      setSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(next);
      utterance.lang = 'en-GB';
      utterance.onend = playNext;
      utterance.onerror = () => setSpeaking(false);
      
      speechSynthesis.speak(utterance);
    };
    playNext();
  }, [stopSpeak, speechSynthesis]);

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

  // Auto-read on passage change (Web Speech API only)
  useEffect(() => { 
    if (passage && passage.text) speakPassage(passage.text); 
  }, [currentId, speakPassage]);

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
      return; 
    }
    if (rolledForPassageRef.current === passage.id) return;

    rolledForPassageRef.current = passage.id;
    const { stat, dc, success, fail } = passage.check;
    const roll = roll2d6();
    const total = roll + (stats[stat] || 0);
    const ok = total >= dc;

    if (!ok && stat === "Udholdenhed") {
      setStats(prev => ({ 
        ...prev, 
        Udholdenhed: Math.max(0, prev.Udholdenhed - 2) 
      }));
    }

    const message = `${stat}: ${stats[stat]}  •  Roll: ${roll}  •  Total: ${total}  →  ${ok ? "Success" : "Failure"}`;
    
    if (window.confirm(`Dice Roll\n\n${message}\n\nClick OK to continue`)) {
      goTo(ok ? success : fail);
    }
  }, [currentId, stats]);

  const goTo = useCallback((id: string) => {
    stopSpeak();
    setCurrentId(id);
  }, [stopSpeak]);

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
      await speakViaCloud(passage.text, ttsProvider);
    } catch (e: any) {
      alert(`${ttsProvider.toUpperCase()} TTS: ${e?.message || "Could not play online voice. Using local speech instead."}`);
      speakPassage(passage.text);
    }
  }, [passage?.text, speakPassage, ttsProvider]);

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
        {/* TTS Provider Selection */}
        <div className="flex gap-2">
          <button
            className={`flex-1 p-2 rounded-lg text-center font-semibold transition-colors ${
              ttsProvider === 'openai' 
                ? 'bg-blue-600 text-white' 
                : 'bg-dungeon-accent text-white hover:bg-dungeon-accent-active'
            }`}
            onClick={() => setTtsProvider('openai')}
          >
            OpenAI TTS
          </button>
          <button
            className={`flex-1 p-2 rounded-lg text-center font-semibold transition-colors ${
              ttsProvider === 'lmnt' 
                ? 'bg-blue-600 text-white' 
                : 'bg-dungeon-accent text-white hover:bg-dungeon-accent-active'
            }`}
            onClick={() => setTtsProvider('lmnt')}
          >
            LMNT TTS
          </button>
        </div>

        {/* TTS Controls */}
        <div className="flex gap-2.5">
          <button
            className={`flex-1 bg-dungeon-accent p-3 rounded-lg text-center font-semibold text-white hover:bg-dungeon-accent-active transition-colors ${
              speaking ? 'bg-dungeon-accent-active' : ''
            }`}
            onClick={() => passage?.text && speakPassage(passage.text)}
          >
            {speaking ? "Read Again" : "Read (Local)"}
          </button>

          <button 
            className="flex-1 bg-green-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-green-700 transition-colors"
            onClick={speakCloudThrottled}
          >
            Read ({ttsProvider.toUpperCase()})
          </button>

          <button 
            className="flex-1 bg-red-600 p-3 rounded-lg text-center font-semibold text-white hover:bg-red-700 transition-colors"
            onClick={stopSpeak}
          >
            Stop
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
