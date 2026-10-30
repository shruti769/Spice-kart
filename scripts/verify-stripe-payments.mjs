// Test-mode integration checks. Creates an isolated account; removes its database fixtures afterward.
// Run from the project root: node scripts/verify-stripe-payments.mjs
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
      let i = l.indexOf('=');
      return [
        l.slice(0, i),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ''),
      ];
    }),
);
const pk = env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!pk?.startsWith('pk_test_')) throw new Error('Test mode required');
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const keys = JSON.parse(
  execFileSync(
    'supabase',
    ['projects', 'api-keys', '--project-ref', new URL(url).hostname.split('.')[0], '--output', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const service = keys.find((k) => k.name === 'service_role')?.api_key;
if (!service) throw new Error('Admin test credentials unavailable');
const admin = createClient(url, service, { auth: { persistSession: false } });
let uid;
let orderId;
async function jsonFetch(url, options) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
      const text = await response.text();
      if (response.status >= 500 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      try {
        return { status: response.status, ok: response.ok, data: JSON.parse(text) };
      } catch {
        throw new Error('Non-JSON response, HTTP ' + response.status);
      }
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
const assert = (ok, label) => {
  if (!ok) throw new Error(label);
  console.log('PASS ' + label);
};
try {
  const email = `stripe-check-${randomUUID()}@example.com`,
    password = randomUUID() + 'Aa1!';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error('Could not create test fixture');
  uid = created.data.user.id;
  const client = createClient(url, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Test sign-in unavailable');
  const invoke = async (body) => {
    const r = await jsonFetch(url + '/functions/v1/stripe-wallet', {
      method: 'POST',
      headers: {
        apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + login.data.session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: r.data };
  };
  const stripe = async (path, params) => {
    const r = await jsonFetch('https://api.stripe.com/v1/' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + pk, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    const data = r.data;
    if (!r.ok) throw new Error('Stripe test API: ' + data.error?.code + ' ' + data.error?.type);
    return data;
  };
  const empty = await invoke({ action: 'cards' });
  assert(empty.status === 200 && empty.data.cards.length === 0, 'new customer has no fake saved cards');
  const setup = await invoke({ action: 'setup' });
  assert(setup.status === 200 && setup.data.setupIntentClientSecret, 'SetupIntent created');
  const setupId = setup.data.setupIntentClientSecret.split('_secret_')[0];
  const saved = await stripe('setup_intents/' + setupId + '/confirm', {
    client_secret: setup.data.setupIntentClientSecret,
    payment_method: 'pm_card_visa',
  });
  assert(saved.status === 'succeeded', 'test card saved in Stripe');
  const cards = await invoke({ action: 'cards' });
  assert(cards.data.cards.length === 1 && cards.data.cards[0].id, 'saved card returned from Stripe');
  const card = cards.data.cards[0];
  assert((await invoke({ action: 'default', id: card.id })).status === 200, 'default card updated');
  assert(
    (await invoke({ action: 'topup', amount: 4, requestId: randomUUID() })).status === 400,
    'invalid top-up rejected',
  );
  const generated = await invoke({ action: 'request-id' });
  assert(generated.status === 200 && /^[0-9a-f-]{36}$/.test(generated.data.requestId), 'server generates top-up request ID');
  const requestId = generated.data.requestId;
  const top = await invoke({ action: 'topup', amount: 5, requestId });
  assert(top.status === 200 && top.data.intentId, 'top-up PaymentIntent created');
  const retry = await invoke({ action: 'topup', amount: 5, requestId });
  assert(retry.data.intentId === top.data.intentId, 'request retry reuses PaymentIntent');
  assert(
    (await invoke({ action: 'confirm', intentId: top.data.intentId })).status === 409,
    'unpaid intent cannot credit wallet',
  );
  const paid = await stripe('payment_intents/' + top.data.intentId + '/confirm', {
    client_secret: top.data.clientSecret,
    payment_method: card.id,
  });
  assert(paid.status === 'succeeded', 'AUD 5 test payment succeeded');
  const credited = await invoke({ action: 'confirm', intentId: top.data.intentId });
  assert(credited.status === 200 && credited.data.balance === 5, 'successful payment credits wallet');
  const twice = await invoke({ action: 'confirm', intentId: top.data.intentId });
  assert(twice.data.balance === 5, 'duplicate confirmation does not double credit');
  const tx = await admin.from('wallet_transactions').select('id').eq('customer_id', uid).eq('kind', 'topup');
  assert(tx.data?.length === 1, 'one ledger entry per payment');
  // A synthetic order isolates payment/webhook checks from opening hours, stock and delivery.
  // Only this fixture insert skips triggers; no business settings are changed.
  orderId = randomUUID();
  if (!/^[0-9a-f-]{36}$/.test(uid)) throw new Error('Invalid fixture ID');
  execFileSync(
    'supabase',
    [
      'db',
      'query',
      '--linked',
      `begin; set local session_replication_role = replica; insert into public.orders(id,customer_id,number,delivery_type,address_line,subtotal,total,payment_method) values ('${orderId}','${uid}','TEST-${orderId}','express','AUTOMATED STRIPE TEST - DO NOT FULFIL',5,5,'card'); commit;`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const orderPayment = async (action) => {
    const r = await jsonFetch(url + '/functions/v1/stripe-payment', {
      method: 'POST',
      headers: {
        apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + login.data.session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, orderId }),
    });
    return { status: r.status, data: r.data };
  };
  const started = await orderPayment('start');
  assert(started.status === 200 && started.data.clientSecret, 'order PaymentIntent created');
  assert(started.data.customer === setup.data.customer, 'checkout uses customer with saved cards');
  const orderIntent = started.data.clientSecret.split('_secret_')[0];
  const paidOrder = await stripe('payment_intents/' + orderIntent + '/confirm', {
    client_secret: started.data.clientSecret,
    payment_method: card.id,
  });
  assert(paidOrder.status === 'succeeded', 'test order payment succeeded');
  let orderPaid = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const row = await admin.from('orders').select('payment_status').eq('id', orderId).single();
    if (row.data?.payment_status === 'paid') {
      orderPaid = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(orderPaid, 'Stripe webhook marks order paid');
  assert((await orderPayment('cancel')).data.cancelled === false, 'paid order cannot be cancelled as unpaid');
  assert((await invoke({ action: 'remove', id: card.id })).status === 200, 'saved card removed');
  assert((await invoke({ action: 'cards' })).data.cards.length === 0, 'removed card absent');
} finally {
  if (uid) {
    if (orderId) {
      await admin.from('payments').delete().eq('order_id', orderId);
      const removed = await admin.from('orders').delete().eq('id', orderId);
      if (removed.error) console.log('CLEANUP REQUIRED test order');
    }
    for (const table of ['stripe_wallet_credits', 'wallet_transactions', 'wallets', 'stripe_customers']) {
      const r = await admin.from(table).delete().eq('customer_id', uid);
      if (r.error) console.log('CLEANUP REQUIRED ' + table);
    }
    const customer = await admin.from('customers').delete().eq('id', uid);
    if (customer.error) console.log('CLEANUP REQUIRED customers');
    const deleted = await admin.auth.admin.deleteUser(uid);
    console.log(deleted.error ? 'CLEANUP REQUIRED auth user' : 'Test account cleaned up');
  }
}
