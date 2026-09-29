-- Spice Kart · catalogue backend (categories, products, product images, admin access).
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run: every statement is idempotent.
--
-- ⚠ Don't re-run after the admin panel's spice-kart-admin/supabase/business_settings.sql: that
--   file replaces public.is_admin() (adding 2FA / IP-allowlist checks) and this one would put the
--   simpler version below back.
--
-- Access model
--   • Customer app (publishable key, not signed in): can READ published products and categories.
--   • Admin panel: signs in with Supabase Auth; users listed in public.admins can add/edit/delete.
--   • Nobody can write with just the publishable key.

-- ─── Categories ───────────────────────────────
create table if not exists public.categories (
  id         text primary key,
  name       text not null,
  short_name text not null,
  sort       int  not null default 0
);

-- Categories are created by admins in the admin panel (no seed data).

-- Sub-categories drive the category sidebar in the app (names must match exactly).
create table if not exists public.subcategories (
  category_id text not null references public.categories (id) on delete cascade,
  name        text not null,
  sort        int  not null default 0,
  primary key (category_id, name)
);

-- Sub-categories are added per category in the admin panel.

-- ─── Admins ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- True when the signed-in user is an admin. SECURITY DEFINER so policies can call it
-- without granting everyone read access to the admins table.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ─── Products ───────────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  brand             text not null default '',
  sku               text unique,
  barcode           text,
  category_id       text not null references public.categories (id),
  subcategory       text,
  description       text not null default '',
  price             numeric(10, 2) not null check (price >= 0),
  compare_at_price  numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price        numeric(10, 2) check (cost_price is null or cost_price >= 0),
  stock_qty         int not null default 0,
  min_stock         int,
  max_stock         int,
  warehouse         text,
  weight            text not null default '',
  unit              text,
  size              text,
  country_of_origin text,
  ingredients       text,
  storage           text,
  attributes        text[] not null default '{}',
  image_url         text,
  express_delivery  boolean not null default true,
  scheduled_delivery boolean not null default true,
  track_inventory   boolean not null default true,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id) where published;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────────────────
alter table public.categories    enable row level security;
alter table public.subcategories enable row level security;
alter table public.admins        enable row level security;
alter table public.products      enable row level security;

drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories for select to anon, authenticated using (true);

drop policy if exists "subcategories are public" on public.subcategories;
create policy "subcategories are public" on public.subcategories for select to anon, authenticated using (true);

-- Admins can see their own row (lets the admin panel confirm access after sign-in).
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "published products are public" on public.products;
create policy "published products are public" on public.products for select to anon, authenticated
  using (published or (select public.is_admin()));

drop policy if exists "admins insert products" on public.products;
create policy "admins insert products" on public.products for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products for delete to authenticated using ((select public.is_admin()));

-- ─── Product images (public bucket; only admins can upload / replace / delete) ───────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ─── Realtime: the app live-updates when an admin adds or edits a product ───────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

-- ─── Make yourself an admin ─────────────────────────────────────────────────────────────
-- 1. Dashboard → Authentication → Users → "Add user" (email + password, auto-confirm).
-- 2. Run (with that email):
--    insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com'
--    on conflict do nothing;
