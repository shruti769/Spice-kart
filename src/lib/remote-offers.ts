import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** A live row of `public.offer_tiles` (RLS only returns active ones inside their date window). */
export type OfferTile = {
  id: string;
  kind: 'deal' | 'bank';
  title: string;
  subtitle: string;
  image_url: string | null;
  category_id: string | null;
  icon: 'card' | 'wallet';
  badge: string;
  ends_at: string | null;
};

const COLUMNS = 'id, kind, title, subtitle, image_url, category_id, icon, badge, ends_at';

/** Artwork bundled with the app, referenced as `asset:<name>` in `image_url`. */
const ASSETS: Record<string, number> = {
  vegetables: require('@/assets/images/offers/vegetables.png'),
  'first-order': require('@/assets/images/offers/first-order.png'),
  pantry: require('@/assets/images/offers/pantry.png'),
  dairy: require('@/assets/images/offers/dairy.png'),
  delivery: require('@/assets/images/offers/delivery.png'),
  spices: require('@/assets/images/offers/spices.png'),
};

/** Image source for a deal tile (bundled asset or uploaded URL); null when it has none. */
export function tileImage(t: OfferTile) {
  if (!t.image_url) return null;
  if (t.image_url.startsWith('asset:')) return ASSETS[t.image_url.slice(6)] ?? null;
  return { uri: t.image_url };
}

/** Replaces `{free_delivery_over}` with the live threshold, e.g. "Orders over $50". */
export const tileText = (s: string, freeOver: number) => s.split('{free_delivery_over}').join('$' + freeOver.toFixed(0));

export const useOfferStore = create<{ tiles: OfferTile[]; loaded: boolean }>(() => ({ tiles: [], loaded: false }));

const loadTiles = singleFlight(async () => {
  const { data, error } = await supabase.from('offer_tiles').select(COLUMNS).order('sort').order('created_at');
  if (error) {
    if (__DEV__) console.warn('Could not load offer tiles:', error.message);
    return;
  }
  useOfferStore.setState({ tiles: (data ?? []) as OfferTile[], loaded: true });
});

export function refreshOfferTiles() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadTiles();
}

let started = false;

/** Load offer tiles now, on foreground, and live when an admin changes them. */
export function startRemoteOffers() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshOfferTiles();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshOfferTiles();
  });
  onTableChange(['offer_tiles'], refreshOfferTiles);
}

/** Live deal tiles and bank offers for the Offers screen. */
export function useOfferTiles() {
  useEffect(startRemoteOffers, []);
  const { tiles, loaded } = useOfferStore();
  return { deals: tiles.filter((t) => t.kind === 'deal'), bank: tiles.filter((t) => t.kind === 'bank'), loaded };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Ends Sunday" / "Ends today" when the soonest-ending deal ends within a week, else undefined. */
export function dealsEndNote(deals: OfferTile[]) {
  const ends = deals.map((d) => (d.ends_at ? new Date(d.ends_at).getTime() : Infinity));
  const soonest = Math.min(...ends);
  if (!Number.isFinite(soonest) || soonest - Date.now() > 7 * 86_400_000) return undefined;
  const d = new Date(soonest);
  return d.toDateString() === new Date().toDateString() ? 'Ends today' : 'Ends ' + DAY_NAMES[d.getDay()];
}
