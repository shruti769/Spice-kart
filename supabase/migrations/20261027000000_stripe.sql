-- Spice Kart · card, Apple Pay and Google Pay through Stripe.
-- Run in Supabase Dashboard → SQL Editor after 20261001100000_wallet.sql. Safe to re-run.
--
-- The app still places the order with place_order() (priced on the server, payment_status
-- 'pending'). Then:
--   stripe-payment (edge function)  creates a PaymentIntent for the order's total and remembers it
--                                   in orders.stripe_payment_intent; the app shows Stripe's Payment Sheet
--   stripe-webhook (edge function)  on payment_intent.succeeded / payment_failed writes a `payments`
--                                   row; payments_sync_order (admin orders.sql) marks the order paid / failed
--   release_unpaid_order()          the customer closed the sheet without paying: stripe-payment cancels the
--                                   PaymentIntent, then this cancels the order and puts its stock back

alter table public.orders add column if not exists stripe_payment_intent text unique;

-- Stripe retries webhooks: one row per PaymentIntent and outcome.
create unique index if not exists payments_provider_ref_status on public.payments (provider_ref, status);

-- Service role only (called by stripe-payment after the PaymentIntent is cancelled).
-- Returns false when the order was paid or has moved on, so it's left alone.
create or replace function public.release_unpaid_order(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id for update;
  if o.id is null or o.status <> 'placed' or o.payment_status not in ('pending', 'failed')
     or o.payment_method not in ('card', 'apple_pay', 'google_pay') then
    return false;
  end if;

  -- Put back what place_order() took (as the admin's cancel_order() does).
  update public.products p set stock_qty = p.stock_qty + i.qty
    from (select product_id, sum(qty)::int qty from public.order_items where order_id = p_id and product_id is not null group by 1) i
   where p.id = i.product_id and p.track_inventory;

  update public.orders set status = 'cancelled', cancel_reason = 'Payment not completed' where id = p_id;
  return true;
end $$;
revoke execute on function public.release_unpaid_order(uuid) from public, anon, authenticated;
grant execute on function public.release_unpaid_order(uuid) to service_role;
