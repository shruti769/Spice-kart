import { useMemo } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import {
  CATEGORIES,
  PRODUCTS,
  productFromRow,
  setRemoteCategories,
  setRemoteProducts,
  type Category,
  type Product,
  type RemoteCategoryRow,
  type RemoteProductRow,
} from '@/data/catalog';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PRODUCT_COLUMNS =
  'id, name, brand, category_id, subcategory, description, price, compare_at_price, weight, image_url, stock_qty, track_inventory';
const CATEGORY_COLUMNS = 'id, name, short_name, image_url, bg_color, subcategories(name, sort)';

/** Bumps every time Supabase categories or products change, so screens re-render. */
export const useCatalogVersion = create<{ version: number }>(() => ({ version: 0 }));

let loading: Promise<void> | null = null;

/**
 * Fetch categories (enabled only, via RLS) and then published products, and merge them into the
 * catalogue. Categories load first because each product is shown under its category.
 */
export function refreshCatalog() {
  if (!isSupabaseConfigured) return Promise.resolve();
  loading ??= (async () => {
    const cats = await supabase.from('categories').select(CATEGORY_COLUMNS).order('sort').order('name');
    if (cats.error) {
      if (__DEV__) console.warn('Could not load categories from Supabase:', cats.error.message);
    } else {
      setRemoteCategories(cats.data as RemoteCategoryRow[]);
    }

    const prods = await supabase.from('products').select(PRODUCT_COLUMNS).order('created_at', { ascending: false });
    if (prods.error) {
      if (__DEV__) console.warn('Could not load products from Supabase:', prods.error.message);
    } else {
      setRemoteProducts((prods.data as RemoteProductRow[]).map(productFromRow).filter((p): p is Product => !!p));
    }
    useCatalogVersion.setState((s) => ({ version: s.version + 1 }));
  })().finally(() => {
    loading = null;
  });
  return loading;
}

let started = false;

/**
 * Load the catalogue now, refresh when the app returns to the foreground, and live-update while
 * it's open (Supabase Realtime on products, categories and sub-categories). Safe to call twice.
 */
export function startRemoteCatalog() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshCatalog();

  AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshCatalog();
  });

  const channel = supabase.channel('catalog-changes');
  for (const table of ['products', 'categories', 'subcategories']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => refreshCatalog());
  }
  channel.subscribe();
}

/**
 * Current products (from Supabase). Returns a new array each time they change, so the caller
 * re-renders and memoised children (React Compiler) see a changed input.
 */
export function useProducts(): Product[] {
  const version = useCatalogVersion((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- PRODUCTS is mutated in place; version marks each change
  return useMemo(() => [...PRODUCTS], [version]);
}

/** Current categories (from Supabase, built-in until the first fetch); new array on each change. */
export function useCategories(): Category[] {
  const version = useCatalogVersion((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- CATEGORIES is mutated in place; version marks each change
  return useMemo(() => [...CATEGORIES], [version]);
}
