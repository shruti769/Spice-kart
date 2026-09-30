-- Spice Kart · Privacy & data screen (Profile → Privacy & data).
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Needs the admin panel's orders.sql, notifications.sql, business_settings.sql and support.sql.
--
--   customers.push_opt_in       Push notifications toggle (order updates; the admin's send-push reads it)
--   customers.email_opt_in      Email updates toggle (order confirmation emails)
--   customers.marketing_opt_in  Marketing & offers toggle (promotional campaigns)
--   products.sensitive          personal-care items the app blurs in orders ("Hide sensitive items")
--   request_my_data()           Download personal data: emails the customer a copy of their data
--   delete_my_account()         Delete account: removes the customer, their orders, chats and profile

alter table public.customers add column if not exists email_opt_in boolean not null default true;

-- Set in the admin's product form; the app blurs these in order lists when the customer asks.
alter table public.products add column if not exists sensitive boolean not null default false;

-- ─── Push tokens ─────────────────────────────────────────────────────────────────────────
-- The app registers this phone's Expo push token for the signed-in customer (creating their
-- `customers` row if they haven't ordered yet). A token left by an earlier account on the same
-- phone moves to this one, which RLS alone wouldn't allow.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  insert into public.customers (id) values (v_uid) on conflict (id) do nothing;
  insert into public.push_tokens (token, customer_id, platform)
  values (p_token, v_uid, p_platform)
  on conflict (token) do update set customer_id = v_uid, platform = excluded.platform, last_seen_at = now();
end $$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- ─── Download personal data ──────────────────────────────────────────────────────────────
-- Queues an email (outbound_messages → send-push → Resend) with the customer's profile, orders
-- and support chats, to the email in Personal details. Once a day at most.
-- Returns 'queued'. Errors: not_signed_in, no_email, already_requested.
create or replace function public.request_my_data()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_data  jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  select nullif(trim(email), '') into v_email from public.profiles where id = v_uid;
  if v_email is null then raise exception 'no_email'; end if;
  if exists (select 1 from public.outbound_messages
             where kind = 'data_export' and recipient = v_email and created_at > now() - interval '1 day') then
    raise exception 'already_requested';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'email', p.email,
                  'mobile', p.mobile, 'date_of_birth', p.dob, 'photo', p.avatar_url, 'created_at', p.created_at)
                from public.profiles p where p.id = v_uid),
    'preferences', (select jsonb_build_object('push_notifications', c.push_opt_in, 'email_updates', c.email_opt_in,
                      'marketing', c.marketing_opt_in)
                    from public.customers c where c.id = v_uid),
    'orders', coalesce((select jsonb_agg(jsonb_build_object(
                  'number', o.number, 'status', o.status, 'placed_at', o.placed_at, 'delivery', o.delivery_type,
                  'address', o.address_line, 'total', o.total, 'payment_method', o.payment_method,
                  'items', (select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'line_total', i.line_total) order by i.id)
                            from public.order_items i where i.order_id = o.id))
                order by o.placed_at desc)
                from public.orders o where o.customer_id = v_uid), '[]'::jsonb),
    'support_chats', coalesce((select jsonb_agg(jsonb_build_object(
                  'number', t.number, 'subject', t.subject, 'status', t.status, 'created_at', t.created_at,
                  'messages', (select jsonb_agg(jsonb_build_object('from', m.sender, 'at', m.created_at, 'text', m.body) order by m.created_at)
                               from public.support_messages m where m.ticket_id = t.id and not m.internal))
                order by t.created_at desc)
                from public.support_tickets t where t.customer_id = v_uid), '[]'::jsonb)
  ) into v_data;

  insert into public.outbound_messages (channel, recipient, subject, body, kind)
  values ('email', v_email, 'Your Spice Kart data',
    E'Hi,\n\nHere is a copy of the personal data Spice Kart holds about you, as you asked from the app.\n\n'
      || jsonb_pretty(v_data)
      || E'\n\nIf you didn’t ask for this, contact support in the app.\n\nSpice Kart',
    'data_export');
  perform public.kick_push_sender();
  return 'queued';
end $$;
revoke execute on function public.request_my_data() from public, anon;
grant execute on function public.request_my_data() to authenticated;

-- ─── Delete account ──────────────────────────────────────────────────────────────────────
-- Deletes the signed-in customer's orders (items, payments, refunds and status history cascade),
-- then their Auth user, which cascades to profiles, customers, push tokens, inbox, reviews and
-- support chats. The app removes the profile photo itself before calling this.
-- Errors: not_signed_in, admin_account, active_order (an order is still on its way).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.admins where user_id = v_uid) then raise exception 'admin_account'; end if;
  if exists (select 1 from public.orders where customer_id = v_uid and status not in ('delivered', 'cancelled')) then
    raise exception 'active_order';
  end if;
  delete from public.orders where customer_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
