export type PolicyId = 'terms' | 'privacy' | 'refund' | 'delivery' | 'payment' | 'wallet' | 'promo';

export type Policy = {
  title: string;
  updated: string;
  intro: string;
  /** Each section's heading doubles as its chip label; `body` is one entry per paragraph, and can use the live-value placeholders. */
  sections: { heading: string; body: string[] }[];
};

export const POLICIES: Record<PolicyId, Policy> = {
  terms: {
    title: 'Terms of Service',
    updated: '2 Nov 2026',
    intro: 'The agreement between you and Spice Kart when you create an account, browse or place an order.',
    sections: [
      {
        heading: 'Your account',
        body: [
          'You must be 18 or older to hold an account. Keep your login details private — you are responsible for orders placed from your account.',
          'We may suspend accounts used for fraud, abuse of promotions or harassment of our team.',
        ],
      },
      {
        heading: 'Placing an order',
        body: [
          'Your order is placed once payment is successful. You pay the total shown at checkout. If an item is unavailable, we refund you for it.',
        ],
      },
      {
        heading: 'Age-restricted items',
        body: [
          'Some items require ID on delivery. If valid ID cannot be shown, our team will return those items and they will be refunded.',
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
    updated: '13 Nov 2026',
    intro: 'What personal data we collect, why we use it, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Your name, contact details, delivery addresses, order history and payment tokens. We never store full card numbers.',
          'With your permission we use your location to find your address on the map and check that we deliver to you.',
        ],
      },
      {
        heading: 'How we use it',
        body: ['To fulfil orders, provide support, prevent fraud and — only if you opt in — send personalised offers.'],
      },
      {
        heading: 'Sharing',
        body: ['Our team sees only what they need to deliver your order. We never sell your personal data.'],
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
    updated: '13 Nov 2026',
    intro: 'When you can cancel for free, how refunds are paid and how to report a problem.',
    sections: [
      {
        heading: 'Cancelling an order',
        body: [
          'Orders can’t be cancelled in the app. Contact support before our team starts picking and we will cancel your order and refund you in full.',
          'Orders already out for delivery cannot be cancelled — contact support and we will help where possible.',
        ],
      },
      {
        heading: 'How refunds are issued',
        body: [
          'Approved refunds go back to the payment method you used, and your bank may take 5–10 business days to show them. Orders paid with Spice Kart Money are refunded to your Spice Kart Money.',
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
    updated: '12 Nov 2026',
    intro: 'Delivery windows, coverage areas, fees and what happens if a delivery fails.',
    sections: [
      {
        heading: 'Delivery windows',
        body: [
          'Standard delivery arrives in 2–4 hours in Brisbane and by the next day elsewhere. Scheduled orders arrive within the window you book at checkout.',
        ],
      },
      {
        heading: 'Coverage & fees',
        body: [
          'We deliver across Australia. Standard delivery costs {express_fee}. Scheduled windows cost {scheduled_fee} unless a different fee is shown at checkout. Delivery is free on orders over {free_over}, and a {handling_fee} handling fee applies to every order. All fees are shown before you pay.',
        ],
      },
      {
        heading: 'Failed deliveries',
        body: [
          'Our team waits 5 minutes and tries to call you. If we can’t reach you, please contact support to arrange delivery.',
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
    updated: '2 Nov 2026',
    intro: 'How and when you are charged, and the payment methods we accept.',
    sections: [
      {
        heading: 'When you are charged',
        body: [
          'You pay the full order total when you place your order. If an item is unavailable or an order is cancelled, we refund you.',
        ],
      },
      {
        heading: 'Accepted methods',
        body: [
          'Visa, Mastercard, Amex and Spice Kart Money, plus Apple Pay or Google Pay when shown at checkout. Cash on delivery is not available.',
        ],
      },
    ],
  },
  wallet: {
    title: 'Wallet Terms',
    updated: '3 Nov 2026',
    intro: 'Rules for Spice Kart Money: your balance, top-ups and getting your money back.',
    sections: [
      {
        heading: 'Your balance',
        body: [
          'Spice Kart Money is a prepaid balance that can only be used on Spice Kart. Balances do not earn interest and never expire. Any credit from Spice Kart is used first when you pay.',
        ],
      },
      {
        heading: 'Top-ups',
        body: ['Top up from $5 to $500 at a time by card.'],
      },
      {
        heading: 'Getting your money back',
        body: ['Contact support to return top-ups to the card you paid with. Credit that wasn’t paid by card can only be spent on Spice Kart.'],
      },
    ],
  },
  promo: {
    title: 'Promotional Terms',
    updated: '2 Nov 2026',
    intro: 'How coupons and offers work, and who is eligible.',
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
        heading: 'Misuse',
        body: ['We may cancel offers gained through duplicate accounts or other misuse of promotions.'],
      },
    ],
  },
};

export const isPolicyId = (v: unknown): v is PolicyId => typeof v === 'string' && v in POLICIES;
