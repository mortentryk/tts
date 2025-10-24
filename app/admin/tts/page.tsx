'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  language: string;
  voiceId: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'adam',
    name: 'Adam',
    description: 'Multilingual, good for Danish - clear and professional',
    gender: 'male',
    language: 'Multilingual',
    voiceId: 'pNInz6obpgDQGcFmaJgB'
  },
  {
    id: 'antoni',
    name: 'Antoni',
    description: 'Multilingual with clear pronunciation - great for storytelling',
    gender: 'male',
    language: 'Multilingual',
    voiceId: 'ErXwobaYiN019PkySvjV'
  },
  {
    id: 'arnold',
    name: 'Arnold',
    description: 'Deep, authoritative voice - perfect for adventure stories',
    gender: 'male',
    language: 'Multilingual',
    voiceId: 'VR6AewLTigWG4xSOukaG'
  },
  {
    id: 'bella',
    name: 'Bella',
    description: 'Warm, friendly female voice - great for children\'s stories',
    gender: 'female',
    language: 'Multilingual',
    voiceId: 'EXAVITQu4vr4xnSDxMaL'
  },
  {
    id: 'domi',
    name: 'Domi',
    description: 'Expressive and dynamic - perfect for character voices',
    gender: 'female',
    language: 'Multilingual',
    voiceId: 'AZnzlk1XvdvUeBnXmlld'
  },
  {
    id: 'elli',
    name: 'Elli',
    description: 'Young, energetic voice - ideal for modern stories',
    gender: 'female',
    language: 'Multilingual',
    voiceId: 'MF3mGyEYCl7XYWbV9V6O'
  },
  {
    id: 'josh',
    name: 'Josh',
    description: 'Friendly, approachable male voice - good for dialogue',
    gender: 'male',
    language: 'Multilingual',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX'
  },
  {
    id: 'rachel',
    name: 'Rachel',
    description: 'Professional, clear female voice - excellent for narration',
    gender: 'female',
    language: 'Multilingual',
    voiceId: '21m00Tcm4TlvDq8ikWAM'
  },
  {
    id: 'sam',
    name: 'Sam',
    description: 'Versatile male voice - good for all story types',
    gender: 'male',
    language: 'Multilingual',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ'
  }
];

export default function TTSManager() {
  const router = useRouter();
  const [selectedVoice, setSelectedVoice] = useState<string>('adam');
  const [testText, setTestText] = useState<string>('Hej! Dette er en test af ElevenLabs tekst-til-tale system. Kan du høre mig tydeligt?');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (!isLoggedIn) {
      router.push('/admin/login');
    }
  }, [router]);

  const handleVoiceTest = async () => {
    if (!testText.trim()) {
      alert('Please enter some text to test');
      return;
    }

    setLoading(true);
    setIsPlaying(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voice: selectedVoice,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          alert('Error playing audio');
        };
        
        await audio.play();
      } else {
        const error = await response.json();
        alert(`TTS Error: ${error.error}`);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('TTS test error:', error);
      alert('Failed to generate TTS audio');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin/login');
  };

  const selectedVoiceData = VOICE_OPTIONS.find(v => v.id === selectedVoice);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🎙️ ElevenLabs TTS Manager
            </h1>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                ← Back to Admin
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Selection */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                🎭 Voice Selection
              </h2>
              
              <div className="space-y-4">
                {VOICE_OPTIONS.map((voice) => (
                  <div
                    key={voice.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedVoice === voice.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVoice(voice.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{voice.name}</h3>
                        <p className="text-sm text-gray-600">{voice.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            voice.gender === 'male' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {voice.gender === 'male' ? '👨' : '👩'} {voice.gender}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            🌍 {voice.language}
                          </span>
                        </div>
                      </div>
                      {selectedVoice === voice.id && (
                        <div className="text-blue-600 text-2xl">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Testing */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                🧪 Voice Testing
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Text (Danish/English)
                  </label>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Enter text to test the voice..."
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Selected Voice: {selectedVoiceData?.name}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    {selectedVoiceData?.description}
                  </p>
                </div>

                <button
                  onClick={handleVoiceTest}
                  disabled={loading || isPlaying}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating Audio...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <span>🔊 Playing...</span>
                    </>
                  ) : (
                    <>
                      <span>🎵 Test Voice</span>
                    </>
                  )}
                </button>

                <div className="text-sm text-gray-600">
                  <p><strong>💡 Tips:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Test with Danish text for best results</li>
                    <li>Try different voices for different story types</li>
                    <li>Male voices work well for adventure stories</li>
                    <li>Female voices are great for children's stories</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Settings Info */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              ⚙️ Voice Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Stability:</strong> 0.6 (Higher = more consistent)
              </div>
              <div>
                <strong>Similarity Boost:</strong> 0.8 (Higher = more voice-like)
              </div>
              <div>
                <strong>Style:</strong> 0.2 (Slight style for natural speech)
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              These settings are optimized for Danish pronunciation and storytelling.
              The voices use the <code>eleven_multilingual_v2</code> model for best results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
