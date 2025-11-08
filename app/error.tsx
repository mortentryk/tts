'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
        <p className="text-gray-300 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        {error.message && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-300 font-mono">{error.message}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

