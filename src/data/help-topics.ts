import type { DeliverySettings } from '@/lib/remote-delivery';

/** One question in a help topic: tap to expand. */
export type HelpQuestion = {
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

/**
 * Help centre topics. Delivery fees, times and the delivery area come from the live Supabase
 * settings so the answers always match what checkout charges.
 */
export function helpTopics(s: DeliverySettings, postcodes: string[]): HelpTopic[] {
  const area = postcodes.length
    ? `We currently deliver to these postcodes: ${[...postcodes].sort().join(', ')}.`
    : 'We deliver across Melbourne.';
  return [
    {
      id: 'orders',
      title: 'Orders',
      intro: 'Track, change or cancel an order, and fix problems with what arrived.',
      about: 'orders',
      questions: [
        {
          q: 'Where is my order?',
          sub: 'Live tracking and arrival times',
          body: 'Every order can be followed live from the moment your shopper starts picking. You’ll see each item being picked, then the driver on the map with an updated arrival time.',
          stepsTitle: 'HOW TO TRACK',
          steps: [
            'Open Orders from the Account tab.',
            'Select the active order.',
            'Tap Track to see picking progress and the driver on the map.',
            'We’ll notify you when the driver is 5 minutes away.',
          ],
          note: 'If tracking hasn’t updated for 15 minutes, contact support and we’ll call the driver for you.',
        },
        {
          q: 'An item is missing from my delivery',
          sub: 'Report it and get refunded',
          body: 'Sorry about that. Report the missing item within 24 hours of delivery and we’ll refund it straight away.',
          stepsTitle: 'HOW TO REPORT IT',
          steps: [
            'Open Orders and select the delivered order.',
            'Tap Report an issue.',
            'Choose the missing items.',
            'Submit — the refund goes to Spice Kart Money.',
          ],
          note: 'Prefer a refund to your card? Choose “Refund to card” when you report it.',
        },
        {
          q: 'Cancel or change an order',
          sub: 'Before picking starts',
          body: 'You can cancel or change an order until your shopper starts picking it. After that, contact support and we’ll do our best to help.',
          stepsTitle: 'TO CANCEL OR CHANGE',
          steps: ['Open Orders and select the active order.', 'Tap Cancel order or Change items.', 'Confirm your changes.'],
          note: 'Cancelled orders are refunded in full to the original payment method.',
        },
        {
          q: 'Substitutions explained',
          sub: 'What happens when an item is out of stock',
          body: 'If an item runs out after you order, your shopper picks the closest match of the same or better quality at no extra cost. If there’s no good match, the item is refunded.',
          stepsTitle: 'YOUR OPTIONS',
          steps: [
            'Approve or reject substitutions in the Track screen.',
            'Rejected substitutions are refunded automatically.',
            'You’re never charged more than the original item.',
          ],
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      intro: 'Delivery times, fees, scheduled slots and what to do if you’re not home.',
      about: 'delivery',
      questions: [
        {
          q: 'Delivery times & fees',
          sub: 'Express vs scheduled',
          body: `Express delivery arrives in about ${s.etaMinutes} minutes across Melbourne. Scheduled delivery lets you book a delivery window up to ${s.bookAheadDays} days ahead.`,
          stepsTitle: 'FEES AT A GLANCE',
          steps: [
            `Express: ${money(s.expressFee)}, free over ${money(s.freeOver)}.`,
            `Scheduled slot: ${money(s.scheduledFee)}.`,
            `Handling fee of ${money(s.handlingFee)} per order.`,
            'Fees are shown before you pay.',
          ],
          note: 'Surge fees never apply — the price you see is the price you pay.',
        },
        {
          q: 'Booking a scheduled slot',
          sub: 'Choose a delivery window',
          body: `Pick a day and a delivery window at checkout. Slots close ${s.cutoffMinutes >= 60 ? `${s.cutoffMinutes / 60} hour${s.cutoffMinutes === 60 ? '' : 's'}` : `${s.cutoffMinutes} minutes`} before they start.`,
          stepsTitle: 'TO BOOK A SLOT',
          steps: ['Go to checkout.', 'Tap Schedule under Delivery time.', 'Choose a day and a window.', 'Place your order.'],
          note: 'Popular windows fill up — book early for weekends.',
        },
        {
          q: 'I wasn’t home for my delivery',
          sub: 'Leave-at-door and redelivery',
          body: 'If you’re not home, your driver will call you. If they can’t reach you, they’ll leave the order at your door when it’s safe to do so, or bring it back to the store.',
          stepsTitle: 'NEXT TIME',
          steps: ['Add delivery instructions to your address.', 'Keep your phone nearby around the arrival time.', 'Contact support to arrange a redelivery.'],
        },
        {
          q: 'Where do you deliver?',
          sub: 'Coverage areas',
          body: `${area} Enter your address or use your current location to check if we deliver to you.`,
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payments',
      intro: 'Cards, Apple Pay, failed payments and receipts.',
      about: 'payments',
      questions: [
        {
          q: 'Why was my payment declined?',
          sub: 'Common causes and fixes',
          body: 'Declines usually come from your bank. Common reasons are an expired card, insufficient funds or a security hold.',
          stepsTitle: 'TRY THIS',
          steps: [
            'Check the card’s expiry and CVV.',
            'Try Apple Pay or another card.',
            'Contact your bank if it keeps failing.',
            'Retry — nothing is charged for failed attempts.',
          ],
          note: 'Pending authorisations from failed attempts drop off within 3–5 days.',
        },
        {
          q: 'Accepted payment methods',
          sub: 'Cards, wallets and Spice Kart Money',
          body: 'We accept Visa, Mastercard and American Express, Apple Pay, Google Pay, PayID bank transfer and your Spice Kart Money balance.',
          stepsTitle: 'TO CHANGE HOW YOU PAY',
          steps: ['Go to checkout.', 'Choose a method under Payment method.', 'Add a new card from Account → Payments.'],
        },
        {
          q: 'Getting a tax invoice',
          sub: 'Receipts for every order',
          body: 'Every order comes with a GST tax invoice, sent to your email once the order is delivered.',
          stepsTitle: 'TO GET A COPY',
          steps: ['Open Orders.', 'Select the order.', 'Tap View receipt.'],
          note: 'Add an email address in Personal details to receive receipts.',
        },
      ],
    },
    {
      id: 'refunds',
      title: 'Refunds',
      intro: 'How refunds work, how long they take and where the money goes.',
      about: 'refunds',
      questions: [
        {
          q: 'How refunds are processed',
          sub: 'Money returns to Spice Kart Money instantly',
          body: 'If an item is missing, damaged or unavailable, we refund it automatically once your shopper marks the order complete. Refunds go to Spice Kart Money by default so you can spend them on your next order straight away.',
          stepsTitle: 'HOW TO REQUEST A REFUND',
          steps: [
            'Open Orders and select the order.',
            'Tap Report an issue and choose the affected items.',
            'Add a photo if the item arrived damaged.',
            'Submit most refunds are approved within minutes.',
          ],
          note: 'Prefer the money back on your card? Choose “Refund to card” when you report the issue — bank refunds take 3–5 business days.',
        },
        {
          q: 'How do refunds to Spice Kart Money work?',
          sub: 'Instant credit you can spend',
          body: 'Refunds to Spice Kart Money land in your balance straight away and are used automatically at checkout when you pay with your wallet.',
          stepsTitle: 'TO SEE YOUR REFUNDS',
          steps: ['Open the Wallet.', 'Check Recent activity for the refund.', 'Pay with Spice Kart Money on your next order.'],
          note: 'You can withdraw your balance to your bank at any time.',
        },
        {
          q: 'Damaged or expired items',
          sub: 'Photo and refund',
          body: 'If something arrives damaged or past its use-by date, send us a photo within 24 hours and we’ll refund it.',
          stepsTitle: 'TO REPORT IT',
          steps: ['Open Orders and select the order.', 'Tap Report an issue.', 'Choose the item and add a photo.', 'Submit.'],
        },
      ],
    },
    {
      id: 'wallet',
      title: 'Wallet',
      intro: 'Spice Kart Money: top-ups, cashback and withdrawals.',
      about: 'wallet',
      questions: [
        {
          q: 'What is Spice Kart Money?',
          sub: 'Your in-app balance',
          body: 'Spice Kart Money is a prepaid balance you can use on any order. It holds refunds, cashback and top-ups.',
          stepsTitle: 'GETTING STARTED',
          steps: ['Open the Wallet tab.', 'Tap Add money.', 'Choose an amount and pay by card.', 'Your balance updates instantly.'],
          note: 'Balances are protected and never expire.',
        },
        {
          q: 'Earning 5% cashback',
          sub: 'Pay with wallet, get money back',
          body: 'Pay for an order with Spice Kart Money and get 5% of the order total back in your wallet once it’s delivered.',
          stepsTitle: 'HOW IT WORKS',
          steps: ['Top up your wallet.', 'Choose Spice Kart Money at checkout.', 'Cashback lands after delivery.'],
        },
        {
          q: 'Withdrawing your balance',
          sub: 'Move money to your bank',
          body: 'You can move your Spice Kart Money balance to your bank account at any time, free of charge.',
          stepsTitle: 'TO WITHDRAW',
          steps: ['Open the Wallet.', 'Tap Withdraw.', 'Enter the amount and confirm.'],
          note: 'Withdrawals reach your bank within 1–2 business days.',
        },
      ],
    },
    {
      id: 'addresses',
      title: 'Addresses',
      intro: 'Save, edit and switch delivery addresses.',
      about: 'addresses',
      questions: [
        {
          q: 'Can I change my address after ordering?',
          sub: 'Before picking starts',
          body: 'You can change the delivery address until your shopper starts picking, as long as the new address is in the same delivery zone.',
          stepsTitle: 'TO CHANGE',
          steps: ['Open the active order.', 'Tap Delivery address.', 'Select or add an address.', 'Confirm — fees update if needed.'],
          note: 'After picking starts, contact support and we’ll try to reroute the driver.',
        },
        {
          q: 'Adding delivery instructions',
          sub: 'Gate codes, units and notes',
          body: 'Delivery instructions help your driver find you, like a gate code, unit number or where to leave the order.',
          stepsTitle: 'TO ADD INSTRUCTIONS',
          steps: ['Open Account → Addresses.', 'Add or edit an address.', 'Fill in Delivery instructions and save.'],
        },
        {
          q: 'Setting a default address',
          sub: 'Faster checkout',
          body: 'Your default address is used automatically at checkout, so you don’t have to pick it every time.',
          stepsTitle: 'TO SET IT',
          steps: ['Open Account → Addresses.', 'Choose an address.', 'Turn on Set as default address.'],
        },
      ],
    },
  ];
}

/** Help-centre search results and home-screen FAQs point at a topic question. */
export const TOPIC_OF_TAG: Record<string, HelpTopicId> = {
  Orders: 'orders',
  Delivery: 'delivery',
  Payments: 'payments',
  Refunds: 'refunds',
  Wallet: 'wallet',
  Addresses: 'addresses',
};
