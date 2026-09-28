-- Spice Kart · delivery fees, express ETA and scheduled delivery slots, managed in the admin panel
-- (Settings → Delivery / Scheduled delivery slots) and used by the app's cart and checkout.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

-- ─── Store-wide delivery settings (a single row, id = 1) ─────────────────────────────────
create table if not exists public.delivery_settings (
  id                   int primary key default 1 check (id = 1),
  express_fee          numeric(10, 2) not null default 3.99 check (express_fee >= 0),
  express_eta_minutes  int not null default 25 check (express_eta_minutes between 1 and 600),
  -- Fee for a scheduled slot that has no fee of its own.
  scheduled_fee        numeric(10, 2) not null default 2.99 check (scheduled_fee >= 0),
  handling_fee         numeric(10, 2) not null default 0.99 check (handling_fee >= 0),
  -- Delivery (express or scheduled) is free when the item total reaches this amount.
  free_delivery_over   numeric(10, 2) not null default 50 check (free_delivery_over >= 0),
  -- Customers can book dates from today up to `book_ahead_days` days ahead (today included).
  book_ahead_days      int not null default 7 check (book_ahead_days between 1 and 60),
  -- A slot stops being bookable this many minutes before it starts.
  cutoff_minutes       int not null default 60 check (cutoff_minutes between 0 and 1440),
  updated_at           timestamptz not null default now()
);

insert into public.delivery_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists delivery_settings_touch on public.delivery_settings;
create trigger delivery_settings_touch before update on public.delivery_settings
  for each row execute function public.touch_updated_at();

-- ─── Weekly slots: repeat every week on `weekday` ───────────────────────────────────────
create table if not exists public.delivery_slots (
  id          uuid primary key default gen_random_uuid(),
  weekday     text not null check (weekday in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  -- Minutes from midnight, store local time (Australia/Melbourne).
  start_min   int not null check (start_min between 0 and 1439),
  end_min     int not null check (end_min between 1 and 1440),
  capacity    int not null default 20 check (capacity >= 1),
  -- null = use delivery_settings.scheduled_fee
  fee         numeric(10, 2) check (fee is null or fee >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_min > start_min)
);

create index if not exists delivery_slots_day_idx on public.delivery_slots (weekday, start_min);

drop trigger if exists delivery_slots_touch on public.delivery_slots;
create trigger delivery_slots_touch before update on public.delivery_slots
  for each row execute function public.touch_updated_at();

-- ─── RLS: everyone reads, admins write ──────────────────────────────────────────────────
alter table public.delivery_settings enable row level security;
alter table public.delivery_slots enable row level security;

drop policy if exists "delivery settings are public" on public.delivery_settings;
create policy "delivery settings are public" on public.delivery_settings for select to anon, authenticated using (true);
drop policy if exists "admins update delivery settings" on public.delivery_settings;
create policy "admins update delivery settings" on public.delivery_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "delivery slots are public" on public.delivery_slots;
create policy "delivery slots are public" on public.delivery_slots for select to anon, authenticated
  using (active or (select public.is_admin()));
drop policy if exists "admins insert delivery slots" on public.delivery_slots;
create policy "admins insert delivery slots" on public.delivery_slots for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admins update delivery slots" on public.delivery_slots;
create policy "admins update delivery slots" on public.delivery_slots for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins delete delivery slots" on public.delivery_slots;
create policy "admins delete delivery slots" on public.delivery_slots for delete to authenticated using ((select public.is_admin()));

-- Realtime so the app's cart and checkout update when an admin changes fees or slots.
do $$
declare t text;
begin
  foreach t in array array['delivery_settings', 'delivery_slots'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
