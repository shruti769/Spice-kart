-- Spice Kart · The store is in Gatton, Queensland: store hours, delivery slots, "today" for banners,
-- announcements and collections, and the admin's daily figures follow Brisbane time (no daylight
-- saving) instead of Melbourne. There is no Express delivery: emails call it Standard delivery.
-- Generated from the live definitions with only those two changes. Safe to re-run.

CREATE OR REPLACE FUNCTION public.store_is_open(p_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare h jsonb; local timestamp := p_at at time zone 'Australia/Brisbane';
        day text := (array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])[extract(isodow from local)::int];
begin
  select hours into h from public.business_settings where id;
  if h is null or h = '{}'::jsonb then return true; end if;
  return exists (
    select 1 from jsonb_array_elements(coalesce(h -> day, '[]'::jsonb)) w
     where local::time >= (w ->> 'open')::time and local::time < (w ->> 'close')::time
  );
end $function$;

CREATE OR REPLACE FUNCTION public.admin_daily_series(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(day date, orders integer, revenue numeric, new_customers integer, total_customers integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
    select g::date,
           (select count(*)::int from public.orders o where (o.placed_at at time zone 'Australia/Brisbane')::date = g::date and o.status <> 'cancelled'),
           (select coalesce(sum(o.total), 0) from public.orders o where (o.placed_at at time zone 'Australia/Brisbane')::date = g::date and o.status <> 'cancelled'),
           (select count(*)::int from public.customers c where (c.created_at at time zone 'Australia/Brisbane')::date = g::date),
           (select count(*)::int from public.customers c where (c.created_at at time zone 'Australia/Brisbane')::date <= g::date)
      from generate_series((p_from at time zone 'Australia/Brisbane')::date,
                           ((p_to - interval '1 microsecond') at time zone 'Australia/Brisbane')::date, interval '1 day') g;
end $function$;

CREATE OR REPLACE FUNCTION public.payment_summary(p_day date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d date := coalesce(p_day, (now() at time zone 'Australia/Brisbane')::date); r jsonb;
        t0 timestamptz; t1 timestamptz;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  t0 := d::timestamp at time zone 'Australia/Brisbane'; t1 := (d + 1)::timestamp at time zone 'Australia/Brisbane';
  select jsonb_build_object(
    'revenue', coalesce(sum(amount) filter (where status = 'succeeded'), 0) - coalesce(sum(amount) filter (where status = 'refunded'), 0),
    'succeeded', count(*) filter (where status = 'succeeded'),
    'failed', count(*) filter (where status = 'failed'),
    'refunded_amount', coalesce(sum(amount) filter (where status = 'refunded'), 0),
    'refunds', count(*) filter (where status = 'refunded'),
    'prev_revenue', (select coalesce(sum(amount) filter (where status = 'succeeded'), 0) - coalesce(sum(amount) filter (where status = 'refunded'), 0)
                       from public.payments where created_at >= t0 - interval '1 day' and created_at < t0)
  ) into r from public.payments where created_at >= t0 and created_at < t1;
  return r || jsonb_build_object('pending', (select count(*) from public.orders where payment_status = 'pending' and status <> 'cancelled'));
end $function$;

CREATE OR REPLACE FUNCTION public.place_order(p_items jsonb, p_address_label text, p_address_line text, p_payment text, p_slot_id uuid DEFAULT NULL::uuid, p_delivery_date date DEFAULT NULL::date, p_coupon text DEFAULT NULL::text, p_delivery_location jsonb DEFAULT NULL::jsonb, p_device_location jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid       uuid := (select auth.uid());
  v_now       timestamp := now() at time zone 'Australia/Brisbane';
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
  v_postcode  text := substring(trim(p_address_line) from '(\d{4})$');
  v_dlat      double precision;
  v_dlng      double precision;
  v_olat      double precision;
  v_olng      double precision;
  v_oacc      real;
  v_oat       timestamptz;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if coalesce(trim(p_address_line), '') = '' then raise exception 'no_address'; end if;
  v_method := case p_payment when 'Card' then 'card' when 'Apple Pay' then 'apple_pay' when 'Google Pay' then 'google_pay' when 'PayID' then 'payid' when 'Spice Kart Money' then 'wallet' end;
  if v_method is null then raise exception 'bad_payment'; end if;
  if not public.delivers_to(v_postcode) then raise exception 'not_deliverable:%', coalesce(v_postcode, ''); end if;

  -- Map pins are optional extras: anything malformed or out of range is simply not stored.
  begin
    v_dlat := (p_delivery_location ->> 'lat')::double precision;
    v_dlng := (p_delivery_location ->> 'lng')::double precision;
  exception when others then v_dlat := null; v_dlng := null;
  end;
  if v_dlat is null or v_dlng is null or v_dlat not between -90 and 90 or v_dlng not between -180 and 180 then
    v_dlat := null; v_dlng := null;
  end if;
  begin
    v_olat := (p_device_location ->> 'lat')::double precision;
    v_olng := (p_device_location ->> 'lng')::double precision;
    v_oacc := greatest((p_device_location ->> 'accuracy')::real, 0);
    v_oat  := least(coalesce((p_device_location ->> 'at')::timestamptz, now()), now());
  exception when others then v_olat := null; v_olng := null;
  end;
  if v_olat is null or v_olng is null or v_olat not between -90 and 90 or v_olng not between -180 and 180 then
    v_olat := null; v_olng := null; v_oacc := null; v_oat := null;
  end if;

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
    v_promised := (p_delivery_date + make_interval(mins => v_slot.end_min)) at time zone 'Australia/Brisbane';
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
    subtotal, delivery_fee, handling_fee, discount, total, coupon_code, payment_method,
    delivery_lat, delivery_lng, order_lat, order_lng, order_accuracy_m, order_located_at
  ) values (
    v_uid, case when p_slot_id is null then 'express' else 'scheduled' end,
    p_slot_id, case when p_slot_id is null then null else p_delivery_date end, v_label, v_promised,
    trim(p_address_line), coalesce(trim(p_address_label), ''), v_postcode,
    v_subtotal, v_delivery, v_settings.handling_fee, v_discount,
    v_subtotal - v_discount + v_delivery + v_settings.handling_fee, v_coupon.code, v_method,
    v_dlat, v_dlng, v_olat, v_olng, v_oacc, v_oat
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
$function$;

CREATE OR REPLACE FUNCTION public.queue_daily_digest()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.business_settings; local timestamp := now() at time zone 'Australia/Brisbane';
        y date := (now() at time zone 'Australia/Brisbane')::date - 1; txt text; e text; st text;
begin
  select * into s from public.business_settings where id for update;
  if not s.daily_digest or extract(hour from local) < s.digest_hour or s.last_digest_on = local::date then return; end if;
  select name into st from public.stores where is_primary;
  select 'Orders: ' || count(*) filter (where status <> 'cancelled')
      || E'\nRevenue: $' || to_char(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 'FM999999990.00')
      || E'\nCancelled: ' || count(*) filter (where status = 'cancelled')
    into txt
    from public.orders where (placed_at at time zone 'Australia/Brisbane')::date = y;
  txt := txt
    || E'\nNew customers: ' || (select count(*) from public.customers where (created_at at time zone 'Australia/Brisbane')::date = y)
    || E'\nLow / out of stock products: ' || (select count(*) from public.admin_alerts where category = 'inventory' and resolved_at is null)
    || E'\nOpen alerts: ' || (select count(*) from public.admin_alerts where resolved_at is null and read_at is null)
    || E'\nRefunds waiting: ' || (select count(*) from public.refund_requests where status = 'pending');
  foreach e in array s.digest_emails loop
    insert into public.outbound_messages (channel, recipient, subject, body, kind)
    values ('email', e, coalesce(st, 'Spice Kart') || ' daily operations · ' || to_char(y, 'Dy DD Mon'), txt, 'daily_digest');
  end loop;
  update public.business_settings set last_digest_on = local::date where id;
end $function$;

CREATE OR REPLACE FUNCTION public.orders_closed_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  o public.delivery_date_overrides;
  whole_day boolean;
begin
  select * into o from public.delivery_date_overrides
   where date = case when new.slot_id is null then (now() at time zone 'Australia/Brisbane')::date else new.slot_date end;
  if not found then return new; end if;
  whole_day := coalesce(cardinality(o.closed_slot_ids), 0) = 0;
  if new.slot_id is null then
    if whole_day then raise exception 'store_closed' using errcode = 'P0001'; end if;
  elsif whole_day or new.slot_id = any (o.closed_slot_ids) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.alerts_on_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          || E'\nDelivery: ' || case when new.delivery_type = 'express' then 'Standard' else coalesce(new.slot_label, 'Scheduled') end
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
end $function$;

CREATE OR REPLACE FUNCTION public.messages_on_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        || E'\nDelivery: ' || case when o.delivery_type = 'express' then 'Standard' else coalesce(o.slot_label, 'Scheduled') end
        || E'\nTo: ' || o.address_line || E'\n\n' || coalesce(st, 'Spice Kart'),
      'order_confirmation', o.id);
  exception when others then
    raise warning 'Order confirmation failed for %: %', new.id, sqlerrm;
  end;
  return null;
end $function$;

alter policy "Anyone reads live announcements" on public.announcements using ((active AND ((starts_on IS NULL) OR (starts_on <= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date)) AND ((ends_on IS NULL) OR (ends_on >= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date))));

alter policy "Anyone reads live collections" on public.seasonal_collections using (((starts_on <= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date) AND (ends_on >= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date)));

alter policy "Anyone reads live banners" on public.banners using (((status = 'published'::text) AND (starts_on <= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date) AND (ends_on >= ((now() AT TIME ZONE 'Australia/Brisbane'::text))::date)));
