-- Spice Kart · Profile changes reach the app live, and the admin can close delivery on chosen dates.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   profiles (Realtime)             the app updates as soon as a profile changes
--   sync_customer_to_profile()      the admin edits `customers` but the app reads `profiles`: copies
--                                   the name and email across. Not the mobile, which is the login.
--   delivery_date_overrides         a closed date. closed_slot_ids empty = the whole day (express too),
--                                   otherwise only those scheduled windows.
--   orders_closed_date()            refuses orders for a closed date on the server as well

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

create or replace function public.sync_customer_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A problem here must never stop the customer row saving.
  begin
    update public.profiles
       set first_name = new.first_name, last_name = new.last_name, email = coalesce(new.email, '')
     where id = new.id
       and (first_name, last_name, email) is distinct from (new.first_name, new.last_name, coalesce(new.email, ''));
  exception when others then
    raise warning 'Could not copy customer % to their profile: %', new.id, sqlerrm;
  end;
  return null;
end $$;
revoke execute on function public.sync_customer_to_profile() from public, anon, authenticated;

drop trigger if exists sync_customer_to_profile on public.customers;
create trigger sync_customer_to_profile after update of first_name, last_name, email on public.customers
  for each row execute function public.sync_customer_to_profile();

-- The app hears about closed dates through app_changes, like the rest of the delivery settings.
drop trigger if exists delivery_date_overrides_app_change on public.delivery_date_overrides;
create trigger delivery_date_overrides_app_change after insert or update or delete on public.delivery_date_overrides
  for each statement execute function public.bump_app_change();

create or replace function public.orders_closed_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  o public.delivery_date_overrides;
  whole_day boolean;
begin
  select * into o from public.delivery_date_overrides
   where date = case when new.slot_id is null then (now() at time zone 'Australia/Melbourne')::date else new.slot_date end;
  if not found then return new; end if;
  whole_day := coalesce(cardinality(o.closed_slot_ids), 0) = 0;
  if new.slot_id is null then
    if whole_day then raise exception 'store_closed' using errcode = 'P0001'; end if;
  elsif whole_day or new.slot_id = any (o.closed_slot_ids) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists orders_closed_date on public.orders;
create trigger orders_closed_date before insert on public.orders
  for each row execute function public.orders_closed_date();
