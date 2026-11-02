import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { singleFlight } from '@/lib/live-changes';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// Refund requests live in the admin panel's `public.refund_requests` (Admin → Payments, where they
// are approved or declined with `decide_refund`). RLS returns only this customer's requests, and
// the status updates live here as soon as the admin decides.

export type RefundReason = 'missing_item' | 'damaged_item' | 'delivery_issue' | 'payment_issue' | 'refund_issue' | 'other';
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export type RefundRequest = {
  id: string;
  /** "RF-1001" */
  number: string;
  orderId: string;
  /** "SK10482" */
  orderNo: string | null;
  status: RefundStatus;
  amount: number | null;
  createdAt: string;
};

type Row = { id: string; number: string; order_id: string; status: RefundStatus; amount: number | string | null; created_at: string; order: { number: string } | null };

const COLUMNS = 'id, number, order_id, status, amount, created_at, order:orders(number)';

export const useRefundStore = create<{ refunds: RefundRequest[]; loaded: boolean }>(() => ({ refunds: [], loaded: false }));

const loadRefunds = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    const { data, error } = await supabase.from('refund_requests').select(COLUMNS).order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    if (!useApp.getState().signedIn) return;
    useRefundStore.setState({
      loaded: true,
      refunds: (data as unknown as Row[]).map((r) => ({
        id: r.id,
        number: r.number,
        orderId: r.order_id,
        orderNo: r.order?.number ?? null,
        status: r.status,
        amount: r.amount == null ? null : Number(r.amount),
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    if (__DEV__) console.warn('Could not load refund requests:', (e as Error).message);
  }
});

export function refreshRefunds() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadRefunds();
}

/** Ask for a refund on an order; the admin decides the amount. Throws if it couldn't be sent. */
export async function requestRefund(input: { orderId: string; reason: RefundReason; detail: string }) {
  const uid = await ensureUserId();
  const { error } = await supabase
    .from('refund_requests')
    .insert({ order_id: input.orderId, customer_id: uid, reason: input.reason, detail: input.detail.trim().slice(0, 1000) });
  if (error) throw error;
  await refreshRefunds();
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    if (channel || !useApp.getState().signedIn) return;
    channel = supabase
      .channel('my-refunds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests', filter: `customer_id=eq.${uid}` }, () => refreshRefunds())
      .subscribe();
  } catch {
    // Retried on the next sign-in.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  useRefundStore.setState({ refunds: [], loaded: false });
}

let started = false;

/** Load this customer's refund requests when signed in (and on foreground), live-update them, and clear them on log out. */
export function startRemoteRefunds() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshRefunds();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshRefunds();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshRefunds();
  });
}
