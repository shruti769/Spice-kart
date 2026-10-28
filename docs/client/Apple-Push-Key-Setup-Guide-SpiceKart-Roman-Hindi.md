# SpiceKart - Apple Push Key Setup Guide

Business owner ke liye simple steps | Roman Hindi

Neeche diye gaye steps apne Apple Developer account aur Firebase project mein complete kar dein. Isse iPhone par do cheezein hongi:

- Login aasaan hoga: customer ko OTP seedha milega, beech mein chhoti si “verifying” screen nahi aayegi.
- Order updates (confirmed, out for delivery, delivered) customers ko push notification se milenge.

Aap Apple par ek key banayenge, use Firebase mein upload karenge, aur wahi key humein securely bhejenge. Isme lagbhag 15 minute lagenge.

## 1. Apple push key banayein

https://developer.apple.com/account kholein aur us Apple ID se sign in karein jiska Apple Developer account hai. Aapka Account Holder ya Admin hona zaroori hai.

1. Certificates, IDs & Profiles kholein, phir Keys.
2. Nayi key banane ke liye + button par click karein.
3. Key name: SpiceKart Push.
4. Apple Push Notifications service (APNs) par tick karein, phir uske aage Configure par click karein.
5. Environment mein Sandbox & Production, aur key type mein Team Scoped (All Topics) chunein. Save karein.
6. Continue par click karein, phir Confirm (ya Register).
7. Download par click karein. Aapko AuthKey_ABC123XYZ9.p8 jaisi file milegi.

Apple ye file sirf ek baar download karne deta hai. Ise kisi safe jagah, jaise password manager, mein save kar lein. Agar file kho jaye, toh key revoke karke nayi banani padegi.

## 2. Key ID aur Team ID note karein

- Key ID: register karne ke baad key ke page par dikhta hai (10 letters aur numbers, file ke naam mein bhi hota hai).
- Team ID: https://developer.apple.com/account kholein, Membership details tak scroll karein aur Team ID copy karein (10 letters aur numbers).

## 3. Key ko Firebase mein upload karein

https://console.firebase.google.com kholein aur spicekart naam ka project chunein. Check karein ki browser ke address mein spicekart-f3459 likha ho. spicekart-2026 project use na karein.

1. Project Overview ke paas gear icon par click karein, phir Project settings.
2. Cloud Messaging tab kholein.
3. Apple app configuration (ya iOS app configuration) mein iOS app com.komal92.spicekart chunein.
4. APNs Authentication Key mein Upload par click karein. Agar development aur production ke alag slots dikhein, toh dono mein yahi key upload karein.
5. .p8 file chunein, Key ID daalein (aur Team ID, agar maange), phir Upload par click karein.

Ab key uploaded dikhni chahiye. APNs certificates wala section bharne ki zaroorat nahi hai, key uski jagah kaam karti hai.

## 4. Key humein securely share karein

iPhones par order notifications bhejne ke liye humein bhi yahi key chahiye. Humein ye bhejein:

- .p8 file.
- Key ID.
- Team ID.

## Humein aapse kya chahiye?

- Confirmation ki key Firebase mein upload ho gayi hai (project spicekart-f3459).
- .p8 file, Key ID aur Team ID, secure tarike se share kiye hue.

## Baaki kaam hum karenge

Hum key ko apni app build service mein lagayenge, iPhone par test version install karenge, aur confirm karenge ki login mein “verifying” screen nahi aati aur order notifications aate hain. Test version install karne ke liye hum aapko iPhone register karne ka link bhej sakte hain. Aapki taraf se coding ki zaroorat nahi hai.

Ye key expire nahi hoti aur iska koi extra kharcha nahi hai, ye Apple Developer membership mein shamil hai.

## Official help links

Apple push key: https://developer.apple.com/help/account/keys/create-a-private-key/

Apple par Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging/ios/certs

SpiceKart ke liye taiyar kiya gaya | 28 October 2026. Apne Apple aur Firebase accounts mein dikhne wale steps follow karein.
