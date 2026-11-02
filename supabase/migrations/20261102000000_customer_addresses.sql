-- Spice Kart · Saved delivery addresses, kept with the account so they survive log out and a new phone.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   customer_addresses       one row per saved address; customers can only see and change their own
--   set_default_address()    makes one address the default, in one statement, so there's never two
--
-- Deleting an account removes its addresses (delete_my_account deletes the auth user).

create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tag         text not null check (char_length(tag) <= 5),
  label       text not null check (char_length(label) <= 40),
  line        text not null check (char_length(line) between 1 and 300),
  area        text not null default '' check (char_length(area) <= 120),
  lat         double precision,
  lng         double precision,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses (customer_id, created_at);

alter table public.customer_addresses enable row level security;

revoke all on public.customer_addresses from public, anon;
grant select, insert, update, delete on public.customer_addresses to authenticated;

drop policy if exists "Customers manage own addresses" on public.customer_addresses;
create policy "Customers manage own addresses" on public.customer_addresses for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create or replace function public.set_default_address(p_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.customer_addresses set is_default = (id = p_id) where customer_id = (select auth.uid());
$$;
revoke execute on function public.set_default_address(uuid) from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;
