import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { REMOTE_PREFIX, findProduct, photo, type Address } from '@/data/catalog';
import { singleFlight } from '@/lib/live-changes';
import type { DeviceFix } from '@/lib/location';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp, type PaymentKey } from '@/store/app-store';

// Orders live in the admin panel's `public.orders` / `public.order_items` (keyed by customer =
// Supabase Auth user). The app places them through the `place_order` RPC, which re-prices the
// cart on the server (see the orders migration).

export type OrderStatus = 'placed' | 'confirmed' | 'picking' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type OrderItem = { productId: string | null; name: string; img: string; qty: number; lineTotal: number };

export type Order = {
  id: string;
  /** "SK10001" */
  no: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  items: OrderItem[];
};

type OrderRow = {
  id: string;
  number: string;
  status: OrderStatus;
  placed_at: string;
  total: number | string;
  order_items: { product_id: string | null; name: string; image_url: string | null; qty: number; line_total: number | string }[];
};

const COLUMNS = 'id, number, status, placed_at, total, order_items(product_id, name, image_url, qty, line_total)';

export const isActiveOrder = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

const fromRow = (r: OrderRow): Order => ({
  id: r.id,
  no: r.number,
  status: r.status,
  createdAt: r.placed_at,
  total: Number(r.total),
  items: r.order_items.map((i) => ({
    productId: i.product_id,
    name: i.name,
    img: i.image_url || photo('basket'),
    qty: i.qty,
    lineTotal: Number(i.line_total),
  })),
});

export const useOrderStore = create<{ orders: Order[]; loaded: boolean }>(() => ({ orders: [], loaded: false }));

const loadOrders = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    // RLS returns only this user's orders.
    const { data, error } = await supabase.from('orders').select(COLUMNS).order('placed_at', { ascending: false }).limit(50);
    if (error) throw error;
    if (useApp.getState().signedIn) useOrderStore.setState({ orders: (data as OrderRow[]).map(fromRow), loaded: true });
  } catch (e) {
    if (__DEV__) console.warn('Could not load orders:', (e as Error).message);
  }
});

export function refreshOrders() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadOrders();
}

/** Why `placeOrder` failed: a code from the `place_order` RPC (or 'network'), plus a product name for out_of_stock. */
export class OrderError extends Error {
  constructor(
    readonly code: string,
    readonly detail = '',
  ) {
    super(code);
  }
}

/** Place the cart as an order. Resolves with the order number and the total charged by the server. */
export async function placeOrder(input: {
  cart: Record<string, number>;
  address: Address;
  payment: PaymentKey;
  /** null = express */
  slotId: string | null;
  date: string | null;
  coupon: string | null;
  /** Where the phone was when ordering, if the user allowed location. */
  device: DeviceFix | null;
}): Promise<{ id: string; no: string; total: number }> {
  // Only products still in the catalogue (the cart totals ignore the rest too).
  const items = Object.entries(input.cart)
    .filter(([id, qty]) => qty > 0 && id.startsWith(REMOTE_PREFIX) && findProduct(id))
    .map(([id, qty]) => ({ product_id: id.slice(REMOTE_PREFIX.length), qty }));
  if (!items.length) throw new OrderError('empty_cart');

  try {
    await ensureUserId();
  } catch {
    throw new OrderError('network');
  }
  const { data, error } = await supabase.rpc('place_order', {
    p_items: items,
    p_address_label: input.address.label,
    p_address_line: input.address.line,
    p_payment: input.payment,
    p_slot_id: input.slotId,
    p_delivery_date: input.slotId ? input.date : null,
    p_coupon: input.coupon,
    p_delivery_location: input.address.lat != null && input.address.lng != null ? { lat: input.address.lat, lng: input.address.lng } : null,
    p_device_location: input.device,
  });
  if (error) {
    // Our own errors are "code" or "code:detail". The admin schema's orders_assign_store trigger
    // (stores.sql) refuses every order until a store is saved. Anything else is a connection / server problem.
    if (error.message.startsWith('No store is set up')) throw new OrderError('no_store');
    const [, code, detail] = error.message.match(/^([a-z_]+)(?::(.*))?$/) ?? [];
    if (__DEV__) console.warn('Could not place order:', error.message);
    throw new OrderError(code ?? 'network', detail ?? '');
  }
  const placed = data as { id: string; number: string; total: number | string };
  refreshOrders();
  return { id: placed.id, no: placed.number, total: Number(placed.total) };
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    channel = supabase
      .channel('my-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${uid}` }, () => refreshOrders())
      .subscribe();
  } catch {
    // Realtime is a nicety; the list still refreshes on focus.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  useOrderStore.setState({ orders: [], loaded: false });
}

let started = false;

/** Load orders when signed in (and on foreground), live-update their status, and clear them on log out. */
export function startRemoteOrders() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshOrders();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshOrders();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshOrders();
  });
}

/** This user's orders, newest first. Refreshes whenever the calling screen mounts. */
export function useOrders() {
  useEffect(() => {
    refreshOrders();
  }, []);
  return useOrderStore();
}

// ─── Tracking one order ─────────────────────────────────────────────────────────────────

export type TrackedOrder = {
  id: string;
  no: string;
  status: OrderStatus;
  deliveryType: 'express' | 'scheduled';
  slotLabel: string | null;
  placedAt: string;
  promisedBy: string | null;
  deliveredAt: string | null;
  cancelReason: string | null;
  addressLine: string;
  /** When each status was reached (latest time), from the admin's `order_status_events`. */
  reachedAt: Partial<Record<OrderStatus, string>>;
  /** Look it up with `useStore` (live store details). */
  storeId: string | null;
};

type TrackRow = {
  id: string;
  number: string;
  status: OrderStatus;
  delivery_type: 'express' | 'scheduled';
  slot_label: string | null;
  placed_at: string;
  promised_by: string | null;
  delivered_at: string | null;
  cancel_reason: string | null;
  address_line: string;
  history: { status: OrderStatus; at: string }[] | null;
  store_id: string | null;
};

const TRACK_COLUMNS =
  'id, number, status, delivery_type, slot_label, placed_at, promised_by, delivered_at, cancel_reason, address_line, store_id, history:order_status_events(status, at)';

function toTracked(r: TrackRow): TrackedOrder {
  const reachedAt: TrackedOrder['reachedAt'] = { placed: r.placed_at };
  for (const e of r.history ?? []) {
    if (!reachedAt[e.status] || e.at > reachedAt[e.status]!) reachedAt[e.status] = e.at;
  }
  if (r.delivered_at) reachedAt.delivered = r.delivered_at;
  return {
    id: r.id,
    no: r.number,
    status: r.status,
    deliveryType: r.delivery_type,
    slotLabel: r.slot_label,
    placedAt: r.placed_at,
    promisedBy: r.promised_by,
    deliveredAt: r.delivered_at,
    cancelReason: r.cancel_reason,
    addressLine: r.address_line,
    reachedAt,
    storeId: r.store_id,
  };
}

/**
 * One order for the Track screen, live: re-fetched whenever the admin changes its status (orders
 * and order_status_events are in the Realtime publication) and when the app returns to the front.
 * `id` null = this customer's latest active order.
 */
export function useTrackedOrder(id: string | null) {
  const [state, setState] = useState<{ order: TrackedOrder | null; loading: boolean }>({ order: null, loading: isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    let orderId = id;
    let live: RealtimeChannel | null = null;

    const load = async () => {
      try {
        await ensureUserId();
        let q = supabase.from('orders').select(TRACK_COLUMNS);
        q = orderId ? q.eq('id', orderId) : q.not('status', 'in', '(delivered,cancelled)').order('placed_at', { ascending: false }).limit(1);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        if (!alive) return;
        const order = data ? toTracked(data as unknown as TrackRow) : null;
        setState({ order, loading: false });
        // Subscribe once we know which order this is.
        if (order && !live) {
          orderId = order.id;
          live = supabase
            .channel('track-' + order.id)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` }, () => load())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_events', filter: `order_id=eq.${order.id}` }, () => load())
            .subscribe();
        }
      } catch (e) {
        if (__DEV__) console.warn('Could not load order for tracking:', (e as Error).message);
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    };

    load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => {
      alive = false;
      sub.remove();
      if (live) supabase.removeChannel(live);
    };
  }, [id]);

  return state;
}
