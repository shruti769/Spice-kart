// Test-mode checks for cancelling unpaid orders after 30 minutes. Creates an isolated customer and
// removes its database fixtures afterward. The already-paid case uses a wallet top-up's payment, so
// no new-order email goes out. Run from the project root: node scripts/verify-unpaid-expiry.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(process.cwd() + '/package.json');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => /^\w+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
    }),
);
const pk = env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!pk?.startsWith('pk_test_')) throw new Error('Test mode required');
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const keys = JSON.parse(
  execFileSync('supabase', ['projects', 'api-keys', '--project-ref', new URL(url).hostname.split('.')[0], '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
);
const service = keys.find((k) => k.name === 'service_role')?.api_key;
if (!service) throw new Error('Admin test credentials unavailable');
const db = createClient(url, service, { auth: { persistSession: false } });

const query = (sql) => execFileSync('supabase', ['db', 'query', '--linked', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const assert = (ok, label) => {
  if (!ok) throw new Error('FAIL ' + label);
  console.log('PASS ' + label);
};
const call = async (fn, token, body) => {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40000),
  });
  return { status: res.status, data: await res.json() };
};
const stripeForm = (path, body) =>
  fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + pk, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
const OLD = new Date(Date.now() - 31 * 60 * 1000).toISOString();

let customerId;
const orders = [];
try {
  const email = `expiry-check-${randomUUID()}@example.com`;
  const password = randomUUID() + 'Aa1!';
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error('Could not create test account: ' + created.error.message);
  customerId = created.data.user.id;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Test sign-in unavailable');
  const token = login.data.session.access_token;

  const setup = await call('stripe-wallet', token, { action: 'setup' });
  if (!setup.data.setupIntentClientSecret) throw new Error('Card setup failed: ' + setup.status);
  const saved = await stripeForm(`setup_intents/${setup.data.setupIntentClientSecret.split('_secret_')[0]}/confirm`, {
    client_secret: setup.data.setupIntentClientSecret,
    payment_method: 'pm_card_visa',
  });
  if (!saved.ok) throw new Error('Could not save test card');
  const card = (await call('stripe-wallet', token, { action: 'cards' })).data.cards[0].id;

  const makeOrder = () => {
    const id = randomUUID();
    query(`begin; set local session_replication_role = replica; insert into public.orders(id,customer_id,number,delivery_type,address_line,subtotal,total,payment_method) values ('${id}','${customerId}','TEST-${id}','express','AUTOMATED STRIPE TEST - DO NOT FULFIL',20,20,'card'); commit;`);
    orders.push(id);
    return id;
  };
  const age = async (id, fields = {}) => {
    const r = await db.from('orders').update({ placed_at: OLD, ...fields }).eq('id', id);
    if (r.error) throw new Error('Could not age test order: ' + r.error.message);
  };
  const read = async (id) => (await db.from('orders').select('status, cancel_reason').eq('id', id).single()).data;

  // Old, no payment started.
  const noIntent = makeOrder();
  await age(noIntent);
  // Old, payment sheet opened but never paid.
  const open = makeOrder();
  const started = await call('stripe-payment', token, { action: 'start', orderId: open });
  if (!started.data.clientSecret) throw new Error('Could not start test payment: ' + started.status);
  await age(open);
  // Old and marked unpaid here, but paid in Stripe (a late webhook).
  const top = await call('stripe-wallet', token, { action: 'topup', amount: 10, requestId: randomUUID() });
  const paidRes = await stripeForm(`payment_intents/${top.data.intentId}/confirm`, { client_secret: top.data.clientSecret, payment_method: card });
  if (!paidRes.ok) throw new Error('Could not pay test top-up');
  const paidInStripe = makeOrder();
  await age(paidInStripe, { stripe_payment_intent: top.data.intentId });
  // Placed just now.
  const recent = makeOrder();

  query('select public.expire_unpaid_tick();');
  for (let i = 0; i < 30; i++) {
    if ((await read(noIntent)).status === 'cancelled' && (await read(open)).status === 'cancelled') break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const a = await read(noIntent);
  assert(a.status === 'cancelled' && a.cancel_reason === 'Payment not completed', 'old order with no payment is cancelled');
  assert((await read(open)).status === 'cancelled', 'old order with an open payment is cancelled');
  const lateConfirm = await stripeForm(`payment_intents/${started.data.clientSecret.split('_secret_')[0]}/confirm`, {
    client_secret: started.data.clientSecret,
    payment_method: card,
  });
  assert(!lateConfirm.ok, 'Stripe refuses payment for the cancelled order');
  assert((await read(paidInStripe)).status === 'placed', 'order paid in Stripe is kept');
  assert((await read(recent)).status === 'placed', 'a new order is kept');
  const reopened = await call('stripe-payment', token, { action: 'start', orderId: noIntent });
  assert(reopened.status === 409, 'a cancelled order can’t be paid from the app');
  const told = await db.from('customer_notifications').select('body').eq('order_id', noIntent).single();
  assert(told.data?.body === 'Payment wasn’t completed, so you haven’t been charged.', 'customer is told they weren’t charged');
  console.log('ALL PASSED');
} finally {
  for (const id of orders) {
    await db.from('customer_notifications').delete().eq('order_id', id);
    await db.from('payments').delete().eq('order_id', id);
    const removed = await db.from('orders').delete().eq('id', id);
    if (removed.error) console.log('CLEANUP REQUIRED test order');
  }
  if (customerId) {
    for (const table of ['customer_notifications', 'stripe_wallet_credits', 'wallet_transactions', 'wallets', 'stripe_customers']) {
      const r = await db.from(table).delete().eq('customer_id', customerId);
      if (r.error) console.log('CLEANUP REQUIRED ' + table);
    }
    const c = await db.from('customers').delete().eq('id', customerId);
    if (c.error) console.log('CLEANUP REQUIRED customers');
    const d = await db.auth.admin.deleteUser(customerId);
    if (d.error) console.log('CLEANUP REQUIRED test user');
  }
}
