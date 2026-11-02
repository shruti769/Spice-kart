# SpiceKart - Brevo Email Setup Guide

Simple steps for the business owner

SpiceKart will use Brevo to send emails to customers, such as order confirmations. These emails go out under your business name and from your domain, so the account should be in your name.

You will create a Brevo account, verify your domain, and send us one API key securely. It takes about 20 minutes, and the domain check can take a few hours to finish.

Brevo's screens change from time to time, so some menu names may look slightly different. If something doesn't match, send us a screenshot.

## Before you start

- Decide which address the emails will come from, such as orders@spicekart.com.au. Keep this inbox active, because customers may reply to it.
- Have access to your domain's DNS settings (where you bought the domain, such as GoDaddy or Cloudflare). If someone else manages your website, ask them to do step 3.

## 1. Create your Brevo account

Open https://www.brevo.com and sign up with your business email. Fill in the form as follows:

1. First name and Last name: your name.
2. Organization name: Spice Kart Pty Ltd.
3. Website: your business website. If you don't have one, tick I don't have a website.
4. Click Continue and answer the remaining questions. Brevo may ask you to verify your email or mobile number.

## 2. Add the sender

1. Click your account name at the top right, then open Senders, Domains & Dedicated IPs.
2. In the Senders tab, click Add a sender.
3. Name: Spice Kart.
4. Email: the address you chose, such as orders@spicekart.com.au.
5. Save. If a verification email or code arrives in that inbox, confirm it.

## 3. Verify your domain

This lets customers receive emails from your domain and makes them less likely to land in spam.

1. On the same page, open the Domains tab, then click Add a domain.
2. Enter your domain, such as spicekart.com.au.
3. Brevo will show some DNS records. Add them to your domain's DNS settings exactly as shown.
4. Go back to Brevo and click Verify (or Authenticate).

The records can take a few hours to become active, and sometimes up to 48 hours. You can keep trying until the domain shows as Authenticated.

## 4. Create the API key

1. Open https://app.brevo.com/settings/keys/api.
2. Click Generate a new API key.
3. Name: spice-kart-send-push.
4. Click Generate, then copy the key straight away and save it somewhere safe. It starts with xkeysib-.

The key may only be shown once. If you lose it, create a new one. This page may also show an SMTP key (starting with xsmtpsib-). We don't need that one.

## 5. Check Authorized IPs

In the account menu, open Security, then Authorized IPs (if you see it). If IP blocking is on, turn it off, otherwise our email service may be blocked. If you need to keep it on, let us know.

## What we need from you

- The Brevo API key, shared securely.
- The sender email address, such as orders@spicekart.com.au.
- Confirmation that the domain shows as Authenticated in Brevo.

## What we will do next

We will add the key to the app's email service, send a test email, and check that it comes from the right address and reaches the inbox. No coding is needed on your side.

Brevo has a free plan with a daily email limit. You may need a paid plan as orders grow, so please check the current limits and prices on Brevo's pricing page.

## Official help links

Brevo pricing: https://www.brevo.com/pricing/

Brevo help center: https://help.brevo.com

Prepared for SpiceKart | 2 November 2026. Follow the steps shown in your own Brevo account.
