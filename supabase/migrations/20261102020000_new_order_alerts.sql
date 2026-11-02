-- Spice Kart · Tell the admin about new orders. The business delivers its own orders from the admin
-- panel, so there are no drivers to notify and the panel is the only place an order arrives.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run. Needs the admin's notifications.sql and
-- business_settings.sql.
--
--   business_settings.notify_admin_new_order   email the admin about each new order
--   business_settings.new_order_emails         who gets it; empty = the store's support email
--   alerts_on_new_order()                      once an order is paid: a bell alert (the admin panel
--                                              plays a sound for it) and the email
--
-- Fires on payment, not on insert: card orders exist before they're paid, and are cancelled if the
-- customer backs out of paying. Wallet orders are marked paid as they're placed.

alter table public.business_settings
  add column if not exists notify_admin_new_order boolean not null default true,
  add column if not exists new_order_emails text[] not null default '{}';

create or replace function public.alerts_on_new_order()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  s public.business_settings;
  c public.customers;
  store_email text;
  recipient text;
begin
  -- A problem here must never stop a payment being recorded or an order moving along.
  begin
    if new.status is distinct from old.status and new.status <> 'placed' then
      perform public.resolve_alert('order:new:' || new.id);
    end if;
    if new.payment_status <> 'paid' or old.payment_status is not distinct from 'paid' or new.status = 'cancelled' then
      return null;
    end if;

    select * into c from public.customers where id = new.customer_id;
    perform public.raise_alert('order:new:' || new.id, 'operations', 'info',
      'New order #' || new.number || ' · $' || to_char(new.total, 'FM999990.00'),
      coalesce(nullif(trim(c.first_name || ' ' || c.last_name), '') || ' · ', '') || new.address_line,
      'orders', 'View orders');

    select * into s from public.business_settings where id;
    if not coalesce(s.notify_admin_new_order, true) then return null; end if;
    select nullif(trim(support_email), '') into store_email from public.stores where id = new.store_id;

    foreach recipient in array case when cardinality(s.new_order_emails) > 0 then s.new_order_emails else array_remove(array[store_email], null) end loop
      insert into public.outbound_messages (channel, recipient, subject, body, kind, order_id)
      values ('email', recipient,
        'New order #' || new.number || ' · $' || to_char(new.total, 'FM999990.00'),
        'New paid order #' || new.number || E'.\n\n'
          || coalesce((select string_agg(qty || ' × ' || name || '  $' || to_char(line_total, 'FM999990.00'), E'\n' order by id)
                         from public.order_items where order_id = new.id), '')
          || E'\n\nTotal: $' || to_char(new.total, 'FM999990.00')
          || E'\nDelivery: ' || case when new.delivery_type = 'express' then 'Express' else coalesce(new.slot_label, 'Scheduled') end
          || E'\nCustomer: ' || coalesce(nullif(trim(c.first_name || ' ' || c.last_name), ''), 'Customer') || coalesce(' · ' || nullif(c.mobile, ''), '')
          || E'\nTo: ' || new.address_line
          || coalesce(E'\nDelivery note: ' || nullif(new.delivery_notes, ''), '')
          || E'\n\nOpen the admin panel to pack and deliver it.',
        'new_order_admin', new.id);
    end loop;
  exception when others then
    raise warning 'New order alert failed for %: %', new.id, sqlerrm;
  end;
  return null;
end $$;
revoke execute on function public.alerts_on_new_order() from public, anon, authenticated;

drop trigger if exists alerts_on_new_order on public.orders;
create trigger alerts_on_new_order after update of payment_status, status on public.orders
  for each row execute function public.alerts_on_new_order();

-- ─── Order updates without drivers or shoppers ───────────────────────────────────────────
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare t text; b text; opted boolean;
begin
  if new.status is not distinct from old.status then return new; end if;
  case new.status
    when 'confirmed'        then t := 'Order #' || new.number || ' confirmed'; b := 'We’ve got it and will start picking your groceries shortly.';
    when 'picking'          then t := 'We’re picking your groceries'; b := 'We’ve started on order #' || new.number || '.';
    when 'packed'           then t := 'Your order is packed'; b := 'Order #' || new.number || ' is packed and will be delivered soon.';
    when 'out_for_delivery' then t := 'Your order is on the way'; b := 'Order #' || new.number || ' is out for delivery.';
    when 'delivered'        then t := 'Delivered · enjoy!'; b := 'Order #' || new.number || ' has been delivered. Tap to rate your order.';
    when 'cancelled'        then t := 'Order #' || new.number || ' was cancelled'; b := 'If you were charged, the refund is on its way.';
    else return new;
  end case;
  select push_opt_in into opted from public.customers where id = new.customer_id;
  insert into public.customer_notifications (customer_id, order_id, kind, title, body, link, push_status)
  values (new.customer_id, new.id, 'order_update', t, b, 'order:' || new.id, case when opted then 'pending' else 'skipped' end);
  if opted then perform public.kick_push_sender(); end if;
  return new;
end $$;
