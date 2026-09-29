import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// The store(s) customers buy from, as set in Admin → Settings → General (`public.stores`; RLS
// returns active ones). Live: the admin's edits bump `app_changes` ('stores').

export type StoreInfo = { id: string; name: string; suburb: string; phone: string | null; isPrimary: boolean };

export const useStoreStore = create<{ stores: StoreInfo[] }>(() => ({ stores: [] }));

const loadStores = singleFlight(async () => {
  const { data, error } = await supabase.from('stores').select('id, name, suburb, support_phone, is_primary');
  if (error) {
    if (__DEV__) console.warn('Could not load store details:', error.message);
    return;
  }
  useStoreStore.setState({
    stores: data.map((r) => ({ id: r.id, name: r.name, suburb: r.suburb ?? '', phone: r.support_phone || null, isPrimary: !!r.is_primary })),
  });
});

export function refreshStores() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadStores();
}

let started = false;

export function startRemoteStores() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshStores();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshStores();
  });
  onTableChange(['stores'], refreshStores);
}

/** The order's store (by id), else the primary store; null until loaded. */
export function useStore(id?: string | null) {
  return useStoreStore((s) => s.stores.find((x) => x.id === id) ?? s.stores.find((x) => x.isPrimary) ?? s.stores[0] ?? null);
}
