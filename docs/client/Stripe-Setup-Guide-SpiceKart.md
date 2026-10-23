# SpiceKart — Stripe Setup

Simple steps for the business owner

Please complete the steps below so we can add real payments to your app.

## 1. Create your Stripe account

Open https://dashboard.stripe.com/register and sign up using your business email. If you already have a Stripe account for this business, use that account.

Select the correct business country. Choose Australia if your business is registered/eligible there. Verify your email and enable two-factor authentication when prompted.

## 2. Complete your business details

In the Stripe Dashboard, open the account activation checklist. Enter the details Stripe asks for, such as:

- Legal business name and business type.
- Business address, phone number and website/app details.
- ABN/ACN, if requested for your business type.
- Owner/representative details and identity documents, if requested.

Upload documents directly to Stripe. If Stripe asks for a website or policy page you do not have, contact us before submitting.

## 3. Add your bank account

Add the bank account where you want to receive customer payments. Enter the account holder name, BSB and account number requested by Stripe. Check the details carefully.

Complete any remaining Stripe requirements until the Dashboard shows your account can accept payments and receive payouts.

## 4. Find your Stripe API keys

Open https://dashboard.stripe.com/apikeys. If the page looks different, search for “API keys” in the Stripe Dashboard or open Workbench / Developers and find API keys.

First select the sandbox/test environment. Copy these two values:

- Test publishable key: starts with pk_test_.
- Test secret key: starts with sk_test_. Reveal or create the key if Stripe asks you to do so.

After your account is activated and we have tested the integration, select the live account/environment and provide:

- Live publishable key: starts with pk_live_.
- Live secret key: starts with sk_live_.

Label each key clearly as TEST or LIVE and make sure both belong to the same Stripe account/environment. If Stripe shows a secret only once, save it in your secure password manager. Follow any permission or IP restriction requirements Stripe displays; contact us if unsure.

You do not need to invite us to your Stripe account. Keep ownership, login credentials and bank settings with your business.

## 5. Share the keys securely

Send us the publishable key and share the secret key through an agreed password manager or encrypted, expiring secret-sharing link. Send any separate unlock password through a different channel.

Do not paste secret keys into WhatsApp, normal email, public documents, source code or screenshots. Do not send your Stripe password, login OTP, bank login or identity documents.

Also confirm your Stripe account is ready to accept payments and receive payouts, and tell us if any verification request is still pending.

## 6. Set up payment confirmation with our instructions

Once the payment integration is ready, we will send you the exact webhook URL and list of events to select.

1. Open Webhooks / Event destinations in Stripe Workbench or Developers.
2. Add a destination for your own account using the URL we provide.
3. Select the exact events from our instructions and save it.
4. Open the saved destination and reveal its signing secret, which starts with whsec_.
5. Share this secret using the same secure method as the API secret key. Tell us whether it is for TEST or LIVE.

The webhook secret is different from your API secret key. Test and live destinations have separate secrets. Please wait for our URL and event list before creating the destination. You do not need to write any code.

## What we need from you

- First: test publishable key and test secret key.
- After testing and activation: live publishable key and live secret key.
- When we provide the webhook details: the signing secret for each environment being configured.
- Confirmation of account activation and payout bank setup.

Publishable keys connect the app to Stripe. Secret API keys and webhook signing secrets will be stored only on the secure backend, never inside the mobile app.

## What we will do next

We will add checkout to the app, test payment success/failure and order confirmation, then ask you to approve going live. No coding is needed from your side. Stripe charges processing fees for live payments; review https://stripe.com/au/pricing before launch.

## Official help

Account setup: https://docs.stripe.com/get-started/account/set-up

Bank and account checklist: https://docs.stripe.com/get-started/account/checklist

API keys: https://docs.stripe.com/keys

Webhooks: https://docs.stripe.com/webhooks

Prepared for SpiceKart | 23 October 2026. Follow the requirements shown in your own Stripe Dashboard.
