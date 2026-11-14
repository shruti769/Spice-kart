-- Standard delivery is 2–4 hours in Brisbane and next day elsewhere. Orders outside Brisbane were
-- promised "now + 4 hours", so the admin saw them as late (and "Notify delayed customers" would
-- message those customers). Now they are due by the end of the next day (Brisbane time).

-- Same rule as the app (src/lib/standard-eta.ts): map pin within 40 km of Brisbane CBD,
-- else a Greater Brisbane postcode (4000–4207, 4300–4306, 4500–4521).
create or replace function public.is_brisbane_delivery(p_postcode text, p_lat double precision, p_lng double precision)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select case
    when p_lat is not null and p_lng is not null then
      6371 * sqrt(power(radians(p_lat + 27.4698), 2) + power(radians(p_lng - 153.0251) * cos(radians(-27.4698)), 2)) <= 40
    when p_postcode ~ '^\d{4}$' then
      p_postcode::int between 4000 and 4207 or p_postcode::int between 4300 and 4306 or p_postcode::int between 4500 and 4521
    else false
  end
$$;

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
    -- Standard: 2–4 hours in Brisbane (late after the admin's ETA); next day elsewhere (late after midnight tomorrow).
    v_promised := case when public.is_brisbane_delivery(v_postcode, v_dlat, v_dlng)
                       then now() + make_interval(mins => v_settings.express_eta_minutes)
                       else ((v_now::date + 2)::timestamp) at time zone 'Australia/Brisbane' end;
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
$function$
;

-- Open Standard orders outside Brisbane: move their due time to the end of the day after they were placed.
update public.orders o
   set promised_by = (((o.placed_at at time zone 'Australia/Brisbane')::date + 2)::timestamp) at time zone 'Australia/Brisbane'
 where o.delivery_type = 'express'
   and o.status not in ('delivered', 'cancelled')
   and not public.is_brisbane_delivery(o.postcode, o.delivery_lat, o.delivery_lng);
