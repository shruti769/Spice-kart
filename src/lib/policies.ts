export type PolicyId = 'terms' | 'privacy' | 'refund' | 'delivery' | 'payment' | 'wallet' | 'promo';

export type Policy = {
  title: string;
  updated: string;
  intro: string;
  /** Each section's heading doubles as its chip label; `body` is one entry per paragraph. */
  sections: { heading: string; body: string[] }[];
};

export const POLICIES: Record<PolicyId, Policy> = {
  terms: {
    title: 'Terms of Service',
    updated: '12 Aug 2026',
    intro: 'The agreement between you and Spice Kart when you create an account, browse or place an order.',
    sections: [
      {
        heading: 'Your account',
        body: [
          'You must be 18 or older to hold an account. Keep your login details private — you are responsible for orders placed from your account.',
          'We may suspend accounts used for fraud, abuse of promotions or harassment of our shoppers and drivers.',
        ],
      },
      {
        heading: 'Placing an order',
        body: [
          'An order is confirmed once payment is authorised. Prices and availability may change until picking starts; we will always show the final amount before charging you.',
        ],
      },
      {
        heading: 'Age-restricted items',
        body: [
          'Some items require ID on delivery. If valid ID cannot be shown, the driver will return those items and they will be refunded.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We will notify you in the app at least 14 days before material changes take effect. Continuing to use Spice Kart means you accept the updated terms.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '3 Sep 2026',
    intro: 'What personal data we collect, why we use it, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Your name, contact details, delivery addresses, order history and payment tokens. We never store full card numbers.',
          'With your permission we use your location to show nearby stores and live delivery tracking.',
        ],
      },
      {
        heading: 'How we use it',
        body: ['To fulfil orders, provide support, prevent fraud and — only if you opt in — send personalised offers.'],
      },
      {
        heading: 'Sharing',
        body: ['Shoppers and drivers see only what they need to deliver your order. We never sell your personal data.'],
      },
      {
        heading: 'Your choices',
        body: [
          'Download or delete your data at any time from Account → Privacy & data. Marketing can be turned off in Notification settings.',
        ],
      },
    ],
  },
  refund: {
    title: 'Refund & Cancellation',
    updated: '24 Aug 2026',
    intro: 'When you can cancel for free, how refunds are paid and how to report a problem.',
    sections: [
      {
        heading: 'Cancelling an order',
        body: [
          'You may cancel free of charge until your shopper begins picking. After that, a restocking fee of up to $4.95 may apply to fresh and chilled items.',
          'Orders already out for delivery cannot be cancelled in the app — contact support and we will help where possible.',
        ],
      },
      {
        heading: 'How refunds are issued',
        body: [
          'Approved refunds are credited to Spice Kart Money immediately. Refunds to your original payment method take 3–5 business days.',
        ],
      },
      {
        heading: 'Fresh items',
        body: [
          'Report quality issues with produce, dairy, meat and bakery within 24 hours of delivery. A photo helps us process it faster.',
        ],
      },
      {
        heading: 'Disputes',
        body: [
          'If you disagree with a refund decision, reply to the support ticket within 14 days and a senior agent will review it.',
        ],
      },
    ],
  },
  delivery: {
    title: 'Delivery Policy',
    updated: '19 Sep 2026',
    intro: 'Delivery windows, coverage areas, fees and what happens if a delivery fails.',
    sections: [
      {
        heading: 'Delivery windows',
        body: [
          'Express orders arrive in 30–45 minutes. Scheduled orders arrive within the 2-hour window you book at checkout.',
        ],
      },
      {
        heading: 'Coverage & fees',
        body: [
          'We deliver across metro Melbourne. Express costs $4.99 (free over $60) and scheduled slots cost $2.99. All fees are shown before you pay.',
        ],
      },
      {
        heading: 'Failed deliveries',
        body: [
          'Drivers wait 5 minutes and try to call you. If Leave at door is on, we leave the order and send a photo. Otherwise you can arrange one free redelivery.',
        ],
      },
      {
        heading: 'Chilled & frozen items',
        body: ['These are never left unattended for more than 30 minutes. If no one is home they are returned and refunded.'],
      },
    ],
  },
  payment: {
    title: 'Payment Policy',
    updated: '8 Sep 2026',
    intro: 'How and when you are charged, temporary holds and receipts.',
    sections: [
      {
        heading: 'When you are charged',
        body: [
          'We place a hold for the estimated total when you order, then charge the final amount once your shopper finishes picking.',
        ],
      },
      {
        heading: 'Holds',
        body: [
          'Holds may be up to 10% above the estimate to cover weighed items. Any unused hold is released by your bank within 3–5 days.',
        ],
      },
      {
        heading: 'Accepted methods',
        body: [
          'Visa, Mastercard, Amex, Apple Pay, Google Pay and Spice Kart Money. Cash on delivery is not available.',
        ],
      },
      {
        heading: 'Receipts',
        body: ['A tax invoice is emailed after every delivery and is available in the order screen.'],
      },
    ],
  },
  wallet: {
    title: 'Wallet Terms',
    updated: '19 Sep 2026',
    intro: 'Rules for Spice Kart Money: top-ups, cashback, refunds and withdrawals.',
    sections: [
      {
        heading: 'Your balance',
        body: [
          'Spice Kart Money is a prepaid balance that can only be used on Spice Kart. Balances do not earn interest and never expire.',
        ],
      },
      {
        heading: 'Top-ups',
        body: ['Top up from $10 to $500 at a time by card. The maximum balance is $2,000.'],
      },
      {
        heading: 'Cashback',
        body: [
          'Pay a full order with your wallet to earn 5% cashback, capped at $10 per order. Cashback can be spent but not withdrawn.',
        ],
      },
      {
        heading: 'Withdrawals',
        body: [
          'Top-ups and refunds can be withdrawn to an Australian bank account free of charge, usually within 1–2 business days.',
        ],
      },
    ],
  },
  promo: {
    title: 'Promotional Terms',
    updated: '1 Sep 2026',
    intro: 'How coupons, offers and referral rewards work, and who is eligible.',
    sections: [
      {
        heading: 'Coupons',
        body: [
          'One coupon per order. Coupons cannot be combined, exchanged for cash or applied to delivery fees unless stated.',
        ],
      },
      {
        heading: 'Eligibility',
        body: [
          'Offers marked “new customers” apply to your first order only. Minimum spend is calculated before fees and after other discounts.',
        ],
      },
      {
        heading: 'Referrals',
        body: [
          'You and your friend each get $10 of Spice Kart Money once their first order over $40 is delivered. Limited to 20 referrals a year.',
        ],
      },
      {
        heading: 'Misuse',
        body: ['We may cancel rewards gained through duplicate accounts or other misuse of promotions.'],
      },
    ],
  },
};

export const isPolicyId = (v: unknown): v is PolicyId => typeof v === 'string' && v in POLICIES;
