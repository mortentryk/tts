import { supabaseAdmin } from './supabase';
import type { SupabaseStory } from './supabaseStoryManager';

/**
 * Check if a user has access to a story
 * Access is granted if:
 * 1. Story is free (is_free = true)
 * 2. User has purchased the story individually
 * 3. User has an active subscription
 */
export async function canUserAccessStory(
  userEmail: string | null,
  story: Pick<SupabaseStory, 'id' | 'is_free'>
): Promise<{ hasAccess: boolean; reason: 'free' | 'purchased' | 'subscription' | 'none' }> {
  // If story is free, grant access
  if (story.is_free) {
    return { hasAccess: true, reason: 'free' };
  }

  // If no user email, deny access
  if (!userEmail) {
    return { hasAccess: false, reason: 'none' };
  }

  // Get or create user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, subscription_status, subscription_period_end')
    .eq('email', userEmail)
    .single();

  if (!user) {
    return { hasAccess: false, reason: 'none' };
  }

  // Check if user has active subscription
  if (user.subscription_status === 'active') {
    // Check if subscription hasn't expired
    if (user.subscription_period_end) {
      const now = new Date();
      const periodEnd = new Date(user.subscription_period_end);
      if (periodEnd > now) {
        return { hasAccess: true, reason: 'subscription' };
      }
    }
  }

  // Check if user has purchased this specific story
  const { data: purchase } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('story_id', story.id)
    .single();

  if (purchase) {
    return { hasAccess: true, reason: 'purchased' };
  }

  return { hasAccess: false, reason: 'none' };
}

/**
 * Get user's purchased stories and subscription status
 */
export async function getUserPurchases(userEmail: string | null) {
  if (!userEmail) {
    return {
      purchasedStories: [],
      hasActiveSubscription: false,
      subscriptionPeriodEnd: null,
    };
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, subscription_status, subscription_period_end')
    .eq('email', userEmail)
    .single();

  if (!user) {
    return {
      purchasedStories: [],
      hasActiveSubscription: false,
      subscriptionPeriodEnd: null,
    };
  }

  // Get purchased stories
  const { data: purchases } = await supabaseAdmin
    .from('purchases')
    .select('story_id')
    .eq('user_id', user.id);

  const purchasedStoryIds = purchases?.map((p) => p.story_id) || [];

  // Check subscription status
  const hasActiveSubscription =
    user.subscription_status === 'active' &&
    user.subscription_period_end &&
    new Date(user.subscription_period_end) > new Date();

  return {
    purchasedStories: purchasedStoryIds,
    hasActiveSubscription,
    subscriptionPeriodEnd: user.subscription_period_end,
  };
}

/**
 * Get user's email from token/localStorage
 * This is a simple implementation - in production, use JWT or similar
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.email || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Set user email in localStorage
 */
export function setUserEmail(email: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('user_data', JSON.stringify({ email }));
  } catch {
    // Ignore errors
  }
}

