import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';
import Stripe from 'npm:stripe@22.6.2';

// Admin panel refunds. Stripe is asked first and the database records only what Stripe accepted, so
// an order never shows "refunded" while the money stays put. `requestId` (one per refund attempt,
// from the admin panel) makes a retry safe: Stripe returns the same refund instead of a second one.
//
//   order          refund an order         { orderId, amount, reason, requestId }
//   request        decide a refund request { requestId: id for Stripe, refundRequest, approve, amount }
//   cancel         cancel an order and refund what was paid { orderId, reason, requestId }
//   wallet-info    what can go back to a card   { customerId }
//   wallet-to-card wallet money → the cards it was topped up from { customerId, amount, requestId }

const key = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

// The admin panel calls this from the browser. Access still depends on the admin's sign-in, not the origin.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, data: unknown) => Response.json(data, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
/** Something the admin should read: the panel shows `error`. */
class Refusal extends Error {}

const cents = (amount: number) => Math.round(amount * 100);
const money = (amount: number) => '$' + amount.toFixed(2);
const roundCents = (amount: number) => Math.round(amount * 100) / 100;

function validAmount(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && Math.abs(n * 100 - cents(n)) < 1e-6 ? roundCents(n) : null;
}

/** The card payment behind an order and what's left of it, when refunds go to the original method. */
async function cardPayment(admin: SupabaseClient, orderId: string) {
  const { data: settings, error: settingsError } = await admin.from('business_settings').select('refund_destination').limit(1).maybeSingle();
  if (settingsError) throw settingsError;
  if (settings?.refund_destination === 'wallet') return null;
  const { data, error } = await admin.from('payments').select('amount, status, provider_ref, created_at').eq('order_id', orderId).order('created_at');
  if (error) throw error;
  const rows = data ?? [];
  const total = (status: string) => rows.filter((p) => p.status === status).reduce((n, p) => n + Number(p.amount), 0);
  const intent = rows.filter((p) => p.status === 'succeeded' && p.provider_ref?.startsWith('pi_')).at(-1)?.provider_ref;
  return intent ? { intent, left: roundCents(total('succeeded') - total('refunded')) } : null;
}

/** Sends the refund to the card. Returns its Stripe id, already recorded or not. */
async function refundToCard(intent: string, amount: number, requestId: string, metadata: Record<string, string>) {
  const refund = await stripe!.refunds.create(
    { payment_intent: intent, amount: cents(amount), reason: 'requested_by_customer', metadata },
    { idempotencyKey: `admin-refund-${requestId}` },
  );
  if (refund.status === 'failed' || refund.status === 'canceled') throw new Refusal(`Stripe couldn’t refund this payment (${refund.failure_reason ?? refund.status})`);
  return refund.id;
}

/** Refunds an order: to its card when refunds go to the original method, otherwise just recorded. */
async function refundOrder(user: SupabaseClient, admin: SupabaseClient, orderId: string, requested: number | null, reason: string | null, requestId: string) {
  const card = await cardPayment(admin, orderId);
  let ref: string | null = null;
  let amount = requested;
  if (card) {
    amount ??= card.left;
    if (amount <= 0 || amount > card.left) throw new Refusal(`Refund must be between $0.01 and ${money(card.left)} (what’s left)`);
    ref = await refundToCard(card.intent, amount, requestId, { order_id: orderId });
    // A retry after the database step failed: Stripe already refunded this one.
    const { data: existing } = await admin.from('payments').select('*').eq('provider_ref', ref).eq('status', 'refunded').maybeSingle();
    if (existing) return { payment: existing, toCard: true };
  }
  const { data, error } = await user.rpc('refund_order', { p_order: orderId, p_amount: amount, p_reason: reason, p_provider_ref: ref });
  if (error) throw new Refusal(ref ? `Stripe refunded it (${ref}) but saving failed: ${error.message}. Please try again` : error.message);
  return { payment: data, toCard: !!ref };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'POST required' });
  if (!stripe) return reply(503, { error: 'Stripe isn’t set up' });
  const auth = req.headers.get('Authorization');
  if (!auth) return reply(401, { error: 'Please sign in' });

  // RPCs run as the signed-in admin, so refund_order and decide_refund do their own checks too.
  const user = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: isAdmin, error: adminError } = await user.rpc('is_admin');
  if (adminError || !isAdmin) return reply(403, { error: 'Admins only' });
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json();

    if (body.action === 'order') {
      if (typeof body.requestId !== 'string' || !body.requestId) throw new Refusal('Missing request id');
      const amount = body.amount == null ? null : validAmount(body.amount);
      if (body.amount != null && amount == null) throw new Refusal('Enter a valid amount');
      return reply(200, await refundOrder(user, admin, body.orderId, amount, body.reason || null, body.requestId));
    }

    if (body.action === 'cancel') {
      if (typeof body.requestId !== 'string' || !body.requestId) throw new Refusal('Missing request id');
      const { data: order, error } = await user.rpc('cancel_order', { p_id: body.orderId, p_reason: body.reason || null });
      if (error) throw new Refusal(error.message);

      // Wallet orders were already refunded by the cancel itself (wallet_refund_cancelled).
      const { data: payments, error: paymentsError } = await admin.from('payments').select('amount, status').eq('order_id', body.orderId);
      if (paymentsError) throw paymentsError;
      const total = (status: string) => (payments ?? []).filter((p) => p.status === status).reduce((n, p) => n + Number(p.amount), 0);
      const left = roundCents(total('succeeded') - total('refunded'));
      if (left <= 0) return reply(200, { cancelled: true, refunded: 0 });
      try {
        const done = await refundOrder(user, admin, body.orderId, left, 'Order cancelled', body.requestId);
        return reply(200, { cancelled: true, refunded: left, toCard: done.toCard });
      } catch (e) {
        // The order is cancelled either way: make sure someone pays the customer back.
        const why = e instanceof Error ? e.message : 'Unknown error';
        await admin.rpc('raise_alert', {
          p_key: 'refund:cancel:' + body.orderId,
          p_category: 'payments',
          p_severity: 'critical',
          p_title: `Order #${order.number} was cancelled but ${money(left)} wasn’t refunded`,
          p_body: why,
          p_link: 'pay',
          p_link_label: 'Review payments',
        });
        return reply(200, { cancelled: true, refunded: 0, refundError: why });
      }
    }

    if (body.action === 'request') {
      let ref: string | null = null;
      let amount = body.amount == null ? null : validAmount(body.amount);
      if (body.approve) {
        const { data: request, error } = await admin.from('refund_requests').select('order_id, status, number, amount').eq('id', body.refundRequest).maybeSingle();
        if (error) throw error;
        if (!request) throw new Refusal('Refund request not found');
        if (request.status !== 'pending') throw new Refusal('This request was already decided');
        const card = await cardPayment(admin, request.order_id);
        if (card && card.left > 0) {
          if (typeof body.requestId !== 'string' || !body.requestId) throw new Refusal('Missing request id');
          amount = roundCents(Math.min(amount ?? Number(request.amount ?? card.left), card.left));
          if (amount <= 0) throw new Refusal('Enter a valid amount');
          ref = await refundToCard(card.intent, amount, body.requestId, { order_id: request.order_id, refund_request: request.number });
        }
      }
      const { data, error } = await user.rpc('decide_refund', { p_request: body.refundRequest, p_approve: !!body.approve, p_amount: body.approve ? amount : null, p_provider_ref: ref });
      if (error) throw new Refusal(ref ? `Stripe refunded it (${ref}) but saving failed: ${error.message}. Please try again` : error.message);
      return reply(200, { request: data, toCard: !!ref });
    }

    if (body.action === 'wallet-info' || body.action === 'wallet-to-card') {
      const [{ data: wallet, error: walletError }, { data: credits, error: creditsError }] = await Promise.all([
        admin.from('wallets').select('balance, credit_balance').eq('customer_id', body.customerId).maybeSingle(),
        admin.from('stripe_wallet_credits').select('payment_intent, amount, refunded').eq('customer_id', body.customerId).order('created_at', { ascending: false }),
      ]);
      if (walletError || creditsError) throw walletError ?? creditsError;
      const balance = Number(wallet?.balance ?? 0);
      const topups = (credits ?? []).map((c) => ({ intent: c.payment_intent, left: roundCents(Number(c.amount) - Number(c.refunded)) })).filter((c) => c.left > 0);
      const credit = Number(wallet?.credit_balance ?? 0);
      // Admin credit can only be spent, so only the customer's own money can go back to a card.
      const returnable = roundCents(Math.min(balance - credit, topups.reduce((n, c) => n + c.left, 0)));
      if (body.action === 'wallet-info') return reply(200, { balance, credit, returnable });

      const amount = validAmount(body.amount);
      if (amount == null) throw new Refusal('Enter a valid amount');
      if (typeof body.requestId !== 'string' || !body.requestId) throw new Refusal('Missing request id');
      if (amount > returnable) throw new Refusal(`Only ${money(returnable)} can go back to a card`);

      // Newest top-ups first. The wallet pays first, so the money can't also be spent meanwhile.
      let remaining = amount;
      let sent = 0;
      let newBalance = balance;
      for (const topup of topups) {
        if (remaining <= 0) break;
        const part = roundCents(Math.min(remaining, topup.left));
        const reserved = await admin.rpc('wallet_card_refund_reserve', { p_customer: body.customerId, p_intent: topup.intent, p_amount: part });
        if (reserved.error) throw reserved.error;
        newBalance = Number(reserved.data);
        try {
          await refundToCard(topup.intent, part, `${body.requestId}-${topup.intent}`, { wallet_user: body.customerId, wallet_return: 'true' });
        } catch (e) {
          const undone = await admin.rpc('wallet_card_refund_undo', { p_customer: body.customerId, p_intent: topup.intent, p_amount: part });
          if (undone.error) throw new Refusal(`Stripe refused ${money(part)} and the wallet couldn’t be restored. Please credit it by hand: ${undone.error.message}`);
          newBalance = Number(undone.data);
          const why = e instanceof Error ? e.message : 'Stripe refused the refund';
          throw new Refusal(sent > 0 ? `${money(sent)} went back to the card, but the rest failed: ${why}` : why);
        }
        sent = roundCents(sent + part);
        remaining = roundCents(remaining - part);
      }
      return reply(200, { sent, balance: newBalance });
    }

    return reply(400, { error: 'Unknown action' });
  } catch (e) {
    if (e instanceof Refusal) return reply(200, { error: e.message });
    // Stripe's own messages say why (charge too old, already refunded…), and only admins get here.
    if (e instanceof Stripe.errors.StripeError) return reply(200, { error: e.message });
    console.error('stripe-refund', (e as Error).message);
    return reply(500, { error: 'Couldn’t process the refund. Please try again' });
  }
});
