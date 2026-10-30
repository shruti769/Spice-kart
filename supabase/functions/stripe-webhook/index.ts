import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import Stripe from 'npm:stripe@22.6.2';

// Stripe → Spice Kart. Subscribe the endpoint to payment_intent.succeeded and
// payment_intent.payment_failed. Each one becomes a `payments` row; the admin schema's
// payments_sync_order trigger then sets the order's payment_status (paid / failed), which the
// admin panel and the app's order screens pick up through Realtime.

const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripe = secretKey ? new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() }) : null;
const crypto = Stripe.createSubtleCryptoProvider();

type Method = 'card' | 'apple_pay' | 'google_pay';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('POST required', { status: 405 });
  if (!stripe || !signingSecret || !supabaseUrl || !serviceKey) return new Response('Not configured', { status: 503 });

  // Verification needs the raw body.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, request.headers.get('Stripe-Signature') ?? '', signingSecret, undefined, crypto);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }
  if (event.type !== 'payment_intent.succeeded' && event.type !== 'payment_intent.payment_failed') {
    return Response.json({ ignored: event.type });
  }

  const walletUser = event.data.object.metadata?.wallet_user;
  if (walletUser && event.type === 'payment_intent.succeeded') {
    try {
      const intent = await stripe.paymentIntents.retrieve(event.data.object.id);
      if (intent.status !== 'succeeded' || intent.currency !== 'aud' || intent.amount_received !== intent.amount) return new Response('Invalid wallet payment', { status: 400 });
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: owner, error: ownerError } = await admin.from('stripe_customers').select('stripe_id').eq('customer_id', walletUser).maybeSingle();
      if (ownerError) throw ownerError;
      if (!owner) return Response.json({ ignored: 'deleted wallet customer' });
      if (owner.stripe_id !== intent.customer) return new Response('Wallet owner mismatch', { status: 400 });
      const { error } = await admin.rpc('credit_stripe_wallet', { p_intent: intent.id, p_customer: walletUser, p_amount: intent.amount_received / 100 });
      if (error) throw error;
      return Response.json({ ok: true });
    } catch { return new Response('Try again', { status: 500 }); }
  }

  const orderId = event.data.object.metadata?.order_id;
  if (!orderId) return Response.json({ ignored: 'no order' });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const { data: order, error } = await admin.from('orders').select('id, payment_method').eq('id', orderId).maybeSingle();
    if (error) throw error;
    if (!order) return Response.json({ ignored: 'unknown order' });

    // Re-read the PaymentIntent for the card the customer actually used (and whether it came from a wallet).
    const intent = await stripe.paymentIntents.retrieve(event.data.object.id, { expand: ['latest_charge'] });
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const card = charge?.payment_method_details?.card;
    const wallet = card?.wallet?.type;
    const method: Method = wallet === 'apple_pay' || wallet === 'google_pay' ? wallet : order.payment_method;
    const succeeded = event.type === 'payment_intent.succeeded';

    const { error: insertError } = await admin.from('payments').upsert({
      order_id: order.id,
      amount: (succeeded ? intent.amount_received : intent.amount) / 100,
      method,
      status: succeeded ? 'succeeded' : 'failed',
      card_brand: card?.brand ?? null,
      card_last4: card?.last4 ?? null,
      provider_ref: intent.id,
      failure_reason: succeeded ? null : (intent.last_payment_error?.message ?? 'Payment failed').slice(0, 200),
    }, { onConflict: 'provider_ref,status', ignoreDuplicates: true });
    if (insertError) throw insertError;
    return Response.json({ ok: true });
  } catch (e) {
    // A 5xx makes Stripe retry later.
    console.error('stripe-webhook', event.id, (e as Error).message);
    return new Response('Try again', { status: 500 });
  }
});
