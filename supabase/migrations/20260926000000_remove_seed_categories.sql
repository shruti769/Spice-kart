-- Spice Kart · remove the placeholder categories; admins create every category themselves.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

-- Delete the 17 seeded categories (their sub-categories go with them via ON DELETE CASCADE).
-- A category that already has products is kept, so no product is orphaned.
delete from public.categories c
where c.id in ('dairy', 'bakery', 'produce', 'flours', 'pulses', 'spice', 'grains', 'oil', 'snack',
               'instant', 'tea', 'condiments', 'sweeteners', 'frozen', 'fasting', 'general', 'pooja')
  and not exists (select 1 from public.products p where p.category_id = c.id);

-- New categories get a soft default tile colour (the admin form picks one automatically).
alter table public.categories alter column bg_color set default '#F1F5EA';

-- Category icons may be SVG (the Add category form accepts PNG, SVG or WebP).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
where id = 'product-images';
