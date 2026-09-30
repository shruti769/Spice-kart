import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { singleFlight } from '@/lib/live-changes';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// Spice Kart Money lives in Supabase: `wallets` (the balance) and `wallet_transactions` (every
// top-up, order payment, refund and admin adjustment), written only by server functions — see the
// wallet migration. The balance is also cached in the app store (`wallet`) so it shows instantly
// on launch; it's live-updated while signed in.

export type WalletTx = {
  id: number;
  amount: number;
  kind: 'topup' | 'order_payment' | 'refund' | 'adjustment';
  method: string | null;
  note: string;
  createdAt: string;
};

type TxRow = { id: number; amount: number | string; kind: WalletTx['kind']; method: string | null; note: string; created_at: string };

export const useWalletStore = create<{ transactions: WalletTx[]; loaded: boolean }>(() => ({ transactions: [], loaded: false }));

/** "$24" for whole dollars, else "$24.50" (compact header chips). */
export const shortBalance = (n: number) => '$' + (Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2));

const loadWallet = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    const [w, tx] = await Promise.all([
      supabase.from('wallets').select('balance').maybeSingle(),
      supabase.from('wallet_transactions').select('id, amount, kind, method, note, created_at').order('created_at', { ascending: false }).limit(30),
    ]);
    if (w.error) throw w.error;
    if (tx.error) throw tx.error;
    if (!useApp.getState().signedIn) return;
    useApp.getState().set({ wallet: w.data ? Number(w.data.balance) : 0 });
    useWalletStore.setState({
      loaded: true,
      transactions: (tx.data as TxRow[]).map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        kind: r.kind,
        method: r.method,
        note: r.note,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    if (__DEV__) console.warn('Could not load wallet:', (e as Error).message);
  }
});

export function refreshWallet() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadWallet();
}

export class TopUpError extends Error {}

/**
 * Add money. DEMO: no payment provider is connected yet, so the server credits the top-up
 * without charging the card. Returns the new balance.
 */
export async function topUp(amount: number, method: string): Promise<number> {
  if (!isSupabaseConfigured) throw new TopUpError('Couldn’t add money. Please try again');
  try {
    await ensureUserId();
  } catch {
    throw new TopUpError('No connection · please try again');
  }
  const { data, error } = await supabase.rpc('wallet_top_up', { p_amount: amount, p_method: method });
  if (error) {
    if (__DEV__) console.warn('Could not top up:', error.message);
    throw new TopUpError(error.message.includes('bad_amount') ? 'Enter an amount between $5 and $500' : 'Couldn’t add money. Please try again');
  }
  const balance = Number(data);
  useApp.getState().set({ wallet: balance });
  refreshWallet();
  return balance;
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    if (channel || !useApp.getState().signedIn) return;
    channel = supabase
      .channel('my-wallet')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `customer_id=eq.${uid}` }, () => refreshWallet())
      .subscribe();
  } catch {
    // Retried on the next sign-in.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  useWalletStore.setState({ transactions: [], loaded: false });
}

let started = false;

/** Load the wallet when signed in (and on foreground), live-update it, and clear it on log out. */
export function startRemoteWallet() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshWallet();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshWallet();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshWallet();
  });
}
