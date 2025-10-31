/**
 * Script to create Stripe products and prices for stories
 * 
 * Usage:
 *   node scripts/create-stripe-products.js [storyId] [price]
 *   
 * Examples:
 *   node scripts/create-stripe-products.js all 5.99  # Create products for all stories without prices
 *   node scripts/create-stripe-products.js <story-uuid> 6.99  # Create product for specific story
 */

// Load environment variables (try dotenv if available)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, assume env vars are set another way
  console.log('ℹ️  Loading env vars from system (dotenv not required)');
}

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

if (!stripeSecretKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY');
  console.error('   Get your key from: https://dashboard.stripe.com/apikeys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
});

async function createStripeProductForStory(story, price) {
  try {
    console.log(`\n📦 Creating Stripe product for: ${story.title}`);
    
    // Create product
    const product = await stripe.products.create({
      name: story.title,
      description: story.description || `Interactive TTS story: ${story.title}`,
      metadata: {
        storyId: story.id,
      },
    });

    console.log(`   ✅ Product created: ${product.id}`);

    // Create price (one-time payment)
    const priceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
    });

    console.log(`   ✅ Price created: ${priceObj.id} ($${price.toFixed(2)})`);

    // Update story in database
    const { error: updateError } = await supabase
      .from('stories')
      .update({
        stripe_product_id: product.id,
        stripe_price_id: priceObj.id,
        price: price,
        is_free: price === 0,
      })
      .eq('id', story.id);

    if (updateError) {
      console.error(`   ❌ Failed to update story: ${updateError.message}`);
      return false;
    }

    console.log(`   ✅ Story updated in database`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const storyId = args[0];
  const priceArg = args[1];

  // Default price recommendation
  const defaultPrice = 5.99;
  const price = priceArg ? parseFloat(priceArg) : defaultPrice;

  if (!storyId) {
    console.error('❌ Please provide a story ID or "all"');
    console.log('\nUsage:');
    console.log('  node scripts/create-stripe-products.js all [price]');
    console.log('  node scripts/create-stripe-products.js <story-uuid> [price]');
    console.log('\nExamples:');
    console.log('  node scripts/create-stripe-products.js all 5.99');
    console.log('  node scripts/create-stripe-products.js <uuid> 6.99');
    process.exit(1);
  }

  if (isNaN(price) || price < 0) {
    console.error('❌ Invalid price. Must be a positive number.');
    process.exit(1);
  }

  console.log(`\n🚀 Creating Stripe Products`);
  console.log(`💰 Default price: $${price.toFixed(2)}`);
  console.log(`📝 Story ID: ${storyId}\n`);

  if (storyId === 'all') {
    // Get all stories without Stripe products
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, title, description, price, stripe_price_id')
      .is('stripe_price_id', null)
      .order('title');

    if (error) {
      console.error('❌ Error fetching stories:', error.message);
      process.exit(1);
    }

    if (stories.length === 0) {
      console.log('✅ All stories already have Stripe products!');
      process.exit(0);
    }

    console.log(`Found ${stories.length} stories without Stripe products:\n`);

    let successCount = 0;
    for (const story of stories) {
      // Use existing price if set, otherwise use default
      const storyPrice = story.price && story.price > 0 ? parseFloat(story.price) : price;
      const success = await createStripeProductForStory(story, storyPrice);
      if (success) successCount++;
    }

    console.log(`\n✅ Completed: ${successCount}/${stories.length} products created`);
  } else {
    // Get specific story
    const { data: story, error } = await supabase
      .from('stories')
      .select('id, title, description, price, stripe_price_id')
      .eq('id', storyId)
      .single();

    if (error || !story) {
      console.error('❌ Story not found:', error?.message);
      process.exit(1);
    }

    if (story.stripe_price_id) {
      console.log('⚠️  Story already has a Stripe product!');
      console.log(`   Product ID: ${story.stripe_product_id}`);
      console.log(`   Price ID: ${story.stripe_price_id}`);
      console.log('\nIf you want to update it, you\'ll need to do it manually in Stripe.');
      process.exit(0);
    }

    // Use existing price if set, otherwise use provided/default price
    const storyPrice = story.price && story.price > 0 ? parseFloat(story.price) : price;
    const success = await createStripeProductForStory(story, storyPrice);
    
    if (success) {
      console.log(`\n✅ Product created successfully!`);
    } else {
      console.log(`\n❌ Failed to create product`);
      process.exit(1);
    }
  }
}

main().catch(console.error);

