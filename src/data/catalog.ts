/** Catalogue data — ported verbatim from the prototype. */

export type CategoryId =
  | 'dairy' | 'bakery' | 'produce' | 'flours' | 'pulses' | 'spice' | 'grains' | 'oil' | 'snack'
  | 'instant' | 'tea' | 'condiments' | 'sweeteners' | 'frozen' | 'fasting' | 'general' | 'pooja';

export type Category = {
  id: CategoryId;
  name: string;
  short: string;
  kw: string;
  /** Top-down tint used behind the product list header. */
  tint: [string, string, string];
  count: number;
  img: string | number;
  /** Pastel tile colour behind the (transparent) basket artwork. */
  bg: string;
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

/** Pastel tile colours from the Categories design, behind each transparent basket. */
const CAT_BG: Record<CategoryId, string> = {
  dairy: '#EFFACF', bakery: '#F6F4B5', produce: '#F6ECEF', flours: '#FBF7E0', pulses: '#ECF1E7', spice: '#EDF5F8',
  grains: '#F7E2CE', oil: '#FAF6CF', snack: '#E6FEF3', instant: '#F3F2EC', tea: '#EFFACF', condiments: '#FCEDED',
  sweeteners: '#DFF3B4', frozen: '#E7F5FE', fasting: '#E9FEF6', general: '#F1EFE7', pooja: '#EEEEFE',
};

/** Basket artwork for each category (transparent PNGs from the design). */
const CAT_ART: Record<CategoryId, number> = {
  dairy: require('@/assets/images/categories/dairy.png'),
  bakery: require('@/assets/images/categories/bakery.png'),
  produce: require('@/assets/images/categories/produce.png'),
  flours: require('@/assets/images/categories/flours.png'),
  pulses: require('@/assets/images/categories/pulses.png'),
  spice: require('@/assets/images/categories/spice.png'),
  grains: require('@/assets/images/categories/grains.png'),
  oil: require('@/assets/images/categories/oil.png'),
  snack: require('@/assets/images/categories/snack.png'),
  instant: require('@/assets/images/categories/instant.png'),
  tea: require('@/assets/images/categories/tea.png'),
  condiments: require('@/assets/images/categories/condiments.png'),
  sweeteners: require('@/assets/images/categories/sweeteners.png'),
  frozen: require('@/assets/images/categories/frozen.png'),
  fasting: require('@/assets/images/categories/fasting.png'),
  general: require('@/assets/images/categories/general.png'),
  pooja: require('@/assets/images/categories/pooja.png'),
};

type CatDef = [CategoryId, string, string, string, [string, string, string]];
const CAT_DEFS: CatDef[] = [
  ['dairy', 'Dairy & Refrigerated', 'Dairy', 'milk', ['#E7F0FB', '#F5F9FE', '#FFFFFF']],
  ['bakery', 'Bakery & Bread', 'Bakery', 'bread', ['#FBF1DB', '#FDF8EE', '#FFFFFF']],
  ['produce', 'Fresh Produce', 'Produce', 'veg', ['#EDF8DD', '#F8FCF2', '#FFFFFF']],
  ['flours', 'Flours', 'Flours', 'flour', ['#F7F1E2', '#FCF9F1', '#FFFFFF']],
  ['pulses', 'Pulses & Lentils', 'Pulses', 'lentils', ['#F6EFE0', '#FCF8F0', '#FFFFFF']],
  ['spice', 'Spices & Masalas', 'Spices', 'masala', ['#FFEBD3', '#FFF6EA', '#FFFFFF']],
  ['grains', 'Grains, Rice & Cereals', 'Grains & Rice', 'rice', ['#F3EFE4', '#FAF8F2', '#FFFFFF']],
  ['oil', 'Oil & Ghee', 'Oil & Ghee', 'oil', ['#FCF4DA', '#FEFAEE', '#FFFFFF']],
  ['snack', 'Snacks & Savouries', 'Snacks', 'snack', ['#FDE8EE', '#FEF5F8', '#FFFFFF']],
  ['instant', 'Instant & Ready to Eat', 'Ready to Eat', 'noodle', ['#EBEFFA', '#F6F8FD', '#FFFFFF']],
  ['tea', 'Tea & Beverages', 'Tea & Drinks', 'tea', ['#E9F2E6', '#F6FAF4', '#FFFFFF']],
  ['condiments', 'Condiments, Pickles & Paste', 'Pickles & Paste', 'canned', ['#FCEADF', '#FEF6F1', '#FFFFFF']],
  ['sweeteners', 'Sweeteners & Baking', 'Sweet & Baking', 'sugar', ['#F8EBF4', '#FDF6FA', '#FFFFFF']],
  ['frozen', 'Frozen Foods & Vegetables', 'Frozen', 'frozen', ['#E4F1F3', '#F3FAFB', '#FFFFFF']],
  ['fasting', 'Fasting Foods', 'Fasting', 'sabudana', ['#EFEAFA', '#F8F6FD', '#FFFFFF']],
  ['general', 'General Foods', 'General', 'general', ['#EFF1ED', '#F8F9F6', '#FFFFFF']],
  ['pooja', 'Pooja/Festival', 'Pooja', 'pooja', ['#FCEDE4', '#FEF7F2', '#FFFFFF']],
];

type Raw = [string, string, string, number, number, string];

/** Local product shots from the Home design, keyed by product name. */
const ART: Record<string, number> = {
  'Patanjali Besan': require('@/assets/images/home/products/besan.png'),
  'Aashirvaad Atta': require('@/assets/images/home/products/atta.png'),
  'Tata Salt': require('@/assets/images/home/products/salt.png'),
  'White Sandwich Loaf': require('@/assets/images/home/products/bread.png'),
  'Mother Dairy Salted Butter': require('@/assets/images/home/products/butter.png'),
  'Fortune Basmati Rice': require('@/assets/images/home/products/rice.png'),
  'Cheese Block': require('@/assets/images/home/products/cheese.png'),
  'Extra Virgin Olive Oil': require('@/assets/images/home/products/oil.png'),
  'Pink Lady Apples': require('@/assets/images/home/products/apples.png'),
  'Laundry Liquid': require('@/assets/images/home/products/laundry.png'),
  'Truss Tomatoes': require('@/assets/images/products/tomatoes.png'),
  'Washed Potatoes': require('@/assets/images/products/potatoes.png'),
  'Brown Onions': require('@/assets/images/products/onions.png'),
  Carrots: require('@/assets/images/products/carrots.png'),
  'Vadilal Methi': require('@/assets/images/products/methi.png'),
  'Ashoka Hara Bhara Kabab': require('@/assets/images/products/kabab.png'),
  'Bikaji Samosa': require('@/assets/images/products/bikaji-samosa.png'),
  'Vadilal Chauli': require('@/assets/images/products/chauli.png'),
  'Ashoka Punjabi Samosa': require('@/assets/images/products/punjabi-samosa.png'),
  'Vadilal Aloo Tikki': require('@/assets/images/products/aloo-tikki.png'),
  'Vadilal Arwi': require('@/assets/images/products/arwi.png'),
  'Vadilal Bhindi Cut': require('@/assets/images/products/bhindi.png'),
  'Tomato Ketchup': require('@/assets/images/products/ketchup.png'),
};

/**
 * Sidebar sub-categories per category: [name, product names]. A product belongs to the
 * first sub-category that lists it. Tiles use `SUB_ART` when the design supplies one.
 */
const SUBS: Record<CategoryId, [string, string[]][]> = {
  dairy: [
    ['Milk', ['Full Cream Milk', 'Low Fat Milk', 'Almond Milk', 'Oat Milk']],
    ['Curd & Cheese', ['Greek Yoghurt', 'Mother Dairy Salted Butter', 'Cheese Block', 'Paneer', 'Thickened Cream']],
    ['Eggs', ['Free Range Eggs']],
  ],
  bakery: [
    ['Breads', ['White Sandwich Loaf', 'Wholemeal Loaf', 'Sourdough Loaf']],
    ['Buns & Pav', ['Burger Buns', 'Pav Buns']],
    ['Croissants & Wraps', ['Butter Croissants', 'Wholegrain Wraps']],
  ],
  produce: [
    ['Vegetables', ['Truss Tomatoes', 'Washed Potatoes', 'Brown Onions', 'Carrots', 'Red Capsicum', 'Broccoli', 'Cauliflower', 'Lebanese Cucumber']],
    ['Fruits', ['Cavendish Bananas', 'Pink Lady Apples', 'Navel Oranges', 'Kensington Mangoes', 'Seedless Grapes', 'Strawberries', 'Hass Avocados', 'Lemons']],
    ['Coriander & others', ['Baby Spinach', 'Garlic', 'Ginger', 'Green Chillies', 'Fresh Coriander']],
  ],
  flours: [
    ['Atta & Maida', ['Aashirvaad Atta', 'Plain Flour', 'Maida']],
    ['Besan & Rice Flour', ['Patanjali Besan', 'Rice Flour']],
  ],
  pulses: [
    ['Dals', ['Toor Dal', 'Red Lentils', 'Moong Dal', 'Chana Dal', 'Urad Dal']],
    ['Beans', ['Canned Chickpeas', 'Rajma Kidney Beans']],
  ],
  spice: [
    ['Powders', ['Ground Turmeric', 'Ground Coriander', 'Chilli Powder']],
    ['Whole Spices', ['Cumin Seeds', 'Black Peppercorns', 'Mustard Seeds']],
    ['Masalas', ['Garam Masala', 'Pav Bhaji Masala']],
  ],
  grains: [
    ['Rice', ['Fortune Basmati Rice', 'Sona Masoori Rice']],
    ['Pasta', ['Vetta Pasta']],
    ['Poha & Oats', ['Poha (Flattened Rice)', 'Semolina (Sooji)', 'Rolled Oats']],
  ],
  oil: [
    ['Oils', ['Extra Virgin Olive Oil', 'Sunflower Oil', 'Mustard Oil']],
    ['Ghee', ['Pure Cow Ghee']],
  ],
  snack: [
    ['Chips & Namkeen', ['Sea Salt Chips', 'Masala Namkeen Mix', 'Popcorn', 'Papad']],
    ['Biscuits', ['Choc Chip Biscuits', 'Water Crackers']],
    ['Nuts', ['Mixed Nuts']],
  ],
  instant: [
    ['Noodles & Soups', ['Instant Noodles', 'Cup Soup']],
    ['Ready Meals', ['Ready Paratha', 'Dal Makhani Ready Meal', 'Instant Upma Mix']],
  ],
  tea: [
    ['Tea & Coffee', ['Masala Chai', 'Assam Tea Leaves', 'Filter Coffee Powder', 'Green Tea Bags']],
    ['Drinks', ['Cola Soft Drink', 'Mango Juice']],
  ],
  condiments: [
    ['Pickles & Pastes', ['Mango Pickle', 'Ginger Garlic Paste', 'Tamarind Paste']],
    ['Sauces', ['Tomato Ketchup', 'Diced Tomatoes']],
    ['Salt', ['Tata Salt']],
  ],
  sweeteners: [
    ['Sugar & Honey', ['Raw Sugar', 'Jaggery Blocks', 'Honey']],
    ['Baking', ['Baking Powder', 'Vanilla Essence']],
  ],
  frozen: [
    ['Food', ['Ashoka Hara Bhara Kabab', 'Bikaji Samosa', 'Ashoka Punjabi Samosa', 'Vadilal Aloo Tikki', 'Frozen Paratha']],
    ['Vegetables', ['Vadilal Methi', 'Vadilal Chauli', 'Vadilal Arwi', 'Vadilal Bhindi Cut']],
  ],
  fasting: [
    ['Fasting Flours', ['Rajgira Flour', 'Singhare Atta']],
    ['Others', ['Sabudana (Tapioca)', 'Rock Salt (Sendha)']],
  ],
  general: [
    ['Cleaning', ['Dishwashing Liquid', 'Laundry Liquid', 'Multipurpose Spray', 'Facial Tissues', 'Paper Towels']],
    ['Personal Care', ['Daily Shampoo', 'Soap Bars', 'Toothpaste']],
  ],
  pooja: [['Pooja Essentials', ['Agarbatti Incense', 'Camphor Tablets', 'Pooja Thali Set', 'Cotton Wicks']]],
};

/** Sidebar tile artwork from the category designs, keyed by `<category>/<sub-category>`. */
const SUB_ART: Record<string, number> = {
  'produce/All': require('@/assets/images/subcats/produce-all.png'),
  'produce/Vegetables': require('@/assets/images/subcats/produce-veg.png'),
  'produce/Fruits': require('@/assets/images/subcats/produce-fruits.png'),
  'produce/Coriander & others': require('@/assets/images/subcats/produce-herbs.png'),
  'frozen/All': require('@/assets/images/subcats/frozen-all.png'),
  'frozen/Food': require('@/assets/images/subcats/frozen-food.png'),
  'frozen/Vegetables': require('@/assets/images/subcats/frozen-veg.png'),
  'dairy/Milk': require('@/assets/images/home/cats/dairy.png'),
  'dairy/Curd & Cheese': require('@/assets/images/home/products/cheese.png'),
  'dairy/Eggs': require('@/assets/images/categories/dairy.png'),
  'bakery/Breads': require('@/assets/images/home/products/bread.png'),
  'bakery/Buns & Pav': require('@/assets/images/categories/bakery.png'),
  'bakery/Croissants & Wraps': require('@/assets/images/home/cats/bakery.png'),
  'flours/Atta & Maida': require('@/assets/images/home/products/atta.png'),
  'flours/Besan & Rice Flour': require('@/assets/images/home/products/besan.png'),
  'pulses/Dals': require('@/assets/images/categories/pulses.png'),
  'pulses/Beans': require('@/assets/images/home/cats/flours.png'),
  'spice/Powders': require('@/assets/images/categories/spice.png'),
  'spice/Whole Spices': require('@/assets/images/home/cats/oil.png'),
  'spice/Masalas': require('@/assets/images/categories/spice.png'),
  'grains/Rice': require('@/assets/images/home/products/rice.png'),
  'grains/Pasta': require('@/assets/images/categories/grains.png'),
  'grains/Poha & Oats': require('@/assets/images/home/cats/dryfruits.png'),
  'oil/Oils': require('@/assets/images/home/products/oil.png'),
  'oil/Ghee': require('@/assets/images/home/cats/oil.png'),
  'snack/Chips & Namkeen': require('@/assets/images/home/cats/chips.png'),
  'snack/Biscuits': require('@/assets/images/home/cats/bakery.png'),
  'snack/Nuts': require('@/assets/images/home/cats/dryfruits.png'),
  'instant/Noodles & Soups': require('@/assets/images/home/cats/instant.png'),
  'instant/Ready Meals': require('@/assets/images/categories/instant.png'),
  'tea/Tea & Coffee': require('@/assets/images/home/cats/tea.png'),
  'tea/Drinks': require('@/assets/images/categories/tea.png'),
  'condiments/Pickles & Pastes': require('@/assets/images/categories/condiments.png'),
  'condiments/Sauces': require('@/assets/images/home/cats/sauces.png'),
  'condiments/Salt': require('@/assets/images/home/products/salt.png'),
  'sweeteners/Sugar & Honey': require('@/assets/images/categories/sweeteners.png'),
  'sweeteners/Baking': require('@/assets/images/home/cats/sweets.png'),
  'fasting/Fasting Flours': require('@/assets/images/home/cats/flours.png'),
  'fasting/Others': require('@/assets/images/categories/fasting.png'),
  'general/Cleaning': require('@/assets/images/home/products/laundry.png'),
  'general/Personal Care': require('@/assets/images/categories/general.png'),
  'pooja/Pooja Essentials': require('@/assets/images/categories/pooja.png'),
};

const subOf = (cat: CategoryId, name: string) => SUBS[cat].find(([, names]) => names.includes(name))?.[0] ?? '';
const RAW: Record<CategoryId, Raw[]> = {
  dairy: [
    ['Full Cream Milk', 'Dairyfields', '2L', 4.5, 5.2, 'milk,bottle'],
    ['Low Fat Milk', 'Dairyfields', '2L', 4.4, 0, 'milk,carton'],
    ['Greek Yoghurt', 'Dairyfields', '1kg', 6.9, 0, 'yogurt'],
    ['Mother Dairy Salted Butter', 'Mother Dairy', '250g', 6.95, 0, 'butter'],
    ['Cheese Block', 'Britannia', '500g', 8.5, 9.9, 'cheese'],
    ['Paneer', 'Dairyfields', '500g', 7.9, 0, 'cheese'],
    ['Thickened Cream', 'Dairyfields', '300ml', 3.2, 0, 'cream,dairy'],
    ['Free Range Eggs', 'Hen & Field', '12 pack', 7.2, 0, 'eggs'],
    ['Almond Milk', 'Nutwell', '1L', 3.6, 0, 'almond,milk'],
    ['Oat Milk', 'Nutwell', '1L', 3.9, 4.5, 'oat,milk'],
  ],
  bakery: [
    ['White Sandwich Loaf', "Baker's Row", '700g', 3.8, 0, 'bread,loaf'],
    ['Wholemeal Loaf', "Baker's Row", '700g', 4.1, 0, 'wholemeal,bread'],
    ['Sourdough Loaf', "Baker's Row", '600g', 6.5, 7.5, 'sourdough'],
    ['Burger Buns', "Baker's Row", '6 pack', 4.2, 0, 'burger,buns'],
    ['Butter Croissants', "Baker's Row", '4 pack', 5.5, 0, 'croissant'],
    ['Wholegrain Wraps', "Baker's Row", '8 pack', 4.6, 0, 'wrap,tortilla'],
    ['Pav Buns', "Baker's Row", '6 pack', 3.9, 0, 'burger,buns'],
  ],
  produce: [
    ['Truss Tomatoes', 'Farm Fresh', '500g', 4.9, 5.9, 'tomato'],
    ['Washed Potatoes', 'Farm Fresh', '2kg', 5.5, 0, 'potato'],
    ['Brown Onions', 'Farm Fresh', '1kg', 3.2, 0, 'onion'],
    ['Carrots', 'Farm Fresh', '1kg', 2.8, 3.5, 'carrot'],
    ['Red Capsicum', 'Farm Fresh', 'each', 2.4, 0, 'capsicum,pepper'],
    ['Baby Spinach', 'Green Leaf', '120g', 3.9, 0, 'spinach,leaf'],
    ['Broccoli', 'Farm Fresh', 'each', 3.6, 4.2, 'broccoli'],
    ['Cauliflower', 'Farm Fresh', 'each', 4.5, 0, 'cauliflower'],
    ['Lebanese Cucumber', 'Farm Fresh', '3 pack', 3.3, 0, 'cucumber'],
    ['Garlic', 'Farm Fresh', '3 pack', 2.1, 0, 'garlic'],
    ['Ginger', 'Farm Fresh', '150g', 2.9, 0, 'ginger,root'],
    ['Green Chillies', 'Farm Fresh', '100g', 1.8, 2.2, 'green,chilli'],
    ['Fresh Coriander', 'Green Leaf', '100g', 2.5, 0, 'spinach,leaf'],
    ['Cavendish Bananas', 'Sunny Grove', '1kg', 4.2, 0, 'banana'],
    ['Pink Lady Apples', 'Sunny Grove', '1kg', 5.9, 6.9, 'apple'],
    ['Navel Oranges', 'Sunny Grove', '1kg', 4.8, 0, 'orange,fruit'],
    ['Kensington Mangoes', 'Sunny Grove', 'each', 3.5, 0, 'mango'],
    ['Seedless Grapes', 'Sunny Grove', '500g', 6.5, 7.9, 'grapes'],
    ['Strawberries', 'Sunny Grove', '250g', 4.5, 0, 'strawberry'],
    ['Hass Avocados', 'Sunny Grove', '2 pack', 4, 5, 'avocado'],
    ['Lemons', 'Sunny Grove', '3 pack', 3.2, 0, 'lemon'],
  ],
  flours: [
    ['Aashirvaad Atta', 'Aashirvaad', '2Kg', 4.9, 5.9, 'flour'],
    ['Plain Flour', 'Pantry Co', '1kg', 2.2, 0, 'flour'],
    ['Patanjali Besan', 'Patanjali', '500g', 4.5, 5.2, 'flour'],
    ['Maida', 'Pantry Co', '1kg', 2.8, 0, 'flour'],
    ['Rice Flour', 'Pantry Co', '1kg', 3.4, 0, 'flour'],
  ],
  pulses: [
    ['Toor Dal', 'Pantry Co', '1kg', 5.9, 6.9, 'lentils'],
    ['Red Lentils', 'Pantry Co', '1kg', 4.8, 0, 'lentils'],
    ['Moong Dal', 'Pantry Co', '1kg', 5.4, 0, 'lentils'],
    ['Chana Dal', 'Pantry Co', '1kg', 5.2, 0, 'lentils'],
    ['Urad Dal', 'Pantry Co', '1kg', 6.1, 0, 'lentils'],
    ['Canned Chickpeas', 'Pantry Co', '400g', 1.4, 0, 'chickpeas'],
    ['Rajma Kidney Beans', 'Pantry Co', '1kg', 6.4, 7.2, 'lentils'],
  ],
  spice: [
    ['Ground Turmeric', 'Spice Kart Select', '100g', 3.5, 0, 'turmeric,powder'],
    ['Cumin Seeds', 'Spice Kart Select', '100g', 3.2, 0, 'cumin,seeds'],
    ['Ground Coriander', 'Spice Kart Select', '100g', 3.1, 0, 'coriander,spice'],
    ['Garam Masala', 'Spice Kart Select', '100g', 4.2, 4.9, 'garam,masala'],
    ['Chilli Powder', 'Spice Kart Select', '100g', 3.4, 0, 'chilli,powder'],
    ['Black Peppercorns', 'Spice Kart Select', '100g', 5.6, 0, 'peppercorn'],
    ['Mustard Seeds', 'Spice Kart Select', '100g', 2.9, 0, 'cumin,seeds'],
    ['Pav Bhaji Masala', 'Spice Kart Select', '100g', 4, 0, 'garam,masala'],
  ],
  grains: [
    ['Fortune Basmati Rice', 'Fortune', '5Kg', 10.9, 12.8, 'basmati,rice'],
    ['Sona Masoori Rice', 'Pantry Co', '5kg', 13.5, 0, 'basmati,rice'],
    ['Vetta Pasta', 'Vetta', '500g', 2.4, 0, 'pasta,penne'],
    ['Poha (Flattened Rice)', 'Pantry Co', '1kg', 3.8, 0, 'rice'],
    ['Semolina (Sooji)', 'Pantry Co', '1kg', 3.2, 0, 'flour'],
    ['Rolled Oats', 'Pantry Co', '1kg', 4.4, 5, 'oats'],
  ],
  oil: [
    ['Extra Virgin Olive Oil', 'Grove & Co', '1L', 12.5, 15, 'olive,oil'],
    ['Pure Cow Ghee', 'Dairyfields', '1L', 18.9, 21, 'butter'],
    ['Sunflower Oil', 'Grove & Co', '2L', 8.9, 0, 'olive,oil'],
    ['Mustard Oil', 'Grove & Co', '1L', 7.4, 0, 'olive,oil'],
  ],
  snack: [
    ['Sea Salt Chips', 'Crunch Co', '175g', 3.9, 4.5, 'potato,chips'],
    ['Choc Chip Biscuits', 'Crunch Co', '250g', 3.2, 0, 'biscuits,cookies'],
    ['Mixed Nuts', 'Crunch Co', '400g', 9.5, 0, 'nuts'],
    ['Popcorn', 'Crunch Co', '100g', 2.8, 0, 'popcorn'],
    ['Water Crackers', 'Crunch Co', '250g', 2.6, 0, 'crackers'],
    ['Masala Namkeen Mix', 'Crunch Co', '400g', 5.4, 6.2, 'snack'],
    ['Papad', 'Crunch Co', '200g', 3.1, 0, 'crackers'],
  ],
  instant: [
    ['Instant Noodles', 'Quick Bite', '5 pack', 4.6, 5.4, 'noodle'],
    ['Ready Paratha', 'Quick Bite', '5 pack', 5.9, 0, 'wrap,tortilla'],
    ['Dal Makhani Ready Meal', 'Quick Bite', '300g', 4.9, 0, 'lentils'],
    ['Instant Upma Mix', 'Quick Bite', '200g', 3.4, 0, 'flour'],
    ['Cup Soup', 'Quick Bite', '4 pack', 4.2, 0, 'noodle'],
  ],
  tea: [
    ['Masala Chai', 'Leaf & Bloom', '250g', 6.9, 7.9, 'tea'],
    ['Assam Tea Leaves', 'Leaf & Bloom', '500g', 8.4, 0, 'tea'],
    ['Filter Coffee Powder', 'Leaf & Bloom', '500g', 9.6, 0, 'tea'],
    ['Green Tea Bags', 'Leaf & Bloom', '50 pack', 5.8, 0, 'tea'],
    ['Cola Soft Drink', 'Fizz Co', '1.25L', 3.2, 3.8, 'tea'],
    ['Mango Juice', 'Fizz Co', '1L', 4.1, 0, 'mango'],
  ],
  condiments: [
    ['Mango Pickle', 'Homestead', '400g', 5.4, 0, 'canned,tomato'],
    ['Ginger Garlic Paste', 'Homestead', '300g', 3.6, 4.2, 'garlic'],
    ['Tomato Ketchup', 'Homestead', '500g', 3.4, 0, 'canned,tomato'],
    ['Diced Tomatoes', 'Pantry Co', '400g', 1.2, 1.6, 'canned,tomato'],
    ['Tata Salt', 'Tata', '1Kg', 7.2, 0, 'salt'],
    ['Tamarind Paste', 'Homestead', '200g', 3.8, 0, 'canned,tomato'],
  ],
  sweeteners: [
    ['Raw Sugar', 'Pantry Co', '1kg', 2.6, 0, 'sugar'],
    ['Jaggery Blocks', 'Pantry Co', '1kg', 5.2, 0, 'sugar'],
    ['Honey', 'Grove & Co', '500g', 7.9, 8.9, 'sugar'],
    ['Baking Powder', 'Pantry Co', '200g', 2.4, 0, 'flour'],
    ['Vanilla Essence', 'Pantry Co', '100ml', 3.1, 0, 'sugar'],
  ],
  frozen: [
    ['Vadilal Methi', 'Vadilal', '312g', 2.99, 0, 'spinach,leaf'],
    ['Ashoka Hara Bhara Kabab', 'Ashoka', '12pcs', 6.99, 0, 'snack'],
    ['Bikaji Samosa', 'Bikaji', '25pcs', 9.99, 0, 'snack'],
    ['Vadilal Chauli', 'Vadilal', '312g', 2.99, 0, 'broccoli'],
    ['Ashoka Punjabi Samosa', 'Ashoka', '25pcs', 18.99, 0, 'snack'],
    ['Vadilal Aloo Tikki', 'Vadilal', '12pcs', 11.99, 0, 'potato'],
    ['Vadilal Arwi', 'Vadilal', '312g', 2.99, 0, 'potato'],
    ['Vadilal Bhindi Cut', 'Vadilal', '312g', 2.99, 0, 'broccoli'],
    ['Frozen Paratha', 'Frostfield', '5 pack', 5.9, 6.8, 'wrap,tortilla'],
  ],
  fasting: [
    ['Sabudana (Tapioca)', 'Vrat Pure', '500g', 4.2, 0, 'rice'],
    ['Rajgira Flour', 'Vrat Pure', '500g', 5.6, 0, 'flour'],
    ['Singhare Atta', 'Vrat Pure', '500g', 5.9, 6.5, 'flour'],
    ['Rock Salt (Sendha)', 'Vrat Pure', '500g', 2.9, 0, 'salt'],
  ],
  general: [
    ['Dishwashing Liquid', 'HomeKeep', '500ml', 4.2, 0, 'dish,soap'],
    ['Laundry Liquid', 'HomeKeep', '2L', 12.9, 15.5, 'laundry,detergent'],
    ['Facial Tissues', 'HomeKeep', '180 pack', 2.9, 0, 'tissues'],
    ['Paper Towels', 'HomeKeep', '4 pack', 5.6, 0, 'paper,towel'],
    ['Multipurpose Spray', 'HomeKeep', '750ml', 4.9, 0, 'cleaning,spray'],
    ['Daily Shampoo', 'Pure Care', '400ml', 7.9, 9.5, 'shampoo'],
    ['Soap Bars', 'Pure Care', '4 pack', 4.5, 0, 'soap,bar'],
    ['Toothpaste', 'Pure Care', '110g', 4.2, 0, 'toothpaste'],
  ],
  pooja: [
    ['Agarbatti Incense', 'Shubh', '100 sticks', 3.4, 0, 'masala'],
    ['Camphor Tablets', 'Shubh', '50g', 4.1, 0, 'salt'],
    ['Pooja Thali Set', 'Shubh', 'each', 14.9, 17.5, 'masala'],
    ['Cotton Wicks', 'Shubh', '200 pack', 2.6, 0, 'tissues'],
  ],
};

const DESC: Record<CategoryId, string> = {
  dairy: 'Fresh everyday dairy from Australian farms, kept cold from dock to door.',
  bakery: 'Baked fresh this morning in small batches — soft crumb, proper crust.',
  produce: 'Picked from Victorian growers and packed the same morning. Crisp, clean and ready for tonight.',
  flours: 'Stone-ground and freshly milled for soft rotis and perfect batters.',
  pulses: 'Cleaned, sorted and graded by hand — cooks evenly every time.',
  spice: 'Small-batch ground spice with a bright, full aroma. Our own Spice Kart blend.',
  grains: 'A dependable pantry staple you can build a week of meals around.',
  oil: 'Cold-pressed and sealed for freshness — everyday cooking essentials.',
  snack: 'A simple, satisfying snack for the pantry shelf — no artificial colours.',
  instant: 'On the table in minutes when the day gets away from you.',
  tea: 'Full-bodied leaves and everyday drinks for the whole household.',
  condiments: 'Slow-made in small batches — the finishing touch to any meal.',
  sweeteners: 'Baking and sweetening staples you can measure with confidence.',
  frozen: 'Snap-frozen at peak freshness so nothing goes to waste.',
  fasting: 'Carefully sourced vrat-friendly staples for fasting days.',
  general: 'Hard-working home and daily-care essentials that get through the week.',
  pooja: 'Traditional festival and pooja essentials, ethically sourced.',
};

function build() {
  const products: Product[] = [];
  let n = 0;
  for (const [id, name] of CAT_DEFS) {
    for (const r of RAW[id]) {
      n++;
      products.push({
        id: `${id}-${n}`,
        cat: id,
        catName: name,
        name: r[0],
        brand: r[1],
        weight: r[2],
        price: r[3],
        orig: r[4],
        kw: r[5],
        img: ART[r[0]] ?? photo(r[5]),
        sub: subOf(id, r[0]),
        rating: (4.1 + ((n * 7) % 8) / 10).toFixed(1),
        out: r[0] === 'Kensington Mangoes' || r[0] === 'Butter Croissants',
        desc: DESC[id],
        facts: [
          { k: 'Size', v: r[2] },
          { k: 'Brand', v: r[1] },
        ],
      });
    }
  }
  const categories: Category[] = CAT_DEFS.map(([id, name, short, kw, tint]) => ({
    id,
    name,
    short,
    kw,
    tint,
    count: products.filter((p) => p.cat === id).length,
    img: CAT_ART[id],
    bg: CAT_BG[id],
  }));
  return { products, categories };
}

export const { products: PRODUCTS, categories: CATEGORIES } = build();

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
const BY_NAME = new Map(PRODUCTS.map((p) => [p.name, p]));

export const findProduct = (id: string) => BY_ID.get(id);
export const findCategory = (id: string) => CATEGORIES.find((c) => c.id === id);
/** Resolve a list of product names, dropping any that don't exist (prototype `mk`). */
export const byNames = (names: string[]) =>
  names.map((n) => BY_NAME.get(n)).filter((p): p is Product => !!p);

export type Subcategory = { name: string; img: string | number; bg: string };

/** "All" plus the category's sub-categories, for the category sidebar. */
export function subcategoriesOf(cat: CategoryId): Subcategory[] {
  const fallback = CAT_ART[cat];
  return ['All', ...SUBS[cat].map(([name]) => name)].map((name) => ({ name, img: SUB_ART[cat + '/' + name] ?? fallback, bg: CAT_BG[cat] }));
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
export type Address = { tag: string; label: string; line: string; area: string };

export const ADDRESSES: Address[] = [
  { tag: 'H', label: 'Home', line: '123 Collins Street, Melbourne VIC 3000', area: 'Melbourne VIC' },
  { tag: 'W', label: 'Work', line: 'Level 8, 420 Bourke Street, Melbourne VIC 3000', area: 'Melbourne VIC' },
];

export const ETA_MINUTES = 25;
export const FREE_OVER = 50;
export const DELIVERY_FEE = 3.99;
export const SERVICE_FEE = 0.99;
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
  freeDelivery: require('@/assets/images/home/free-delivery.png'),
  brandDeals: require('@/assets/images/home/brand-deals.png'),
};
