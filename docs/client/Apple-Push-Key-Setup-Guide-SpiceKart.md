# SpiceKart — Apple Push Key Setup

Simple steps for the business owner

Please complete the steps below on your Apple Developer account and your Firebase project. This does two things on iPhone:

- Login is smoother: customers get the OTP straight away, without the short “verifying” screen.
- Order updates (confirmed, out for delivery, delivered) reach customers as push notifications.

You will create one key on Apple, upload it to Firebase, and share the same key with us securely. It takes about 15 minutes.

## 1. Create the Apple push key

Open https://developer.apple.com/account and sign in with the Apple ID that owns your Apple Developer account. You need to be the Account Holder or an Admin.

1. Open Certificates, IDs & Profiles, then Keys.
2. Click the + button to create a new key.
3. Key name: SpiceKart Push.
4. Tick Apple Push Notifications service (APNs), then click Configure next to it.
5. Choose the environment Sandbox & Production, and the key type Team Scoped (All Topics). Save.
6. Click Continue, then Confirm (or Register).
7. Click Download. You get a file named like AuthKey_ABC123XYZ9.p8.

Apple lets you download this file only once. Save it somewhere safe, such as your password manager. If you lose it, you must revoke the key and create a new one.

## 2. Note the Key ID and Team ID

- Key ID: shown on the key’s page after you register it (10 letters and numbers, also part of the file name).
- Team ID: open https://developer.apple.com/account, scroll to Membership details and copy the Team ID (10 letters and numbers).

## 3. Upload the key to Firebase

Open https://console.firebase.google.com and choose the project named spicekart. Check that the web address contains spicekart-f3459. Do not use the spicekart-2026 project.

1. Click the gear icon next to Project Overview, then Project settings.
2. Open the Cloud Messaging tab.
3. Under Apple app configuration (or iOS app configuration), choose the iOS app com.komal92.spicekart.
4. Under APNs Authentication Key, click Upload. If you see separate development and production slots, upload the same key to both.
5. Choose the .p8 file, enter the Key ID (and the Team ID if asked), then click Upload.

The key should now show as uploaded. You do not need to fill in the APNs certificates section; the key replaces it.

## 4. Share the key with us securely

We also need the same key to send order notifications to iPhones. Please send us:

- The .p8 file.
- The Key ID.
- The Team ID.

## What we need from you

- Confirmation that the key is uploaded in Firebase (project spicekart-f3459).
- The .p8 file, Key ID and Team ID, shared securely.

## What we will do next

We will add the key to our app build service, install a test version on an iPhone, and confirm that login has no “verifying” screen and that order notifications arrive. To install the test version we may send you a link to register your iPhone. No coding is needed from your side.

The key does not expire, and there is no extra cost; it is included in your Apple Developer membership.

## Official help

Apple push key: https://developer.apple.com/help/account/keys/create-a-private-key/

Firebase Cloud Messaging on Apple: https://firebase.google.com/docs/cloud-messaging/ios/certs

Prepared for SpiceKart | 28 October 2026. Follow the steps shown in your own Apple and Firebase accounts.
