import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, createSubscriptionSession } from '@/lib/stripe';
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

    let session;

    if (type === 'subscription') {
      // Create subscription checkout session
      if (!planId) {
        return NextResponse.json(
          { error: 'planId is required for subscriptions' },
          { status: 400 }
        );
      }

      // Get subscription plan details
      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('stripe_price_id')
        .eq('id', planId)
        .single();

      if (!plan || !plan.stripe_price_id) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 404 }
        );
      }

      session = await createSubscriptionSession({
        userEmail,
        stripePriceId: plan.stripe_price_id,
      });
    } else {
      // Create one-time purchase checkout session
      if (!storyId) {
        return NextResponse.json(
          { error: 'storyId is required for one-time purchases' },
          { status: 400 }
        );
      }

      // Get story details
      const { data: story } = await supabaseAdmin
        .from('stories')
        .select('id, title, price, stripe_price_id')
        .eq('id', storyId)
        .single();

      if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      }

      if (story.stripe_price_id) {
        // Use existing Stripe price
        session = await createCheckoutSession({
          userEmail,
          storyId: story.id,
          storyTitle: story.title,
          price: Number(story.price),
          stripePriceId: story.stripe_price_id,
        });
      } else {
        // Create Stripe product and price on-the-fly
        // Note: In production, you should create products in Stripe dashboard or via admin
        return NextResponse.json(
          { error: 'Story not configured for sale. Please contact support.' },
          { status: 400 }
        );
      }
    }

    // Store session in database
    await supabaseAdmin.from('stripe_sessions').insert({
      stripe_session_id: session.id,
      user_email: userEmail,
      story_id: type === 'subscription' ? null : storyId,
      session_type: type,
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

