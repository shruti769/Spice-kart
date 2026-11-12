import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { useOrderStore } from '@/lib/remote-orders';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// What the admin's Content page publishes for the Home screen: `public.announcements` and
// `public.seasonal_collections`. RLS only returns ones whose dates include today (Brisbane time),
// and edits arrive live through `app_changes`.

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'alert';
  placement: 'top_bar' | 'popup';
  audience: 'all' | 'new' | 'frequent';
  /** Where tapping goes: page: or category: (see `openLink`). */
  link: string | null;
};

export type Collection = { id: string; name: string; tagline: string; cover: string | null; productIds: string[] };

/** Orders it takes to count as a "Frequent customer" for announcements. */
const FREQUENT_ORDERS = 3;
const DISMISSED_KEY = 'spice-kart-dismissed-popups';

export const useHomeContent = create<{ announcements: Announcement[]; collections: Collection[]; dismissed: string[] }>(() => ({
  announcements: [],
  collections: [],
  dismissed: [],
}));

const loadContent = singleFlight(async () => {
  const [a, c] = await Promise.all([
    supabase.from('announcements').select('id, title, message, type, placement, audience, link').order('created_at', { ascending: false }),
    supabase.from('seasonal_collections').select('id, name, tagline, cover_url, product_ids').eq('show_on_home', true).order('starts_on', { ascending: false }),
  ]);
  if (a.error || c.error) {
    if (__DEV__) console.warn('Could not load home content:', (a.error ?? c.error)?.message);
    return;
  }
  useHomeContent.setState({
    announcements: a.data as Announcement[],
    collections: c.data.map((r) => ({ id: r.id, name: r.name, tagline: r.tagline, cover: r.cover_url, productIds: r.product_ids ?? [] })),
  });
});

export function refreshHomeContent() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadContent();
}

let started = false;

/** Load Home content now, on foreground, and live when an admin changes it. */
export function startRemoteHomeContent() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshHomeContent();
  AsyncStorage.getItem(DISMISSED_KEY)
    .then((v) => useHomeContent.setState({ dismissed: v ? JSON.parse(v) : [] }))
    .catch(() => {});
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshHomeContent();
  });
  onTableChange(['announcements', 'seasonal_collections'], refreshHomeContent);
}

/** Announcements for this customer: new = no orders yet, frequent = several (unknown until orders load). */
export function useAnnouncements() {
  const announcements = useHomeContent((s) => s.announcements);
  const dismissed = useHomeContent((s) => s.dismissed);
  const count = useOrderStore((s) => s.orders.length);
  const loaded = useOrderStore((s) => s.loaded);
  const live = announcements.filter((a) => a.audience === 'all' || (loaded && (a.audience === 'new' ? count === 0 : count >= FREQUENT_ORDERS)));
  return {
    bars: live.filter((a) => a.placement === 'top_bar'),
    // A popup shows once per phone: dismissing it is remembered.
    popup: live.find((a) => a.placement === 'popup' && !dismissed.includes(a.id)) ?? null,
  };
}

export function dismissPopup(id: string) {
  const dismissed = [...useHomeContent.getState().dismissed, id];
  useHomeContent.setState({ dismissed });
  AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)).catch(() => {});
}
