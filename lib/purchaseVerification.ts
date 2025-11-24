import { supabaseAdmin } from './supabase';
import type { SupabaseStory } from './supabaseStoryManager';

/**
 * Grace access helper: re-fetch subscription status from Stripe if user has
 * a recent subscription_id but status is not active, to confirm before denying access
 */
async function checkSubscriptionGraceAccess(
  userId: string,
  subscriptionId: string | null,
  stripeCustomerId: string | null
): Promise<{ hasAccess: boolean; status: string | null }> {
  if (!subscriptionId && !stripeCustomerId) {
    return { hasAccess: false, status: null };
  }

  // Only check if we have Stripe configured
  const stripe = (await import('./stripe')).stripe;
  if (!stripe) {
    return { hasAccess: false, status: null };
  }

  try {
    let subscription: any = null;

    // Try to fetch by subscription ID first
    if (subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (error: any) {
        // Subscription might be deleted, try customer lookup
        if (stripeCustomerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all',
            limit: 1,
          });
          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0];
          }
        }
      }
    } else if (stripeCustomerId) {
      // Fallback to customer lookup
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
      }
    }

    if (!subscription) {
      return { hasAccess: false, status: null };
    }

    // Update user record with latest status from Stripe
    const updateData: any = {
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      subscription_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    };

    // Extract and update subscription price ID if available
    const subscriptionPriceId = subscription.items?.data?.[0]?.price?.id || null;
    if (subscriptionPriceId) {
      updateData.subscription_price_id = subscriptionPriceId;
    }

    await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId);

    // Check if subscription is active
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    const now = new Date();

    const hasAccess = isActive && (!periodEnd || periodEnd > now || periodEnd.getFullYear() >= 2099);

    return { hasAccess, status: subscription.status };
  } catch (error) {
    console.error('Error checking subscription grace access:', error);
    return { hasAccess: false, status: null };
  }
}

/**
 * Check if a user has access to a story
 * Access is granted if:
 * 1. Story is free (is_free = true)
 * 2. User has purchased the story individually
 * 3. User has an active subscription
 * 
 * @param userEmail - User email (for backward compatibility) or null
 * @param userId - User ID from Supabase Auth (preferred)
 */
export async function canUserAccessStory(
  userEmail: string | null,
  story: Pick<SupabaseStory, 'id' | 'is_free'> & { is_free?: boolean },
  userId?: string | null
): Promise<{ hasAccess: boolean; reason: 'free' | 'purchased' | 'subscription' | 'none' }> {
  // If story is free, grant access
  if (story.is_free) {
    return { hasAccess: true, reason: 'free' };
  }

  // If no user identifier, deny access
  if (!userEmail && !userId) {
    return { hasAccess: false, reason: 'none' };
  }

  // Get user - prefer userId (from auth) over email (legacy)
  let user;
  if (userId) {
    // Use auth_user_id to find the user record
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status, subscription_period_end, subscription_id, stripe_customer_id')
      .eq('auth_user_id', userId)
      .single();
    user = data;
  } else if (userEmail) {
    // Fallback to email lookup (legacy)
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status, subscription_period_end, subscription_id, stripe_customer_id')
      .eq('email', userEmail)
      .single();
    user = data;
  }

  if (!user) {
    return { hasAccess: false, reason: 'none' };
  }

  // Grace access check: if subscription status is not active but user has subscription_id,
  // re-fetch from Stripe to confirm status before denying access
  if (user.subscription_status !== 'active' && (user.subscription_id || user.stripe_customer_id)) {
    const graceCheck = await checkSubscriptionGraceAccess(
      user.id,
      user.subscription_id || null,
      user.stripe_customer_id || null
    );
    
    if (graceCheck.hasAccess) {
      // Re-fetch user to get updated status
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .select('subscription_status, subscription_period_end')
        .eq('id', user.id)
        .single();
      
      if (updatedUser) {
        user.subscription_status = updatedUser.subscription_status;
        user.subscription_period_end = updatedUser.subscription_period_end;
      }
    }
  }

  // Check if user has active subscription
  if (user.subscription_status === 'active') {
    // Lifetime subscriptions have null or far-future period_end
    if (!user.subscription_period_end) {
      return { hasAccess: true, reason: 'subscription' };
    }
    
    // Safely parse subscription_period_end (may be string or Date)
    const periodEndValue = user.subscription_period_end;
    const periodEnd = typeof periodEndValue === 'string' 
      ? new Date(periodEndValue)
      : periodEndValue instanceof Date
      ? periodEndValue
      : new Date(periodEndValue);
    
    // Check if date is valid
    if (isNaN(periodEnd.getTime())) {
      // Invalid date, treat as lifetime
      return { hasAccess: true, reason: 'subscription' };
    }
    
    // Check if subscription hasn't expired
    const now = new Date();
    // Treat dates far in the future (like 2099) as lifetime
    if (periodEnd.getFullYear() >= 2099 || periodEnd > now) {
      return { hasAccess: true, reason: 'subscription' };
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
 * 
 * @param userEmail - User email (for backward compatibility) or null
 * @param userId - User ID from Supabase Auth (preferred)
 */
export async function getUserPurchases(userEmail: string | null, userId?: string | null) {
  if (!userEmail && !userId) {
    return {
      purchasedStories: [],
      hasActiveSubscription: false,
      subscriptionPeriodEnd: null,
    };
  }

  // Get user - prefer userId (from auth) over email (legacy)
  let user;
  if (userId) {
    // Use auth_user_id to find the user record
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status, subscription_period_end')
      .eq('auth_user_id', userId)
      .single();
    user = data;
  } else if (userEmail) {
    // Fallback to email lookup (legacy)
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, subscription_status, subscription_period_end')
      .eq('email', userEmail)
      .single();
    user = data;
  }

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

  // Check subscription status (including lifetime subscriptions)
  let hasActiveSubscription = false;
  if (user.subscription_status === 'active') {
    if (!user.subscription_period_end) {
      hasActiveSubscription = true; // null means lifetime
    } else {
      // Safely parse subscription_period_end (may be string or Date)
      const periodEndValue = user.subscription_period_end;
      const periodEnd = typeof periodEndValue === 'string' 
        ? new Date(periodEndValue)
        : periodEndValue instanceof Date
        ? periodEndValue
        : new Date(periodEndValue);
      
      // Check if date is valid
      if (isNaN(periodEnd.getTime())) {
        // Invalid date, treat as lifetime
        hasActiveSubscription = true;
      } else {
        // Treat dates far in the future (like 2099) as lifetime, or if not expired
        const now = new Date();
        hasActiveSubscription = periodEnd.getFullYear() >= 2099 || periodEnd > now;
      }
    }
  }

  return {
    purchasedStories: purchasedStoryIds,
    hasActiveSubscription,
    subscriptionPeriodEnd: user.subscription_period_end,
  };
}

/**
 * Get user's email from token/localStorage (LEGACY - for backward compatibility)
 * @deprecated Use getCurrentUser from @/lib/authClient instead
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
 * Set user email in localStorage (LEGACY - for backward compatibility)
 * @deprecated This is only used for guest checkout flow
 */
export function setUserEmail(email: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('user_data', JSON.stringify({ email }));
  } catch {
    // Ignore errors
  }
}

