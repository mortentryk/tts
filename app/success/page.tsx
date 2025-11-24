'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setUserEmail } from '@/lib/purchaseVerification';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyPurchase();
  }, []);

  const verifyPurchase = async () => {
    const sessionId = searchParams.get('session_id');
    const paymentIntentId = searchParams.get('payment_intent');

    // Handle payment_intent (from one-click purchases)
    if (paymentIntentId) {
      try {
        // For one-click purchases, the webhook handles the purchase recording
        // We just need to verify it succeeded
        const response = await fetch('/api/checkout/verify-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Bekræftelse mislykkedes');
        }

        // Store user email for future access
        if (data.email) {
          setUserEmail(data.email);
        }

        setVerifying(false);
        return;
      } catch (error: any) {
        console.error('Verification error:', error);
        setError(error.message || 'Kunne ikke bekræfte køb');
        setVerifying(false);
        return;
      }
    }

    // Handle session_id (from regular checkout)
    if (!sessionId) {
      setError('Ingen sessions-ID eller payment intent fundet');
      setVerifying(false);
      return;
    }

    try {
      const response = await fetch('/api/checkout/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bekræftelse mislykkedes');
      }

      // Store user email for future access
      if (data.email) {
        setUserEmail(data.email);
      }

      setVerifying(false);
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Kunne ikke bekræfte køb');
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl text-center">
        {verifying ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">Bekræfter dit køb...</h1>
            <p className="text-gray-400">Vent venligst et øjeblik</p>
          </>
        ) : error ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Bekræftelse mislykkedes</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg"
            >
              Tilbage til Historier
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-2">Køb gennemført!</h1>
            <p className="text-gray-400 mb-6">
              Tak for dit køb. Din historie er nu tilgængelig!
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg"
            >
              Gå til Historier
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Indlæser...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

