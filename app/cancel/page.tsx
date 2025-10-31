'use client';

import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-3xl font-bold mb-2">Betaling Annulleret</h1>
        <p className="text-gray-400 mb-6">
          Ingen bekymringer! Du kan prøve igen når som helst.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg mb-3 block w-full"
        >
          Tilbage til Historier
        </button>
        <p className="text-sm text-gray-500">
          Din betaling blev ikke behandlet
        </p>
      </div>
    </div>
  );
}

