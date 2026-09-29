-- Spice Kart · placing orders from the app's checkout.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Needs the admin panel's spice-kart-admin/supabase/orders.sql (customers, orders, order_items)
-- and this repo's profiles migration.
--
-- The app calls `place_order()` instead of inserting rows itself: it re-prices the cart from
-- `products`, `delivery_settings`, `delivery_slots` and `coupons` on the server, checks stock and
-- slot capacity, and writes the customer, order, items and stock change in one transaction.
-- Payment is not captured yet: every order starts with payment_status = 'pending'.
--
-- p_items: [{"product_id": "<uuid>", "qty": 2}, …]. p_slot_id null = express delivery.
-- p_payment: the app's label ('Card', 'Apple Pay', 'Google Pay', 'PayID').
-- Errors (the exception message): not_signed_in, empty_cart, bad_quantity, no_address,
-- bad_payment, product_unavailable, out_of_stock:<product name>, slot_unavailable, slot_full.
create or replace function public.place_order(
  p_items          jsonb,
  p_address_label  text,
  p_address_line   text,
  p_payment        text,
  p_slot_id        uuid default null,
  p_delivery_date  date default null,
  p_coupon         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_now       timestamp := now() at time zone 'Australia/Melbourne';
  v_method    text;
  v_lines     jsonb;
  v_count     int;
  v_bad_qty   boolean;
  v_found     int := 0;
  v_item      record;
  v_settings  public.delivery_settings;
  v_slot      public.delivery_slots;
  v_label     text;
  v_promised  timestamptz;
  v_coupon    public.coupons;
  v_subtotal  numeric(10, 2) := 0;
  v_eligible  numeric(10, 2);
  v_discount  numeric(10, 2) := 0;
  v_delivery  numeric(10, 2);
  v_order     public.orders;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if coalesce(trim(p_address_line), '') = '' then raise exception 'no_address'; end if;
  v_method := case p_payment when 'Card' then 'card' when 'Apple Pay' then 'apple_pay' when 'Google Pay' then 'google_pay' when 'PayID' then 'payid' end;
  if v_method is null then raise exception 'bad_payment'; end if;

  -- One line per product.
  select jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty)), count(*), bool_or(qty is null or qty < 1 or qty > 99)
    into v_lines, v_count, v_bad_qty
  from (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  ) l;
  if v_bad_qty then raise exception 'bad_quantity'; end if;

  -- Lock the products so two orders can't both take the last unit.
  for v_item in
    select p.name, p.price, p.published, p.track_inventory, p.stock_qty, l.qty
    from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
    join public.products p on p.id = l.product_id
    order by p.id
    for update of p
  loop
    v_found := v_found + 1;
    if not v_item.published then raise exception 'product_unavailable'; end if;
    if v_item.track_inventory and v_item.stock_qty < v_item.qty then
      raise exception 'out_of_stock:%', v_item.name;
    end if;
    v_subtotal := v_subtotal + v_item.price * v_item.qty;
  end loop;
  if v_found <> v_count then raise exception 'product_unavailable'; end if;

  -- Delivery fee (same rules as the app's cart): express, or a bookable scheduled slot.
  select * into v_settings from public.delivery_settings where id = 1;
  if p_slot_id is null then
    v_delivery := v_settings.express_fee;
    v_promised := now() + make_interval(mins => v_settings.express_eta_minutes);
  else
    -- Locking the slot serialises capacity checks for it.
    select * into v_slot from public.delivery_slots where id = p_slot_id and active for update;
    if not found
      or p_delivery_date is null
      or p_delivery_date < v_now::date
      or p_delivery_date > v_now::date + v_settings.book_ahead_days
      or v_slot.weekday <> (array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])[extract(isodow from p_delivery_date)::int]
      or p_delivery_date + make_interval(mins => v_slot.start_min - v_settings.cutoff_minutes) <= v_now
    then
      raise exception 'slot_unavailable';
    end if;
    if (select count(*) from public.orders
        where slot_id = p_slot_id and slot_date = p_delivery_date and status <> 'cancelled') >= v_slot.capacity then
      raise exception 'slot_full';
    end if;
    v_delivery := coalesce(v_slot.fee, v_settings.scheduled_fee);
    -- "Tue 30 Sep · 9:00 – 11:00", 12-hour like the app.
    v_label := to_char(p_delivery_date, 'Dy FMDD Mon') || ' · '
      || ((v_slot.start_min / 60 + 11) % 12 + 1) || ':' || lpad((v_slot.start_min % 60)::text, 2, '0') || ' – '
      || ((v_slot.end_min / 60 + 11) % 12 + 1) || ':' || lpad((v_slot.end_min % 60)::text, 2, '0');
    v_promised := (p_delivery_date + make_interval(mins => v_slot.end_min)) at time zone 'Australia/Melbourne';
  end if;
  if v_subtotal >= v_settings.free_delivery_over then v_delivery := 0; end if;

  -- Coupon (same rules as the app's applyCouponRules). One that doesn't apply is simply dropped.
  if nullif(trim(p_coupon), '') is not null then
    select * into v_coupon from public.coupons
    where code = trim(p_coupon) and active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
    if found then
      if v_coupon.category_id is null then
        v_eligible := v_subtotal;
      else
        select coalesce(sum(p.price * l.qty), 0) into v_eligible
        from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
        join public.products p on p.id = l.product_id
        where p.category_id = v_coupon.category_id;
      end if;
      if v_eligible > 0 and v_eligible >= v_coupon.min_spend then
        if v_coupon.discount_type = 'flat' then
          v_discount := least(v_coupon.value, v_eligible);
        elsif v_coupon.discount_type = 'percent' then
          v_discount := round(v_eligible * v_coupon.value) / 100;
          if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
        elsif v_delivery > 0 then
          v_delivery := 0;
        else
          v_coupon := null;
        end if;
      else
        v_coupon := null;
      end if;
    end if;
  end if;

  -- The admin panel's customer record, kept in step with the app's personal details.
  insert into public.customers (id, first_name, last_name, email, mobile)
  select v_uid, coalesce(left(p.first_name, 60), ''), coalesce(left(p.last_name, 60), ''), nullif(p.email, ''), nullif(p.mobile, '')
  from (select v_uid as id) u left join public.profiles p on p.id = u.id
  on conflict (id) do update set
    first_name = coalesce(nullif(excluded.first_name, ''), public.customers.first_name),
    last_name  = coalesce(nullif(excluded.last_name, ''), public.customers.last_name),
    email      = coalesce(excluded.email, public.customers.email),
    mobile     = coalesce(excluded.mobile, public.customers.mobile);

  insert into public.orders (
    customer_id, delivery_type, slot_id, slot_date, slot_label, promised_by,
    address_line, address_area, postcode,
    subtotal, delivery_fee, handling_fee, discount, total, coupon_code, payment_method
  ) values (
    v_uid, case when p_slot_id is null then 'express' else 'scheduled' end,
    p_slot_id, case when p_slot_id is null then null else p_delivery_date end, v_label, v_promised,
    trim(p_address_line), coalesce(trim(p_address_label), ''), substring(trim(p_address_line) from '(\d{4})$'),
    v_subtotal, v_delivery, v_settings.handling_fee, v_discount,
    v_subtotal - v_discount + v_delivery + v_settings.handling_fee, v_coupon.code, v_method
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, image_url, qty, unit_price)
  select v_order.id, p.id, p.name, p.image_url, l.qty, p.price
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
  join public.products p on p.id = l.product_id;

  update public.products p set stock_qty = p.stock_qty - l.qty
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty int)
  where p.id = l.product_id and p.track_inventory;

  return jsonb_build_object('id', v_order.id, 'number', v_order.number, 'total', v_order.total);
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, uuid, date, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, uuid, date, text) to authenticated;

-- Orders go only through place_order(): drop the admin schema's direct-insert policies, which let
-- a customer write an order with any price or total (also removed from the admin's orders.sql).
drop policy if exists "Customers place orders" on public.orders;
drop policy if exists "Customers add own order items" on public.order_items;
-- Likewise payments: a customer-written 'succeeded' row would mark their order paid. Payments are
-- recorded by the server (payment provider webhook) or an admin.
drop policy if exists "Customers record own payments" on public.payments;
