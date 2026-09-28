-- Spice Kart · Offers screen tiles managed in the admin panel, and instant app updates.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- 1. `offer_tiles`: the app's "Shop the deals" tiles and "Bank & payment offers" rows
--    (Admin → Offers & Promotions → Offers screen).
-- 2. `app_changes`: one row per table, bumped by a trigger on every write. Realtime only sends the
--    app changes to rows it can read, so hiding a product / category / coupon / slot used to go
--    unnoticed until the app was reopened. The app listens to this table instead.
-- 3. `next_offer_change()`: when the next coupon or tile starts or ends, so the app can refresh
--    exactly then.

-- ─── 1. Offer tiles ─────────────────────────────────────────────────────────────────────
create table if not exists public.offer_tiles (
  id           uuid primary key default gen_random_uuid(),
  -- deal: image tile under "Shop the deals" · bank: row under "Bank & payment offers"
  kind         text not null check (kind in ('deal', 'bank')),
  -- `{free_delivery_over}` is replaced with the live free-delivery threshold, e.g. "$50".
  title        text not null check (length(trim(title)) > 0),
  subtitle     text not null default '',
  -- deal: tile artwork; `asset:<name>` = artwork bundled with the app.
  image_url    text,
  -- deal: category opened on tap (null = the Categories tab).
  category_id  text references public.categories (id) on update cascade on delete set null,
  -- bank: icon and the small pill on the right, e.g. "Auto", "Always on".
  icon         text not null default 'card' check (icon in ('card', 'wallet')),
  badge        text not null default '',
  starts_at    timestamptz,
  ends_at      timestamptz,
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists offer_tiles_kind_idx on public.offer_tiles (kind, sort);

drop trigger if exists offer_tiles_touch on public.offer_tiles;
create trigger offer_tiles_touch before update on public.offer_tiles
  for each row execute function public.touch_updated_at();

alter table public.offer_tiles enable row level security;

drop policy if exists "live offer tiles are public" on public.offer_tiles;
create policy "live offer tiles are public" on public.offer_tiles for select to anon, authenticated
  using (
    (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );
drop policy if exists "admins insert offer tiles" on public.offer_tiles;
create policy "admins insert offer tiles" on public.offer_tiles for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update offer tiles" on public.offer_tiles;
create policy "admins update offer tiles" on public.offer_tiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete offer tiles" on public.offer_tiles;
create policy "admins delete offer tiles" on public.offer_tiles for delete to authenticated using ((select public.is_admin()));

-- Seed with what the app showed before (only when the table is empty).
insert into public.offer_tiles (kind, title, subtitle, image_url, category_id, icon, badge, sort)
select v.kind, v.title, v.subtitle, v.image_url,
       (select id from public.categories where id = v.category_id), v.icon, v.badge, v.sort
from (values
  ('deal', 'Fresh vegetables', 'Min spend $25', 'asset:vegetables', 'produce', 'card', '', 1),
  ('deal', 'Your first order', 'Applied automatically at checkout', 'asset:first-order', 'produce', 'card', '', 2),
  ('deal', 'Selected pantry essentials', 'Rice, pasta and pulses', 'asset:pantry', 'grains', 'card', '', 3),
  ('deal', 'Milk & dairy', 'Before 10am daily', 'asset:dairy', 'dairy', 'card', '', 4),
  ('deal', 'Orders over {free_delivery_over}', 'Every day, all suburbs', 'asset:delivery', 'produce', 'card', '', 5),
  ('deal', 'Spice Kart Select spices', 'Our own small-batch blends', 'asset:spices', 'spice', 'card', '', 6),
  ('bank', '10% off with Visa cards', 'Max $12 · min spend $40', null, null, 'card', 'Auto', 1),
  ('bank', '5% back to Spice Kart Money', 'On every PayID order', null, null, 'wallet', 'Always on', 2)
) as v(kind, title, subtitle, image_url, category_id, icon, badge, sort)
where not exists (select 1 from public.offer_tiles);

-- ─── 2. Change feed ─────────────────────────────────────────────────────────────────────
create table if not exists public.app_changes (
  table_name  text primary key,
  changed_at  timestamptz not null default now()
);

alter table public.app_changes enable row level security;
drop policy if exists "app changes are public" on public.app_changes;
create policy "app changes are public" on public.app_changes for select to anon, authenticated using (true);

-- Runs as the owner so admin writes can bump the feed (nobody can write it directly).
create or replace function public.bump_app_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_changes (table_name, changed_at) values (tg_table_name, now())
  on conflict (table_name) do update set changed_at = excluded.changed_at;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['products', 'categories', 'subcategories', 'coupons', 'delivery_settings', 'delivery_slots', 'offer_tiles', 'banners'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_app_change', t);
      execute format('create trigger %I after insert or update or delete on public.%I for each statement execute function public.bump_app_change()', t || '_app_change', t);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_changes') then
    alter publication supabase_realtime add table public.app_changes;
  end if;
end $$;

-- ─── 3. Next scheduled start / end ──────────────────────────────────────────────────────
-- Only reveals a timestamp, never which coupon or tile it belongs to.
create or replace function public.next_offer_change() returns timestamptz
language sql stable security definer set search_path = public as $$
  select min(t) from (
    select starts_at as t from public.coupons where active and starts_at > now()
    union all select ends_at from public.coupons where active and ends_at > now()
    union all select starts_at from public.offer_tiles where active and starts_at > now()
    union all select ends_at from public.offer_tiles where active and ends_at > now()
  ) x;
$$;

grant execute on function public.next_offer_change() to anon, authenticated;
