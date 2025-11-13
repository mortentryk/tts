'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function PurchasePage() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStory();
  }, []);

  const loadStory = async () => {
    try {
      const response = await fetch(`/api/stories/${params.storyId}`);
      if (!response.ok) {
        throw new Error('Historie ikke fundet');
      }
      const data = await response.json();
      setStory(data);
    } catch (error) {
      setError('Historie ikke fundet');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      // Create checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'one-time',
          userEmail: email,
          storyId: story.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oprette betalingssession');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      setError(error.message || 'Kunne ikke starte betaling');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Indlæser...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Historie ikke fundet</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg"
          >
            Tilbage til Historier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-8 text-gray-400 hover:text-white"
        >
          ← Tilbage
        </button>

        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-4">Køb Historie</h1>
          <p className="text-gray-300 text-lg mb-8">{story.title}</p>

          <div className="mb-6">
            <p className="text-4xl font-bold text-yellow-500">
              ${Number(story.price).toFixed(2)}
            </p>
            <p className="text-gray-400 text-sm mt-1">Engangsbetaling</p>
          </div>

          {story.description && (
            <div className="mb-6">
              <p className="text-gray-300">{story.description}</p>
            </div>
          )}

          <form onSubmit={handlePurchase}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email-adresse
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="din@email.dk"
              />
              <p className="text-sm text-gray-400 mt-2">
                Vi sender din købsbekræftelse til denne email
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={processing || !email}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-colors"
            >
              {processing ? 'Behandler...' : `Køb for $${Number(story.price).toFixed(2)}`}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              🔒 Sikker betaling via Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

