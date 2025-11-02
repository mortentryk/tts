'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JourneyMap from './components/JourneyMap';
import PurchaseButton from '../components/PurchaseButton';
import { getUserEmail, getUserPurchases } from '@/lib/purchaseVerification';

export default function Home() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJourney, setShowJourney] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPurchases, setUserPurchases] = useState({
    purchasedStories: [] as string[],
    hasActiveSubscription: false,
    hasLifetimeAccess: false,
    subscriptionPeriodEnd: null as string | null,
  });
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    loadStories();
    loadUserData();
    loadPlans();
  }, []);

  const loadUserData = async () => {
    const email = getUserEmail();
    setUserEmail(email);

    if (email) {
      const purchases = await getUserPurchases(email);
      setUserPurchases({
        purchasedStories: purchases.purchasedStories || [],
        hasActiveSubscription: purchases.hasActiveSubscription || false,
        hasLifetimeAccess: purchases.hasLifetimeAccess || false,
        subscriptionPeriodEnd: purchases.subscriptionPeriodEnd || null,
      });
    }
  };

  const loadStories = async () => {
    console.log('🚀 Starting to load stories...');
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      } else {
        throw new Error('Supabase not available');
      }
    } catch (error) {
      console.error('❌ Failed to load stories:', error);
      console.log('🔄 Using fallback stories...');
      setStories([
        { id: 'cave-adventure', title: 'Cave Adventure', description: 'Explore a mysterious cave filled with treasures and dangers.', is_free: true, price: 0 },
      ]);
    } finally {
      console.log('🏁 Finished loading stories');
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const handlePurchase = async (planId: string, userEmail: string | null) => {
    if (!userEmail) {
      const email = prompt('Indtast venligst din e-mail for at fortsætte:');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Indtast venligst en gyldig e-mailadresse');
        return;
      }
      setUserEmail(email);
      localStorage.setItem('user_data', JSON.stringify({ email }));
      userEmail = email;
    }

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          userEmail,
          planId,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Fejl ved oprettelse af checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Fejl ved oprettelse af checkout');
    }
  };

  const checkAccess = (story: any): boolean => {
    // Free stories are accessible
    if (story.is_free) return true;

    // Check if user has lifetime access
    if (userPurchases.hasLifetimeAccess) return true;

    // Check if user has active subscription
    if (userPurchases.hasActiveSubscription) return true;

    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Indlæser magiske historier...</p>
        </div>
      </div>
    );
  }

  const freeStories = stories.filter(s => s.is_free || s.price === 0);
  const paidStories = stories.filter(s => !s.is_free && s.price > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
            Interaktive Eventyr
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Magiske historier med stemme-fortælling, interaktive valg og fantastiske visuelle effekter. 
            Perfekt til børn og familier.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => setShowJourney(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-10 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🗺️ Start Eventyr Rejse
            </button>
            
            {(userPurchases.hasActiveSubscription || userPurchases.hasLifetimeAccess) && (
              <div className="bg-green-600 px-6 py-4 rounded-lg font-semibold">
                ✅ {userPurchases.hasLifetimeAccess ? 'Livstids Adgang' : 'Aktivt Abonnement'} - Fuld Adgang
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-xl font-bold mb-2">Stemme Fortælling</h3>
              <p className="text-gray-300">Hver historie kommer til live med professionel stemme-fortælling</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-bold mb-2">Interaktive Valg</h3>
              <p className="text-gray-300">Træf beslutninger der former din historie</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-xl font-bold mb-2">Fantastiske Visuelle Effekter</h3>
              <p className="text-gray-300">Smukke billeder og videoer følger med hver historie</p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Stories Section */}
      {freeStories.length > 0 && (
        <section className="py-12 px-4 bg-black/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center">✨ Gratis Historier</h2>
            <p className="text-center text-gray-300 mb-8">Prøv disse historier gratis!</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {freeStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  hasAccess={checkAccess(story)}
                  userEmail={userEmail}
                  onSelect={(story) => router.push(`/story/${story.slug || story.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Premium Stories Section */}
      {paidStories.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center">⭐ Premium Historier</h2>
            <p className="text-center text-gray-300 mb-8">Lås eksklusive eventyr op</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {paidStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  hasAccess={checkAccess(story)}
                  userEmail={userEmail}
                  onSelect={(story) => {
                    if (checkAccess(story)) {
                      router.push(`/story/${story.slug || story.id}`);
                    } else {
                      router.push(`/purchase/${story.id}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-black/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Vælg Din Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {plans.map((plan) => {
              const isSubscription = plan.interval === 'month' || plan.interval === 'year';
              const isLifetime = plan.interval === null || plan.name.toLowerCase().includes('lifetime');
              
              return (
                <div
                  key={plan.id}
                  className={`${
                    isSubscription
                      ? 'bg-gradient-to-br from-yellow-600 to-orange-600 border-2 border-yellow-400'
                      : 'bg-white/10 backdrop-blur-sm border-2 border-yellow-500'
                  } p-8 rounded-lg`}
                >
                  <div className="text-center">
                    {isSubscription && (
                      <div className="text-sm font-bold mb-2 text-yellow-200">POPULÆRT</div>
                    )}
                    {isLifetime && (
                      <div className="text-sm font-bold mb-2 text-yellow-400">BEDSTE VÆRDI</div>
                    )}
                    <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                    <div className="text-4xl font-bold mb-2">${Number(plan.price).toFixed(2)}</div>
                    <div className={`${isSubscription ? 'text-gray-100' : 'text-gray-300'} mb-6`}>
                      {isSubscription ? 'per måned' : 'engangsbetaling'}
                    </div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ Alle historier låst op</li>
                      <li>✅ Nye historier tilføjes automatisk</li>
                      <li>✅ Stemme-fortælling</li>
                      <li>✅ Interaktive valg</li>
                      {isLifetime && <li>✅ Ingen månedlige gebyrer</li>}
                      {isSubscription && <li>✅ Annuller når som helst</li>}
                    </ul>
                    <button
                      onClick={() => handlePurchase(plan.id, userEmail)}
                      disabled={userPurchases.hasLifetimeAccess || (isSubscription && userPurchases.hasActiveSubscription)}
                      className={`${
                        isSubscription
                          ? 'bg-white text-orange-600 hover:bg-gray-100'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      } font-bold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {userPurchases.hasLifetimeAccess
                        ? 'Du har allerede livstids adgang'
                        : isSubscription && userPurchases.hasActiveSubscription
                        ? 'Du er allerede abonneret'
                        : 'Køb Nu'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journey Modal */}
      {showJourney && (
        <JourneyMap
          stories={stories}
          onExit={() => setShowJourney(false)}
          showIntro={true}
        />
      )}

      {/* Footer */}
      <footer className="bg-black/50 py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/" className="hover:text-white">Hjem</a></li>
                <li><a href="/admin" className="hover:text-white">Admin</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Juridisk</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/terms" className="hover:text-white">Vilkår</a></li>
                <li><a href="/privacy" className="hover:text-white">Privatliv</a></li>
                <li><a href="/refund" className="hover:text-white">Refusioner</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <p className="text-gray-400">Har du brug for hjælp? Kontakt os</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">© 2024</h4>
              <p className="text-gray-400 text-sm">TTS Historier Platform</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Story Card Component
interface StoryCardProps {
  story: any;
  hasAccess: boolean;
  userEmail: string | null;
  onSelect?: (story: any) => void;
}

function StoryCard({ story, hasAccess, userEmail, onSelect }: StoryCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-lg overflow-hidden hover:border-yellow-500 transition-all duration-300">
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
        <p className="text-gray-300 mb-4">{story.description}</p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            {story.is_free ? '🆓 GRATIS' : `$${Number(story.price).toFixed(2)}`}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-yellow-900 text-yellow-300">
            MEDIUM
          </span>
        </div>

        <PurchaseButton story={story} hasAccess={hasAccess} userEmail={userEmail} />
      </div>
    </div>
  );
}
