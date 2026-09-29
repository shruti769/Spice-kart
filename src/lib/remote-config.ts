import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PaymentKey } from '@/store/app-store';

// Store-wide business rules from the admin's `store_config()` RPC (Admin → Settings): opening
// hours, minimum order and the payment methods that are switched on. The server enforces the same
// rules in place_order (store_closed, below_minimum, payment_method_unavailable); the app reads
// them to say so up front. Live: admin edits bump `app_changes` ('business_settings').

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Weekday = (typeof WEEKDAYS)[number];
type Window = { open: string; close: string };

export type StoreConfig = {
  /** Per weekday, store time. `{}` = no hours set = always open; a missing or empty day = closed. */
  hours: Partial<Record<Weekday, Window[]>>;
  minOrder: number;
  paymentMethods: PaymentKey[];
};

const METHOD: Record<string, PaymentKey> = { card: 'Card', apple_pay: 'Apple Pay', google_pay: 'Google Pay', payid: 'PayID' };

/** Until Supabase answers: no restrictions (the server still checks). */
const DEFAULTS: StoreConfig = { hours: {}, minOrder: 0, paymentMethods: ['Card', 'Apple Pay', 'Google Pay', 'PayID'] };

export const useConfigStore = create<StoreConfig>(() => DEFAULTS);

const loadConfig = singleFlight(async () => {
  const { data, error } = await supabase.rpc('store_config');
  if (error || !data) {
    if (__DEV__ && error) console.warn('Could not load store settings:', error.message);
    return;
  }
  const c = data as { hours?: StoreConfig['hours']; min_order_value?: number | string; payment_methods?: string[] };
  useConfigStore.setState({
    hours: c.hours ?? {},
    minOrder: Number(c.min_order_value ?? 0),
    paymentMethods: (c.payment_methods ?? []).map((m) => METHOD[m]).filter((m): m is PaymentKey => !!m),
  });
});

export function refreshConfig() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadConfig();
}

let started = false;

export function startRemoteConfig() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshConfig();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshConfig();
  });
  onTableChange(['business_settings'], refreshConfig);
}

// ─── Opening hours (Australia/Melbourne, whatever the phone's time zone) ─────────────────

let clock: Intl.DateTimeFormat | null = null;
try {
  clock = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
} catch {
  // No time-zone data: use the phone's local time.
}

/** Weekday index (0 = Mon) and minutes since midnight at the store. */
function storeNow(now: Date) {
  if (clock) {
    const p = Object.fromEntries(clock.formatToParts(now).map((x) => [x.type, x.value]));
    return { day: Math.max(0, WEEKDAYS.indexOf(p.weekday as Weekday)), mins: (+p.hour % 24) * 60 + +p.minute };
  }
  return { day: (now.getDay() + 6) % 7, mins: now.getHours() * 60 + now.getMinutes() };
}

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** "07:00" → "7:00 am" */
function label(hhmm: string) {
  const m = toMins(hhmm) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Whether the store is open now, and when it next opens ("opens 9:00 am" / "opens Tue 9:00 am"). */
export function openState(hours: StoreConfig['hours'], now = new Date()): { open: boolean; opens: string | null } {
  if (!Object.keys(hours).length) return { open: true, opens: null };
  const { day, mins } = storeNow(now);
  const windows = (d: number) => [...(hours[WEEKDAYS[d % 7]] ?? [])].sort((a, b) => toMins(a.open) - toMins(b.open));
  if (windows(day).some((w) => toMins(w.open) <= mins && mins < (toMins(w.close) || 1440))) return { open: true, opens: null };
  for (let i = 0; i < 7; i++) {
    const next = windows(day + i).find((w) => i > 0 || toMins(w.open) > mins);
    if (next) return { open: false, opens: 'opens ' + (i === 0 ? '' : i === 1 ? 'tomorrow ' : WEEKDAYS[(day + i) % 7] + ' ') + label(next.open) };
  }
  return { open: false, opens: null };
}

/** Live store settings plus whether the store is open right now (re-checked every minute). */
export function useStoreConfig() {
  const config = useConfigStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return { ...config, ...openState(config.hours, now) };
}
