import type { DeliverySettings } from '@/lib/remote-delivery';
import type { HelpArticle } from '@/lib/remote-help';

/** One question in a help topic: tap to expand. */
export type HelpQuestion = {
  /** `help_articles.id` when it came from Supabase (views and votes are counted). */
  id?: string;
  q: string;
  sub: string;
  /** Paragraph(s) under the question. */
  body: string;
  /** Numbered steps card. */
  stepsTitle?: string;
  steps?: string[];
  /** Small print under the steps. */
  note?: string;
};

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  /** Intro card text. */
  intro: string;
  /** "Chat with us about …" */
  about: string;
  questions: HelpQuestion[];
};

export type HelpTopicId = 'orders' | 'delivery' | 'payments' | 'refunds' | 'wallet' | 'addresses';

const money = (v: number) => '$' + (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2));

const cutoffLabel = (mins: number) =>
  mins >= 60 ? `${mins / 60} hour${mins === 60 ? '' : 's'}` : `${mins} minutes`;

/** Fills the live-value placeholders admins can use in Help centre articles. */
function fillPlaceholders(text: string, s: DeliverySettings, area: string) {
  const values: Record<string, string> = {
    eta_minutes: String(s.etaMinutes),
    book_ahead_days: String(s.bookAheadDays),
    express_fee: money(s.expressFee),
    free_over: money(s.freeOver),
    scheduled_fee: money(s.scheduledFee),
    handling_fee: money(s.handlingFee),
    slot_cutoff: cutoffLabel(s.cutoffMinutes),
    delivery_area: area,
  };
  return text.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m);
}

/**
 * Help centre topics. Questions come from the admin's Help centre (`remote`, once loaded); until
 * then the built-in ones below are shown. Delivery fees, times and the delivery area come from the
 * live Supabase settings so the answers always match what checkout charges.
 */
export function helpTopics(
  s: DeliverySettings,
  postcodes: string[],
  remote?: { articles: HelpArticle[]; loaded: boolean },
): HelpTopic[] {
  const area = postcodes.length
    ? `We currently deliver to these postcodes: ${[...postcodes].sort().join(', ')}.`
    : 'We deliver across Melbourne.';
  const fill = (t: string) => fillPlaceholders(t, s, area);
  const fillQ = (item: HelpQuestion): HelpQuestion => ({
    ...item,
    q: fill(item.q),
    sub: fill(item.sub),
    body: fill(item.body),
    steps: item.steps?.map(fill),
    note: item.note ? fill(item.note) : undefined,
  });
  return TOPICS.map((t) => ({
    ...t,
    questions: remote?.loaded
      ? remote.articles
          .filter((a) => a.topic === t.id)
          .map((a) =>
            fillQ({
              id: a.id,
              q: a.q,
              sub: a.sub,
              body: a.body,
              stepsTitle: a.stepsTitle || undefined,
              steps: a.steps.length ? a.steps : undefined,
              note: a.note || undefined,
            }),
          )
      : BUILT_IN[t.id].map(fillQ),
  }));
}

const TOPICS: Omit<HelpTopic, 'questions'>[] = [
  { id: 'orders', title: 'Orders', intro: 'Track an order, order again, and fix problems with what arrived.', about: 'orders' },
  { id: 'delivery', title: 'Delivery', intro: 'Delivery times, fees, scheduled slots and what to do if you’re not home.', about: 'delivery' },
  { id: 'payments', title: 'Payments', intro: 'Payment methods, declined payments and receipts.', about: 'payments' },
  { id: 'refunds', title: 'Refunds', intro: 'How to ask for a refund and how long it takes.', about: 'refunds' },
  { id: 'wallet', title: 'Wallet', intro: 'Spice Kart Money: your balance and top-ups.', about: 'wallet' },
  { id: 'addresses', title: 'Addresses', intro: 'Save and choose delivery addresses.', about: 'addresses' },
];

/**
 * Shown until the admin's Help centre articles load (and without Supabase). Same text as the
 * starter articles in the admin's supabase/support.sql; `{…}` placeholders are filled from the
 * live delivery settings.
 */
const BUILT_IN: Record<HelpTopicId, HelpQuestion[]> = {
  orders: [
  {
    q: 'Where is my order?',
    sub: 'Live status and arrival time',
    body: 'Every order shows its live status — confirmed, picking, packed, out for delivery and delivered — with the time each step happened and your estimated arrival. The Track screen updates by itself as your order moves along.',
    stepsTitle: 'HOW TO TRACK',
    steps: [
      'Tap Orders in the bottom bar.',
      'Find your order under Active.',
      'Tap Track to see each step and your estimated arrival.',
      'Need the store? Tap the phone button on the store card to call them.',
    ],
    note: 'If your order is running late, Track shows RUNNING LATE. Contact support any time and we’ll chase it up for you.',
  },
  {
    q: 'An item is missing from my delivery',
    sub: 'Report it and we’ll sort it out',
    body: 'Sorry about that. Report it in the app and our support team will check your order and arrange a refund for anything that didn’t arrive.',
    stepsTitle: 'HOW TO REPORT IT',
    steps: [
      'Tap your avatar on Home, then Contact support.',
      'Tap Report an issue and choose Missing item.',
      'Tell us which item is missing and add a photo if it helps.',
      'Tap Continue to chat — we’ll reply in the same chat.',
    ],
    note: 'Please report missing items as soon as you can after delivery so we can check with the store.',
  },
  {
    q: 'Cancel or change an order',
    sub: 'Contact us before picking starts',
    body: 'Orders can’t be cancelled or edited in the app yet. If you need to cancel or change something, contact support as soon as possible — we can usually help until the store starts picking your groceries.',
    stepsTitle: 'TO ASK FOR A CHANGE',
    steps: [
      'Tap your avatar on Home, then Contact support.',
      'Tap Live chat.',
      'Send your order number and what you’d like to change.',
    ],
    note: 'Orders that are already out for delivery can’t be cancelled.',
  },
  {
    q: 'Ordering again',
    sub: 'Reorder a past order in one tap',
    body: 'Add everything from a past order back to your cart in one tap. Items are added at today’s prices, and anything no longer in our range is left out.',
    stepsTitle: 'TO REORDER',
    steps: [
      'Tap Orders in the bottom bar.',
      'Open Past Orders.',
      'Tap Reorder on the order you want.',
      'Check your cart, then place the order.',
    ],
  },
  ],
  delivery: [
  {
    q: 'Delivery times & fees',
    sub: 'Express vs scheduled',
    body: 'Express delivery arrives in about {eta_minutes} minutes while the store is open. Scheduled delivery lets you pick a delivery window up to {book_ahead_days} days ahead.',
    stepsTitle: 'FEES AT A GLANCE',
    steps: [
      'Express: {express_fee}, free over {free_over}.',
      'Scheduled: from {scheduled_fee} — each window shows its own fee.',
      'Handling fee: {handling_fee} per order.',
      'Every fee is shown at checkout before you place the order.',
    ],
    note: 'Outside store hours Express shows as Closed — choose Schedule instead.',
  },
  {
    q: 'Booking a scheduled slot',
    sub: 'Choose a delivery window',
    body: 'Pick a day and a delivery window at checkout. Windows close {slot_cutoff} before they start.',
    stepsTitle: 'TO BOOK A WINDOW',
    steps: [
      'Go to checkout.',
      'Tap Schedule under delivery time.',
      'Pick a day, then an available window.',
      'Tap Place order.',
    ],
    note: 'Popular windows fill up — book early for weekends.',
  },
  {
    q: 'I wasn’t home for my delivery',
    sub: 'What to do next',
    body: 'Missed your delivery? Contact support straight away and we’ll work out the next steps with the store.',
    stepsTitle: 'NEXT TIME',
    steps: [
      'Keep your mobile number up to date in Personal details.',
      'Keep your phone nearby around your arrival time.',
      'Check Track for your estimated arrival.',
    ],
    note: 'You can also call the store from the Track screen.',
  },
  {
    q: 'Where do you deliver?',
    sub: 'Coverage areas',
    body: '{delivery_area} Add your address in the app and we’ll tell you straight away if it’s outside our delivery area.',
    stepsTitle: 'TO CHECK YOUR ADDRESS',
    steps: [
      'Tap your avatar on Home, then Saved addresses.',
      'Tap Add new address or Use my current location.',
      'Enter your postcode — if we don’t deliver there yet, you’ll see a message.',
    ],
  },
  ],
  payments: [
  {
    q: 'Why was my payment declined?',
    sub: 'Common causes and fixes',
    body: 'Declines usually come from your bank — for example an expired card, a typo in the card details or not enough funds.',
    stepsTitle: 'TRY THIS',
    steps: [
      'Check the card number, expiry and CVV under Payment methods in your account.',
      'Try another method at checkout, like Apple Pay or PayID.',
      'Contact your bank if the same card keeps failing.',
      'Still stuck? Chat with us from Contact support.',
    ],
  },
  {
    q: 'Accepted payment methods',
    sub: 'Cards, Apple Pay, Google Pay and PayID',
    body: 'At checkout you can pay by credit or debit card, Apple Pay, Google Pay or PayID bank transfer. The options you see depend on what your store currently accepts.',
    stepsTitle: 'TO MANAGE YOUR CARDS',
    steps: [
      'Tap your avatar on Home, then Payment methods.',
      'Tap + Add payment method to add a card.',
      'Tap Set default on the card you use most.',
      'Choose how to pay under Payment method at checkout.',
    ],
    note: 'Spice Kart Money can’t be used at checkout yet.',
  },
  {
    q: 'Getting a tax invoice',
    sub: 'Receipts for your orders',
    body: 'Need a tax invoice or receipt for an order? Ask us in chat and we’ll send it to your email.',
    stepsTitle: 'TO GET A COPY',
    steps: [
      'Add your email in Personal details.',
      'Open Contact support and tap Live chat.',
      'Send the order number you need an invoice for.',
    ],
  },
  ],
  refunds: [
  {
    q: 'How refunds are processed',
    sub: 'Reviewed by our support team',
    body: 'If something was missing, damaged or wrong, report it and our support team will review it and arrange your refund. We’ll keep you updated in the chat.',
    stepsTitle: 'HOW TO REQUEST A REFUND',
    steps: [
      'Tap your avatar on Home, then Contact support.',
      'Tap Report an issue and choose what went wrong.',
      'Add details, and a photo if an item arrived damaged.',
      'Tap Continue to chat.',
    ],
    note: 'Refunds go back to the payment method you used. Your bank may take 3–5 business days to show it.',
  },
  {
    q: 'How long do refunds take?',
    sub: 'Checking on a refund',
    body: 'Once your refund is approved we’ll confirm it in your chat. It’s returned to the payment method you used for the order, and your bank may take 3–5 business days to show it.',
    stepsTitle: 'TO CHECK ON A REFUND',
    steps: [
      'Open Contact support.',
      'Under Your conversations, open the chat about your refund.',
      'Still waiting after 5 business days? Send us a message in the same chat.',
    ],
  },
  {
    q: 'Damaged or expired items',
    sub: 'Send a photo and we’ll fix it',
    body: 'If something arrives damaged or past its use-by date, send us a photo and we’ll make it right.',
    stepsTitle: 'TO REPORT IT',
    steps: [
      'Open Contact support and tap Report an issue.',
      'Choose Damaged item.',
      'Tap Attach a photo and add a short note.',
      'Tap Continue to chat.',
    ],
    note: 'Please report it as soon as you can after delivery.',
  },
  ],
  wallet: [
  {
    q: 'What is Spice Kart Money?',
    sub: 'Your in-app balance',
    body: 'Spice Kart Money is your in-app balance. You’ll find it on the Spice Kart Money card in your account.',
    stepsTitle: 'TO SEE YOUR BALANCE',
    steps: [
      'Tap your avatar on Home.',
      'Your balance is on the Spice Kart Money card.',
      'Tap Add money to top it up.',
    ],
    note: 'Paying for orders with Spice Kart Money is coming soon.',
  },
  {
    q: 'Adding money',
    sub: 'Top up your balance',
    body: 'Top up your Spice Kart Money balance from your account in a few taps.',
    stepsTitle: 'TO ADD MONEY',
    steps: [
      'Tap your avatar on Home, then Add money.',
      'Pick $10, $25, $50 or $100, or enter a custom amount.',
      'Choose how to pay.',
      'Tap Confirm & add money.',
    ],
  },
  {
    q: 'Questions about your balance',
    sub: 'We’re here to help',
    body: 'Balance doesn’t look right, or want to move money out? Withdrawals aren’t available in the app yet — chat with us and we’ll help.',
    stepsTitle: 'TO GET HELP',
    steps: [
      'Open Contact support.',
      'Tap Live chat.',
      'Tell us what you need help with.',
    ],
  },
  ],
  addresses: [
  {
    q: 'Can I change my address after ordering?',
    sub: 'Contact us straight away',
    body: 'Delivery addresses can’t be changed in the app once an order is placed. Contact support straight away and we’ll see what we can do before your order leaves the store.',
    stepsTitle: 'TO ASK FOR A CHANGE',
    steps: [
      'Open Contact support.',
      'Tap Live chat.',
      'Send your order number and the new address.',
    ],
    note: 'The new address must be inside our delivery area.',
  },
  {
    q: 'Adding a new address',
    sub: 'Home, work and more',
    body: 'Save your home, work or other addresses so checkout is quicker.',
    stepsTitle: 'TO ADD AN ADDRESS',
    steps: [
      'Tap your avatar on Home, then Saved addresses.',
      'Tap Add new address, or Use my current location to fill it in.',
      'Enter your street, suburb, state and postcode, and choose Home, Work or Other.',
      'Tap Save address.',
    ],
    note: 'To remove an address, press and hold it in Saved addresses.',
  },
  {
    q: 'Setting a default address',
    sub: 'Faster checkout',
    body: 'Your default address is used automatically at checkout.',
    stepsTitle: 'TO SET IT',
    steps: [
      'Tap your avatar on Home, then Saved addresses.',
      'Tap Add new address.',
      'Turn on Set as default address, then save.',
    ],
    note: 'Delivering somewhere else? Tap that address in Saved addresses before you check out.',
  },
  ],
};

export const TOPIC_OF_TAG: Record<string, HelpTopicId> = {
  Orders: 'orders',
  Delivery: 'delivery',
  Payments: 'payments',
  Refunds: 'refunds',
  Wallet: 'wallet',
  Addresses: 'addresses',
};
