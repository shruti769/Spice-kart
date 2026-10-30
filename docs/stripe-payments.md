# Stripe payment checks

The app currently uses a Stripe **test** publishable key. This change does not enable live payments.

- Saved cards belong to a server-mapped Stripe customer. The app collects card details in Stripe's SetupIntent Payment Sheet and fetches card summaries from Stripe. Checkout and wallet top-ups use that customer's saved cards.
- Wallet top-ups use AUD PaymentIntents. Both the authenticated confirmation endpoint and the signed Stripe webhook can finalize credit. `credit_stripe_wallet` records the PaymentIntent and updates the balance atomically, once. The old demo `wallet_top_up` RPC is disabled, including for older app installations.
- PayID is hidden and rejected by the app's payment availability check.
- Apple Pay and Google Pay are configured, but still require tests on suitable physical devices and builds.

## Automated verification

Run from the project root with `.env` configured and the Supabase CLI signed in:

```sh
npx expo lint
npx tsc --noEmit
npx --yes deno check --node-modules-dir=none supabase/functions/stripe-wallet/index.ts supabase/functions/stripe-payment/index.ts supabase/functions/stripe-webhook/index.ts
supabase db query --linked --file scripts/verify-stripe-wallet.sql
node scripts/verify-stripe-payments.mjs
```

The SQL check rolls back its changes. The integration script requires a test publishable key, creates an isolated test account, tests card saving/removal/defaults, validates a $5 test top-up, verifies idempotency and rejection of unpaid credits, and confirms a synthetic order through Stripe and its actual webhook. It deletes its database fixtures afterward; Stripe retains test-mode payment records.

The synthetic order has no inventory or delivery effects. Its insert skips triggers only within that fixture transaction so the payment/webhook check can run outside store opening hours without modifying business settings. It does **not** validate normal cart placement, delivery rules, stock restoration, or the native Payment Sheet UI.

## Remaining device checks

On an authenticated development build, add a card, complete a wallet top-up, cancel a payment, and place an order during opening hours. Verify displayed balances, stock restoration after an unpaid cancellation, return from bank authentication, and Apple Pay / Google Pay on supported devices. These checks are required before switching to live keys.

The schema migration and all three edge functions have been applied/deployed to the configured Supabase project. Historical migrations in this repository are managed manually; the new SQL migration is safe to run again.
