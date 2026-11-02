import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { singleFlight } from '@/lib/live-changes';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// The customer's inbox: `public.customer_notifications`, written by the admin's order updates,
// refund decisions and campaigns (the same rows `send-push` delivers). RLS returns only this
// customer's rows, so they show here live even when a push didn't reach the phone.

export type AppNotification = {
  id: number;
  kind: 'promotional' | 'order_update' | 'system';
  title: string;
  body: string;
  /** Where tapping goes: order:, support:, category: or page: (see `openLink`). */
  link: string | null;
  createdAt: string;
  read: boolean;
};

type Row = { id: number; kind: AppNotification['kind']; title: string; body: string; link: string | null; created_at: string; read_at: string | null };

export const useNotificationStore = create<{ items: AppNotification[]; loaded: boolean }>(() => ({ items: [], loaded: false }));

/** How many notifications haven't been read yet. */
export const useUnreadNotifications = () => useNotificationStore((s) => s.items.filter((n) => !n.read).length);

const loadNotifications = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    const { data, error } = await supabase
      .from('customer_notifications')
      .select('id, kind, title, body, link, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    if (!useApp.getState().signedIn) return;
    useNotificationStore.setState({
      loaded: true,
      items: (data as Row[]).map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, read: !!r.read_at })),
    });
  } catch (e) {
    if (__DEV__) console.warn('Could not load notifications:', (e as Error).message);
  }
});

export function refreshNotifications() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadNotifications();
}

export async function markNotificationRead(id: number) {
  useNotificationStore.setState((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  const now = new Date().toISOString();
  const { error } = await supabase.from('customer_notifications').update({ read_at: now, opened_at: now }).eq('id', id);
  if (error && __DEV__) console.warn('Could not mark notification read:', error.message);
}

export async function markAllNotificationsRead() {
  useNotificationStore.setState((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) }));
  const { error } = await supabase.from('customer_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error && __DEV__) console.warn('Could not mark notifications read:', error.message);
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    if (channel || !useApp.getState().signedIn) return;
    channel = supabase
      .channel('my-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_notifications', filter: `customer_id=eq.${uid}` }, () => refreshNotifications())
      .subscribe();
  } catch {
    // Retried on the next sign-in.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  useNotificationStore.setState({ items: [], loaded: false });
}

let started = false;

/** Load the inbox when signed in (and on foreground), live-update it, and clear it on log out. */
export function startRemoteNotifications() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshNotifications();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshNotifications();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshNotifications();
  });
}
