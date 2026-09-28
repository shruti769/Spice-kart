import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { findCategory } from '@/data/catalog';
import { onTableChange, singleFlight } from '@/lib/live-changes';
import { goTab, openCategory } from '@/lib/nav';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAddress, useApp } from '@/store/app-store';

export type BannerPlacement = 'home_top' | 'home_middle' | 'category_top';

/** A live row of `public.banners` (RLS only returns published ones whose dates include today, Melbourne time). */
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta_label: string;
  destination_type: 'category' | 'page' | null;
  destination: string | null;
  placement: BannerPlacement;
  priority: number;
  image_url: string | null;
  all_customers: boolean;
  melbourne_only: boolean;
  new_customers: boolean;
};

const COLUMNS =
  'id, title, subtitle, cta_label, destination_type, destination, placement, priority, image_url, all_customers, melbourne_only, new_customers';

export const useBannerStore = create<{ banners: Banner[]; loaded: boolean }>(() => ({ banners: [], loaded: false }));

let midnightTimer: ReturnType<typeof setTimeout> | undefined;

/** Banners go live / expire at midnight in Melbourne (the read policy's clock): refresh then. */
function scheduleMidnightRefresh() {
  clearTimeout(midnightTimer);
  let minutes: number;
  try {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value]),
    );
    minutes = (+p.hour % 24) * 60 + +p.minute;
  } catch {
    const now = new Date();
    minutes = now.getHours() * 60 + now.getMinutes();
  }
  midnightTimer = setTimeout(() => refreshBanners(), (1440 - minutes) * 60_000 + 30_000);
}

const loadBanners = singleFlight(async () => {
  const { data, error } = await supabase
    .from('banners')
    .select(COLUMNS)
    .order('priority')
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('Could not load banners:', error.message);
    return;
  }
  useBannerStore.setState({ banners: (data ?? []) as Banner[], loaded: true });
  scheduleMidnightRefresh();
});

export function refreshBanners() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadBanners();
}

let started = false;

/** Load banners now, on foreground, at Melbourne midnight, and live when an admin changes them. */
export function startRemoteBanners() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshBanners();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshBanners();
  });
  onTableChange(['banners'], refreshBanners);
}

/**
 * Live banners for one placement, filtered by the admin's targeting:
 * - "All customers" on → everyone; off → only new customers when "Show to new customers" is on.
 * - "Show to new customers" off → hidden until the customer has placed an order.
 * - "Melbourne metro only" → only when the delivery address is in Victoria.
 * On category pages, only banners that open this category (or a page) are shown.
 */
export function useBanners(placement: BannerPlacement, categoryId?: string) {
  useEffect(startRemoteBanners, []);
  const banners = useBannerStore((s) => s.banners);
  const isNew = useApp((s) => !s.order);
  const address = useAddress();
  const inVic = /\bVIC\b|Victoria|Melbourne/i.test(address.area + ' ' + address.line);
  return banners.filter(
    (b) =>
      b.placement === placement &&
      (b.all_customers || (b.new_customers && isNew)) &&
      (b.new_customers || !isNew) &&
      (!b.melbourne_only || inVic) &&
      (placement !== 'category_top' || b.destination_type !== 'category' || b.destination === categoryId),
  );
}

/** Where tapping the banner goes. */
export function openBanner(b: Banner) {
  if (b.destination_type === 'category' && b.destination) {
    if (findCategory(b.destination)) openCategory(b.destination);
    else goTab('categories');
    return;
  }
  switch (b.destination) {
    case 'Offers page':
      router.push('/offers');
      return;
    case 'New arrivals':
      goTab('search');
      return;
    default:
      goTab('home');
  }
}
