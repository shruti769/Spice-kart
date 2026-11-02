-- Spice Kart · Delivery instructions, and saved addresses that update live on the customer's other phones.
-- Run in Supabase Dashboard → SQL Editor, after customer_addresses. Safe to re-run.
--
--   customer_addresses.notes     the address's delivery instructions
--   set_order_delivery_note()    copies them onto the customer's new order (the admin's order page shows
--                                orders.delivery_notes). Separate from place_order so a problem here can
--                                never stop an order going through.
--   Realtime                     replica identity full lets the app's customer filter catch deletes too

alter table public.customer_addresses add column if not exists notes text not null default '' check (char_length(notes) <= 300);

alter table public.customer_addresses replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_addresses') then
    alter publication supabase_realtime add table public.customer_addresses;
  end if;
end $$;

create or replace function public.set_order_delivery_note(p_order uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  update public.orders
     set delivery_notes = left(trim(p_note), 300)
   where id = p_order and customer_id = (select auth.uid()) and status = 'placed';
  if not found then raise exception 'order_not_found'; end if;
end $$;
revoke execute on function public.set_order_delivery_note(uuid, text) from public, anon;
grant execute on function public.set_order_delivery_note(uuid, text) to authenticated;
