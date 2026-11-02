import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Address } from '@/data/catalog';
import { singleFlight } from '@/lib/live-changes';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// Saved addresses live in `public.customer_addresses` (see its migration), so they come back after
// log out and on a new phone. The app store keeps a copy for instant display; saves reach the
// server first, so a failure shows up straight away instead of being lost later. Changes made on
// another phone arrive live over Realtime.

type Row = { id: string; tag: string; label: string; line: string; area: string; lat: number | null; lng: number | null; notes: string; is_default: boolean };

const COLUMNS = 'id, tag, label, line, area, lat, lng, notes, is_default';
const TABLE = 'customer_addresses';

const fromRow = (r: Row): Address => ({
  id: r.id,
  tag: r.tag,
  label: r.label,
  line: r.line,
  area: r.area,
  ...(r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : {}),
  ...(r.notes ? { notes: r.notes } : {}),
});

const toRow = (a: Address) => ({ tag: a.tag, label: a.label, line: a.line, area: a.area, lat: a.lat ?? null, lng: a.lng ?? null, notes: a.notes ?? '' });

async function setDefault(id: string) {
  const { error } = await supabase.rpc('set_default_address', { p_id: id });
  if (error && __DEV__) console.warn('Could not save the default address:', error.message);
}

const loadAddresses = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('created_at');
    if (error) throw error;
    let rows = data as Row[];

    // Saved on this phone before addresses synced: upload them once.
    const unsynced = useApp.getState().addresses.filter((a) => !a.id && !rows.some((r) => r.line === a.line));
    if (unsynced.length) {
      const added = await supabase.from(TABLE).insert(unsynced.map(toRow)).select(COLUMNS);
      if (added.error) throw added.error;
      rows = [...rows, ...(added.data as Row[])];
    }

    const state = useApp.getState();
    if (!state.signedIn) return;
    // The account's default wins; otherwise stay on the address selected on this phone.
    const current = state.addresses[state.addr] ?? state.addresses[0];
    const saved = rows.findIndex((r) => r.is_default);
    const addr = Math.max(0, saved >= 0 ? saved : current ? rows.findIndex((r) => (current.id ? r.id === current.id : r.line === current.line)) : 0);
    state.set({ addresses: rows.map(fromRow), addr });
    if (saved < 0 && rows[addr]) await setDefault(rows[addr].id);
  } catch (e) {
    if (__DEV__) console.warn('Could not load addresses:', (e as Error).message);
  }
});

export function refreshAddresses() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadAddresses();
}

/** Save a new address to the account. Throws if the server didn't take it. */
export async function saveAddress(a: Address, makeDefault: boolean) {
  await ensureUserId();
  const { data, error } = await supabase.from(TABLE).insert(toRow(a)).select(COLUMNS).single();
  if (error) throw error;
  const row = data as Row;
  useApp.getState().addAddress(fromRow(row), makeDefault);
  if (makeDefault) await setDefault(row.id);
  refreshAddresses();
}

/** Save changes to an existing address. Throws if the server didn't take them. */
export async function updateAddress(id: string, a: Address) {
  await ensureUserId();
  const { data, error } = await supabase.from(TABLE).update(toRow(a)).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  const { addresses, set } = useApp.getState();
  set({ addresses: addresses.map((x) => (x.id === id ? fromRow(data as Row) : x)) });
  refreshAddresses();
}

/** Remove the address at `index`. Throws if the server didn't take it. */
export async function deleteAddress(index: number) {
  const id = useApp.getState().addresses[index]?.id;
  if (id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }
  useApp.getState().removeAddress(index);
  refreshAddresses();
}

/** Deliver to the address at `index`, on this phone now and as the account's default. */
export function selectAddress(index: number) {
  const { addresses, set } = useApp.getState();
  set({ addr: index });
  const id = addresses[index]?.id;
  if (id) setDefault(id);
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    if (channel || !useApp.getState().signedIn) return;
    channel = supabase
      .channel('my-addresses')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `customer_id=eq.${uid}` }, () => refreshAddresses())
      .subscribe();
  } catch {
    // Retried on the next sign-in.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
}

let started = false;

/** Load the account's addresses on sign-in and on foreground, and live-update them while signed in. */
export function startRemoteAddresses() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshAddresses();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshAddresses();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshAddresses();
  });
}
