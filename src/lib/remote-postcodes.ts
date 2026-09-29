import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// The delivery area: active postcodes from `public.delivery_postcodes` (Admin → Settings).
// An empty list means the admin hasn't set an area yet, so every postcode is accepted
// (the same rule as the server's `delivers_to()`).

export const usePostcodeStore = create<{ postcodes: Set<string>; loaded: boolean }>(() => ({ postcodes: new Set(), loaded: false }));

const loadPostcodes = singleFlight(async () => {
  const { data, error } = await supabase.from('delivery_postcodes').select('postcode').eq('active', true);
  if (error) {
    if (__DEV__) console.warn('Could not load delivery postcodes:', error.message);
    return;
  }
  usePostcodeStore.setState({ postcodes: new Set(data.map((r) => r.postcode as string)), loaded: true });
});

export function refreshPostcodes() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadPostcodes();
}

/** Whether the store delivers to `postcode` (true until the list has loaded; the server checks again). */
export function deliversTo(postcode: string) {
  const { postcodes } = usePostcodeStore.getState();
  return postcodes.size === 0 || postcodes.has(postcode);
}

/** Postcode at the end of an address line ("… VIC 3000" → "3000"). */
export const postcodeOf = (line: string) => line.trim().match(/(\d{4})$/)?.[1] ?? '';

let started = false;

export function startRemotePostcodes() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshPostcodes();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshPostcodes();
  });
  onTableChange(['delivery_postcodes'], refreshPostcodes);
}
