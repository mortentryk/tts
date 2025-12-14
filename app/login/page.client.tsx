'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp, signInWithMagicLink, isAuthenticated } from '@/lib/authClient';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const redirectTo = searchParams.get('redirect') || '/library';

  useEffect(() => {
    // Check if already authenticated - redirect to library
    isAuthenticated().then((auth) => {
      if (auth) {
        router.push(redirectTo);
      }
    });
  }, [router, redirectTo]);

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { user } = await signUp(email, password);
        if (user) {
          setMessage('Konto oprettet! Tjek din email for bekræftelse.');
          // If email confirmation is disabled, redirect immediately
          if (user.email_confirmed_at) {
            router.push(redirectTo);
          }
        }
      } else {
        await signIn(email, password);
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || 'Der opstod en fejl');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await signInWithMagicLink(email);
      setMessage('Tjek din email for login-link!');
    } catch (err: any) {
      setError(err.message || 'Der opstod en fejl');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {mode === 'signup' ? 'Opret konto' : mode === 'magic' ? 'Login med email' : 'Log ind'}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {message}
          </div>
        )}

        {mode === 'magic' ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="din@email.dk"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sender...' : 'Send login-link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="din@email.dk"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Adgangskode
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logger ind...' : mode === 'signup' ? 'Opret konto' : 'Log ind'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-yellow-400 hover:text-yellow-300 text-sm"
          >
            {mode === 'signin' ? 'Har du ikke en konto? Opret en' : 'Har du allerede en konto? Log ind'}
          </button>
          <div>
            <button
              onClick={() => setMode('magic')}
              className="text-yellow-400 hover:text-yellow-300 text-sm"
            >
              Login med email-link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}


