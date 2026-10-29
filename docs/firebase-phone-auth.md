# Firebase phone OTP

Android is configured for Firebase project `spicekart-f3459`, package `com.komal92.spicekart`.
The downloaded `google-services.json` is copied into the project root. It is ignored by Git,
but included in EAS uploads by `.easignore`. Other developers/CI need their own copy.
Never put an Admin SDK service-account private key into this app.

## Firebase Console steps

1. In Authentication > Sign-in method, enable Phone.
2. Check Authentication > Settings > SMS region policy allows Australia (+61).
3. Add the Android signing certificate SHA-1 and SHA-256 fingerprints in Project Settings.
   Use the fingerprints for the certificate signing each installed development/preview/production
   build. Play App Signing uses its own certificate for Play-distributed builds.
4. Download the updated Android config after updating project settings and replace the root file.
5. Configure billing as required for real verification SMS. For initial testing, add a fictional
   Australian phone number and a six-digit code under Phone > Phone numbers for testing.

## Build and test

```sh
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
```

Install the development build on a device. Expo Go does not contain the Firebase native modules.
Test valid/incorrect/expired codes, resend, Android automatic verification, restart, and logout.
The login selector supports Australia (+61, nine digits starting with 4) and India (+91, ten digits starting with 6–9).
SMS requests and verification are handled by Firebase; arbitrary codes no longer sign in.
Google/Apple sign-in never bypasses phone verification: see "Google and Apple sign-in" below.

## Google and Apple sign-in

Every account is still keyed by a verified mobile. Google / Apple sign in straight away when that
Firebase user already has a phone linked; otherwise the app deletes the new empty Firebase user,
asks for the mobile, runs the normal OTP, then links the Google / Apple credential to the phone
user (`linkPendingSocial` in `src/lib/firebase-auth.ts`). `firebase-session` accepts `phone`,
`google.com` and `apple.com` tokens only when they carry a `phone_number` claim.

1. Authentication > Sign-in method: enable Google (pick a support email) and Apple.
2. Download the updated `google-services.json` and `GoogleService-Info.plist` (they now contain the
   Google OAuth clients and `REVERSED_CLIENT_ID`) and replace the root files.
3. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` to the Web client ID (Authentication > Sign-in
   method > Google > Web SDK configuration, or the `client_type: 3` entry in `google-services.json`).
4. Sign in with Apple is iOS only. `ios.usesAppleSignIn` adds the capability; EAS enables it on the
   App ID when building with the Apple Developer account. No Services ID is needed for native iOS.
5. Rebuild the development client (new native modules), then deploy `firebase-session`.

## iOS (Apple credentials and device testing pending)

The iOS bundle identifier is `com.komal92.spicekart`. App config points at
`./GoogleService-Info.plist`. The downloaded file is installed and its Firebase project
and bundle identifier have been checked. Apple APNs/signing setup and device testing remain pending.

1. In the same Firebase project, add an Apple/iOS app with that exact bundle identifier.
2. Download its `GoogleService-Info.plist` into the project root. Do not rename an Android
   JSON file; these are separate Firebase client registrations in the same project.
3. In Firebase Project settings > Cloud Messaging > the iOS app, upload the Apple APNs
   authentication key and provide its Key ID / Team ID as requested by the console.
4. Configure EAS iOS signing with the Apple Developer account, then build:

```sh
npx eas-cli@latest build --platform ios --profile development
```

This profile targets physical iPhones and requires appropriate Apple signing and device registration.
After installing the development build, run `npx expo start --dev-client` and open its QR/link.
Pressing `i` from Metro opens the iOS simulator; Metro does not build or install the native client.

The Firebase App/Auth plugins, dynamic frameworks, and background fetch/remote notification
modes are configured. The Auth plugin configures the reCAPTCHA callback from the downloaded
plist during prebuild. Test SMS delivery, wrong/expired codes, resend, restart, and logout on
iOS as well as Android. Test iOS with Background App Refresh enabled and disabled to cover
silent APNs verification and reCAPTCHA fallback. Expo Go does not support this native integration.

References:
- https://firebase.google.com/docs/auth/ios/phone-auth
- https://rnfirebase.io/auth/phone-auth

## Backend account sessions

The app now requires `firebase-session`, a Supabase Edge Function that verifies Google's
Firebase phone ID token before issuing a normal Supabase session. It maps Firebase UIDs
to stable UUID accounts through a service-only table, preserving existing UUID RLS.
Anonymous device fallback is removed. Deploy the new migration and function before using
this app version against the live backend. See [live-otp-release.md](./live-otp-release.md)
for deployment steps and account requirements. Old anonymous customer data is not
merged by mobile number automatically.

References:
- https://rnfirebase.io/auth/phone-auth
- https://rnfirebase.io/
- https://firebase.google.com/docs/auth/android/phone-auth

## Android Firebase compatibility

React Native Firebase App/Auth are pinned together to 26.4.0. Version 27 requires Kotlin 2.4,
while SDK 57's Pika compiler artifact for Kotlin 2.4 is unavailable. Keep SDK 57's default
Kotlin toolchain and the Firebase 26.x native SDK line together. Recheck compatibility before
upgrading Firebase to v27 or changing the Expo SDK. A native rebuild is required after changes.

## iOS testing without a paid Apple Developer account

Use a simulator development build. `development-simulator` extends `development` and sets
`ios.simulator: true`, so EAS does not need iPhone distribution signing credentials.

```sh
npx eas-cli@latest build --platform ios --profile development-simulator
npx eas-cli@latest build:run --platform ios --latest
npx expo start --dev-client
```

Install Xcode and an iOS simulator runtime on the Mac to run the simulator. The resulting
build runs only on the simulator, not on physical iPhones. Firebase uses the reCAPTCHA
fallback on iOS Simulator; silent APNs verification requires a supported physical-device setup.
Start with a fictional phone number and six-digit code configured in Firebase Console.
Real SMS delivery additionally depends on Firebase billing, quotas, and region settings.

https://docs.expo.dev/build-reference/simulators/
