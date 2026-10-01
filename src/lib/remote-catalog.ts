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
/**
 * Columns added by later migrations (`sensitive`: privacy, `gallery`: product_gallery). Products
 * still load without them: a column the database doesn't have yet is dropped and the fetch retried.
 */
const optionalColumns = new Set(['sensitive', 'gallery']);
type RatingRow = { product_id: string; average: number | string; count: number };
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
    supabase.from('products').select([PRODUCT_COLUMNS, ...optionalColumns].join(', ')).order('created_at', { ascending: false });
  const ratingsReq = supabase.from('product_ratings').select('product_id, average, count');
  let prods = await select();
  for (let missing; prods.error && (missing = [...optionalColumns].find((c) => prods.error!.message.includes(c))); ) {
    optionalColumns.delete(missing);
    prods = await select();
  }
  // Ratings come from the reviews migration; products still load without them.
  const ratings = await ratingsReq;
  if (ratings.error && __DEV__) console.warn('Could not load product ratings:', ratings.error.message);
  const ratingOf = new Map((ratings.data as RatingRow[] | null ?? []).map((r) => [r.product_id, r]));
  if (prods.error) {
    if (__DEV__) console.warn('Could not load products from Supabase:', prods.error.message);
  } else {
    const rows = prods.data as unknown as RemoteProductRow[];
    setRemoteProducts(
      rows
        .map((row) => {
          const p = productFromRow(row);
          const r = ratingOf.get(row.id);
          return p && r ? { ...p, rating: Number(r.average), reviewCount: r.count } : p;
        })
        .filter((p): p is Product => !!p),
    );
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
 * it's open (via `app_changes`, so hiding a product or category shows too; reviews update ratings). Safe to call twice.
 */
export function startRemoteCatalog() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshCatalog();

  AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshCatalog();
  });

  onTableChange(['products', 'categories', 'subcategories', 'reviews'], refreshCatalog);
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
