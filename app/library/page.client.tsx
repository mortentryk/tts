'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, onAuthStateChange, signOut } from '@/lib/authClient';
import { getUserPurchases } from '@/lib/purchaseVerification';

export default function LibraryPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPurchases, setUserPurchases] = useState({
    purchasedStories: [] as string[],
    hasActiveSubscription: false,
    subscriptionPeriodEnd: null as string | null,
  });
  const [stories, setStories] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
    loadStories();

    // Listen to auth state changes
    const subscription = onAuthStateChange(async (authUser) => {
      if (authUser) {
        setUserEmail(authUser.email);
        setUserId(authUser.id);
        const purchases = await getUserPurchases(authUser.email, authUser.id);
        setUserPurchases(purchases);
        loadStories();
      } else {
        setUserEmail(null);
        setUserId(null);
        setUserPurchases({
          purchasedStories: [],
          hasActiveSubscription: false,
          subscriptionPeriodEnd: null,
        });
        // Redirect to login if not authenticated
        router.push('/login?redirect=/library');
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

  const loadUserData = async () => {
    const authUser = await getCurrentUser();
    if (authUser) {
      setUserEmail(authUser.email);
      setUserId(authUser.id);
      const purchases = await getUserPurchases(authUser.email, authUser.id);
      setUserPurchases(purchases);
    } else {
      router.push('/login?redirect=/library');
    }
    setLoading(false);
  };

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Indlæser...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null; // Will redirect
  }

  const purchasedStories = userPurchases.hasActiveSubscription 
    ? stories // Show all stories if they have subscription
    : stories.filter(s => userPurchases.purchasedStories.includes(s.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">📚 Min Bibliotek</h1>
            <p className="text-gray-400">
              {userEmail && `Logget ind som ${userEmail}`}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/feed')}
              className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg font-semibold transition-colors hover:border-yellow-400"
            >
              🎬 Se Reels
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Tilbage til Forside
            </button>
            <button
              onClick={handleSignOut}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Log ud
            </button>
          </div>
        </div>

        {/* Subscription Status */}
        {userPurchases.hasActiveSubscription && (
          <div className="mb-6 bg-green-600/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-300 font-semibold">
              ✅ Aktivt Abonnement
              {userPurchases.subscriptionPeriodEnd && (
                <span className="text-sm text-gray-400 ml-2">
                  (til {new Date(userPurchases.subscriptionPeriodEnd).toLocaleDateString('da-DK')})
                </span>
              )}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Du har adgang til alle historier i biblioteket
            </p>
          </div>
        )}

        {/* Purchased Stories */}
        {purchasedStories.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {purchasedStories.map((story) => (
              <div key={story.id} className="bg-white/10 backdrop-blur-sm border-2 border-green-500/50 rounded-lg overflow-hidden hover:border-green-400 transition-colors">
                {story.cover_image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={story.cover_image_url}
                      alt={`${story.title} cover`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{story.title}</h3>
                  <p className="text-gray-300 mb-4 line-clamp-2">{story.description}</p>
                  <button
                    onClick={() => router.push(`/story/${story.slug || story.id}`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>▶️</span>
                    <span>Læs Historie</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-400 text-lg mb-4">Du har endnu ikke købt nogen historier.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Gå til Historier
            </button>
          </div>
        )}

        {/* Future: Profile Character Section */}
        {/* This space can be used for profile/character features in the future */}
      </div>
    </div>
  );
}







