-- Spice Kart · The "order confirmed" email goes out once the order is paid, not when it's created.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

drop trigger if exists messages_on_order_insert on public.orders;
drop function if exists public.messages_on_order_insert();

create or replace function public.messages_on_order_paid() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare o public.orders; s public.business_settings; c public.customers; st text;
begin
  -- A problem here must never stop a payment being recorded.
  begin
    select * into o from public.orders where id = new.id;
    if o.status = 'cancelled' or o.payment_status <> 'paid' then return null; end if;
    -- A failed refund can put an order back to paid: it was already confirmed.
    if exists (select 1 from public.outbound_messages where order_id = o.id and kind = 'order_confirmation') then return null; end if;
    select * into s from public.business_settings where id;
    select * into c from public.customers where id = o.customer_id;
    if not coalesce(s.notify_order_email, false) or c.email is null or not c.email_opt_in then return null; end if;
    select name into st from public.stores where id = o.store_id;
    insert into public.outbound_messages (channel, recipient, subject, body, kind, order_id)
    values ('email', c.email, 'Your ' || coalesce(st, 'Spice Kart') || ' order #' || o.number || ' is confirmed',
      'Hi ' || coalesce(nullif(c.first_name, ''), 'there') || E',\n\nThanks for your order #' || o.number || E'.\n\n'
        || coalesce((select string_agg(qty || ' × ' || name || '  $' || to_char(line_total, 'FM999990.00'), E'\n' order by id)
                       from public.order_items where order_id = o.id), '')
        || E'\n\nTotal: $' || to_char(o.total, 'FM999990.00')
        || E'\nDelivery: ' || case when o.delivery_type = 'express' then 'Express' else coalesce(o.slot_label, 'Scheduled') end
        || E'\nTo: ' || o.address_line || E'\n\n' || coalesce(st, 'Spice Kart'),
      'order_confirmation', o.id);
  exception when others then
    raise warning 'Order confirmation failed for %: %', new.id, sqlerrm;
  end;
  return null;
end $$;

-- Deferred to the end of the transaction: a wallet order is paid before place_order() adds the line items.
drop trigger if exists messages_on_order_paid on public.orders;
create constraint trigger messages_on_order_paid after update of payment_status on public.orders
  deferrable initially deferred for each row
  when (new.payment_status = 'paid' and old.payment_status is distinct from 'paid')
  execute function public.messages_on_order_paid();
