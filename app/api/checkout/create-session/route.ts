import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, createSubscriptionSession } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { createCheckoutSessionSchema, safeValidateBody } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body including email format
    const validation = safeValidateBody(createCheckoutSessionSchema, body);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    const { type, userEmail, storyId, planId } = validation.data;

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

    if (type === 'subscription' || type === 'lifetime') {
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
        .select('stripe_price_id, is_lifetime, price')
        .eq('id', planId)
        .single();

      if (!plan || !plan.stripe_price_id) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 404 }
        );
      }

      // For lifetime subscriptions, use one-time payment mode
      if (plan.is_lifetime || type === 'lifetime') {
        // Create one-time checkout session for lifetime access with proper metadata
        const stripe = (await import('@/lib/stripe')).stripe;
        const { getOrCreateCustomer } = await import('@/lib/stripe');
        if (!stripe) {
          throw new Error('Stripe is not configured');
        }
        
        // Get or create customer to save payment methods
        const customer = await getOrCreateCustomer(userEmail);
        
        // Normalize URL by adding https:// if protocol is missing
        let siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim();
        if (!siteUrl.match(/^https?:\/\//)) {
          siteUrl = `https://${siteUrl}`;
        }
        session = await stripe.checkout.sessions.create({
          customer: customer.id, // Use customer ID to save payment methods
          payment_method_types: ['card'],
          line_items: [
            {
              price: plan.stripe_price_id,
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${siteUrl}/cancel`,
          metadata: {
            type: 'lifetime',
            planId: planId,
            isLifetime: 'true',
          },
          // Save payment method for future one-click purchases
          payment_intent_data: {
            setup_future_usage: 'off_session',
          },
        });
      } else {
        // Regular recurring subscription
        session = await createSubscriptionSession({
          userEmail,
          stripePriceId: plan.stripe_price_id,
        });
      }
    } else {
      // Create one-time purchase checkout session
      if (!storyId) {
        return NextResponse.json(
          { error: 'storyId is required for one-time purchases' },
          { status: 400 }
        );
      }

      // Get story details
      const { data: story, error: storyError } = await supabaseAdmin
        .from('stories')
        .select('id, title, price, stripe_price_id')
        .eq('id', storyId)
        .single();

      if (storyError || !story) {
        console.error('Error fetching story:', storyError);
        return NextResponse.json(
          { error: 'Story not found or database error' },
          { status: 404 }
        );
      }

      if (!story.stripe_price_id) {
        console.error('Story missing stripe_price_id:', { storyId, title: story.title });
        return NextResponse.json(
          { 
            error: 'Denne historie er ikke konfigureret til salg. Kontakt venligst support.',
            details: 'Story is missing Stripe price configuration'
          },
          { status: 400 }
        );
      }

      // Use existing Stripe price
      try {
        session = await createCheckoutSession({
          userEmail,
          storyId: story.id,
          storyTitle: story.title,
          price: Number(story.price) || 0,
          stripePriceId: story.stripe_price_id,
        });
      } catch (stripeError: any) {
        console.error('Stripe API error:', stripeError);
        throw new Error(`Stripe error: ${stripeError.message || 'Failed to create checkout session'}`);
      }
    }

    // Store session in database (wrap in try-catch to not fail if this fails)
    try {
      await supabaseAdmin.from('stripe_sessions').insert({
        stripe_session_id: session.id,
        user_email: userEmail,
        story_id: type === 'one-time' ? storyId : null,
        session_type: type === 'one-time' ? 'checkout' : type,
        status: 'pending',
      });
    } catch (dbError: any) {
      // Log but don't fail the request - session is already created in Stripe
      console.error('Failed to store session in database:', dbError);
      // Continue - the session is still valid
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    // Provide more detailed error information
    const errorMessage = error.message || 'Failed to create checkout session';
    const errorDetails = error.stack || '';
    console.error('Error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

