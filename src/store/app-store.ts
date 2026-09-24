import { create } from 'zustand';

import {
  ADDRESSES,
  DELIVERY_FEE,
  FREE_OVER,
  SERVICE_FEE,
  findProduct,
  money,
  type Address,
  type Product,
} from '@/data/catalog';

export type SortOption = 'Recommended' | 'Price: Low to High' | 'Price: High to Low' | 'Popular' | 'New';
export type PriceFilter = 'u5' | '5to10' | 'o10' | null;
export type PaymentKey = 'Card' | 'Apple Pay' | 'Google Pay' | 'PayID';
export type User = { first: string; last: string; email: string; /** 9 digits after +61. */ mobile: string; dob: string; /** Local profile photo URI. */ avatar?: string };
export type SavedCard = { brand: 'VISA' | 'MASTERCARD' | 'AMEX'; last4: string; /** MM/YY */ exp: string };
export type PlacedOrder = { no: string; itemIds: string[]; qty: Record<string, number>; total: string };

type Prefs = Partial<
  Record<'push' | 'email' | 'marketing' | 'loc' | 'share' | 'sens' | 'defAddr' | 'saveCard' | 'defCard', boolean>
>;

type State = {
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
  recentTerms: string[];

  // checkout
  payment: PaymentKey;
  slot: string | null;
  schDay: string;
  scheduling: boolean;

  // orders tab
  ordersTab: 'Active' | 'Past Orders';

  // wallet
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
  placeOrder: () => void;
  reorder: (ids: string[]) => void;
  togglePref: (k: keyof Prefs, def: boolean) => void;
  resetFilters: () => void;
  restart: () => void;
  addAddress: (a: Address, makeDefault: boolean) => void;
  removeAddress: (index: number) => void;
  addCard: (c: SavedCard, makeDefault: boolean) => void;
  removeCard: (index: number) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const initial: State = {
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
  user: { first: 'Jaiveer', last: 'Singh', email: '', mobile: '412908344', dob: '14 / 03 / 1994' },
  order: null,
  sort: 'Recommended',
  dealsOnly: false,
  availOnly: false,
  price: null,
  q: '',
  recentTerms: ['Full cream milk', 'Truss tomatoes', 'Basmati rice', 'Avocado'],
  payment: 'Card',
  slot: 'ASAP',
  schDay: 'Today',
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

export const useApp = create<State & Actions>()((set, get) => ({
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

  placeOrder: () => {
    const { cart, coupon } = get();
    const t = cartTotals(cart, coupon);
    set({
      order: {
        // Base chosen so the design's $25.78 basket reads #SK10482.
        no: 'Order #SK' + (10457 + Math.floor(t.total)),
        itemIds: Object.keys(cart),
        qty: { ...cart },
        total: money(t.total),
      },
      cart: {},
      coupon: null,
    });
  },

  reorder: (ids) => {
    const cart = { ...get().cart };
    let unavailable = 0;
    for (const id of ids) {
      const p = findProduct(id);
      if (p && !p.out) cart[p.id] = (cart[p.id] ?? 0) + 1;
      else unavailable++;
    }
    set({ cart });
    get().flash(unavailable ? unavailable + ' item unavailable · rest added' : 'Added to cart');
  },

  togglePref: (k, def) => {
    const prefs = get().prefs;
    set({ prefs: { ...prefs, [k]: !(prefs[k] ?? def) } });
  },

  resetFilters: () => set({ dealsOnly: false, availOnly: false, price: null }),

  restart: () => set({ cart: {}, order: null }),

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
}));

export type CouponCode = 'SPICE5' | 'FRESH20' | 'SKFREE';

/** Coupon rules from the Offers screen. `produce` is the subtotal of fresh-vegetable/fruit items. */
function couponDiscount(code: CouponCode | null, sub: number, produce: number, delivery: number) {
  switch (code) {
    case 'SPICE5':
      return { discount: Math.min(5, sub), freeDelivery: false, note: '' };
    case 'FRESH20':
      if (sub < 25) return { discount: 0, freeDelivery: false, note: 'Spend $' + (25 - sub).toFixed(2) + ' more to use FRESH20' };
      if (produce === 0) return { discount: 0, freeDelivery: false, note: 'Add fresh vegetables to use FRESH20' };
      return { discount: Math.min(10, Math.round(produce * 20) / 100), freeDelivery: false, note: '' };
    case 'SKFREE':
      return { discount: 0, freeDelivery: delivery > 0, note: delivery > 0 ? '' : 'Delivery is already free on this order' };
    default:
      return { discount: 0, freeDelivery: false, note: '' };
  }
}

export function cartTotals(cart: Record<string, number>, coupon: CouponCode | null = null) {
  let sub = 0;
  let produce = 0;
  let n = 0;
  for (const id of Object.keys(cart)) {
    const p = findProduct(id);
    if (p) {
      sub += p.price * cart[id];
      if (p.cat === 'produce') produce += p.price * cart[id];
      n += cart[id];
    }
  }
  const baseDelivery = n === 0 ? 0 : sub >= FREE_OVER ? 0 : DELIVERY_FEE;
  const service = n === 0 ? 0 : SERVICE_FEE;
  const c = couponDiscount(n === 0 ? null : coupon, sub, produce, baseDelivery);
  const delivery = c.freeDelivery ? 0 : baseDelivery;
  const total = sub - c.discount + delivery + service;
  return { sub, n, delivery, service, discount: c.discount, couponNote: c.note, total, freeOver: FREE_OVER };
}

export const useTotals = () => {
  const cart = useApp((s) => s.cart);
  const coupon = useApp((s) => s.coupon);
  return cartTotals(cart, coupon);
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
  if (s.sort === 'Popular') arr = [...arr].sort((a, b) => Number(b.rating) - Number(a.rating));
  if (s.sort === 'New') arr = [...arr].reverse();
  return arr;
}

/** The currently selected delivery address. */
export const useAddress = () => useApp((s) => s.addresses[s.addr] ?? s.addresses[0]);

/** "Jaiveer Singh" → "JS". */
export const initialsOf = (u: User) => ((u.first[0] ?? '') + (u.last[0] ?? '')).toUpperCase() || '?';

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
