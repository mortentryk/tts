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

    // Log webhook event
    await supabaseAdmin.from('stripe_webhooks').insert({
      event_id: event.id,
      event_type: event.type,
      event_data: event.data,
      processed: false,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object);
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

  // Handle based on session mode and metadata
  const { type } = session.metadata || {};

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

      // Update user subscription
      await supabaseAdmin
        .from('users')
        .update({
          subscription_status: subscription.status,
          subscription_id: subscriptionId,
          subscription_period_end: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null,
        })
        .eq('id', user.id);
    }
  } else if (session.mode === 'payment' && type === 'lifetime-access') {
    // Grant lifetime access
    await supabaseAdmin
      .from('users')
      .update({
        lifetime_access: true,
        lifetime_access_purchased_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    
    console.log('Lifetime access granted to:', customerEmail);
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  console.log('Subscription updated:', subscription.id);

  const customerId = subscription.customer;

  // Find user by customer ID
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for subscription:', customerId);
    return;
  }

  // Update subscription status
  const subscriptionData = subscription as any;
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: subscriptionData.status,
      subscription_id: subscriptionData.id,
      subscription_period_end: subscriptionData.current_period_end 
        ? new Date(subscriptionData.current_period_end * 1000).toISOString() 
        : null,
    })
    .eq('id', user.id);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  const customerId = subscription.customer;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for deleted subscription:', customerId);
    return;
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

