import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

import { ensureUserId } from '@/lib/remote-profile';
import { stripePublishableKey } from '@/lib/stripe-payment';
import { supabase } from '@/lib/supabase';
import { useApp, type SavedCard } from '@/store/app-store';

type Result = {
  requestId: string;
  cards: SavedCard[];
  defaultId?: string;
  customer: string;
  customerSessionClientSecret: string;
  setupIntentClientSecret: string;
  clientSecret: string;
  intentId: string;
  balance: number;
};
export async function walletRequest(body: Record<string, unknown>): Promise<Result> {
  if (!stripePublishableKey) throw new Error('Payments are not set up yet');
  await ensureUserId();
  const { data, error } = await supabase.functions.invoke('stripe-wallet', { body });
  if (error || data?.error) throw new Error(data?.error || 'Could not connect to payments. Please try again.');
  return data as Result;
}
export async function refreshCards() {
  const uid = await ensureUserId();
  const data = await walletRequest({ action: 'cards' });
  if (uid !== (await ensureUserId())) return;
  useApp.getState().set({
    cards: data.cards,
    defaultCard: Math.max(
      0,
      data.cards.findIndex((c) => c.id === data.defaultId),
    ),
  });
}
export async function saveStripeCard() {
  const data = await walletRequest({ action: 'setup' });
  const init = await initPaymentSheet({
    merchantDisplayName: 'SpiceKart',
    customerId: data.customer,
    customerSessionClientSecret: data.customerSessionClientSecret,
    setupIntentClientSecret: data.setupIntentClientSecret,
    returnURL: 'spicekart://stripe-redirect',
    style: 'alwaysLight',
  });
  if (init.error) throw new Error(init.error.message);
  const { error } = await presentPaymentSheet();
  if (error) {
    if (error.code === 'Canceled') return false;
    throw new Error(error.message);
  }
  await refreshCards();
  return true;
}
export async function payWalletTopUp(amount: number) {
  const { requestId } = await walletRequest({ action: 'request-id' });
  const data = await walletRequest({ action: 'topup', amount, requestId });
  const init = await initPaymentSheet({
    merchantDisplayName: 'SpiceKart',
    customerId: data.customer,
    customerSessionClientSecret: data.customerSessionClientSecret,
    paymentIntentClientSecret: data.clientSecret,
    applePay: { merchantCountryCode: 'AU' },
    googlePay: { merchantCountryCode: 'AU', currencyCode: 'AUD', testEnv: stripePublishableKey.startsWith('pk_test_') },
    returnURL: 'spicekart://stripe-redirect',
    style: 'alwaysLight',
  });
  if (init.error) throw new Error(init.error.message);
  const { error } = await presentPaymentSheet();
  if (error) throw new Error(error.code === 'Canceled' ? 'Payment cancelled. No money was added.' : error.message);
  try {
    return (await walletRequest({ action: 'confirm', intentId: data.intentId })).balance;
  } catch {
    throw new Error(
      'Payment submitted. Your balance will update after confirmation. Check wallet activity before paying again.',
    );
  }
}

let started = false;
export function startRemoteCards() {
  if (started) return;
  started = true;
  const sync = () => {
    useApp.getState().set({ cards: [], defaultCard: 0 });
    if (useApp.getState().signedIn) refreshCards().catch(() => {});
  };
  useApp.subscribe((s, prev) => {
    if (s.signedIn !== prev.signedIn || s.user.mobile !== prev.user.mobile) sync();
  });
  if (useApp.persist.hasHydrated()) sync();
  else useApp.persist.onFinishHydration(sync);
}
