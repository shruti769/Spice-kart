/** Approved 3D artwork replaces the original supplied icons; later admin uploads take precedence. */
const artwork: Record<string, { originalUrl: string; image: number }> = {
  "flours": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/flours-532142d4-0256-4e9d-bce1-d68ff61148d8.png",
    image: require('@/assets/images/categories-3d/flours.png'),
  },
  "spices": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/spices-0cb82499-1833-428a-bed1-98919ebf2f2e.png",
    image: require('@/assets/images/categories-3d/spices.png'),
  },
  "snacks": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/snacks-6e0140bb-4496-452c-8654-c3404b5d6828.png",
    image: require('@/assets/images/categories-3d/snacks.png'),
  },
  "dairy-and-refrigerated": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/dairy-and-refrigerated-905ba874-b856-4560-a8b5-a88f9bd04df7.png",
    image: require('@/assets/images/categories-3d/dairy.png'),
  },
  "bakery-and-bread": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/bakery-and-bread-ab44c418-a0d4-4e45-b374-aecf30df93a5.png",
    image: require('@/assets/images/categories-3d/bakery.png'),
  },
  "fresh-produce": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/fresh-produce-707c3b69-d8ed-446d-8849-cf3e60cc26a0.png",
    image: require('@/assets/images/categories-3d/produce.png'),
  },
  "pulses-and-lentils": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/pulses-and-lentils-05aed570-28a4-4d93-a510-1c7acddc40b7.png",
    image: require('@/assets/images/categories-3d/pulses.png'),
  },
  "spices-and-masalas": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/spices-and-masalas-a04aea48-fa02-4467-b03c-31ce293d3a89.png",
    image: require('@/assets/images/categories-3d/spices.png'),
  },
  "grains-rice-cereals": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/grains-rice-cereals-11f30352-7051-47a1-b908-a1fd72301c6e.png",
    image: require('@/assets/images/categories-3d/grains.png'),
  },
  "oil-and-ghee": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/oil-and-ghee-b972a071-6fba-4e93-a666-3934f9eaca9d.png",
    image: require('@/assets/images/categories-3d/oil.png'),
  },
  "snacks-and-savouries": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/snacks-and-savouries-a63ec932-2878-4cb4-aa6b-da6796e5e906.png",
    image: require('@/assets/images/categories-3d/snacks.png'),
  },
  "instant-and-ready-to-eat": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/instant-and-ready-to-eat-c1bd5312-6246-49b2-92c3-b4254749266f.png",
    image: require('@/assets/images/categories-3d/instant.png'),
  },
  "tea-and-beverages": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/tea-and-beverages-e0022698-ad6b-4f87-a67d-2f2be84f3d23.png",
    image: require('@/assets/images/categories-3d/beverages.png'),
  },
  "condiments-pickles-and-paste": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/condiments-pickles-and-paste-bcad3e97-d596-4278-b621-6b34ac82ddb4.png",
    image: require('@/assets/images/categories-3d/condiments.png'),
  },
  "sweeteners-and-miscellaneous-baking": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/sweeteners-and-miscellaneous-baking-95b06f61-15a6-4ebc-84ac-c5e5c4ca85fd.png",
    image: require('@/assets/images/categories-3d/sweeteners.png'),
  },
  "frojen-foods-and-vegetables": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/frojen-foods-and-vegetables-f2798ff1-7406-4c47-af2e-54c41c7c7b07.png",
    image: require('@/assets/images/categories-3d/frozen.png'),
  },
  "fasting-foods": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/fasting-foods-05b9027a-bd1d-45bc-86ee-3bae38c36164.png",
    image: require('@/assets/images/categories-3d/fasting.png'),
  },
  "general-foods": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/general-foods-8a293f57-234a-4888-8873-e0f58b45bf0c.png",
    image: require('@/assets/images/categories-3d/general.png'),
  },
  "pooja-festival": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/pooja-festival-1c22d40a-b6a8-4c0c-b05a-a4e592702d5e.png",
    image: require('@/assets/images/categories-3d/pooja.png'),
  },
  "cosmetics": {
    originalUrl: "https://posbkqkzkyehmanrbqcj.supabase.co/storage/v1/object/public/product-images/categories/cosmetics-10cd8158-64ea-46ca-a914-4b704de83afd.png",
    image: require('@/assets/images/categories-3d/cosmetics.png'),
  },
};

export function categoryArtwork(id: string, imageUrl: string | null): string | number | null {
  const supplied = artwork[id];
  if (supplied && (!imageUrl || imageUrl === supplied.originalUrl)) return supplied.image;
  return imageUrl;
}

const backgrounds: Record<string, string> = {
  flours: '#EFFACF',
  spices: '#F6ECEF',
  snacks: '#FBF7E0',
  'dairy-and-refrigerated': '#E7F3FC',
  'bakery-and-bread': '#FBECD9',
  'fresh-produce': '#E8F5D9',
  'pulses-and-lentils': '#F7E6DA',
  'spices-and-masalas': '#F6ECEF',
  'grains-rice-cereals': '#FAF3D8',
  'oil-and-ghee': '#FFF3CC',
  'snacks-and-savouries': '#FBF7E0',
  'instant-and-ready-to-eat': '#FCE8DC',
  'tea-and-beverages': '#E9F1DC',
  'condiments-pickles-and-paste': '#F8E5DE',
  'sweeteners-and-miscellaneous-baking': '#F6E8F3',
  'frojen-foods-and-vegetables': '#E3F3F8',
  'fasting-foods': '#F7F0DA',
  'general-foods': '#EEE8F8',
  'pooja-festival': '#FFF0D8',
  cosmetics: '#F8E5EF',
};

/** Same hue and saturation, `amount` (0–1) less lightness: deepens the pastels a little. */
function deepen(hex: string, amount = 0.06): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l2 = Math.max(0, l - amount);
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l2 - c / 2;
  const [r2, g2, b2] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + [r2, g2, b2].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Give default grey tiles a (slightly deepened) category pastel; keep custom colors set in the admin. */
export function categoryBackground(id: string, color: string | null): string {
  if (color && color.toUpperCase() !== '#F1F3EE') return deepen(color);
  return deepen(backgrounds[id] ?? color ?? '#F1F3EE');
}
