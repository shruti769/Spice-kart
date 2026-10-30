import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import Stripe from 'npm:stripe@22.6.2';

const key = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;
const reply = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'POST required' });
  if (!stripe) return reply(503, { error: 'payments_not_configured' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return reply(401, { error: 'not_signed_in' });
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user || user.is_anonymous) return reply(401, { error: 'not_signed_in' });
  try {
    const body = await req.json();
    // Generate retry identifiers on the server so the mobile build needs no crypto module.
    if (body.action === 'request-id') return reply(200, { requestId: crypto.randomUUID() });
    const { data: mapping, error: mappingError } = await admin
      .from('stripe_customers')
      .select('stripe_id')
      .eq('customer_id', user.id)
      .maybeSingle();
    if (mappingError) throw mappingError;
    let customer = mapping?.stripe_id;
    if (!customer) {
      const created = await stripe.customers.create(
        { metadata: { app_user: user.id } },
        { idempotencyKey: `customer-${user.id}` },
      );
      const { error } = await admin.from('stripe_customers').upsert({ customer_id: user.id, stripe_id: created.id });
      if (error) throw error;
      customer = created.id;
    }
    if (body.action === 'cards') {
      const cards = await stripe.paymentMethods.list({ customer, type: 'card', limit: 100 });
      const account = await stripe.customers.retrieve(customer);
      const defaultId = !account.deleted ? account.invoice_settings.default_payment_method : null;
      return reply(200, {
        cards: cards.data
          .filter((p) => ['visa', 'mastercard', 'amex'].includes(p.card!.brand))
          .map((p) => ({
            id: p.id,
            brand: p.card!.brand.toUpperCase(),
            last4: p.card!.last4,
            exp: String(p.card!.exp_month).padStart(2, '0') + '/' + String(p.card!.exp_year).slice(-2),
          })),
        defaultId,
      });
    }
    if (body.action === 'remove' || body.action === 'default') {
      const method = await stripe.paymentMethods.retrieve(body.id);
      if (method.customer !== customer) return reply(403, { error: 'not_your_card' });
      if (body.action === 'remove') await stripe.paymentMethods.detach(method.id);
      else await stripe.customers.update(customer, { invoice_settings: { default_payment_method: method.id } });
      return reply(200, { ok: true });
    }
    if (body.action === 'confirm') {
      const intent = await stripe.paymentIntents.retrieve(body.intentId);
      if (intent.customer !== customer || intent.metadata.wallet_user !== user.id)
        return reply(403, { error: 'not_your_payment' });
      if (intent.status !== 'succeeded' || intent.currency !== 'aud' || intent.amount_received !== intent.amount)
        return reply(409, { error: 'Payment is still pending. Your balance will update after confirmation.' });
      const { data, error } = await admin.rpc('credit_stripe_wallet', {
        p_intent: intent.id,
        p_customer: user.id,
        p_amount: intent.amount_received / 100,
      });
      if (error) throw error;
      return reply(200, { balance: Number(data) });
    }
    if (body.action !== 'setup' && body.action !== 'topup') return reply(400, { error: 'bad_action' });
    const session = await stripe.customerSessions.create({
      customer,
      components: {
        mobile_payment_element: {
          enabled: true,
          features: {
            payment_method_save: 'enabled',
            payment_method_redisplay: 'enabled',
            payment_method_remove: 'enabled',
          },
        },
      },
    });
    if (body.action === 'setup') {
      const intent = await stripe.setupIntents.create({
        customer,
        payment_method_types: ['card'],
        usage: 'on_session',
      });
      return reply(200, {
        customer,
        customerSessionClientSecret: session.client_secret,
        setupIntentClientSecret: intent.client_secret,
      });
    }
    const amount = body.amount;
    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 5 ||
      amount > 500 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 ||
      typeof body.requestId !== 'string' ||
      !/^[\w-]{16,100}$/.test(body.requestId)
    )
      return reply(400, { error: 'bad_amount' });
    const intent = await stripe.paymentIntents.create(
      {
        customer,
        amount: Math.round(amount * 100),
        currency: 'aud',
        payment_method_types: ['card'],
        metadata: { wallet_user: user.id },
      },
      { idempotencyKey: `topup-${user.id}-${body.requestId}` },
    );
    return reply(200, {
      customer,
      customerSessionClientSecret: session.client_secret,
      clientSecret: intent.client_secret,
      intentId: intent.id,
    });
  } catch (e) {
    console.error('stripe-wallet', (e as Error).message);
    return reply(502, { error: 'Could not complete the payment request. Please try again.' });
  }
});
