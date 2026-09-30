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
import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PRODUCT_COLUMNS =
  'id, name, brand, category_id, subcategory, description, price, compare_at_price, weight, image_url, stock_qty, track_inventory';
/** `sensitive` comes from the privacy migration; products still load without it. */
let withSensitive = true;
const CATEGORY_COLUMNS = 'id, name, short_name, image_url, bg_color, subcategories(name, sort)';

/** Bumps every time Supabase categories or products change, so screens re-render. */
export const useCatalogVersion = create<{ version: number }>(() => ({ version: 0 }));

/**
 * Fetch categories (enabled only, via RLS) and then published products, and merge them into the
 * catalogue. Categories load first because each product is shown under its category.
 */
const loadCatalog = singleFlight(async () => {
  const cats = await supabase.from('categories').select(CATEGORY_COLUMNS).order('sort').order('name');
  if (cats.error) {
    if (__DEV__) console.warn('Could not load categories from Supabase:', cats.error.message);
  } else {
    setRemoteCategories(cats.data as RemoteCategoryRow[]);
  }

  const select = () =>
    supabase.from('products').select(withSensitive ? PRODUCT_COLUMNS + ', sensitive' : PRODUCT_COLUMNS).order('created_at', { ascending: false });
  let prods = await select();
  if (prods.error && withSensitive && /sensitive/.test(prods.error.message)) {
    withSensitive = false;
    prods = await select();
  }
  if (prods.error) {
    if (__DEV__) console.warn('Could not load products from Supabase:', prods.error.message);
  } else {
    setRemoteProducts((prods.data as unknown as RemoteProductRow[]).map(productFromRow).filter((p): p is Product => !!p));
  }
  useCatalogVersion.setState((s) => ({ version: s.version + 1 }));
});

export function refreshCatalog() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadCatalog();
}

let started = false;

/**
 * Load the catalogue now, refresh when the app returns to the foreground, and live-update while
 * it's open (via `app_changes`, so hiding a product or category shows too). Safe to call twice.
 */
export function startRemoteCatalog() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshCatalog();

  AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshCatalog();
  });

  onTableChange(['products', 'categories', 'subcategories'], refreshCatalog);
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

/** Current categories (from Supabase; empty until the first fetch); new array on each change. */
export function useCategories(): Category[] {
  const version = useCatalogVersion((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- CATEGORIES is mutated in place; version marks each change
  return useMemo(() => [...CATEGORIES], [version]);
}
