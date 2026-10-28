import { initPaymentSheet, presentPaymentSheet, PaymentSheetError } from '@stripe/stripe-react-native';

import { ensureUserId } from '@/lib/remote-profile';
import { supabase } from '@/lib/supabase';
import type { PaymentKey } from '@/store/app-store';

// Card, Apple Pay and Google Pay are charged through Stripe's Payment Sheet after place_order()
// has created the order (see the stripe migration and the stripe-payment / stripe-webhook edge
// functions). The webhook marks the order paid; the app only shows the sheet.

export const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/** Payment methods that go through Stripe (the rest are Spice Kart Money or PayID). */
export const isStripeMethod = (p: PaymentKey) => p === 'Card' || p === 'Apple Pay' || p === 'Google Pay';

async function call(action: 'start' | 'cancel', orderId: string) {
  await ensureUserId();
  const { data, error } = await supabase.functions.invoke('stripe-payment', { body: { action, orderId } });
  if (error) throw error;
  return data as { clientSecret?: string; paid?: boolean; cancelled?: boolean };
}

/**
 * Show the Payment Sheet for a placed order. 'paid' once Stripe confirms the payment, 'cancelled'
 * when the customer closes the sheet, 'failed' when the sheet can't be shown or payment fails.
 */
export async function payForOrder(orderId: string): Promise<{ result: 'paid' | 'cancelled' | 'failed'; message?: string }> {
  if (!stripePublishableKey) return { result: 'failed', message: 'Card payments aren’t set up yet' };
  try {
    const { clientSecret, paid } = await call('start', orderId);
    if (paid) return { result: 'paid' };
    if (!clientSecret) return { result: 'failed' };
    const init = await initPaymentSheet({
      merchantDisplayName: 'SpiceKart',
      paymentIntentClientSecret: clientSecret,
      applePay: { merchantCountryCode: 'AU' },
      googlePay: { merchantCountryCode: 'AU', currencyCode: 'AUD', testEnv: stripePublishableKey.startsWith('pk_test_') },
      returnURL: 'spicekart://stripe-redirect',
      defaultBillingDetails: { address: { country: 'AU' } },
      style: 'alwaysLight',
    });
    if (init.error) return { result: 'failed', message: init.error.message };
    const { error } = await presentPaymentSheet();
    if (!error) return { result: 'paid' };
    return { result: error.code === PaymentSheetError.Canceled ? 'cancelled' : 'failed', message: error.message };
  } catch (e) {
    if (__DEV__) console.warn('Stripe payment failed:', (e as Error).message);
    return { result: 'failed' };
  }
}

/** Give up on an unpaid order: cancels it and puts its stock back. False when it turned out to be paid. */
export async function cancelUnpaidOrder(orderId: string) {
  try {
    const { cancelled } = await call('cancel', orderId);
    return cancelled !== false;
  } catch {
    // Left as pending; the admin can cancel it.
    return true;
  }
}
