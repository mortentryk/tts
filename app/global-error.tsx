'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture critical exception in Sentry
    Sentry.captureException(error, {
      level: 'fatal',
      tags: {
        errorBoundary: 'global',
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
          <div className="text-center max-w-2xl">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-4xl font-bold mb-4">Critical Error</h1>
            <p className="text-gray-300 mb-6">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            {error.message && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-300 font-mono">{error.message}</p>
              </div>
            )}
            <button
              onClick={reset}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

