import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { onTableChange, singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Store-wide delivery settings from `public.delivery_settings` (edited in the admin panel). */
export type DeliverySettings = {
  expressFee: number;
  etaMinutes: number;
  /** Fee for a scheduled slot that has no fee of its own. */
  scheduledFee: number;
  handlingFee: number;
  freeOver: number;
  bookAheadDays: number;
  cutoffMinutes: number;
};

/** A weekly slot from `public.delivery_slots` (RLS only returns active ones). */
export type DeliverySlot = {
  id: string;
  weekday: Weekday;
  /** Minutes from midnight. */
  start: number;
  end: number;
  /** null = `scheduledFee`. */
  fee: number | null;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Weekday = (typeof WEEKDAYS)[number];

/** Used until Supabase answers (and when it isn't configured). */
const DEFAULTS: DeliverySettings = {
  expressFee: 3.99,
  etaMinutes: 25,
  scheduledFee: 2.99,
  handlingFee: 0.99,
  freeOver: 50,
  bookAheadDays: 7,
  cutoffMinutes: 60,
};

export const useDeliveryStore = create<{ settings: DeliverySettings; slots: DeliverySlot[] }>(() => ({
  settings: DEFAULTS,
  slots: [],
}));

const loadDelivery = singleFlight(async () => {
  const [settings, slots] = await Promise.all([
    supabase.from('delivery_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('delivery_slots').select('id, weekday, start_min, end_min, fee').eq('active', true).order('start_min'),
  ]);
  const error = settings.error ?? slots.error;
  if (error) {
    if (__DEV__) console.warn('Could not load delivery settings:', error.message);
    return;
  }
  const s = settings.data;
  useDeliveryStore.setState({
    settings: s
      ? {
          expressFee: Number(s.express_fee),
          etaMinutes: s.express_eta_minutes,
          scheduledFee: Number(s.scheduled_fee),
          handlingFee: Number(s.handling_fee),
          freeOver: Number(s.free_delivery_over),
          bookAheadDays: s.book_ahead_days,
          cutoffMinutes: s.cutoff_minutes,
        }
      : DEFAULTS,
    slots: (slots.data ?? []).map((r) => ({ id: r.id, weekday: r.weekday, start: r.start_min, end: r.end_min, fee: r.fee == null ? null : Number(r.fee) })),
  });
});

export function refreshDelivery() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadDelivery();
}

let started = false;

/** Load delivery settings now, on foreground, and live when an admin changes them. */
export function startRemoteDelivery() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshDelivery();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshDelivery();
  });
  onTableChange(['delivery_settings', 'delivery_slots'], refreshDelivery);
}

/** Live delivery settings (fees, express ETA …). */
export const useDeliverySettings = () => useDeliveryStore((s) => s.settings);

/** Express ETA in minutes, e.g. for "Delivery in 25 minutes". */
export const useEtaMinutes = () => useDeliveryStore((s) => s.settings.etaMinutes);

// ─── Scheduling ─────────────────────────────────────────────────────────────────────────
// Slot times are the store's local time (Australia/Melbourne), whatever the phone's time zone.
// Dates are 'YYYY-MM-DD' strings; calendar maths uses UTC dates so DST never shifts a day.

const STORE_TZ = 'Australia/Melbourne';
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const weekdayOf = (d: Date) => WEEKDAYS[(d.getUTCDay() + 6) % 7];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let storeClock: Intl.DateTimeFormat | null = null;
try {
  storeClock = new Intl.DateTimeFormat('en-AU', { timeZone: STORE_TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
} catch {
  // No time-zone data: fall back to the phone's local time.
}

/** Today's date (UTC midnight) and minutes since midnight at the store. */
function storeNow(now: Date) {
  if (storeClock) {
    const p = Object.fromEntries(storeClock.formatToParts(now).map((x) => [x.type, x.value]));
    return { today: new Date(Date.UTC(+p.year, +p.month - 1, +p.day)), minutes: (+p.hour % 24) * 60 + +p.minute };
  }
  return { today: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), minutes: now.getHours() * 60 + now.getMinutes() };
}

/** 690 → "11:30", 780 → "1:00" (12-hour, as in the design). */
const clock = (mins: number) => `${Math.floor(mins / 60) % 12 || 12}:${pad2(mins % 60)}`;

/** "11:30 – 12:00" */
export const windowLabel = (s: Pick<DeliverySlot, 'start' | 'end'>) => clock(s.start) + ' – ' + clock(s.end);

export type ScheduleDay = { date: string; label: string; sub: string; slots: DeliverySlot[] };

/** Slot price before the free-delivery threshold. */
export const slotFee = (slot: DeliverySlot, settings: DeliverySettings) => slot.fee ?? settings.scheduledFee;

/**
 * Bookable days from today up to `bookAheadDays` days ahead (both included). Each day lists the
 * slots that are still open (not past the booking cut-off). Days with no open slots are left out.
 */
export function scheduleDays(
  { settings, slots }: { settings: DeliverySettings; slots: DeliverySlot[] },
  now = new Date(),
): ScheduleDay[] {
  const out: ScheduleDay[] = [];
  const { today, minutes } = storeNow(now);
  const d = new Date(today);
  for (let i = 0; i <= settings.bookAheadDays; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    // Minutes from today's midnight at the store until this day's midnight.
    const dayStart = i * 1440;
    const open = slots.filter((s) => s.weekday === weekdayOf(d) && dayStart + s.start - settings.cutoffMinutes > minutes);
    if (!open.length) continue;
    out.push({
      date: toISO(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayOf(d),
      sub: d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()],
      slots: open,
    });
  }
  return out;
}

/** Current time, updated every minute so slots disappear once their cut-off passes. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Live bookable days for the checkout's "Schedule" panel. */
export function useScheduleDays() {
  const now = useNow();
  const settings = useDeliveryStore((s) => s.settings);
  const slots = useDeliveryStore((s) => s.slots);
  return scheduleDays({ settings, slots }, now);
}

/** The slot `slotId` on `date` if it can still be booked. */
export function findBookableSlot(slotId: string | null, date: string) {
  if (!slotId || slotId === 'ASAP') return undefined;
  return scheduleDays(useDeliveryStore.getState())
    .find((d) => d.date === date)
    ?.slots.find((s) => s.id === slotId);
}

/** "Today · 11:30 – 12:00", "Wed 3 Sep · 1:00 – 1:30"; falls back when the slot was removed. */
export function scheduledLabel(slotId: string, date: string) {
  const slot = useDeliveryStore.getState().slots.find((s) => s.id === slotId);
  const d = fromISO(date);
  const diff = Math.round((d.getTime() - storeNow(new Date()).today.getTime()) / 86_400_000);
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : weekdayOf(d) + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
  return slot ? day + ' · ' + windowLabel(slot) : day + ' · Scheduled delivery';
}
