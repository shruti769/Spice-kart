import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import Stripe from 'npm:stripe@22.6.2';

// The app's side of a Stripe payment, for an order already placed with place_order():
//   { action: 'start',  orderId }  → { clientSecret } for the Payment Sheet, or { paid: true }
//   { action: 'cancel', orderId }  → cancels the PaymentIntent and the unpaid order (stock goes back)
// Called with the customer's Supabase session, so RLS decides which orders they can see.

const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const stripe = secretKey ? new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() }) : null;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

const STRIPE_METHODS = ['card', 'apple_pay', 'google_pay'];

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  if (!stripe || !supabaseUrl || !serviceKey || !anonKey) return reply(503, { error: 'payments_not_configured' });
  const auth = request.headers.get('Authorization');
  if (!auth) return reply(401, { error: 'not_signed_in' });

  let action: unknown, orderId: unknown;
  try {
    ({ action, orderId } = await request.json());
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  if ((action !== 'start' && action !== 'cancel') || typeof orderId !== 'string') return reply(400, { error: 'bad_request' });

  const user = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: order, error } = await user.from('orders')
    .select('id, number, total, status, payment_status, payment_method, stripe_payment_intent')
    .eq('id', orderId).maybeSingle();
  if (error) return reply(503, { error: 'try_again' });
  if (!order) return reply(404, { error: 'order_not_found' });
  if (!STRIPE_METHODS.includes(order.payment_method)) return reply(400, { error: 'not_a_card_order' });

  try {
    if (action === 'start') {
      if (order.payment_status === 'paid') return reply(200, { paid: true });
      if (order.status === 'cancelled' || order.payment_status !== 'pending' && order.payment_status !== 'failed') {
        return reply(409, { error: 'order_closed' });
      }
      let intent = order.stripe_payment_intent ? await stripe.paymentIntents.retrieve(order.stripe_payment_intent) : null;
      if (intent?.status === 'succeeded' || intent?.status === 'processing') return reply(200, { paid: true });
      if (!intent || intent.status === 'canceled') {
        intent = await stripe.paymentIntents.create({
          amount: Math.round(Number(order.total) * 100),
          currency: 'aud',
          automatic_payment_methods: { enabled: true },
          description: `SpiceKart order #${order.number}`,
          metadata: { order_id: order.id, order_number: order.number },
        }, { idempotencyKey: `order-${order.id}` });
        const saved = await admin.from('orders').update({ stripe_payment_intent: intent.id }).eq('id', order.id);
        if (saved.error) throw saved.error;
      }
      return reply(200, { clientSecret: intent.client_secret });
    }

    // cancel
    if (order.status === 'cancelled') return reply(200, { cancelled: true });
    if (order.stripe_payment_intent) {
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
      // Paid (or still settling) after all: keep the order.
      if (intent.status === 'succeeded' || intent.status === 'processing') return reply(200, { cancelled: false });
      if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id);
    }
    const { data: released, error: releaseError } = await admin.rpc('release_unpaid_order', { p_id: order.id });
    if (releaseError) throw releaseError;
    return reply(200, { cancelled: released === true });
  } catch (e) {
    console.error('stripe-payment', action, order.id, (e as Error).message);
    return reply(502, { error: 'try_again' });
  }
});
