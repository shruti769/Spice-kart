import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useCatalogVersion } from '@/lib/remote-catalog';
import { applyCouponRules, useCouponStore } from '@/lib/remote-coupons';
import { slotFee, useDeliveryStore } from '@/lib/remote-delivery';

import {
  ADDRESSES,
  findProduct,
  money,
  type Address,
  type Product,
} from '@/data/catalog';

export type SortOption = 'Recommended' | 'Price: Low to High' | 'Price: High to Low' | 'Popular' | 'New';
export type PriceFilter = 'u5' | '5to10' | 'o10' | null;
export type PaymentKey = 'Card' | 'Apple Pay' | 'Google Pay' | 'PayID' | 'Spice Kart Money';
export type User = { first: string; last: string; email: string; /** 9 digits after +61. */ mobile: string; dob: string; /** Profile photo URL (Supabase Storage). */ avatar?: string };
export type SavedCard = { brand: 'VISA' | 'MASTERCARD' | 'AMEX'; last4: string; /** MM/YY */ exp: string };
/** The last order placed on this device (`id` = Supabase `orders.id`, for tracking). */
export type PlacedOrder = { id?: string; no: string; itemIds: string[]; qty: Record<string, number>; total: string };

type Prefs = Partial<
  Record<'push' | 'email' | 'marketing' | 'loc' | 'share' | 'sens' | 'defAddr' | 'saveCard' | 'defCard', boolean>
>;

type State = {
  /** True once the user has verified their number (or used Apple / Google); saved on the device. */
  signedIn: boolean;
  cart: Record<string, number>;
  phone: string;
  addr: number;
  /** Saved delivery addresses; `addr` indexes into this list. */
  addresses: Address[];
  /** Coupon applied from the Offers screen; cleared when an order is placed. */
  coupon: CouponCode | null;
  /** Profile details shown across the app (avatar initials, greetings, personal details). */
  user: User;
  /** Saved payment cards; `defaultCard` indexes into this list. */
  cards: SavedCard[];
  defaultCard: number;
  order: PlacedOrder | null;

  // product list
  sort: SortOption;
  dealsOnly: boolean;
  availOnly: boolean;
  price: PriceFilter;

  // search
  q: string;
  /** The user's own recent searches (newest first), kept on this device. */
  recentTerms: string[];
  /** Products this user opened (newest first), kept on this device — "Continue browsing". */
  viewedIds: string[];

  // checkout
  payment: PaymentKey;
  /** 'ASAP' (express) or the id of a scheduled `delivery_slots` row. */
  slot: string | null;
  /** Date ('YYYY-MM-DD') of the scheduled slot; '' = the first bookable day. */
  schDay: string;
  scheduling: boolean;

  // orders tab
  ordersTab: 'Active' | 'Past Orders';

  // wallet
  /** Spice Kart Money balance from Supabase (see remote-wallet), cached for launch; null = not loaded yet. */
  wallet: number | null;
  amountText: string;
  payIdx: number;

  // account
  issueIdx: number;
  addrTag: 'Home' | 'Work' | 'Other';
  prefs: Prefs;

  toast: string;
};

type Actions = {
  set: (patch: Partial<State>) => void;
  bump: (id: string, d: number) => void;
  flash: (msg: string) => void;
  /** Record an order the server accepted (`no` like "SK10001") and empty the cart. */
  placeOrder: (placed: { id: string; no: string; total: number }) => void;
  /** Add a past order's lines to the cart; returns how many lines were added. */
  reorder: (lines: { id: string; qty: number }[]) => number;
  togglePref: (k: keyof Prefs, def: boolean) => void;
  addRecentTerm: (term: string) => void;
  clearRecentTerms: () => void;
  addViewed: (id: string) => void;
  resetFilters: () => void;
  restart: () => void;
  addAddress: (a: Address, makeDefault: boolean) => void;
  removeAddress: (index: number) => void;
  addCard: (c: SavedCard, makeDefault: boolean) => void;
  removeCard: (index: number) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const initial: State = {
  signedIn: false,
  cart: {},
  phone: '',
  addr: 0,
  addresses: ADDRESSES.map((a) => ({ ...a })),
  coupon: null,
  cards: [
    { brand: 'VISA', last4: '4417', exp: '09/28' },
    { brand: 'MASTERCARD', last4: '8802', exp: '03/27' },
  ],
  defaultCard: 0,
  // Empty until the user fills in their details (sign-up can be skipped).
  user: { first: '', last: '', email: '', mobile: '', dob: '' },
  order: null,
  sort: 'Recommended',
  dealsOnly: false,
  availOnly: false,
  price: null,
  q: '',
  recentTerms: [],
  viewedIds: [],
  payment: 'Card',
  slot: 'ASAP',
  schDay: '',
  scheduling: false,
  ordersTab: 'Active',
  wallet: null,
  amountText: '50',
  payIdx: 0,
  issueIdx: 0,
  addrTag: 'Home',
  prefs: {},
  toast: '',
};

export const useApp = create<State & Actions>()(
  persist(
  (set, get) => ({
  ...initial,

  set: (patch) => set(patch),

  flash: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: '' }), 1500);
  },

  bump: (id, d) => {
    const cart = { ...get().cart };
    const q = (cart[id] ?? 0) + d;
    if (q <= 0) delete cart[id];
    else cart[id] = q;
    set({ cart });
    if (d > 0) get().flash('Added to cart');
  },

  placeOrder: (placed) => {
    const { cart } = get();
    set({
      order: {
        id: placed.id,
        no: 'Order #' + placed.no,
        itemIds: Object.keys(cart),
        qty: { ...cart },
        total: money(placed.total),
      },
      cart: {},
      coupon: null,
    });
  },

  reorder: (lines) => {
    const cart = { ...get().cart };
    let added = 0;
    for (const { id, qty } of lines) {
      const p = findProduct(id);
      if (!p || p.out || qty <= 0) continue;
      cart[p.id] = (cart[p.id] ?? 0) + qty;
      added++;
    }
    set({ cart });
    const missing = lines.length - added;
    get().flash(
      added === 0
        ? 'These items are no longer available'
        : missing
          ? `${missing} item${missing === 1 ? '' : 's'} unavailable · rest added to cart`
          : 'Added to cart',
    );
    return added;
  },

  addRecentTerm: (term) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...get().recentTerms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    set({ recentTerms: next });
  },

  clearRecentTerms: () => {
    set({ recentTerms: [] });
  },

  addViewed: (id) => {
    // Personalised recommendations off: don't remember what the user looks at.
    if (!(get().prefs.share ?? true)) return;
    const next = [id, ...get().viewedIds.filter((x) => x !== id)].slice(0, 12);
    set({ viewedIds: next });
  },

  togglePref: (k, def) => {
    const prefs = get().prefs;
    const on = !(prefs[k] ?? def);
    // Turning personalisation off also forgets the recently viewed products.
    set({ prefs: { ...prefs, [k]: on }, ...(k === 'share' && !on ? { viewedIds: [] } : {}) });
  },

  resetFilters: () => set({ dealsOnly: false, availOnly: false, price: null }),

  // Log out: forget the account and everything tied to it (recent searches stay on the device).
  restart: () => {
    const { recentTerms, viewedIds } = get();
    set({ ...initial, recentTerms, viewedIds });
  },

  addAddress: (a, makeDefault) => {
    const addresses = [...get().addresses, a];
    set({ addresses, ...(makeDefault ? { addr: addresses.length - 1 } : {}) });
  },

  addCard: (c, makeDefault) => {
    const cards = [...get().cards, c];
    set({ cards, ...(makeDefault ? { defaultCard: cards.length - 1 } : {}) });
  },

  removeCard: (index) => {
    const { cards, defaultCard } = get();
    if (cards.length <= 1) return;
    set({
      cards: cards.filter((_, i) => i !== index),
      defaultCard: defaultCard === index ? 0 : defaultCard > index ? defaultCard - 1 : defaultCard,
    });
  },

  removeAddress: (index) => {
    const { addresses, addr } = get();
    if (addresses.length <= 1) return;
    const next = addresses.filter((_, i) => i !== index);
    // Keep the selected address pointing at the same entry (or the first one if it was removed).
    set({ addresses: next, addr: addr === index ? 0 : addr > index ? addr - 1 : addr });
  },
  }),
  {
    // Saved with AsyncStorage so the user stays signed in (and keeps their data) across launches.
    name: 'spice-kart',
    version: 2,
    storage: createJSONStorage(() => AsyncStorage),
    // v1 saved the old placeholder user ("Jaiveer Singh") for anyone who skipped their details.
    migrate: (saved, version) => {
      const s = saved as Partial<State>;
      if (version < 2 && s.user?.first === 'Jaiveer' && s.user.last === 'Singh') {
        s.user = { ...initial.user, avatar: s.user.avatar, email: s.user.email, mobile: s.phone ?? '' };
      }
      return s as State & Actions;
    },
    partialize: (s) => ({
      signedIn: s.signedIn,
      phone: s.phone,
      user: s.user,
      addresses: s.addresses,
      addr: s.addr,
      cards: s.cards,
      defaultCard: s.defaultCard,
      prefs: s.prefs,
      wallet: s.wallet,
      payment: s.payment,
      cart: s.cart,
      coupon: s.coupon,
      order: s.order,
      recentTerms: s.recentTerms,
      viewedIds: s.viewedIds,
    }),
  },
  ),
);

/** A coupon code from Supabase (`public.coupons.code`). */
export type CouponCode = string;

export function cartTotals(cart: Record<string, number>, coupon: CouponCode | null = null, slot: string | null = 'ASAP') {
  let sub = 0;
  let n = 0;
  for (const id of Object.keys(cart)) {
    const p = findProduct(id);
    if (p) {
      sub += p.price * cart[id];
      n += cart[id];
    }
  }
  const { settings, slots } = useDeliveryStore.getState();
  // Express unless a scheduled slot is picked; a slot removed by the admin falls back to the default slot fee.
  const scheduled = slot && slot !== 'ASAP' ? slots.find((s) => s.id === slot) : undefined;
  const fee = !slot || slot === 'ASAP' ? settings.expressFee : scheduled ? slotFee(scheduled, settings) : settings.scheduledFee;
  const baseDelivery = n === 0 ? 0 : sub >= settings.freeOver ? 0 : fee;
  const service = n === 0 ? 0 : settings.handlingFee;
  const c = applyCouponRules(n === 0 ? null : coupon, cart, baseDelivery);
  const delivery = c.freeDelivery ? 0 : baseDelivery;
  const total = sub - c.discount + delivery + service;
  return { sub, n, delivery, service, discount: c.discount, couponNote: c.note, total, freeOver: settings.freeOver };
}

export const useTotals = () => {
  // cartTotals also reads the catalogue, coupons and delivery stores, which the compiler can't see,
  // so it must not memoise the result on cart / coupon / slot alone.
  'use no memo';
  const cart = useApp((s) => s.cart);
  const coupon = useApp((s) => s.coupon);
  const slot = useApp((s) => s.slot);
  // Re-run when products, coupons or delivery settings load or an admin edits them. Without the
  // catalogue, a cart restored on launch counts 0 items until the products arrive.
  useCatalogVersion((s) => s.version);
  useCouponStore((s) => s.coupons);
  useDeliveryStore((s) => s.settings);
  useDeliveryStore((s) => s.slots);
  return cartTotals(cart, coupon, slot);
};

export const usePref = (k: keyof Prefs, def: boolean) => useApp((s) => s.prefs[k] ?? def);

export function sortAndFilter(list: Product[], s: Pick<State, 'sort' | 'dealsOnly' | 'availOnly' | 'price'>) {
  let arr = list;
  if (s.dealsOnly) arr = arr.filter((p) => p.orig > 0);
  if (s.availOnly) arr = arr.filter((p) => !p.out);
  if (s.price === 'u5') arr = arr.filter((p) => p.price < 5);
  if (s.price === '5to10') arr = arr.filter((p) => p.price >= 5 && p.price <= 10);
  if (s.price === 'o10') arr = arr.filter((p) => p.price > 10);
  if (s.sort === 'Price: Low to High') arr = [...arr].sort((a, b) => a.price - b.price);
  if (s.sort === 'Price: High to Low') arr = [...arr].sort((a, b) => b.price - a.price);
  if (s.sort === 'Popular') arr = [...arr].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  if (s.sort === 'New') arr = [...arr].reverse();
  return arr;
}

/** The currently selected delivery address. */
export const useAddress = () => useApp((s) => s.addresses[s.addr] ?? s.addresses[0]);

/** "Jaiveer Singh" → "JS" ('' when no name is set). */
export const initialsOf = (u: User) => ((u.first.trim()[0] ?? '') + (u.last.trim()[0] ?? '')).toUpperCase();

/** "Hi Jaiveer" or "Hi there" when no name is set. */
export const greetingName = (u: User) => u.first.trim() || 'there';

/** The card used for checkout and wallet top-ups. */
export const useDefaultCard = () => useApp((s) => s.cards[s.defaultCard] ?? s.cards[0]);

/** "VISA" → "Visa", "AMEX" → "Amex". */
export const brandName = (c: SavedCard) => c.brand[0] + c.brand.slice(1).toLowerCase();

const FAST_METHODS = ['Apple Pay', 'Google Pay'] as const;

/**
 * Wallet top-up method picked on the Payment method screen: saved cards first, then Apple Pay /
 * Google Pay. Returns a title ("Visa ending 4417"), a subtitle and a short label ("Visa · 4417").
 */
export function useTopUpMethod() {
  const cards = useApp((s) => s.cards);
  const payIdx = useApp((s) => s.payIdx);
  const card = cards[payIdx];
  if (card) return { title: brandName(card) + ' ending ' + card.last4, sub: 'Expires ' + card.exp, short: brandName(card) + ' · ' + card.last4 };
  const fast = FAST_METHODS[payIdx - cards.length] ?? FAST_METHODS[0];
  return { title: fast, sub: 'Confirm on your device', short: fast };
}

/** Resolves once the saved state has been loaded from AsyncStorage (immediately if already loaded). */
export function whenHydrated(): Promise<void> {
  if (useApp.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useApp.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
