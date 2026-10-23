# Live phone OTP release

## Implementation

- Firebase native Phone Auth sends and verifies actual SMS codes on Android/iOS.
- `firebase-session` verifies Google's RS256 signature, issuer, audience, expiry, UID,
  and phone-provider claims before minting a normal Supabase session.
- A service-only `firebase_identities` table maps Firebase UIDs to stable Supabase UUIDs.
  Existing UUID RLS and auth.users foreign keys remain in use. Random private login aliases
  are internal credentials, never customer email addresses and never sent as emails.
- Anonymous device sign-in is removed. The UI only completes login after the verified backend
  session is established. Old anonymous accounts/data are not automatically merged by phone.
- `live-apk` builds an Android release APK with bundled JavaScript. No Metro connection is needed.
- `production` builds store binaries. Android Play builds need the Play signing certificate
  fingerprints in Firebase as well as the EAS fingerprints used for directly installed APKs.

## Required account setup

1. Enable Firebase Blaze billing for actual verification SMS. Keep Phone enabled and restrict SMS
   regions to intended markets. The login country selector accepts Australian +61 (nine digits) and Indian +91 (ten digits) mobile numbers.
2. Apply `supabase/migrations/20261023000000_firebase_identities.sql` to the configured backend.
3. Deploy the server function with Firebase project ID `spicekart-f3459`:

```sh
npx supabase secrets set FIREBASE_PROJECT_ID=spicekart-f3459 --project-ref YOUR_PROJECT_REF
npx supabase functions deploy firebase-session --project-ref YOUR_PROJECT_REF
```

`supabase/config.toml` disables the gateway's Supabase-only JWT check for this endpoint;
its handler verifies the Firebase JWT instead. SUPABASE_URL, SUPABASE_ANON_KEY, and
SUPABASE_SERVICE_ROLE_KEY are server-provided Edge Function secrets. Never ship the service key
or a Firebase Admin private key in the app. Supabase Email auth must be enabled for the server-side
one-time session exchange; no SMTP delivery is performed by `generateLink`.

4. Configure these public EAS environment values for **production** (and development/preview
   if those build profiles are used):

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Use the same values as the local `.env`. `.env` is intentionally excluded from build uploads.
Firebase Android/iOS client files are included through `.easignore`.

5. Build the standalone Android APK:

```sh
npx eas-cli@latest build --platform android --profile live-apk
```

Install the APK, close Metro, and test real-number login, wrong/expired codes, resend,
restart, logout, and signing in on a second device with the same number. Use Firebase fictional
numbers only before billing is active. A real SMS delivery test has not yet been performed.

## iOS release

The iOS Firebase plist and bundle ID are configured. Physical-device EAS distribution/TestFlight
and App Store releases still require Apple Developer signing. Configure the APNs key in Firebase
and test silent verification plus the reCAPTCHA fallback. Simulator builds cannot be installed
on physical iPhones. Local SDK 57 tooling requires Xcode 26.4 or newer.

## Validation

```sh
npx expo lint
npx tsc --noEmit
npx --yes deno check --node-modules-dir=none supabase/functions/firebase-session/index.ts
npx --yes deno test --node-modules-dir=none supabase/functions/firebase-session/verify-firebase_test.ts
```

The token tests cover valid identities, forged signatures, wrong projects/issuers, expiry,
anonymous providers, missing phone numbers, empty UIDs, and future timestamps.
These tests do not replace on-device SMS and deployed-backend integration testing.

## Current activation status

Firebase Blaze activation was confirmed by the user's Console screenshot. The Firebase
identity table and `firebase-session` Edge Function are deployed to the backend configured
in `.env`; the function is ACTIVE. Live endpoint smoke checks reject missing and forged
tokens with HTTP 401. Ten cryptographic verifier tests, app lint, and TypeScript checks pass.
Public Supabase URL/key are configured in the EAS production environment.

An Android `live-apk` cloud build is being prepared. Actual SMS delivery, a valid-token
backend exchange, and two-device account restoration still need on-device testing. The
paid Apple Developer account and iOS APNs/device distribution remain pending.

## India support

Select India (+91) using the flag/country control on Login and enter a ten-digit Indian mobile
number. Send, verify, resend, and profile storage retain the selected international prefix.
The deployed profile/customer constraints accept +61 and +91 numbers and existing legacy
Australian records. Firebase must allow India in its SMS region policy (the user has configured it).
Install a newly built APK to get the updated selector; the previous APK cannot pick up this code
without a new build. Build manually with the `live-apk` profile.
