-- Spice Kart · live banner updates in the app.
-- Run in Supabase Dashboard → SQL Editor after the admin's supabase/banners.sql and
-- 20260928130000_offers_live.sql. Safe to re-run.
--
-- Bumps `app_changes` on every banner write, so the app updates as soon as an admin publishes,
-- edits, unpublishes or deletes a banner (see 20260928130000_offers_live.sql).

drop trigger if exists banners_app_change on public.banners;
create trigger banners_app_change after insert or update or delete on public.banners
  for each statement execute function public.bump_app_change();
