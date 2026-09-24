-- Spice Kart · coupons managed in the admin panel and applied in the app's cart / checkout.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[A-Z0-9_-]{3,20}$'),
  title           text not null check (length(trim(title)) > 0),
  description     text not null default '',
  -- flat: `value` dollars off · percent: `value`% off · free_delivery: delivery fee waived
  discount_type   text not null check (discount_type in ('flat', 'percent', 'free_delivery')),
  value           numeric(10, 2) not null default 0 check (value >= 0),
  max_discount    numeric(10, 2) check (max_discount is null or max_discount > 0),
  min_spend       numeric(10, 2) not null default 0 check (min_spend >= 0),
  -- Optional: only items in this category count towards the discount (and the minimum spend).
  category_id     text references public.categories (id) on update cascade on delete set null,
  starts_at       timestamptz,
  ends_at         timestamptz,
  active          boolean not null default true,
  sort            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount_type <> 'percent' or (value > 0 and value <= 100)),
  check (discount_type <> 'flat' or value > 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists coupons_active_idx on public.coupons (active, sort);

drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch before update on public.coupons
  for each row execute function public.touch_updated_at();

alter table public.coupons enable row level security;

-- The app sees coupons that are switched on and inside their date window; admins see all.
drop policy if exists "live coupons are public" on public.coupons;
create policy "live coupons are public" on public.coupons for select to anon, authenticated
  using (
    (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );

drop policy if exists "admins insert coupons" on public.coupons;
create policy "admins insert coupons" on public.coupons for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update coupons" on public.coupons;
create policy "admins update coupons" on public.coupons for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete coupons" on public.coupons;
create policy "admins delete coupons" on public.coupons for delete to authenticated using ((select public.is_admin()));

-- Realtime so the app's Offers screen and cart update when an admin changes a coupon.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'coupons') then
    alter publication supabase_realtime add table public.coupons;
  end if;
end $$;
