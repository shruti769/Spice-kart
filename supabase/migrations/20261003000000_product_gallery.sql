-- Spice Kart · more than one image per product.
-- Run in Supabase Dashboard → SQL Editor after 20260924000000_catalogue.sql. Safe to re-run.
--
--   products.gallery   extra image URLs after the main one (`image_url`), in display order.
--                      The admin's product form saves up to 5 (6 images in all); the app shows
--                      main + gallery as a swipeable carousel on the product page. Cards, cart
--                      and orders keep using `image_url`.

alter table public.products add column if not exists gallery text[] not null default '{}';

alter table public.products drop constraint if exists products_gallery_max;
alter table public.products add constraint products_gallery_max
  check (coalesce(array_length(gallery, 1), 0) <= 5);
