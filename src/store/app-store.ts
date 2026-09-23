import { create } from 'zustand';

import {
  DELIVERY_FEE,
  FREE_OVER,
  SERVICE_FEE,
  findProduct,
  money,
  type Product,
} from '@/data/catalog';

export type SortOption = 'Recommended' | 'Price: Low to High' | 'Price: High to Low' | 'Popular' | 'New';
export type PriceFilter = 'u5' | '5to10' | 'o10' | null;
export type PaymentKey = 'Card' | 'Apple Pay' | 'Google Pay' | 'PayID';
export type PlacedOrder = { no: string; itemIds: string[]; qty: Record<string, number>; total: string };

type Prefs = Partial<
  Record<'push' | 'email' | 'marketing' | 'loc' | 'share' | 'sens' | 'defAddr' | 'saveCard' | 'defCard', boolean>
>;

type State = {
  cart: Record<string, number>;
  phone: string;
  addr: number;
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
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const initial: State = {
  cart: {},
  phone: '',
  addr: 0,
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
    const { cart } = get();
    const t = cartTotals(cart);
    set({
      order: {
        no: 'Order #SK' + (10500 + Math.floor(t.total)),
        itemIds: Object.keys(cart),
        qty: { ...cart },
        total: money(t.total),
      },
      cart: {},
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
}));

export function cartTotals(cart: Record<string, number>) {
  let sub = 0;
  let n = 0;
  for (const id of Object.keys(cart)) {
    const p = findProduct(id);
    if (p) {
      sub += p.price * cart[id];
      n += cart[id];
    }
  }
  const delivery = n === 0 ? 0 : sub >= FREE_OVER ? 0 : DELIVERY_FEE;
  const service = n === 0 ? 0 : SERVICE_FEE;
  return { sub, n, delivery, service, total: sub + delivery + service, freeOver: FREE_OVER };
}

export const useTotals = () => cartTotals(useApp((s) => s.cart));

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
