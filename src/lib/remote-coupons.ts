import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { findProduct } from '@/data/catalog';
import { onTableChange, singleFlight } from '@/lib/live-changes';
import { refreshOfferTiles } from '@/lib/remote-offers';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** A live coupon from `public.coupons` (RLS only returns active ones inside their date window). */
export type Coupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'flat' | 'percent' | 'free_delivery';
  value: number;
  max_discount: number | null;
  min_spend: number;
  category_id: string | null;
  ends_at: string | null;
};

const COLUMNS = 'id, code, title, description, discount_type, value, max_discount, min_spend, category_id, ends_at';

/** Coupons keyed by code; read synchronously by `cartTotals`. Replaced on each fetch. */
let byCode = new Map<string, Coupon>();

export const findCoupon = (code: string | null) => (code ? byCode.get(code) : undefined);

export const useCouponStore = create<{ coupons: Coupon[]; loaded: boolean }>(() => ({ coupons: [], loaded: false }));

let nextTimer: ReturnType<typeof setTimeout> | undefined;

/** Refresh again when the next coupon or offer tile starts or ends (see `next_offer_change`). */
async function scheduleNextChange() {
  const { data, error } = await supabase.rpc('next_offer_change');
  clearTimeout(nextTimer);
  if (error || !data) return;
  // setTimeout overflows past ~24 days; re-check at least every 6 hours.
  const ms = Math.min(new Date(data as string).getTime() - Date.now() + 1000, 6 * 3600_000);
  nextTimer = setTimeout(() => {
    refreshCoupons();
    refreshOfferTiles();
  }, Math.max(ms, 1000));
}

const loadCoupons = singleFlight(async () => {
  const { data, error } = await supabase.from('coupons').select(COLUMNS).order('sort').order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('Could not load coupons:', error.message);
    return;
  }
  const coupons = (data ?? []).map((r) => ({
    ...r,
    value: Number(r.value),
    max_discount: r.max_discount == null ? null : Number(r.max_discount),
    min_spend: Number(r.min_spend),
  })) as Coupon[];
  byCode = new Map(coupons.map((c) => [c.code, c]));
  useCouponStore.setState({ coupons, loaded: true });
  scheduleNextChange();
});

export function refreshCoupons() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadCoupons();
}

let started = false;

/** Load coupons now, on foreground, and live when an admin changes them (or one starts / ends). */
export function startRemoteCoupons() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshCoupons();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshCoupons();
  });
  onTableChange(['coupons'], refreshCoupons);
}

/** Live coupons; re-renders when they change. */
export function useCoupons() {
  useEffect(startRemoteCoupons, []);
  return useCouponStore();
}

const money = (v: number) => '$' + (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2));

/** Big value / small unit shown on the coupon card, e.g. ["$5", "OFF"], ["20%", "OFF"], ["FREE", "DELIVERY"]. */
export function couponBadge(c: Coupon): [string, string] {
  if (c.discount_type === 'free_delivery') return ['FREE', 'DELIVERY'];
  return [c.discount_type === 'percent' ? `${c.value}%` : money(c.value), 'OFF'];
}

/** Default terms line when the admin left the description empty. */
export function couponTerms(c: Coupon, categoryName?: string) {
  if (c.description.trim()) return c.description.trim();
  const parts = [c.min_spend > 0 ? `Min spend ${money(c.min_spend)}` : 'No minimum spend'];
  if (c.discount_type === 'percent' && c.max_discount) parts.push(`max discount ${money(c.max_discount)}`);
  if (categoryName) parts.push(categoryName + ' only');
  return parts.join(' · ');
}

export type CouponResult = { discount: number; freeDelivery: boolean; note: string };

/**
 * Apply a coupon to the cart. Only items in the coupon's category count when it has one, both
 * for the minimum spend and the discount. `note` explains why a coupon doesn't apply yet.
 */
export function applyCouponRules(code: string | null, cart: Record<string, number>, delivery: number): CouponResult {
  const none = { discount: 0, freeDelivery: false, note: '' };
  if (!code) return none;
  const c = findCoupon(code);
  // Until coupons have loaded, keep the applied code without a warning.
  if (!c) return useCouponStore.getState().loaded ? { ...none, note: 'This coupon is no longer available' } : none;

  let eligible = 0;
  for (const id of Object.keys(cart)) {
    const p = findProduct(id);
    if (p && (!c.category_id || p.cat === c.category_id)) eligible += p.price * cart[id];
  }
  if (c.category_id && eligible === 0) return { ...none, note: `Add items from this coupon's category to use ${c.code}` };
  if (eligible < c.min_spend) return { ...none, note: `Spend ${money(c.min_spend - eligible)} more to use ${c.code}` };

  switch (c.discount_type) {
    case 'flat':
      return { ...none, discount: Math.min(c.value, eligible) };
    case 'percent': {
      const raw = Math.round(eligible * c.value) / 100;
      return { ...none, discount: c.max_discount ? Math.min(raw, c.max_discount) : raw };
    }
    case 'free_delivery':
      return delivery > 0 ? { ...none, freeDelivery: true } : { ...none, note: 'Delivery is already free on this order' };
  }
}
