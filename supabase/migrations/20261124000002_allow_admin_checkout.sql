create or replace function public.checkout_order(
  p_items jsonb,
  p_contact_email text,
  p_shipping_first_name text,
  p_shipping_last_name text,
  p_shipping_address1 text,
  p_shipping_address2 text,
  p_shipping_city text,
  p_shipping_region text,
  p_shipping_postal_code text,
  p_shipping_phone text,
  p_order_notes text default null,
  p_discount_code text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id text := gen_random_uuid()::text;
  v_order_number text;
  v_item jsonb;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_stock integer;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
  v_shipping_total numeric(12,2);
  v_total numeric(12,2);
  v_currency_code text := 'PKR';
  v_discount public.discounts%rowtype;
  v_has_discount boolean := false;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) > 128 then
    raise exception 'Invalid checkout request key' using errcode = '22023';
  end if;
  if coalesce(p_contact_email, '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(trim(coalesce(p_shipping_first_name, ''))) < 2
    or length(trim(coalesce(p_shipping_address1, ''))) < 6
    or length(trim(coalesce(p_shipping_city, ''))) < 2
    or coalesce(p_shipping_phone, '') !~ '^\+?92[0-9]{10}$' then
    raise exception 'Invalid checkout details' using errcode = '22023';
  end if;
  if v_user_id is not null and not (public.is_active_customer() or public.is_admin()) then
    raise exception 'This account is not enabled to place orders' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext(coalesce(v_user_id::text, 'guest') || ':' || p_idempotency_key));
    if v_user_id is not null then
      select id into v_order_id from public.orders
      where idempotency_key = p_idempotency_key and customer_id = v_user_id;
    else
      select id into v_order_id from public.orders
      where idempotency_key = p_idempotency_key and customer_id is null;
    end if;
    if found then
      return (select jsonb_build_object('id', o.id, 'orderNumber', o.order_number,
        'subtotal', o.subtotal, 'discountTotal', o.discount_total, 'shippingTotal', o.shipping_total,
        'total', o.total, 'currencyCode', o.currency_code, 'status', o.status, 'createdAt', o.created_at,
        'items', coalesce((select jsonb_agg(jsonb_build_object('productTitle', oi.product_title, 'variantTitle', oi.variant_title,
          'quantity', oi.quantity, 'lineTotal', oi.line_total, 'unitPrice', oi.unit_price))
          from public.order_items oi where oi.order_id = o.id), '[]'::jsonb))
        from public.orders o where o.id = v_order_id);
    end if;
    v_order_id := gen_random_uuid()::text;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'variantId', '') = '' then
      raise exception 'Invalid cart item' using errcode = '22023';
    end if;
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Invalid cart quantity' using errcode = '22023';
    end;
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Invalid cart quantity' using errcode = '22023';
    end if;
    select * into v_variant from public.product_variants pv
      where pv.id = v_item ->> 'variantId' and pv.is_active for update;
    if not found then
      raise exception 'A cart item is no longer available' using errcode = '22023';
    end if;
    select * into v_product from public.products p
      where p.id = v_variant.product_id and p.status = 'PUBLISHED';
    if not found then raise exception 'A cart item is no longer available' using errcode = '22023'; end if;
    select quantity into v_stock from public.inventory where variant_id = v_variant.id for update;
    if not found or v_stock < v_quantity then
      raise exception 'Insufficient stock for %', v_product.title using errcode = '22023';
    end if;
    v_unit_price := coalesce(v_variant.sale_price, v_variant.price);
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into v_discount from public.discounts
    where code = upper(trim(p_discount_code)) and is_active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or usage_count < usage_limit)
      and (minimum_order is null or minimum_order <= v_subtotal)
    for update;
    if not found then
      raise exception 'That discount code is not valid' using errcode = '22023';
    end if;
    v_has_discount := true;
    v_discount_total := least(v_subtotal, case
      when v_discount.type = 'PERCENTAGE' then v_subtotal * v_discount.value / 100
      else v_discount.value end);
  end if;

  select coalesce((value #>> '{}')::numeric, -1) into v_shipping_total
    from public.store_settings
    where key = case when lower(trim(p_shipping_city)) like '%karachi%' then 'shipping_karachi' else 'shipping_nationwide' end
    and is_public;
  if v_shipping_total is null or v_shipping_total < 0 then
    raise exception 'Shipping is not configured' using errcode = '22023';
  end if;
  v_total := v_subtotal - v_discount_total + v_shipping_total;
  select coalesce((select s.value #>> '{}' from public.store_settings s where s.key = 'currency' and s.is_public), 'PKR')
    into v_currency_code;
  v_order_number := 'VLX-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 6));

  insert into public.orders (
    id, order_number, idempotency_key, customer_id, contact_email, order_notes, payment_method,
    currency_code, subtotal, discount_total, shipping_total, total, discount_id,
    shipping_first_name, shipping_last_name, shipping_address1, shipping_address2,
    shipping_city, shipping_region, shipping_postal_code, shipping_country_code, shipping_phone
  ) values (
    v_order_id, v_order_number, p_idempotency_key, v_user_id, lower(trim(p_contact_email)), p_order_notes, 'COD',
    v_currency_code, v_subtotal, v_discount_total, v_shipping_total, v_total, case when v_has_discount then v_discount.id else null end,
    trim(p_shipping_first_name), coalesce(nullif(trim(p_shipping_last_name), ''), trim(p_shipping_first_name)),
    trim(p_shipping_address1), nullif(trim(coalesce(p_shipping_address2, '')), ''),
    trim(p_shipping_city), nullif(trim(coalesce(p_shipping_region, '')), ''),
    nullif(trim(coalesce(p_shipping_postal_code, '')), ''), 'PK', trim(p_shipping_phone)
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_variant from public.product_variants pv
      where pv.id = v_item ->> 'variantId' and pv.is_active for update;
    select * into v_product from public.products p
      where p.id = v_variant.product_id and p.status = 'PUBLISHED';
    v_unit_price := coalesce(v_variant.sale_price, v_variant.price);
    update public.inventory set quantity = quantity - v_quantity, updated_at = now()
      where variant_id = v_variant.id and quantity >= v_quantity;
    if not found then
      raise exception 'Insufficient stock for %', v_product.title using errcode = '22023';
    end if;
    insert into public.order_items (order_id, product_id, variant_id, product_title, variant_title, sku, quantity, unit_price, line_total)
      values (v_order_id, v_product.id, v_variant.id, v_product.title, v_variant.title, v_variant.sku, v_quantity, v_unit_price, v_unit_price * v_quantity);
    insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
      values (v_variant.id, v_variant.sku, 'SOLD', -v_quantity, 'Order ' || v_order_number, v_user_id);
  end loop;
  insert into public.payments (order_id, method, status, amount) values (v_order_id, 'COD', 'PENDING', v_total);
  insert into public.order_timeline (order_id, status, note, actor_id) values (v_order_id, 'PENDING', 'Order placed', v_user_id);
  if v_has_discount then
    update public.discounts set usage_count = usage_count + 1 where id = v_discount.id;
  end if;

  return (select jsonb_build_object('id', o.id, 'orderNumber', o.order_number, 'contactEmail', o.contact_email,
    'currencyCode', o.currency_code,
    'orderNotes', o.order_notes, 'subtotal', o.subtotal, 'discountTotal', o.discount_total,
    'shippingTotal', o.shipping_total, 'total', o.total, 'status', o.status, 'createdAt', o.created_at,
    'shippingFirstName', o.shipping_first_name, 'shippingLastName', o.shipping_last_name,
    'shippingAddress1', o.shipping_address1, 'shippingCity', o.shipping_city, 'shippingPhone', o.shipping_phone,
    'items', coalesce((select jsonb_agg(jsonb_build_object('productTitle', oi.product_title, 'variantTitle', oi.variant_title,
      'quantity', oi.quantity, 'lineTotal', oi.line_total, 'unitPrice', oi.unit_price)) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb))
    from public.orders o where o.id = v_order_id);
end;
$$;
