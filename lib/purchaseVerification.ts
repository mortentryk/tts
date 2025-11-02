import { supabaseAdmin } from './supabase';
import type { SupabaseStory } from './supabaseStoryManager';

/**
 * Check if a user has access to a story
 * Access is granted if:
 * 1. Story is free (is_free = true)
 * 2. User has lifetime access (one-time payment for all stories)
 * 3. User has an active subscription
 */
export async function canUserAccessStory(
  userEmail: string | null,
  story: Pick<SupabaseStory, 'id' | 'is_free'> & { is_free?: boolean }
): Promise<{ hasAccess: boolean; reason: 'free' | 'lifetime' | 'subscription' | 'none' }> {
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
    .select('id, subscription_status, subscription_period_end, lifetime_access')
    .eq('email', userEmail)
    .single();

  if (!user) {
    return { hasAccess: false, reason: 'none' };
  }

  // Check if user has lifetime access (highest priority)
  if (user.lifetime_access) {
    return { hasAccess: true, reason: 'lifetime' };
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
    .select('id, subscription_status, subscription_period_end, lifetime_access')
    .eq('email', userEmail)
    .single();

  if (!user) {
    return {
      purchasedStories: [],
      hasActiveSubscription: false,
      hasLifetimeAccess: false,
      subscriptionPeriodEnd: null,
    };
  }

  // Check subscription status
  const hasActiveSubscription =
    user.subscription_status === 'active' &&
    user.subscription_period_end &&
    new Date(user.subscription_period_end) > new Date();

  return {
    purchasedStories: [], // No longer tracking individual purchases
    hasActiveSubscription,
    hasLifetimeAccess: user.lifetime_access || false,
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

