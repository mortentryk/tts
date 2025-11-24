import { NextRequest, NextResponse } from 'next/server';
import { stripe, getOrCreateCustomer } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, storyId } = await request.json();

    if (!userEmail || !storyId) {
      return NextResponse.json(
        { error: 'userEmail and storyId are required' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', userEmail)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please complete a purchase first.' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userEmail);
    
    // Update user's stripe_customer_id if needed
    if (!user.stripe_customer_id) {
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
    }

    // Get saved payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    // If no saved payment method, return flag to use regular checkout
    if (paymentMethods.data.length === 0) {
      return NextResponse.json({ 
        useCheckout: true,
        message: 'No saved payment method found'
      });
    }

    // Get story details
    const { data: story } = await supabaseAdmin
      .from('stories')
      .select('id, title, price, stripe_price_id')
      .eq('id', storyId)
      .single();

    if (!story || !story.stripe_price_id) {
      return NextResponse.json(
        { error: 'Story not found or not configured for sale' },
        { status: 404 }
      );
    }

    // Get price details from Stripe to get currency
    const price = await stripe.prices.retrieve(story.stripe_price_id);
    const currency = price.currency || 'dkk';

    // Create Payment Intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(story.price) * 100), // Convert to cents
      currency: currency,
      customer: customer.id,
      payment_method: paymentMethods.data[0].id, // Use first saved payment method
      confirmation_method: 'automatic',
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?payment_intent={PAYMENT_INTENT_ID}`,
      metadata: {
        storyId: story.id,
        storyTitle: story.title,
        type: 'one-time',
        userEmail,
      },
    });

    // If payment requires action (3D Secure), return client secret
    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Payment succeeded immediately
    if (paymentIntent.status === 'succeeded') {
      // Record purchase
      await supabaseAdmin.from('purchases').upsert({
        user_id: user.id,
        story_id: story.id,
        stripe_session_id: paymentIntent.id,
        stripe_checkout_session_id: paymentIntent.id,
        amount_paid: Number(story.price),
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Other statuses (processing, requires_capture, etc.)
    return NextResponse.json({
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('One-click purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}

