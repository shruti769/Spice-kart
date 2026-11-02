# SpiceKart - Brevo Email Setup Guide

Business owner ke liye simple steps | Roman Hindi

SpiceKart customers ko emails (jaise order confirmation) bhejne ke liye Brevo use karega. Ye emails aapke business ke naam aur aapke domain se jayenge, isliye account aapke naam par hona chahiye.

Aap Brevo account banayenge, apna domain verify karenge, aur ek API key humein securely bhejenge. Isme lagbhag 20 minute lagenge, aur domain verify hone mein kuch ghante lag sakte hain.

Brevo ki screens badalti rehti hain, isliye menu ke naam thode alag dikh sakte hain. Agar kuch alag lage, toh humein screenshot bhej dein.

## Shuru karne se pehle

- Decide karein ki emails kis address se jayenge, jaise orders@spicekart.com.au. Ye inbox active rakhein, kyunki customers us par reply kar sakte hain.
- Apne domain ki DNS settings ka access rakhein (jahan se domain kharida tha, jaise GoDaddy ya Cloudflare). Agar website koi aur sambhalta hai, toh step 3 unse karwa lein.

## 1. Brevo account banayein

https://www.brevo.com kholein aur business email se sign up karein. Form mein ye bharein:

1. First name aur Last name: aapka naam.
2. Organization name: Spice Kart Pty Ltd.
3. Website: aapki business website. Agar website nahi hai, toh I don't have a website par tick karein.
4. Continue par click karein aur baaki sawaalon ke jawab dein. Brevo email ya mobile verify karne ko keh sakta hai.

## 2. Sender add karein

1. Upar right mein apne account ke naam par click karein, phir Senders, Domains & Dedicated IPs kholein.
2. Senders tab mein Add a sender par click karein.
3. Name: Spice Kart.
4. Email: wahi address jo aapne chuna hai, jaise orders@spicekart.com.au.
5. Save karein. Agar us inbox mein verification email ya code aaye, toh use confirm kar dein.

## 3. Domain verify karein

Isse customers ko emails aapke domain se milte hain aur spam mein jaane ke chances kam hote hain.

1. Isi page par Domains tab kholein, phir Add a domain par click karein.
2. Apna domain daalein, jaise spicekart.com.au.
3. Brevo kuch DNS records dikhayega. Inhe apne domain ki DNS settings mein bilkul waise hi add karein.
4. Wapas Brevo mein Verify (ya Authenticate) par click karein.

Records active hone mein kuch ghante, kabhi kabhi 48 ghante tak lag sakte hain. Domain Authenticated dikhne tak baar baar try kar sakte hain.

## 4. API key banayein

1. https://app.brevo.com/settings/keys/api kholein.
2. Generate a new API key par click karein.
3. Name: spice-kart-send-push.
4. Generate par click karein aur key turant copy karke safe jagah save kar lein. Ye xkeysib- se shuru hoti hai.

Key ko sirf ek baar dikhaya ja sakta hai. Agar kho jaye, toh nayi key bana lein. Isi page par SMTP key bhi dikh sakti hai (xsmtpsib- se shuru). Humein wo nahi chahiye.

## 5. Authorized IPs check karein

Account menu mein Security, phir Authorized IPs kholein (agar dikhe). Agar IP blocking on hai, toh use off kar dein, warna humari email service block ho sakti hai. Agar aapko ise on hi rakhna hai, toh humein bata dein.

## Humein aapse kya chahiye?

- Brevo API key, secure tarike se share ki hui.
- Sender email address, jaise orders@spicekart.com.au.
- Confirmation ki domain Brevo mein Authenticated dikh raha hai.

## Baaki kaam hum karenge

Hum key ko app ki email service mein lagayenge, ek test email bhejenge, aur check karenge ki wo sahi address se aata hai aur inbox mein pahunchta hai. Aapki taraf se coding ki zaroorat nahi hai.

Brevo ka free plan bhi hai, jisme roz ke emails ki limit hoti hai. Orders badhne par paid plan lena pad sakta hai, isliye current limit aur price Brevo ke pricing page par dekh lein.

## Official help links

Brevo pricing: https://www.brevo.com/pricing/

Brevo help center: https://help.brevo.com

SpiceKart ke liye taiyar kiya gaya | 2 November 2026. Apne Brevo account mein dikhne wale steps follow karein.
