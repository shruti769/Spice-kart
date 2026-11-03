import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import Stripe from 'npm:stripe@22.6.2';

// Cancels card orders left unpaid for 30 minutes. Called by expire_unpaid_tick() every 5 minutes.
// Auth: the `x-dispatch-secret` header must equal the DISPATCH_SECRET function secret.

const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
const dispatchSecret = Deno.env.get('DISPATCH_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripe = secretKey ? new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() }) : null;

Deno.serve(async (request) => {
  if (!stripe || !dispatchSecret || !supabaseUrl || !serviceKey) return new Response('Not configured', { status: 503 });
  if (request.headers.get('x-dispatch-secret') !== dispatchSecret) return new Response('Unauthorized', { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: orders, error } = await admin.rpc('unpaid_orders_due');
  if (error) {
    console.error('stripe-expire-orders', error.message);
    return new Response('Try again', { status: 500 });
  }

  let cancelled = 0;
  let kept = 0;
  for (const order of orders as { id: string; stripe_payment_intent: string | null }[]) {
    // One order failing mustn't stop the rest. It's picked up again on the next run.
    try {
      if (order.stripe_payment_intent) {
        const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
        // Paid (or still settling), and the webhook hasn't reached us yet: keep the order.
        if (intent.status === 'succeeded' || intent.status === 'processing') {
          console.warn('stripe-expire-orders', order.id, 'paid in Stripe but unpaid here');
          kept++;
          continue;
        }
        // Stripe refuses this if the customer has just paid, which keeps the order too.
        if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id);
      }
      const { data: released, error: releaseError } = await admin.rpc('release_unpaid_order', { p_id: order.id });
      if (releaseError) throw releaseError;
      if (released === true) cancelled++;
    } catch (e) {
      console.error('stripe-expire-orders', order.id, (e as Error).message);
      kept++;
    }
  }
  return Response.json({ cancelled, kept });
});
