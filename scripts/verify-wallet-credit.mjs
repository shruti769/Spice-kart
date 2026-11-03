// Test-mode checks for keeping admin credit apart from the customer's own wallet money, through the
// deployed functions. Creates an isolated customer and admin, and removes its database fixtures
// afterward. No order is paid, so no order email goes out. Run from the project root:
// node scripts/verify-wallet-credit.mjs
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
const signUp = async () => {
  const email = `credit-check-${randomUUID()}@example.com`;
  const password = randomUUID() + 'Aa1!';
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error('Could not create test account: ' + created.error.message);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Test sign-in unavailable');
  return { id: created.data.user.id, email, client, token: login.data.session.access_token };
};

let customer;
let adminUser;
let orderId;
try {
  customer = await signUp();
  adminUser = await signUp();
  const template = await db.from('admins').select('role, department').limit(1).single();
  const added = await db.from('admins').insert({ user_id: adminUser.id, email: adminUser.email, name: 'Automated credit test', role: template.data.role, department: template.data.department, status: 'active' });
  if (added.error) throw new Error('Could not create test admin: ' + added.error.message);

  const wallet = (body) => call('stripe-wallet', customer.token, body);
  const refund = (body) => call('stripe-refund', adminUser.token, body);
  const info = async () => (await refund({ action: 'wallet-info', customerId: customer.id })).data;
  const toCard = (amount) => refund({ action: 'wallet-to-card', customerId: customer.id, amount, requestId: randomUUID() });
  const giveCredit = async (amount) => {
    const r = await adminUser.client.rpc('wallet_adjust', { p_customer: customer.id, p_amount: amount, p_note: 'Automated test' });
    if (r.error) throw new Error('Could not add credit: ' + r.error.message);
  };

  const setup = await wallet({ action: 'setup' });
  if (!setup.data.setupIntentClientSecret) throw new Error('Card setup failed: ' + setup.status);
  const saved = await stripeForm(`setup_intents/${setup.data.setupIntentClientSecret.split('_secret_')[0]}/confirm`, {
    client_secret: setup.data.setupIntentClientSecret,
    payment_method: 'pm_card_visa',
  });
  if (!saved.ok) throw new Error('Could not save test card');
  const card = (await wallet({ action: 'cards' })).data.cards[0].id;

  const top = await wallet({ action: 'topup', amount: 10, requestId: randomUUID() });
  const paid = await stripeForm(`payment_intents/${top.data.intentId}/confirm`, { client_secret: top.data.clientSecret, payment_method: card });
  if (!paid.ok) throw new Error('Could not pay test top-up');
  await wallet({ action: 'confirm', intentId: top.data.intentId });
  let now = await info();
  assert(now.balance === 10 && now.credit === 0 && now.returnable === 10, '$10 top-up can go back to the card');

  await giveCredit(25);
  now = await info();
  assert(now.balance === 35 && now.credit === 25 && now.returnable === 10, '$25 credit: total $35, still only $10 can go back');
  const seen = await customer.client.from('wallets').select('balance').single();
  assert(Number(seen.data.balance) === 35, 'the customer sees $35 in total');
  assert(!!(await customer.client.rpc('wallet_adjust', { p_customer: customer.id, p_amount: 5, p_note: 'x' })).error, 'a customer can’t give themselves credit');
  assert(!!(await toCard(11)).data.error, 'can’t send credit to the card');

  orderId = randomUUID();
  query(`begin; set local session_replication_role = replica; insert into public.orders(id,customer_id,number,delivery_type,address_line,subtotal,total,payment_method) values ('${orderId}','${customer.id}','TEST-${orderId}','express','AUTOMATED STRIPE TEST - DO NOT FULFIL',30,30,'wallet'); commit; select public.wallet_apply('${customer.id}', -30, 'order_payment', '${orderId}', 'Spice Kart Money', 'Test order');`);
  now = await info();
  assert(now.balance === 5 && now.credit === 0 && now.returnable === 5, '$30 order takes the credit first, then $5 of their money');
  assert(!!(await toCard(6)).data.error, 'can’t send back more than they have left');

  const sent = await toCard(5);
  assert(sent.data.sent === 5 && sent.data.balance === 0, '$5 goes back to the card through Stripe');
  await giveCredit(25);
  now = await info();
  assert(now.balance === 25 && now.credit === 25 && now.returnable === 0, 'top-up spent, then credit: nothing can go back');
  assert(!!(await toCard(5)).data.error, 'that credit can’t be sent to the card');
  console.log('ALL PASSED');
} finally {
  if (orderId) {
    await db.from('customer_notifications').delete().eq('order_id', orderId);
    await db.from('orders').delete().eq('id', orderId);
  }
  if (customer) {
    for (const table of ['customer_notifications', 'stripe_wallet_credits', 'wallet_transactions', 'wallets', 'stripe_customers']) {
      const r = await db.from(table).delete().eq('customer_id', customer.id);
      if (r.error) console.log('CLEANUP REQUIRED ' + table);
    }
    const c = await db.from('customers').delete().eq('id', customer.id);
    if (c.error) console.log('CLEANUP REQUIRED customers');
    const d = await db.auth.admin.deleteUser(customer.id);
    if (d.error) console.log('CLEANUP REQUIRED test user');
  }
  if (adminUser) {
    const a = await db.from('admins').delete().eq('user_id', adminUser.id);
    if (a.error) console.log('CLEANUP REQUIRED test admin');
    await db.from('customers').delete().eq('id', adminUser.id);
    const d = await db.auth.admin.deleteUser(adminUser.id);
    if (d.error) console.log('CLEANUP REQUIRED test admin user');
  }
}
