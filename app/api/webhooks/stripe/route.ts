import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    // Idempotency check: skip if event already processed
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_webhooks')
      .select('id, processed')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return NextResponse.json({ received: true, skipped: true });
      }
      // Event exists but not processed - update it and continue
      await supabaseAdmin
        .from('stripe_webhooks')
        .update({
          event_type: event.type,
          event_data: event.data,
          processed: false,
        })
        .eq('event_id', event.id);
    } else {
      // Log new webhook event
      try {
        await supabaseAdmin.from('stripe_webhooks').insert({
          event_id: event.id,
          event_type: event.type,
          event_data: event.data,
          processed: false,
        });
      } catch (insertError: any) {
        // If insert fails due to unique constraint, event already exists - update it
        if (insertError.code === '23505') { // PostgreSQL unique violation
          await supabaseAdmin
            .from('stripe_webhooks')
            .update({
              event_type: event.type,
              event_data: event.data,
              processed: false,
            })
            .eq('event_id', event.id);
        } else {
          throw insertError;
        }
      }
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object);
        break;
      }

      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdate(event.data.object);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }

      case 'invoice.payment_succeeded': {
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('stripe_webhooks')
      .update({ processed: true })
      .eq('event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);

    // Log error
    try {
      await supabaseAdmin.from('stripe_webhooks').insert({
        event_id: `error_${Date.now()}`,
        event_type: 'error',
        event_data: { error: error.message },
        processed: false,
        error_message: error.message,
      });
    } catch (e) {
      // Ignore logging errors
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completed:', session.id);

  const customerEmail = session.customer_details?.email || session.customer_email;

  if (!customerEmail) {
    console.error('No customer email in session');
    return;
  }

  // Get or create user
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('email', customerEmail)
    .single();

  if (!user) {
    const { data: newUser } = await supabaseAdmin
      .from('users')
      .insert({ email: customerEmail })
      .select()
      .single();
    
    if (newUser) {
      user = newUser;
    }
  }

  if (!user) {
    console.error('Failed to create/find user');
    return;
  }

  // Update Stripe customer ID if available
  if (session.customer) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: session.customer })
      .eq('id', user.id);
  }

  // Handle based on session mode
  const { type, storyId, planId, isLifetime } = session.metadata || {};

  if (session.mode === 'subscription') {
    // Get subscription ID from line items
    const subscriptionId = session.subscription;

    if (subscriptionId) {
      // Get subscription details
      const stripe = (await import('@/lib/stripe')).stripe;
      if (!stripe) {
        console.error('Stripe not configured');
        return;
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

      // Extract subscription price ID from line items
      const subscriptionPriceId = subscription.items?.data?.[0]?.price?.id || 
                                   session.line_items?.data?.[0]?.price?.id ||
                                   null;

      // Update user subscription with price ID tracking
      const updateData: any = {
        subscription_status: subscription.status,
        subscription_id: subscriptionId,
        subscription_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString() 
          : null,
      };

      // Add subscription_price_id if column exists (graceful degradation)
      if (subscriptionPriceId) {
        updateData.subscription_price_id = subscriptionPriceId;
      }

      await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', user.id);
    }
  } else if (type === 'lifetime' || isLifetime === 'true') {
    // Handle lifetime subscription (one-time payment that grants permanent access)
    // Set subscription_period_end to far future (2099-12-31) to indicate lifetime
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_id: session.id, // Use session ID as identifier
        subscription_period_end: new Date('2099-12-31').toISOString(),
      })
      .eq('id', user.id);
  } else if (type === 'one-time' && storyId) {
    // Record purchase
    await supabaseAdmin.from('purchases').upsert({
      user_id: user.id,
      story_id: storyId,
      stripe_session_id: session.id,
      stripe_checkout_session_id: session.id,
      amount_paid: (session.amount_total || 0) / 100, // Convert from cents
    });
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  console.log('Subscription updated:', subscription.id);

  const customerId = subscription.customer;

  // Find user by customer ID
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .single();

  // Fallback: if user not found by customer ID, try email lookup
  if (!user) {
    const stripe = (await import('@/lib/stripe')).stripe;
    if (stripe) {
      try {
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId) as any;
        const customerEmail = customer.email || customer.metadata?.email;

        if (customerEmail) {
          // Find user by email
          const { data: userByEmail } = await supabaseAdmin
            .from('users')
            .select('id, stripe_customer_id')
            .eq('email', customerEmail)
            .single();

          if (userByEmail) {
            user = userByEmail;
            // Update stripe_customer_id if missing
            if (!user.stripe_customer_id) {
              await supabaseAdmin
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching customer from Stripe:', error);
      }
    }

    if (!user) {
      console.error('User not found for subscription:', customerId);
      return;
    }
  }

  // Extract subscription price ID from line items
  const subscriptionPriceId = subscription.items?.data?.[0]?.price?.id || null;

  // Update subscription status
  const subscriptionData = subscription as any;
  const updateData: any = {
    subscription_status: subscriptionData.status,
    subscription_id: subscriptionData.id,
    subscription_period_end: subscriptionData.current_period_end 
      ? new Date(subscriptionData.current_period_end * 1000).toISOString() 
      : null,
  };

  // Add subscription_price_id if available
  if (subscriptionPriceId) {
    updateData.subscription_price_id = subscriptionPriceId;
  }

  await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', user.id);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  const customerId = subscription.customer;

  // Find user by customer ID
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .single();

  // Fallback: if user not found by customer ID, try email lookup
  if (!user) {
    const stripe = (await import('@/lib/stripe')).stripe;
    if (stripe) {
      try {
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId) as any;
        const customerEmail = customer.email || customer.metadata?.email;

        if (customerEmail) {
          // Find user by email
          const { data: userByEmail } = await supabaseAdmin
            .from('users')
            .select('id, stripe_customer_id')
            .eq('email', customerEmail)
            .single();

          if (userByEmail) {
            user = userByEmail;
            // Update stripe_customer_id if missing
            if (!user.stripe_customer_id) {
              await supabaseAdmin
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching customer from Stripe:', error);
      }
    }

    if (!user) {
      console.error('User not found for deleted subscription:', customerId);
      return;
    }
  }

  // Mark subscription as canceled
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_period_end: new Date().toISOString(),
    })
    .eq('id', user.id);
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  // Only process one-time story purchases (not subscriptions)
  const { type, storyId, userEmail } = paymentIntent.metadata || {};
  
  if (type !== 'one-time' || !storyId) {
    return; // Not a one-click story purchase
  }

  // Get or create user
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('id, stripe_customer_id')
    .eq('email', userEmail)
    .single();

  if (!user && userEmail) {
    const { data: newUser } = await supabaseAdmin
      .from('users')
      .insert({ email: userEmail })
      .select()
      .single();
    
    if (newUser) {
      user = newUser;
    }
  }

  if (!user) {
    console.error('User not found for payment intent:', paymentIntent.id);
    return;
  }

  // Update Stripe customer ID if available
  if (paymentIntent.customer && !user.stripe_customer_id) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: paymentIntent.customer })
      .eq('id', user.id);
  }

  // Record purchase (idempotent - use upsert)
  await supabaseAdmin.from('purchases').upsert({
    user_id: user.id,
    story_id: storyId,
    stripe_session_id: paymentIntent.id,
    stripe_checkout_session_id: paymentIntent.id,
    amount_paid: paymentIntent.amount / 100, // Convert from cents
  }, {
    onConflict: 'user_id,story_id',
  });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id);

  // Only process subscription invoices
  if (!invoice.subscription) {
    return;
  }

  const subscriptionId = invoice.subscription;

  // Get subscription details
  const stripe = (await import('@/lib/stripe')).stripe;
  if (!stripe) {
    console.error('Stripe not configured');
    return;
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

  // Find user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .single();

  if (!user) {
    console.error('User not found for subscription:', subscriptionId);
    return;
  }

  // Update subscription period
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: subscription.status,
      subscription_period_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
    })
    .eq('id', user.id);
}

