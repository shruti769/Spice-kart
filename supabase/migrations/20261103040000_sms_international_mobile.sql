-- Spice Kart · Delivery SMS for customers whose mobile is stored in full (+614…, +91…). Older records
-- hold nine digits after +61. Run in Supabase Dashboard → SQL Editor. Safe to re-run.

create or replace function public.messages_on_order_status() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare s public.business_settings; m text; st text;
begin
  if new.status is not distinct from old.status or new.status not in ('out_for_delivery', 'delivered') then return null; end if;
  select * into s from public.business_settings where id;
  select mobile into m from public.customers where id = new.customer_id;
  if not coalesce(s.notify_delivery_sms, false) or m is null then return null; end if;
  select name into st from public.stores where id = new.store_id;
  insert into public.outbound_messages (channel, recipient, body, kind, order_id)
  values ('sms', case when m like '+%' then m else '+61' || m end,
    coalesce(st, 'Spice Kart') || ': ' || case new.status
      when 'out_for_delivery' then 'your order #' || new.number || ' is on the way.'
      else 'your order #' || new.number || ' has been delivered. Enjoy!' end,
    'delivery_update', new.id);
  return null;
end $$;
