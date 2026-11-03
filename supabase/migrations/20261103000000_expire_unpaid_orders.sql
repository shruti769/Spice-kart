-- Spice Kart · Card orders still unpaid after 30 minutes are cancelled and their stock goes back.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
--
--   unpaid_orders_due()     the orders to cancel, for the stripe-expire-orders function
--   expire_unpaid_tick()    every 5 minutes: calls that function when an order is due. It closes the
--                           payment in Stripe first, so nobody can pay for a cancelled order.
--   notify_order_status()   tells the customer they weren't charged when an unpaid order is cancelled

create or replace function public.unpaid_orders_due(p_limit int default 50)
returns table (id uuid, stripe_payment_intent text)
language sql stable security definer set search_path to '' as $$
  select o.id, o.stripe_payment_intent from public.orders o
   where o.status = 'placed' and o.payment_status in ('pending', 'failed')
     and o.payment_method in ('card', 'apple_pay', 'google_pay')
     and o.placed_at < now() - interval '30 minutes'
   order by o.placed_at
   limit p_limit;
$$;
revoke execute on function public.unpaid_orders_due(int) from public, anon, authenticated;
grant execute on function public.unpaid_orders_due(int) to service_role;

create or replace function public.expire_unpaid_tick() returns void
language plpgsql security definer set search_path to 'public' as $$
declare base text; secret text;
begin
  if not exists (select 1 from public.unpaid_orders_due(1)) then return; end if;
  select decrypted_secret into base   from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if base is null or secret is null then return; end if;
  perform net.http_post(
    url := rtrim(base, '/') || '/functions/v1/stripe-expire-orders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', secret),
    body := '{}'::jsonb
  );
end $$;
revoke execute on function public.expire_unpaid_tick() from public, anon, authenticated;

select cron.schedule('spicekart-expire-unpaid', '*/5 * * * *', 'select public.expire_unpaid_tick()');

create or replace function public.notify_order_status() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare t text; b text; opted boolean;
begin
  if new.status is not distinct from old.status then return new; end if;
  case new.status
    when 'confirmed'        then t := 'Order #' || new.number || ' confirmed'; b := 'We’ve got it and will start picking your groceries shortly.';
    when 'picking'          then t := 'We’re picking your groceries'; b := 'We’ve started on order #' || new.number || '.';
    when 'packed'           then t := 'Your order is packed'; b := 'Order #' || new.number || ' is packed and will be delivered soon.';
    when 'out_for_delivery' then t := 'Your order is on the way'; b := 'Order #' || new.number || ' is out for delivery.';
    when 'delivered'        then t := 'Delivered · enjoy!'; b := 'Order #' || new.number || ' has been delivered. Tap to rate your order.';
    when 'cancelled'        then
      t := 'Order #' || new.number || ' was cancelled';
      b := case when new.payment_status in ('pending', 'failed') then 'Payment wasn’t completed, so you haven’t been charged.' else 'If you were charged, the refund is on its way.' end;
    else return new;
  end case;
  select push_opt_in into opted from public.customers where id = new.customer_id;
  insert into public.customer_notifications (customer_id, order_id, kind, title, body, link, push_status)
  values (new.customer_id, new.id, 'order_update', t, b, 'order:' || new.id, case when opted then 'pending' else 'skipped' end);
  if opted then perform public.kick_push_sender(); end if;
  return new;
end $$;
