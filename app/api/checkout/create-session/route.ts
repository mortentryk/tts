import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionSession, createLifetimeAccessSession } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userEmail, storyId, planId } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get or create user
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', userEmail)
      .single();

    if (!user) {
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({ email: userEmail })
        .select()
        .single();
      
      if (!newUser) {
        throw new Error('Failed to create user');
      }
      user = newUser;
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    // Get plan details
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('stripe_price_id, interval, name')
      .eq('id', planId)
      .single();

    if (!plan || !plan.stripe_price_id) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    let session;

    // Check if this is a subscription (interval is 'month' or 'year') or lifetime (interval is NULL)
    if (plan.interval === 'month' || plan.interval === 'year') {
      // Create subscription checkout session
      session = await createSubscriptionSession({
        userEmail,
        stripePriceId: plan.stripe_price_id,
      });
    } else if (plan.interval === null || plan.name.toLowerCase().includes('lifetime')) {
      // Create lifetime access checkout session (one-time payment)
      session = await createLifetimeAccessSession({
        userEmail,
        stripePriceId: plan.stripe_price_id,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Store session in database
    await supabaseAdmin.from('stripe_sessions').insert({
      stripe_session_id: session.id,
      user_email: userEmail,
      story_id: null,
      session_type: plan.interval === null || plan.name.toLowerCase().includes('lifetime') 
        ? 'lifetime-access' 
        : 'subscription',
      status: 'pending',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

