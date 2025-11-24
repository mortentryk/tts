'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import JourneyMap from './components/JourneyMap';
import PurchaseButton from '../components/PurchaseButton';
import EmailCaptureDialog from '../components/EmailCaptureDialog';
import InstallPWAButton from '../components/InstallPWAButton';
import { getUserEmail, getUserPurchases, setUserEmail } from '@/lib/purchaseVerification';
import { getCurrentUser, onAuthStateChange } from '@/lib/authClient';
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
  const [userId, setUserId] = useState<string | null>(null);
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

    // Listen to auth state changes
    const subscription = onAuthStateChange(async (authUser) => {
      if (authUser) {
        setUserEmailState(authUser.email);
        setUserId(authUser.id);
        const purchases = await getUserPurchases(authUser.email, authUser.id);
        setUserPurchases(purchases);
      } else {
        setUserEmailState(null);
        setUserId(null);
        setUserPurchases({
          purchasedStories: [],
          hasActiveSubscription: false,
          subscriptionPeriodEnd: null,
        });
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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
    // Try to get authenticated user first
    const authUser = await getCurrentUser();
    
    if (authUser) {
      setUserEmailState(authUser.email);
      setUserId(authUser.id);
      const purchases = await getUserPurchases(authUser.email, authUser.id);
      setUserPurchases(purchases);
    } else {
      // Fallback to legacy localStorage email
      const email = getUserEmail();
      setUserEmailState(email);
      setUserId(null);

      if (email) {
        const purchases = await getUserPurchases(email);
        setUserPurchases(purchases);
      }
    }
  };

  const loadStories = async () => {
    console.log('🚀 Starting to load stories...');
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Stories loaded from API:', data);
        // Debug: Log pricing info for each story
        data.forEach((story: any) => {
          console.log(`📖 Story: ${story.title}`, {
            is_free: story.is_free,
            price: story.price,
            stripe_price_id: story.stripe_price_id,
            willShowAsPaid: !story.is_free && (story.price ?? 0) > 0
          });
        });
        setStories(data);
      } else {
        throw new Error('Supabase not available');
      }
    } catch (error) {
      console.error('❌ Failed to load stories:', error);
      console.log('🔄 Using fallback stories...');
      setStories([
        { 
          id: 'cave-adventure', 
          slug: 'cave-adventure',
          title: 'Cave Adventure', 
          description: 'Explore a mysterious cave filled with treasures and dangers.', 
          lang: 'en',
          is_published: true,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_free: true, 
          price: 0 
        },
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

  const handleSubscription = async (planId: string, type: 'subscription' | 'lifetime', emailOverride?: string) => {
    const emailToUse = emailOverride || userEmail;
    
    if (!emailToUse) {
      alert('Email er påkrævet for at abonnere');
      return;
    }
    
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userEmail: emailToUse,
          planId,
        }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Kunne ikke starte betaling. Prøv venligst igen.');
      }
    } catch (error) {
      alert('Fejl ved start af betaling');
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

  // Filter stories: a story is free if is_free is explicitly true OR price is 0
  // A story is paid if is_free is explicitly false AND price > 0
  // Note: is_free defaults to true in database, so must be explicitly set to false
  const freeStories = stories.filter(s => s.is_free === true || (s.price ?? 0) === 0);
  const paidStories = stories.filter(s => s.is_free === false && (s.price ?? 0) > 0);
  
  console.log('💰 Story filtering:', {
    total: stories.length,
    free: freeStories.length,
    paid: paidStories.length,
    freeStories: freeStories.map(s => ({ title: s.title, is_free: s.is_free, price: s.price })),
    paidStories: paidStories.map(s => ({ title: s.title, is_free: s.is_free, price: s.price }))
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-pink-400 bg-clip-text text-transparent">
            Storific Stories
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Magiske historier med stemme-fortælling, interaktive valg og fantastiske visuelle effekter. 
            Perfekt til børn og familier.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 items-center">
            <InstallPWAButton />
            
            {userId ? (
              <>
                <button
                  onClick={() => router.push('/library')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors"
                >
                  📚 Min Bibliotek
                </button>
                <button
                  onClick={() => {
                    import('@/lib/authClient').then(({ signOut }) => {
                      signOut().then(() => {
                        router.push('/');
                      });
                    });
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold transition-colors"
                >
                  Log ud
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors"
              >
                Log ind
              </button>
            )}
            
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

      {/* My Library Section - Link to library page for logged in users */}
      {userId && (
        <section className="py-12 px-4 bg-gradient-to-b from-yellow-900/20 to-transparent">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">📚 Min Bibliotek</h2>
            <p className="text-gray-300 mb-6">
              {userPurchases.hasActiveSubscription 
                ? 'Du har fuld adgang til alle historier med dit abonnement!' 
                : userPurchases.purchasedStories.length > 0
                ? `Du har ${userPurchases.purchasedStories.length} købte historier`
                : 'Se dine købte historier og profil'}
            </p>
            <button
              onClick={() => router.push('/library')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <span>📚</span>
              <span>Gå til Bibliotek</span>
            </button>
          </div>
        </section>
      )}

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
            <p className="text-center text-gray-300 mb-8">Lås op for eksklusive eventyr</p>
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

      {/* Journey Section */}
      <section className="py-12 px-4 bg-black/30">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">🗺️ Start Eventyrrejse</h2>
          <p className="text-gray-300 mb-8">Udforsk alle historier i en interaktiv rejse</p>
          <button
            onClick={() => setShowJourney(true)}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-10 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🗺️ Start Eventyrrejse
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-black/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Vælg Dit Abonnement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Single Purchase */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border-2 border-yellow-500">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Enkelt Historier</h3>
                <div className="text-4xl font-bold mb-2">19 kr.</div>
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
              const regularPrice = monthlyPlan.regular_price ? Number(monthlyPlan.regular_price) : null;
              const offerPrice = Number(monthlyPlan.price); // Offer price from database
              return (
                <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-8 rounded-lg border-2 border-yellow-400">
                  <div className="text-center">
                    <div className="text-sm font-bold mb-2 text-yellow-200">POPULÆRT</div>
                    <h3 className="text-2xl font-bold mb-4">Fuld Adgang</h3>
                    <div className="mb-2">
                      <div className="text-4xl font-bold">{offerPrice.toFixed(0)} kr.</div>
                      {regularPrice && regularPrice > offerPrice && (
                        <div className="text-lg text-gray-200 line-through mt-1">
                          {regularPrice.toFixed(0)} kr.
                        </div>
                      )}
                    </div>
                    <div className="text-gray-100 mb-6">per måned</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ Alle historier låst op</li>
                      <li>✅ Nye historier tilføjes automatisk</li>
                      <li>✅ Opsig når som helst</li>
                      <li>✅ Bedste værdi</li>
                    </ul>
                    <button
                      onClick={() => {
                        if (userEmail) {
                          handleSubscription(monthlyPlan.id, 'subscription');
                        } else {
                          openEmailDialog(
                            'Abonner nu',
                            'Indtast din email-adresse for at abonnere:',
                            async (email: string) => {
                              setUserEmail(email);
                              setUserEmailState(email);
                              await handleSubscription(monthlyPlan.id, 'subscription', email);
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
                    <div className="text-4xl font-bold mb-2">{Number(lifetimePlan.price).toFixed(0)} kr.</div>
                    <div className="text-gray-100 mb-6">engangsbetaling</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ Alle historier låst op for evigt</li>
                      <li>✅ Fremtidige historier inkluderet</li>
                      <li>✅ Ingen tilbagevendende gebyrer</li>
                      <li>✅ Livstidsopdateringer</li>
                    </ul>
                    <button
                      onClick={() => {
                        if (userEmail) {
                          handleSubscription(lifetimePlan.id, 'lifetime');
                        } else {
                          openEmailDialog(
                            'Få Livstidsadgang',
                            'Indtast din email-adresse for livstidsadgang:',
                            async (email: string) => {
                              setUserEmail(email);
                              setUserEmailState(email);
                              await handleSubscription(lifetimePlan.id, 'lifetime', email);
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
              <p className="text-gray-400 text-sm">Storific Stories</p>
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
            {story.is_free ? '🆓 GRATIS' : `${Number(story.price || 0).toFixed(0)} kr.`}
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
