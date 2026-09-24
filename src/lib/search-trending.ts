import { useEffect } from 'react';
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** A row returned by `public.trending_searches()`. */
export type TrendingTerm = {
  term: string;
  searches: number;
  /** Change vs the previous 7 days; null when the term is new this week. */
  change_pct: number | null;
  image_url: string | null;
  product_count: number;
};

const useTrendingStore = create<{ terms: TrendingTerm[]; loaded: boolean }>(() => ({ terms: [], loaded: false }));

let loading: Promise<void> | null = null;

function refreshTrending() {
  if (!isSupabaseConfigured) return Promise.resolve();
  loading ??= (async () => {
    const { data, error } = await supabase.rpc('trending_searches', { limit_count: 5 });
    if (error) {
      if (__DEV__) console.warn('Could not load trending searches:', error.message);
      return;
    }
    useTrendingStore.setState({ terms: (data ?? []) as TrendingTerm[], loaded: true });
  })().finally(() => {
    loading = null;
  });
  return loading;
}

let subscribed = false;
let debounce: ReturnType<typeof setTimeout> | undefined;

/** Live-refresh trending when anyone searches or the catalogue changes (debounced). */
function subscribe() {
  if (subscribed || !isSupabaseConfigured) return;
  subscribed = true;
  const later = () => {
    clearTimeout(debounce);
    debounce = setTimeout(refreshTrending, 1500);
  };
  supabase
    .channel('trending-searches')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'search_events' }, later)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, later)
    .subscribe();
}

/** "Trending in Melbourne": live top searches that match products in the store. */
export function useTrending() {
  useEffect(() => {
    refreshTrending();
    subscribe();
  }, []);
  return useTrendingStore();
}

/** Record a search (term only, no user data) for trending. Fire-and-forget. */
export function logSearch(term: string) {
  const t = term.trim().slice(0, 60);
  if (!isSupabaseConfigured || t.length < 2) return;
  supabase
    .from('search_events')
    .insert({ term: t })
    .then(({ error }) => {
      if (error && __DEV__) console.warn('Could not log search:', error.message);
    });
}
