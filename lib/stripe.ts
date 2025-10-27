import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

export interface CreateCheckoutSessionParams {
  userEmail: string;
  storyId: string;
  storyTitle: string;
  price: number;
  stripePriceId: string;
}

export interface CreateSubscriptionSessionParams {
  userEmail: string;
  planId: string;
  stripePriceId: string;
}

/**
 * Create a Stripe checkout session for one-time story purchase
 */
export async function createCheckoutSession({
  userEmail,
  storyId,
  storyTitle,
  price,
  stripePriceId,
}: CreateCheckoutSessionParams) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cancel`,
    metadata: {
      storyId,
      storyTitle,
      type: 'one-time',
    },
  });

  return session;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createSubscriptionSession({
  userEmail,
  stripePriceId,
}: CreateSubscriptionSessionParams) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cancel`,
    metadata: {
      type: 'subscription',
    },
    subscription_data: {
      metadata: {
        userEmail,
      },
    },
  });

  return session;
}

/**
 * Verify a Stripe checkout session and extract metadata
 */
export async function verifyCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  return {
    sessionId,
    customerEmail: session.customer_details?.email || session.customer_email,
    metadata: session.metadata,
    paymentStatus: session.payment_status,
    status: session.status,
  };
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(email: string) {
  // Try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      source: 'tts-story-platform',
    },
  });

  return customer;
}

/**
 * Create a Stripe product and price for a story
 */
export async function createStoryProduct(
  storyTitle: string,
  storyId: string,
  price: number
) {
  // Create product
  const product = await stripe.products.create({
    name: storyTitle,
    description: `Interactive TTS story: ${storyTitle}`,
    metadata: {
      storyId,
    },
  });

  // Create price
  const priceObj = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100), // Convert to cents
    currency: 'usd',
  });

  return { productId: product.id, priceId: priceObj.id };
}

/**
 * Handle Stripe webhook event
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

