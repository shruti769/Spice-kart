# SpiceKart - Stripe Setup Guide

Business owner ke liye simple steps | Roman Hindi

App mein real payments shuru karne ke liye neeche diye gaye steps complete kar dein.

## 1. Apna Stripe account banayein

https://dashboard.stripe.com/register kholein aur apne business email se account banayein. Agar isi business ka Stripe account pehle se hai, toh wahi use karein.

Apne business ki sahi country select karein. Australia tabhi select karein jab aapka business wahan registered/eligible ho. Apna email verify karein aur Stripe ke kehne par two-factor authentication enable karein.

## 2. Business details complete karein

Stripe Dashboard mein account activation checklist kholein. Stripe jo details maange, woh fill karein, jaise:

- Business ka legal naam aur business type.
- Business address, phone number aur website/app ki details.
- Business type ke hisaab se ABN/ACN, agar maanga jaaye.
- Owner/representative ki details aur identity documents, agar maange jaayein.

Documents seedhe Stripe par upload karein. Agar Stripe aisi website ya policy page maange jo abhi aapke paas nahi hai, toh submit karne se pehle humein bata dein.

## 3. Bank account add karein

Woh bank account add karein jismein aap customer payments receive karna chahte hain. Stripe ke maange hue account holder name, BSB aur account number fill karein. Details dhyan se check karein.

Stripe ki baaki requirements bhi complete karein. Dashboard mein confirm karein ki account payments accept kar sakta hai aur bank mein payouts receive kar sakta hai.

## 4. Stripe API keys nikalein

https://dashboard.stripe.com/apikeys kholein. Agar page alag dikhe, toh Dashboard mein “API keys” search karein ya Workbench / Developers mein API keys dekhein.

Pehle sandbox/test environment select karke ye do keys copy karein:

- Test publishable key: pk_test_ se shuru hoti hai.
- Test secret key: sk_test_ se shuru hoti hai. Stripe kahe toh key reveal ya create karein.

Account activate hone aur hamari testing complete hone ke baad live account/environment select karke ye keys dein:

- Live publishable key: pk_live_ se shuru hoti hai.
- Live secret key: sk_live_ se shuru hoti hai.

Har key ke saath TEST ya LIVE clearly likhein. Dono keys ek hi Stripe account aur environment ki honi chahiye. Agar secret key sirf ek baar dikhe, toh use secure password manager mein save kar lein. Stripe permission ya IP restriction ke baare mein pooche aur samajh na aaye, toh humein bata dein.

Humein Stripe account ka access/invitation dena zaroori nahi hai. Account ownership, login details aur bank settings apne paas rakhein.

## 5. Keys securely share karein

Publishable key humein bhej dein. Secret key agreed password manager ya encrypted, expiry wale secret-sharing link se share karein. Agar link ka alag password ho, toh use doosre channel se bhejein.

Secret keys WhatsApp, normal email, public document, source code ya screenshots mein paste na karein. Stripe password, login OTP, bank login ya identity documents humein na bhejein.

Saath mein confirm karein ki account payments aur payouts ke liye ready hai. Koi verification request pending ho toh woh bhi bata dein.

## 6. Hamari instructions se payment confirmation setup karein

Payment integration ready hone par hum aapko exact webhook URL aur select karne wale events ki list denge.

1. Stripe Workbench / Developers mein Webhooks ya Event destinations kholein.
2. Hamare diye hue URL se apne account ke liye naya destination add karein.
3. Hamari instructions wale exact events select karke save karein.
4. Saved destination kholkar signing secret reveal karein. Ye whsec_ se shuru hota hai.
5. Is secret ko bhi API secret key ki tarah securely share karein. Saath mein TEST ya LIVE likhein.

Webhook secret aur API secret key alag hote hain. Test aur live destinations ke secrets bhi alag hote hain. Destination banane se pehle hamare URL aur events ki list ka wait karein. Aapko koi coding nahi karni hai.

## Humein aapse kya chahiye?

- Pehle: test publishable key aur test secret key.
- Testing aur activation ke baad: live publishable key aur live secret key.
- Jab hum webhook details dein: use hone wale har environment ka signing secret.
- Account activation aur bank setup complete hone ki confirmation.

Publishable key app ko Stripe se connect karti hai. Secret API keys aur webhook secrets sirf secure backend par rakhe jaayenge, mobile app ke andar nahi.

## Baaki kaam hum karenge

Hum app mein checkout add karenge, payment success/failure aur order confirmation test karenge, phir live karne ke liye aapki approval lenge. Aapki taraf se coding ki zaroorat nahi hai.

Live payments par Stripe ki processing fees lagti hain. Launch se pehle rates dekh lein: https://stripe.com/au/pricing

## Official help links

Account setup: https://docs.stripe.com/get-started/account/set-up

Bank aur account checklist: https://docs.stripe.com/get-started/account/checklist

API keys: https://docs.stripe.com/keys

Webhooks: https://docs.stripe.com/webhooks

SpiceKart ke liye taiyar kiya gaya | 23 October 2026. Apne Stripe Dashboard mein dikhne wali requirements follow karein.
