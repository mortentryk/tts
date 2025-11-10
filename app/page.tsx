'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JourneyMap from './components/JourneyMap';
import PurchaseButton from '../components/PurchaseButton';
import EmailCaptureDialog from '../components/EmailCaptureDialog';
import { getUserEmail, getUserPurchases, setUserEmail } from '@/lib/purchaseVerification';
import type { SupabaseStory } from '@/lib/supabaseStoryManager';

// Extended story type for UI with additional fields
type StoryWithUI = SupabaseStory & {
  price?: number;
};

export default function Home() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJourney, setShowJourney] = useState(false);
  const [userEmail, setUserEmailState] = useState<string | null>(null);
  const [userPurchases, setUserPurchases] = useState({
    purchasedStories: [] as string[],
    hasActiveSubscription: false,
    subscriptionPeriodEnd: null as string | null,
  });
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [emailDialog, setEmailDialog] = useState<{
    isOpen: boolean;
    onConfirm: (email: string) => void;
    title: string;
    message: string;
    loading: boolean;
  }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
    loading: false,
  });

  useEffect(() => {
    loadStories();
    loadUserData();
    loadSubscriptionPlans();
  }, []);

  const loadSubscriptionPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      if (response.ok) {
        const plans = await response.json();
        setSubscriptionPlans(plans);
      }
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  const loadUserData = async () => {
    const email = getUserEmail();
    setUserEmailState(email);

    if (email) {
      const purchases = await getUserPurchases(email);
      setUserPurchases(purchases);
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

  const checkAccess = (story: StoryWithUI): boolean => {
    // Free stories are accessible
    if (story.is_free) return true;

    // Check if user has active subscription
    if (userPurchases.hasActiveSubscription) return true;

    // Check if user purchased this specific story
    return userPurchases.purchasedStories.includes(story.id);
  };

  const openEmailDialog = (
    title: string,
    message: string,
    onConfirm: (email: string) => Promise<void>
  ) => {
    setEmailDialog({
      isOpen: true,
      onConfirm: async (email: string) => {
        setEmailDialog((prev) => ({ ...prev, loading: true }));
        try {
          await onConfirm(email);
        } finally {
          setEmailDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
      title,
      message,
      loading: false,
    });
  };

  const handleSubscription = async (planId: string, type: 'subscription' | 'lifetime') => {
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userEmail: userEmailState,
          planId,
        }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Kunne ikke starte checkout. Prøv venligst igen.');
      }
    } catch (error) {
      alert('Fejl ved start af checkout');
    }
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
            Interaktive Historier
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
              🗺️ Start Eventyrrejse
            </button>
            
            {userPurchases.hasActiveSubscription && (
              <div className="bg-green-600 px-6 py-4 rounded-lg font-semibold">
                ✅ Aktivt Abonnement - Fuld Adgang
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-xl font-bold mb-2">Stemme-fortælling</h3>
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
              <p className="text-gray-300">Smukke billeder og videoer ledsager hver historie</p>
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
                  userEmail={userEmailState}
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
            <p className="text-center text-gray-300 mb-8">Lås op for eksklusive eventyr</p>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {paidStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  hasAccess={checkAccess(story)}
                  userEmail={userEmailState}
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
          <h2 className="text-4xl font-bold mb-4 text-center">Vælg Dit Abonnement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Single Purchase */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border-2 border-yellow-500">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Enkelt Historier</h3>
                <div className="text-4xl font-bold mb-2">$2.99</div>
                <div className="text-gray-300 mb-6">per historie</div>
                <ul className="text-left space-y-3 mb-8">
                  <li>✅ Livstidsadgang</li>
                  <li>✅ Stemme-fortælling</li>
                  <li>✅ Interaktive valg</li>
                  <li>✅ Alt indhold</li>
                </ul>
                <p className="text-sm text-gray-400">Engangsbetaling</p>
              </div>
            </div>

            {/* Monthly Subscription */}
            {subscriptionPlans.find((p: any) => p.interval === 'month' && !p.is_lifetime) && (() => {
              const monthlyPlan = subscriptionPlans.find((p: any) => p.interval === 'month' && !p.is_lifetime);
              return (
                <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-8 rounded-lg border-2 border-yellow-400">
                  <div className="text-center">
                    <div className="text-sm font-bold mb-2 text-yellow-200">POPULÆRT</div>
                    <h3 className="text-2xl font-bold mb-4">Fuld Adgang</h3>
                    <div className="text-4xl font-bold mb-2">${Number(monthlyPlan.price).toFixed(2)}</div>
                    <div className="text-gray-100 mb-6">per måned</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ Alle historier låst op</li>
                      <li>✅ Nye historier tilføjes automatisk</li>
                      <li>✅ Opsig når som helst</li>
                      <li>✅ Bedste værdi</li>
                    </ul>
                    <button
                      onClick={() => {
                        if (userEmailState) {
                          handleSubscription(monthlyPlan.id, 'subscription');
                        } else {
                          openEmailDialog(
                            'Abonner nu',
                            'Indtast din email-adresse for at abonnere:',
                            async (email: string) => {
                              setUserEmail(email);
                              setUserEmailState(email);
                              await handleSubscription(monthlyPlan.id, 'subscription');
                            }
                          );
                        }
                      }}
                      className="bg-white text-orange-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100"
                    >
                      Abonner Nu
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Lifetime Subscription */}
            {subscriptionPlans.find((p: any) => p.is_lifetime) && (() => {
              const lifetimePlan = subscriptionPlans.find((p: any) => p.is_lifetime);
              return (
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 rounded-lg border-2 border-purple-400">
                  <div className="text-center">
                    <div className="text-sm font-bold mb-2 text-purple-200">BEDSTE VÆRDI</div>
                    <h3 className="text-2xl font-bold mb-4">Livstidsadgang</h3>
                    <div className="text-4xl font-bold mb-2">${Number(lifetimePlan.price).toFixed(2)}</div>
                    <div className="text-gray-100 mb-6">engangsbetaling</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ Alle historier låst op for evigt</li>
                      <li>✅ Fremtidige historier inkluderet</li>
                      <li>✅ Ingen tilbagevendende gebyrer</li>
                      <li>✅ Livstidsopdateringer</li>
                    </ul>
                    <button
                      onClick={() => {
                        if (userEmailState) {
                          handleSubscription(lifetimePlan.id, 'lifetime');
                        } else {
                          openEmailDialog(
                            'Få Livstidsadgang',
                            'Indtast din email-adresse for livstidsadgang:',
                            async (email: string) => {
                              setUserEmail(email);
                              setUserEmailState(email);
                              await handleSubscription(lifetimePlan.id, 'lifetime');
                            }
                          );
                        }
                      }}
                      className="bg-white text-purple-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100"
                    >
                      Få Livstidsadgang
                    </button>
                  </div>
                </div>
              );
            })()}
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

      {/* Email Capture Dialog */}
      <EmailCaptureDialog
        isOpen={emailDialog.isOpen}
        onClose={() => setEmailDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={emailDialog.onConfirm}
        title={emailDialog.title}
        message={emailDialog.message}
        loading={emailDialog.loading}
      />
    </div>
  );
}

// Story Card Component
interface StoryCardProps {
  story: StoryWithUI;
  hasAccess: boolean;
  userEmail: string | null;
  onSelect?: (story: StoryWithUI) => void;
}

function StoryCard({ story, hasAccess, userEmail, onSelect }: StoryCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on the purchase button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onSelect?.(story);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(story);
    }
  };

  return (
    <div
      role="button"
      tabIndex={onSelect ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-lg overflow-hidden transition-all duration-300 ${
        onSelect ? 'hover:border-yellow-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500' : ''
      }`}
    >
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
            {story.is_free ? '🆓 GRATIS' : `$${Number(story.price || 0).toFixed(2)}`}
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
