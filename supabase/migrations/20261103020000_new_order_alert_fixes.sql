-- Spice Kart · Two fixes to the admin's new-order alert and email.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   Wallet orders    are paid before place_order() adds the line items, so the email listed none.
--                    The trigger now waits for the end of the transaction.
--   Failed refunds   can put an order back to paid. That no longer looks like a new order.

create or replace function public.alerts_on_new_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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
    if new.payment_status <> 'paid' or new.status = 'cancelled'
       or old.payment_status is not distinct from 'paid' or old.payment_status in ('partially_refunded', 'refunded') then
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
create constraint trigger alerts_on_new_order after update of payment_status, status on public.orders
  deferrable initially deferred for each row execute function public.alerts_on_new_order();
