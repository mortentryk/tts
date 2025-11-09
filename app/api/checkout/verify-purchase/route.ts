import { NextRequest, NextResponse } from 'next/server';
import { verifyCheckoutSession } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session with Stripe
    const session = await verifyCheckoutSession(sessionId);

    if (session.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get or create user
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.customerEmail)
      .single();

    if (!user && session.customerEmail) {
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({ email: session.customerEmail })
        .select()
        .single();
      
      if (newUser) {
        user = newUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { type, storyId } = session.metadata || {};

    // Update session status
    await supabaseAdmin
      .from('stripe_sessions')
      .update({ status: 'completed' })
      .eq('stripe_session_id', sessionId);

    // Handle based on purchase type
    if (type === 'subscription') {
      // Update user subscription status
      // Note: This will also be handled by webhooks, but do it here for immediate access
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          // subscription_period_end will be set by webhook
        })
        .eq('id', user.id);
    } else if (type === 'lifetime') {
      // Handle lifetime subscription (one-time payment for permanent access)
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_id: sessionId,
          subscription_period_end: new Date('2099-12-31').toISOString(),
        })
        .eq('id', user.id);
    } else if (type === 'one-time' && storyId) {
      // Record the purchase
      await supabaseAdmin.from('purchases').upsert({
        user_id: user.id,
        story_id: storyId,
        stripe_session_id: sessionId,
        stripe_checkout_session_id: sessionId,
        amount_paid: 0, // Can get from Stripe if needed
      });
    }

    return NextResponse.json({
      success: true,
      type,
      email: session.customerEmail,
    });
  } catch (error: any) {
    console.error('Error verifying purchase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify purchase' },
      { status: 500 }
    );
  }
}

