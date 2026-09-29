/** Catalogue data — ported verbatim from the prototype. */

/** Category slug from Supabase `categories.id`. */
export type CategoryId = string;

export type Category = {
  id: CategoryId;
  name: string;
  short: string;
  kw: string;
  /** Top-down tint used behind the product list header. */
  tint: [string, string, string];
  img: string | number;
  /** Pastel tile colour behind the (transparent) basket artwork. */
  bg: string;
  /** Sidebar sub-category names, in order. */
  subs: string[];
};

export type Product = {
  id: string;
  cat: CategoryId;
  catName: string;
  name: string;
  brand: string;
  weight: string;
  price: number;
  orig: number;
  kw: string;
  img: string | number;
  /** Sub-category shown in the category sidebar (see `subcategoriesOf`). */
  sub: string;
  rating: string;
  out: boolean;
  desc: string;
  facts: { k: string; v: string }[];
};

const IMG: Record<string, string> = {
  'tomato': '6c3af578-f403-4214-9b44-5b9b2ed36aea', 'potato': '51b6f763-82e8-4cf4-97a2-db8f260392ed',
  'onion': 'f25bea2c-43a8-4ca4-8452-5f62ee140e3c', 'carrot': 'b8767cf9-80a8-4f36-9e67-dc1ace168779',
  'capsicum,pepper': '50f03831-a001-4a07-96ee-793683783678', 'spinach,leaf': '281bd282-0080-4da0-9670-7b60427101b8',
  'broccoli': 'de0b2361-debf-4f18-bf0e-4df9941c93f9', 'cauliflower': '73354377-b92d-424c-99bf-1ffba307fce9',
  'cucumber': 'aba6602b-36b2-4f46-93e7-e363a2804b89', 'garlic': 'a2d17267-26fc-49c8-b9df-b3bb0e2415a9',
  'ginger,root': '3d2d4e0c-ac4a-495f-862f-209044e73138', 'green,chilli': 'f28b6b25-715d-451c-893e-b1676fba3128',
  'banana': 'a88f8eb8-9c75-445c-bd2d-5244f933a5c6', 'apple': 'bb6feffe-02c7-4a04-9314-974b4013fdc6',
  'orange,fruit': '6fde67fe-b59b-4d4b-bf64-41de64309a41', 'mango': '47d69292-c936-47a4-b24e-165283d50d82',
  'grapes': '2e8fbef4-e560-4ed0-90eb-6587addd6da8', 'strawberry': '0e030f9c-8ebd-4ec0-9795-716d7523877f',
  'avocado': '6bd7e313-f423-42b7-8c71-99bb91cf255d', 'lemon': '42b3f309-bec5-43ae-a75d-e87c13861f3c',
  'milk,bottle': '70c288eb-b86e-4b46-adbc-3a081c9d06b0', 'milk,carton': '76c93468-0aba-4572-a6b9-28f1279a6013',
  'almond,milk': '085d4b5b-918e-400d-9d21-f578f2131bc1', 'oat,milk': '39aef41f-3f72-4e41-ad67-e5ae91406d76',
  'yogurt': 'ce2c1958-520a-4ff4-96cd-ae95eb5c9193', 'butter': '01a8e7f9-3b9a-48c3-a1d2-6ca662a971c8',
  'cheese': '279e5814-5982-42f5-a4ec-86453b84ee35', 'cream,dairy': 'ba5f681b-f286-4f8b-b2ff-e2a46229405c',
  'eggs': 'd693403e-27bb-4ba5-9298-243865337ec2', 'bread,loaf': '311bbd9d-9fcc-4591-84c7-8af38effe51a',
  'wholemeal,bread': '0aa60c14-316d-4fb7-9382-b16df8f46ccc', 'sourdough': '2406b9cc-ed21-4675-9d21-afd142eb3109',
  'burger,buns': '34cdaf91-37c6-4b5d-be22-ee6ea3d48dc9', 'croissant': '6e72baa1-752b-4233-b208-bb50f8c55275',
  'wrap,tortilla': '1c835a70-a006-4d08-9eac-94c6ec929eb3', 'basmati,rice': '96e1a3ab-d697-418f-a449-2d045731d212',
  'pasta,penne': 'b535c764-42b0-4670-b0d1-2badea58afe4', 'flour': '4481c7bd-9e3c-48fb-8d77-d6bf3f07699b',
  'sugar': '805f3063-be8c-4d0d-bbaa-1d9adfeeb440', 'salt': '2bb55379-10b5-49ea-b76d-421f4441b85e',
  'olive,oil': '42ea6db5-97dc-4334-8b7e-9b1345a60749', 'lentils': 'fd4856f8-45d8-464f-817d-b5ef3ae36891',
  'chickpeas': 'c36a4d4a-d078-4ea1-af36-59854a125f5e', 'canned,tomato': '40a4e2f6-20d2-4f9e-a5f0-659e0549c547',
  'turmeric,powder': '6b68ed6d-ea7d-45cc-b289-952efc30382f', 'cumin,seeds': '160da0d3-89cf-416c-9745-78e5e5ac67cb',
  'coriander,spice': '0b544576-70c7-48bd-be0c-6edc7b4ac689', 'garam,masala': '4d99a6c3-dc40-412d-88cb-142c01255c58',
  'chilli,powder': '3c1d2d4b-e40e-4be9-8757-13fb0dde161e', 'peppercorn': '85058d3f-9fbc-4a4c-95c1-d0ee1522a569',
  'potato,chips': '8ddcd080-8582-44f2-bad1-a6a0db625cbd', 'biscuits,cookies': '0c243bb5-c90b-4908-96b5-789d0be956b6',
  'nuts': '695b3272-eacf-4b9d-9367-e759dad3d7ce', 'popcorn': '1eeef039-e25b-43b9-8465-e6c91926629c',
  'crackers': '3c56a7c3-f4ed-40b0-9352-1bf3c2e0e7ae', 'dish,soap': '4239b853-9027-4be9-bee3-b1801c050d52',
  'laundry,detergent': '4efbb127-6343-4338-b3f4-e3cd4d4051a0', 'tissues': 'ed497336-a600-4912-8c64-20ea911fcef9',
  'paper,towel': 'c7fabe4f-fa1e-41fd-8d30-1ec7f278b263', 'cleaning,spray': '6f9053f9-1a4d-48ee-a22f-42a392955393',
  'shampoo': 'f31a4950-253c-453f-9bb1-e00fe764f8d7', 'conditioner': 'af49b180-1017-43a8-93fb-666eeff6063f',
  'soap,bar': 'b7c829f5-a950-48ad-825c-4a3bdc8540fd', 'toothpaste': '6517607f-ee5f-4378-badc-86bd868f1642',
  'deodorant': '9ca11bb2-6d83-4b46-b89b-46b6fcc2d2f8',
  'market': '97b4cf26-3722-4a99-8920-68270b06c087', 'basket': '7b37f6ce-7d0f-4ab9-9e95-5519e117adda',
  'veg-hero': '5a1d9c1b-fbee-46ee-b656-8486e4758f17', 'market2': '2db5e3df-5446-461c-bc19-74407d3bb01b',
  'bag': '3d22f6b6-3ebd-40a6-b524-c76d40c480ad',
  'cat-dairy': '70c288eb-b86e-4b46-adbc-3a081c9d06b0',
  'cat-bakery': '2406b9cc-ed21-4675-9d21-afd142eb3109',
  'cat-produce': '97b4cf26-3722-4a99-8920-68270b06c087',
  'cat-flours': '4481c7bd-9e3c-48fb-8d77-d6bf3f07699b',
  'cat-pulses': 'fd4856f8-45d8-464f-817d-b5ef3ae36891',
  'cat-spice': '5fecdcc2-f175-4ea9-aec5-121616e4cfd6',
  'cat-grains': '96e1a3ab-d697-418f-a449-2d045731d212',
  'cat-oil': '42ea6db5-97dc-4334-8b7e-9b1345a60749',
  'cat-snack': '8ddcd080-8582-44f2-bad1-a6a0db625cbd',
  'cat-instant': 'b535c764-42b0-4670-b0d1-2badea58afe4',
  'cat-tea': '39aef41f-3f72-4e41-ad67-e5ae91406d76',
  'cat-condiments': '40a4e2f6-20d2-4f9e-a5f0-659e0549c547',
  'cat-sweeteners': '805f3063-be8c-4d0d-bbaa-1d9adfeeb440',
  'cat-frozen': '47d69292-c936-47a4-b24e-165283d50d82',
  'cat-fasting': '96e1a3ab-d697-418f-a449-2d045731d212',
  'cat-general': '6f9053f9-1a4d-48ee-a22f-42a392955393',
  'cat-pooja': '4d99a6c3-dc40-412d-88cb-142c01255c58',
  'oats': '39aef41f-3f72-4e41-ad67-e5ae91406d76',
  'rice': '96e1a3ab-d697-418f-a449-2d045731d212',
  'snack': '8ddcd080-8582-44f2-bad1-a6a0db625cbd',
  'noodle': 'b535c764-42b0-4670-b0d1-2badea58afe4',
  'tea': '39aef41f-3f72-4e41-ad67-e5ae91406d76',
  'frozen': '47d69292-c936-47a4-b24e-165283d50d82',
  'general': '6f9053f9-1a4d-48ee-a22f-42a392955393',
  'pooja': '4d99a6c3-dc40-412d-88cb-142c01255c58',
  'sabudana': '96e1a3ab-d697-418f-a449-2d045731d212',
  'canned': '40a4e2f6-20d2-4f9e-a5f0-659e0549c547',
  'oil': '42ea6db5-97dc-4334-8b7e-9b1345a60749',
  'milk': '70c288eb-b86e-4b46-adbc-3a081c9d06b0',
  'bread': '2406b9cc-ed21-4675-9d21-afd142eb3109',
  'veg': '97b4cf26-3722-4a99-8920-68270b06c087',
  'masala': '4d99a6c3-dc40-412d-88cb-142c01255c58',
};

/** Remote product photo for a keyword (falls back to the basket shot, like the prototype). */
export function photo(key: string) {
  return 'https://api.openverse.org/v1/images/' + (IMG[key] ?? IMG.basket) + '/thumb/';
}

export function money(v: number) {
  return '$' + v.toFixed(2);
}

/**
 * Products come only from Supabase (added in the admin panel) — see `setRemoteProducts`.
 * The array is mutated in place so existing imports see updates.
 */
export const PRODUCTS: Product[] = [];

const DEFAULT_TINT: [string, string, string] = ['#EFF1ED', '#F8F9F6', '#FFFFFF'];

/**
 * Categories come only from Supabase — admins create them (with their image and sub-categories)
 * in the admin panel. Mutated in place by `setRemoteCategories` so existing imports see updates.
 */
export const CATEGORIES: Category[] = [];

/** A row of `public.categories` with its sub-categories. */
export type RemoteCategoryRow = {
  id: string;
  name: string;
  short_name: string;
  image_url: string | null;
  bg_color: string | null;
  subcategories: { name: string; sort: number }[] | null;
};

/** Replace the categories with the (enabled) ones from Supabase. */
export function setRemoteCategories(rows: RemoteCategoryRow[]) {
  const next = rows.map(
    (r): Category => ({
      id: r.id,
      name: r.name,
      short: r.short_name || r.name,
      kw: r.name.toLowerCase(),
      tint: DEFAULT_TINT,
      img: r.image_url || photo('basket'),
      bg: r.bg_color || DEFAULT_TINT[0],
      subs: [...(r.subcategories ?? [])].sort((a, b) => a.sort - b.sort).map((s) => s.name),
    }),
  );
  CATEGORIES.splice(0, CATEGORIES.length, ...next);
}

/** Number of (Supabase) products in a category. */
export const productCount = (cat: CategoryId) => PRODUCTS.filter((p) => p.cat === cat).length;

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
const BY_NAME = new Map(PRODUCTS.map((p) => [p.name, p]));

/** Ids of products that came from Supabase (added in the admin panel) are prefixed with this. */
export const REMOTE_PREFIX = 'db-';

/** A row of `public.products` as returned by Supabase (only the columns the app uses). */
export type RemoteProductRow = {
  id: string;
  name: string;
  brand: string | null;
  category_id: string;
  subcategory: string | null;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  weight: string | null;
  image_url: string | null;
  stock_qty: number | null;
  track_inventory: boolean | null;
};

/** Convert a Supabase row into the app's Product shape so every screen can show it unchanged. */
export function productFromRow(r: RemoteProductRow): Product | null {
  const cat = CATEGORIES.find((c) => c.id === r.category_id);
  if (!cat) return null;
  const price = Number(r.price);
  const compare = r.compare_at_price == null ? 0 : Number(r.compare_at_price);
  const brand = r.brand ?? '';
  const weight = r.weight ?? '';
  return {
    id: REMOTE_PREFIX + r.id,
    cat: cat.id,
    catName: cat.name,
    name: r.name,
    brand,
    weight,
    price,
    // The app shows a discount only when the original price is higher.
    orig: compare > price ? compare : 0,
    kw: (r.subcategory ?? '').toLowerCase(),
    img: r.image_url || photo(cat.kw),
    sub: r.subcategory ?? '',
    rating: '4.5',
    out: !!r.track_inventory && (r.stock_qty ?? 0) <= 0,
    desc: r.description ?? '',
    facts: [
      ...(weight ? [{ k: 'Size', v: weight }] : []),
      ...(brand ? [{ k: 'Brand', v: brand }] : []),
    ],
  };
}

/**
 * Replace the Supabase products in the catalogue. PRODUCTS is mutated
 * in place so existing imports see the new items; screens re-render via `catalogVersion`.
 */
export function setRemoteProducts(list: Product[]) {
  for (let i = PRODUCTS.length - 1; i >= 0; i--) {
    const p = PRODUCTS[i];
    if (p.id.startsWith(REMOTE_PREFIX)) {
      PRODUCTS.splice(i, 1);
      BY_ID.delete(p.id);
      if (BY_NAME.get(p.name) === p) BY_NAME.delete(p.name);
    }
  }
  // Newest admin products first.
  PRODUCTS.unshift(...list);
  for (const p of list) {
    BY_ID.set(p.id, p);
    if (!BY_NAME.has(p.name)) BY_NAME.set(p.name, p);
  }
}

export const findProduct = (id: string) => BY_ID.get(id);
export const findCategory = (id: string) => CATEGORIES.find((c) => c.id === id);
/** Resolve a list of product names, dropping any that don't exist (prototype `mk`). */
export const byNames = (names: string[]) =>
  names.map((n) => BY_NAME.get(n)).filter((p): p is Product => !!p);

export type Subcategory = { name: string; img: string | number; bg: string };

/** "All" plus the category's sub-categories, for the category sidebar. */
export function subcategoriesOf(cat: CategoryId): Subcategory[] {
  const c = CATEGORIES.find((x) => x.id === cat);
  if (!c) return [];
  return ['All', ...c.subs].map((name) => ({ name, img: c.img, bg: c.bg }));
}

export function discountPct(p: Product) {
  return p.orig > 0 ? Math.round((1 - p.price / p.orig) * 100) : 0;
}

export function searchProducts(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return PRODUCTS.filter((p) =>
    (p.name + ' ' + p.brand + ' ' + p.catName + ' ' + p.kw).toLowerCase().includes(t),
  );
}

/** A saved delivery address. `area` is the short "Suburb STATE" shown in the Home header. */
export type Address = {
  tag: string;
  label: string;
  line: string;
  area: string;
  /** Map pin (from the phone's GPS or geocoder), when known; sent with orders for the driver. */
  lat?: number;
  lng?: number;
};

export const ADDRESSES: Address[] = [
  { tag: 'H', label: 'Home', line: '123 Collins Street, Melbourne VIC 3000', area: 'Melbourne VIC' },
  { tag: 'W', label: 'Work', line: 'Level 8, 420 Bourke Street, Melbourne VIC 3000', area: 'Melbourne VIC' },
];

// Delivery fees, the express ETA and the free-delivery threshold come from Supabase: see `@/lib/remote-delivery`.
export const WALLET_BALANCE = 24;

export const LOCAL = {
  appIcon: require('@/assets/images/brand/app-icon.png'),
  wordmarkLight: require('@/assets/images/brand/wordmark-light.png'),
  wordmarkDark: require('@/assets/images/brand/wordmark-dark.png'),
  bannerFresh: require('@/assets/images/banners/fresh-picks.jpg'),
  bannerStaples: require('@/assets/images/banners/staples.jpg'),
  brandDairy: require('@/assets/images/banners/brand-dairy.jpg'),
  brandSpice: require('@/assets/images/banners/brand-spice.jpg'),
  brandPantry: require('@/assets/images/banners/brand-pantry.jpg'),
  brandBakery: require('@/assets/images/banners/brand-bakery.jpg'),
};
