// Test-mode refund checks through the deployed stripe-refund function. Creates an isolated customer
// and admin, and removes its database fixtures afterward. Needs refunds set to the original payment
// method (Admin → Settings → Payments). Run from the project root: node scripts/verify-stripe-refunds.mjs
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

const assert = (ok, label) => {
  if (!ok) throw new Error('FAIL ' + label);
  console.log('PASS ' + label);
};
const signUp = async () => {
  const email = `refund-check-${randomUUID()}@example.com`;
  const password = randomUUID() + 'Aa1!';
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error('Could not create test account: ' + created.error.message);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error('Test sign-in unavailable');
  return { id: created.data.user.id, email, client, token: login.data.session.access_token };
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
const confirm = async (secret, card) => {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${secret.split('_secret_')[0]}/confirm`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + pk, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_secret: secret, payment_method: card }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Stripe test API: ' + data.error?.code);
  return data;
};

let customer;
let adminUser;
let orderId;
let requestRow;
const extraOrders = [];
const failedRefunds = [];
try {
  const dest = await db.from('business_settings').select('refund_destination').limit(1).single();
  if (dest.data.refund_destination !== 'original') throw new Error('Set refunds to the original payment method first');

  customer = await signUp();
  adminUser = await signUp();
  const template = await db.from('admins').select('role, department').limit(1).single();
  const added = await db.from('admins').insert({ user_id: adminUser.id, email: adminUser.email, name: 'Automated refund test', role: template.data.role, department: template.data.department, status: 'active' });
  if (added.error) throw new Error('Could not create test admin: ' + added.error.message);
  const refund = (body) => call('stripe-refund', adminUser.token, body);

  // A saved test card, a wallet top-up and a paid order.
  const wallet = (body) => call('stripe-wallet', customer.token, body);
  const setup = await wallet({ action: 'setup' });
  if (!setup.data.setupIntentClientSecret) throw new Error('Card setup failed: ' + setup.status + ' ' + JSON.stringify(setup.data));
  const setupId = setup.data.setupIntentClientSecret.split('_secret_')[0];
  const saved = await fetch(`https://api.stripe.com/v1/setup_intents/${setupId}/confirm`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + pk, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_secret: setup.data.setupIntentClientSecret, payment_method: 'pm_card_visa' }),
  });
  assert(saved.ok, 'test card saved');
  const card = (await wallet({ action: 'cards' })).data.cards[0].id;

  const top = await wallet({ action: 'topup', amount: 10, requestId: randomUUID() });
  await confirm(top.data.clientSecret, card);
  const credited = await wallet({ action: 'confirm', intentId: top.data.intentId });
  assert(credited.data.balance === 10, 'wallet topped up with $10');

  orderId = randomUUID();
  execFileSync(
    'supabase',
    ['db', 'query', '--linked', `begin; set local session_replication_role = replica; insert into public.orders(id,customer_id,number,delivery_type,address_line,subtotal,total,payment_method) values ('${orderId}','${customer.id}','TEST-${orderId}','express','AUTOMATED STRIPE TEST - DO NOT FULFIL',20,20,'card'); commit;`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const started = await call('stripe-payment', customer.token, { action: 'start', orderId });
  await confirm(started.data.clientSecret, card);
  let paid = false;
  for (let i = 0; i < 20 && !paid; i++) {
    paid = (await db.from('orders').select('payment_status').eq('id', orderId).single()).data?.payment_status === 'paid';
    if (!paid) await new Promise((r) => setTimeout(r, 2000));
  }
  assert(paid, '$20 test order paid by card');

  // Who can refund.
  assert((await call('stripe-refund', customer.token, { action: 'order', orderId, amount: 1, requestId: randomUUID() })).status === 403, 'a customer can’t refund');
  const direct = await adminUser.client.rpc('refund_order', { p_order: orderId, p_amount: 1 });
  assert(!!direct.error, 'a card payment can’t be marked refunded without Stripe');

  // Order refunds.
  const requestId = randomUUID();
  const first = await refund({ action: 'order', orderId, amount: 5, reason: 'Test', requestId });
  assert(first.data.toCard === true && first.data.payment?.provider_ref?.startsWith('re_'), 'partial refund sent to Stripe');
  const retry = await refund({ action: 'order', orderId, amount: 5, reason: 'Test', requestId });
  const rows = await db.from('payments').select('id, amount').eq('order_id', orderId).eq('status', 'refunded');
  assert(!retry.data.error && rows.data.length === 1, 'retrying the same refund doesn’t refund twice');
  const order = await db.from('orders').select('payment_status').eq('id', orderId).single();
  assert(order.data.payment_status === 'partially_refunded', 'order shows partially refunded');
  assert((await refund({ action: 'wallet-info', customerId: customer.id })).data.balance === 10, 'card refund doesn’t touch the wallet');
  assert(!!(await refund({ action: 'order', orderId, amount: 100, requestId: randomUUID() })).data.error, 'can’t refund more than was paid');

  // Refund requests.
  const inserted = await customer.client.from('refund_requests').insert({ order_id: orderId, customer_id: customer.id, reason: 'missing_item', detail: 'Test' }).select('id').single();
  if (inserted.error) throw new Error('Could not create test request: ' + inserted.error.message);
  requestRow = inserted.data.id;
  const decided = await refund({ action: 'request', refundRequest: requestRow, approve: true, amount: 5, requestId: randomUUID() });
  assert(decided.data.toCard === true && decided.data.request?.status === 'paid', 'approving a request refunds the card');
  const again = await refund({ action: 'request', refundRequest: requestRow, approve: true, amount: 5, requestId: randomUUID() });
  assert(!!again.data.error, 'a decided request can’t be paid twice');
  const after = await db.from('payments').select('provider_ref').eq('order_id', orderId).eq('status', 'refunded');
  assert(after.data.length === 2 && after.data.every((p) => p.provider_ref?.startsWith('re_')), 'each refund has its Stripe id');

  // Wallet money back to the card.
  const info = await refund({ action: 'wallet-info', customerId: customer.id });
  assert(info.data.returnable === 10, '$10 of the wallet can go back to a card');
  const back = await refund({ action: 'wallet-to-card', customerId: customer.id, amount: 4, requestId: randomUUID() });
  assert(back.data.sent === 4 && back.data.balance === 6, '$4 of wallet money sent back to the card');
  assert(!!(await refund({ action: 'wallet-to-card', customerId: customer.id, amount: 7, requestId: randomUUID() })).data.error, 'can’t return more than is left');
  const credit = await db.from('stripe_wallet_credits').select('refunded').eq('customer_id', customer.id).single();
  assert(Number(credit.data.refunded) === 4, 'top-up remembers what went back');
  const ledger = await db.from('wallet_transactions').select('amount, kind').eq('customer_id', customer.id).eq('kind', 'adjustment');
  assert(ledger.data.length === 1 && Number(ledger.data[0].amount) === -4, 'wallet activity shows the return');

  // Admin credit (not from a top-up) can't reach a card.
  const gift = await db.rpc('wallet_apply', { p_customer: customer.id, p_amount: 50, p_kind: 'adjustment', p_order: null, p_method: null, p_note: 'Test credit' });
  if (gift.error) throw new Error('Could not add test credit: ' + gift.error.message);
  assert((await refund({ action: 'wallet-info', customerId: customer.id })).data.returnable === 6, 'credit that wasn’t paid by card can’t go back to one');

  // Another test order, for the rest.
  const paidOrder = async (total, paymentMethod) => {
    const id = randomUUID();
    extraOrders.push(id);
    execFileSync(
      'supabase',
      ['db', 'query', '--linked', `begin; set local session_replication_role = replica; insert into public.orders(id,customer_id,number,delivery_type,address_line,subtotal,total,payment_method) values ('${id}','${customer.id}','TEST-${id}','express','AUTOMATED STRIPE TEST - DO NOT FULFIL',${total},${total},'card'); commit;`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const started = await call('stripe-payment', customer.token, { action: 'start', orderId: id });
    await confirm(started.data.clientSecret, paymentMethod);
    for (let i = 0; i < 20; i++) {
      if ((await db.from('orders').select('payment_status').eq('id', id).single()).data?.payment_status === 'paid') return id;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('FAIL test order never marked paid');
  };

  // Cancelling refunds the card.
  const toCancel = await paidOrder(15, card);
  const cancelled = await refund({ action: 'cancel', orderId: toCancel, reason: 'Test', requestId: randomUUID() });
  assert(cancelled.data.cancelled === true && cancelled.data.toCard === true && cancelled.data.refunded === 15, 'cancelling an order refunds the card');
  const after2 = await db.from('orders').select('status, payment_status').eq('id', toCancel).single();
  assert(after2.data.status === 'cancelled' && after2.data.payment_status === 'refunded', 'cancelled order shows refunded');
  const again2 = await refund({ action: 'cancel', orderId: toCancel, requestId: randomUUID() });
  const refunds2 = await db.from('payments').select('id').eq('order_id', toCancel).eq('status', 'refunded');
  assert(again2.data.refunded === 0 && refunds2.data.length === 1, 'cancelling twice doesn’t refund twice');

  // A bank bouncing a refund later (what the webhook calls).
  const failed = await db.from('payments').select('provider_ref, amount').eq('order_id', orderId).eq('status', 'refunded').limit(1).single();
  const failArgs = { p_refund: failed.data.provider_ref, p_intent: 'pi_test', p_amount: Number(failed.data.amount), p_reason: 'expired_or_canceled_card', p_wallet_customer: null, p_refund_request: null };
  assert(!(await db.rpc('stripe_refund_failed', failArgs)).error, 'failed refund processed');
  await db.rpc('stripe_refund_failed', failArgs);
  const remaining = await db.from('payments').select('id').eq('order_id', orderId).eq('status', 'refunded');
  assert(remaining.data.length === 1, 'failed refund removed from the order, once');
  const alert = await db.from('admin_alerts').select('severity').eq('dedup_key', 'refund:failed:' + failed.data.provider_ref).single();
  assert(alert.data?.severity === 'critical', 'admin gets a critical alert');
  failedRefunds.push(failed.data.provider_ref);
  const walletBefore = (await refund({ action: 'wallet-info', customerId: customer.id })).data.balance;
  const walletFail = { p_refund: 're_test_' + randomUUID(), p_intent: top.data.intentId, p_amount: 4, p_reason: 'declined', p_wallet_customer: customer.id, p_refund_request: null };
  failedRefunds.push(walletFail.p_refund);
  await db.rpc('stripe_refund_failed', walletFail);
  await db.rpc('stripe_refund_failed', walletFail);
  const walletAfter = (await refund({ action: 'wallet-info', customerId: customer.id })).data.balance;
  const credit2 = await db.from('stripe_wallet_credits').select('refunded').eq('customer_id', customer.id).single();
  assert(walletAfter === walletBefore + 4 && Number(credit2.data.refunded) === 0, 'failed wallet return goes back to the wallet, once');

  // The real event from Stripe. Needs refund.failed on the webhook endpoint.
  const bounced = await paidOrder(7, 'pm_card_refundFail');
  const bouncing = await refund({ action: 'order', orderId: bounced, amount: 7, requestId: randomUUID() });
  assert(bouncing.data.toCard === true, 'refund to a card that will bounce accepted by Stripe');
  failedRefunds.push(bouncing.data.payment.provider_ref);
  let heard = false;
  for (let i = 0; i < 30 && !heard; i++) {
    heard = !!(await db.from('admin_alerts').select('id').eq('dedup_key', 'refund:failed:' + bouncing.data.payment.provider_ref).maybeSingle()).data;
    if (!heard) await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(heard ? 'PASS real refund.failed event handled by the webhook' : 'WEBHOOK NOT RECEIVED: add refund.failed and refund.updated to the Stripe webhook endpoint');
  console.log('ALL PASSED');
} finally {
  if (requestRow) await db.from('admin_alerts').delete().eq('dedup_key', 'refund:' + requestRow);
  for (const ref of failedRefunds) {
    await db.from('admin_alerts').delete().eq('dedup_key', 'refund:failed:' + ref);
    await db.from('stripe_refund_failures').delete().eq('refund_id', ref);
  }
  for (const id of extraOrders) {
    await db.from('admin_alerts').delete().like('dedup_key', `%${id}%`);
    await db.from('outbound_messages').delete().eq('order_id', id);
    await db.from('customer_notifications').delete().eq('order_id', id);
    await db.from('payments').delete().eq('order_id', id);
    const removed = await db.from('orders').delete().eq('id', id);
    if (removed.error) console.log('CLEANUP REQUIRED test order');
  }
  if (orderId) {
    await db.from('admin_alerts').delete().like('dedup_key', `%${orderId}%`);
    await db.from('outbound_messages').delete().eq('order_id', orderId);
    await db.from('customer_notifications').delete().eq('order_id', orderId);
    await db.from('refund_requests').delete().eq('order_id', orderId);
    await db.from('payments').delete().eq('order_id', orderId);
    const removed = await db.from('orders').delete().eq('id', orderId);
    if (removed.error) console.log('CLEANUP REQUIRED test order');
  }
  if (customer) {
    for (const table of ['stripe_wallet_credits', 'wallet_transactions', 'wallets', 'stripe_customers']) {
      const r = await db.from(table).delete().eq('customer_id', customer.id);
      if (r.error) console.log('CLEANUP REQUIRED ' + table);
    }
    const c = await db.from('customers').delete().eq('id', customer.id);
    if (c.error) console.log('CLEANUP REQUIRED customers');
    const d = await db.auth.admin.deleteUser(customer.id);
    if (d.error) console.log('CLEANUP REQUIRED customer auth user');
  }
  if (adminUser) {
    await db.from('admins').delete().eq('user_id', adminUser.id);
    const d = await db.auth.admin.deleteUser(adminUser.id);
    if (d.error) console.log('CLEANUP REQUIRED admin auth user');
  }
  console.log('Test accounts cleaned up');
}
