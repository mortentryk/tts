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
    subscriptionPeriodEnd: null as string | null,
  });
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);

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
    setUserEmail(email);

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

  const checkAccess = (story: any): boolean => {
    // Free stories are accessible
    if (story.is_free) return true;

    // Check if user has active subscription
    if (userPurchases.hasActiveSubscription) return true;

    // Check if user purchased this specific story
    return userPurchases.purchasedStories.includes(story.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading magical stories...</p>
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
            Interactive Story Adventures
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Magical stories with voice narration, interactive choices, and stunning visuals. 
            Perfect for children and families.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => setShowJourney(true)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-10 py-4 rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🗺️ Start Adventure Journey
            </button>
            
            {userPurchases.hasActiveSubscription && (
              <div className="bg-green-600 px-6 py-4 rounded-lg font-semibold">
                ✅ Active Subscription - Full Access
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-xl font-bold mb-2">Voice Narration</h3>
              <p className="text-gray-300">Every story comes to life with professional voice narration</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-bold mb-2">Interactive Choices</h3>
              <p className="text-gray-300">Make decisions that shape your story</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-xl font-bold mb-2">Stunning Visuals</h3>
              <p className="text-gray-300">Beautiful images and videos accompany each story</p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Stories Section */}
      {freeStories.length > 0 && (
        <section className="py-12 px-4 bg-black/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center">✨ Free Stories</h2>
            <p className="text-center text-gray-300 mb-8">Try these stories for free!</p>
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
            <h2 className="text-3xl font-bold mb-4 text-center">⭐ Premium Stories</h2>
            <p className="text-center text-gray-300 mb-8">Unlock exclusive adventures</p>
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
          <h2 className="text-4xl font-bold mb-4 text-center">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Single Purchase */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border-2 border-yellow-500">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Individual Stories</h3>
                <div className="text-4xl font-bold mb-2">$2.99</div>
                <div className="text-gray-300 mb-6">per story</div>
                <ul className="text-left space-y-3 mb-8">
                  <li>✅ Lifetime access</li>
                  <li>✅ Voice narration</li>
                  <li>✅ Interactive choices</li>
                  <li>✅ All content</li>
                </ul>
                <p className="text-sm text-gray-400">One-time purchase</p>
              </div>
            </div>

            {/* Monthly Subscription */}
            {subscriptionPlans.find((p: any) => p.interval === 'month' && !p.is_lifetime) && (() => {
              const monthlyPlan = subscriptionPlans.find((p: any) => p.interval === 'month' && !p.is_lifetime);
              return (
                <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-8 rounded-lg border-2 border-yellow-400">
                  <div className="text-center">
                    <div className="text-sm font-bold mb-2 text-yellow-200">POPULAR</div>
                    <h3 className="text-2xl font-bold mb-4">All Access</h3>
                    <div className="text-4xl font-bold mb-2">${Number(monthlyPlan.price).toFixed(2)}</div>
                    <div className="text-gray-100 mb-6">per month</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ All stories unlocked</li>
                      <li>✅ New stories added automatically</li>
                      <li>✅ Cancel anytime</li>
                      <li>✅ Best value</li>
                    </ul>
                    <button
                      onClick={async () => {
                        const email = prompt('Enter your email to subscribe:');
                        if (!email) return;
                        
                        try {
                          const response = await fetch('/api/checkout/create-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'subscription',
                              userEmail: email,
                              planId: monthlyPlan.id,
                            }),
                          });
                          
                          const data = await response.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            alert(data.error || 'Failed to start subscription. Please try again.');
                          }
                        } catch (error) {
                          alert('Error starting subscription');
                        }
                      }}
                      className="bg-white text-orange-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100"
                    >
                      Subscribe Now
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
                    <div className="text-sm font-bold mb-2 text-purple-200">BEST VALUE</div>
                    <h3 className="text-2xl font-bold mb-4">Lifetime Access</h3>
                    <div className="text-4xl font-bold mb-2">${Number(lifetimePlan.price).toFixed(2)}</div>
                    <div className="text-gray-100 mb-6">one-time payment</div>
                    <ul className="text-left space-y-3 mb-8">
                      <li>✅ All stories unlocked forever</li>
                      <li>✅ Future stories included</li>
                      <li>✅ No recurring charges</li>
                      <li>✅ Lifetime updates</li>
                    </ul>
                    <button
                      onClick={async () => {
                        const email = prompt('Enter your email for lifetime access:');
                        if (!email) return;
                        
                        try {
                          const response = await fetch('/api/checkout/create-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'lifetime',
                              userEmail: email,
                              planId: lifetimePlan.id,
                            }),
                          });
                          
                          const data = await response.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            alert(data.error || 'Failed to start checkout. Please try again.');
                          }
                        } catch (error) {
                          alert('Error starting checkout');
                        }
                      }}
                      className="bg-white text-purple-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100"
                    >
                      Get Lifetime Access
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
                <li><a href="/" className="hover:text-white">Home</a></li>
                <li><a href="/admin" className="hover:text-white">Admin</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/terms" className="hover:text-white">Terms</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
                <li><a href="/refund" className="hover:text-white">Refunds</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <p className="text-gray-400">Need help? Contact us</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">© 2024</h4>
              <p className="text-gray-400 text-sm">TTS Story Platform</p>
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
            {story.is_free ? '🆓 FREE' : `$${Number(story.price).toFixed(2)}`}
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
