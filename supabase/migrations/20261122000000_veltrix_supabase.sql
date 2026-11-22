create extension if not exists pgcrypto with schema extensions;

create type public.profile_role as enum ('customer', 'admin');
create type public.product_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.order_status as enum ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.payment_method as enum ('COD', 'BANK_TRANSFER', 'ONLINE');
create type public.inventory_transaction_type as enum ('RECEIVED', 'ADJUSTED', 'RESERVED', 'RELEASED', 'SOLD', 'RETURNED');
create type public.discount_type as enum ('PERCENTAGE', 'FIXED_AMOUNT');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  role public.profile_role not null default 'customer',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  brand text not null default '',
  model text,
  movement text,
  case_material text,
  case_diameter text,
  strap_material text,
  water_resistance text,
  dial_color text,
  warranty text,
  status public.product_status not null default 'DRAFT',
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null default 'Default',
  sku text not null unique,
  options jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or (sale_price >= 0 and sale_price <= price)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text,
  postal_code text,
  country_code text not null default 'PK',
  phone text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index addresses_one_default_per_customer
  on public.addresses(customer_id) where is_default;

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.discount_type not null,
  value numeric(12,2) not null check (value > 0),
  minimum_order numeric(12,2) check (minimum_order is null or minimum_order >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  idempotency_key text unique,
  customer_id uuid references public.profiles(id) on delete set null,
  contact_email text not null,
  order_notes text,
  status public.order_status not null default 'PENDING',
  payment_method public.payment_method not null default 'COD',
  currency_code text not null default 'PKR',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  discount_id uuid references public.discounts(id) on delete set null,
  shipping_first_name text not null,
  shipping_last_name text not null,
  shipping_address1 text not null,
  shipping_address2 text,
  shipping_city text not null,
  shipping_region text,
  shipping_postal_code text,
  shipping_country_code text not null default 'PK',
  shipping_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_title text not null,
  variant_title text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  amount numeric(12,2) not null check (amount >= 0),
  provider_reference text unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_timeline (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  variant_sku text not null,
  type public.inventory_transaction_type not null,
  change integer not null,
  note text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  alt_text text,
  position integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'SUBSCRIBED' check (status in ('SUBSCRIBED', 'UNSUBSCRIBED')),
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create index products_status_published_idx on public.products(status, published_at desc);
create index products_brand_idx on public.products(brand);
create index products_created_idx on public.products(created_at desc);
create index categories_parent_idx on public.categories(parent_id);
create index product_images_position_idx on public.product_images(product_id, position);
create index product_variants_active_idx on public.product_variants(product_id, is_active);
create index inventory_quantity_idx on public.inventory(quantity);
create index addresses_customer_default_idx on public.addresses(customer_id, is_default);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_contact_email_idx on public.orders(contact_email);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);
create index payments_order_status_idx on public.payments(order_id, status);
create index timeline_order_created_idx on public.order_timeline(order_id, created_at);
create index inventory_transactions_variant_created_idx on public.inventory_transactions(variant_id, created_at desc);
create index discounts_active_window_idx on public.discounts(is_active, starts_at, expires_at);
create index banners_active_position_idx on public.banners(is_active, position);
create index reviews_product_status_idx on public.reviews(product_id, status, created_at desc);

create function public.search_products(
  p_page integer default 1,
  p_limit integer default 12,
  p_search text default null,
  p_category text default null,
  p_collection text default null,
  p_min numeric default null,
  p_max numeric default null,
  p_color text default null,
  p_strap text default null,
  p_sort text default 'newest'
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select p.* from public.products p
    where p.status = 'PUBLISHED'
      and (nullif(trim(p_search), '') is null
        or p.title ilike '%' || trim(p_search) || '%'
        or p.brand ilike '%' || trim(p_search) || '%'
        or p.description ilike '%' || trim(p_search) || '%')
      and (nullif(trim(p_category), '') is null or exists (
        select 1 from public.product_categories pc join public.categories c on c.id = pc.category_id
        where pc.product_id = p.id and c.slug = p_category))
      and (nullif(trim(p_collection), '') is null or exists (
        select 1 from public.product_collections pcl join public.collections c on c.id = pcl.collection_id
        where pcl.product_id = p.id and c.slug = p_collection))
      and (p_min is null or exists (
        select 1 from public.product_variants v where v.product_id = p.id and v.is_active
          and coalesce(v.sale_price, v.price) >= p_min))
      and (p_max is null or exists (
        select 1 from public.product_variants v where v.product_id = p.id and v.is_active
          and coalesce(v.sale_price, v.price) <= p_max))
      and (nullif(trim(p_color), '') is null or exists (
        select 1 from public.product_variants v cross join lateral jsonb_each_text(v.options) option
        where v.product_id = p.id and v.is_active and (option.key ilike '%color%' or option.key ilike '%colour%')
          and option.value ilike trim(p_color)))
      and (nullif(trim(p_strap), '') is null or exists (
        select 1 from public.product_variants v cross join lateral jsonb_each_text(v.options) option
        where v.product_id = p.id and v.is_active and option.key ilike '%strap%'
          and option.value ilike trim(p_strap)))
  ),
  page_products as (
    select c.* from candidates c
    order by
      case when p_sort = 'title' then lower(c.title) end asc,
      case when p_sort = 'price-asc' then (select min(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = c.id and v.is_active) end asc,
      case when p_sort = 'price-desc' then (select max(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = c.id and v.is_active) end desc,
      c.created_at desc
    limit least(greatest(coalesce(p_limit, 12), 1), 100)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_limit, 12), 1), 100)
  ),
  serialized as (
    select p.*,
      (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text, 'position', i.position)
        order by i.position), '[]'::jsonb) from public.product_images i where i.product_id = p.id) as images,
      (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'title', v.title, 'sku', v.sku, 'options', v.options,
        'price', v.price, 'salePrice', v.sale_price, 'isActive', v.is_active,
        'inventory', jsonb_build_object('quantity', coalesce(inv.quantity, 0))))
        order by coalesce(v.sale_price, v.price)) from public.product_variants v
        left join public.inventory inv on inv.variant_id = v.id
        where v.product_id = p.id and v.is_active) as variants,
      (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
        order by c.name), '[]'::jsonb) from public.product_collections pc
        join public.collections c on c.id = pc.collection_id where pc.product_id = p.id) as collections
    from page_products p
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'title', s.title, 'description', s.description, 'brand', s.brand,
      'model', s.model, 'movement', s.movement, 'caseMaterial', s.case_material,
      'caseDiameter', s.case_diameter, 'strapMaterial', s.strap_material,
      'waterResistance', s.water_resistance, 'dialColor', s.dial_color, 'warranty', s.warranty,
      'status', s.status, 'featured', s.featured, 'createdAt', s.created_at, 'updatedAt', s.updated_at,
      'images', s.images, 'variants', s.variants, 'collections', s.collections
    ) order by
      case when p_sort = 'title' then lower(s.title) end asc,
      case when p_sort = 'price-asc' then (select min(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = s.id and v.is_active) end asc,
      case when p_sort = 'price-desc' then (select max(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = s.id and v.is_active) end desc,
      s.created_at desc) from serialized s), '[]'::jsonb),
    'total', (select count(*) from candidates),
    'page', greatest(coalesce(p_page, 1), 1),
    'pages', greatest(1, ceil((select count(*) from candidates)::numeric / least(greatest(coalesce(p_limit, 12), 1), 100))::integer)
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'ACTIVE'
  );
$$;

create function public.checkout_order(
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
  v_order_id uuid := gen_random_uuid();
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
  v_discount public.discounts%rowtype;
  v_has_discount boolean := false;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_contact_email, ''))) = 0
    or length(trim(coalesce(p_shipping_first_name, ''))) < 2
    or length(trim(coalesce(p_shipping_address1, ''))) < 6
    or length(trim(coalesce(p_shipping_city, ''))) < 2
    or length(trim(coalesce(p_shipping_phone, ''))) < 6 then
    raise exception 'Invalid checkout details' using errcode = '22023';
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
      return (select jsonb_build_object('id', o.id, 'orderNumber', o.order_number, 'contactEmail', o.contact_email,
        'subtotal', o.subtotal, 'discountTotal', o.discount_total, 'shippingTotal', o.shipping_total,
        'total', o.total, 'status', o.status, 'createdAt', o.created_at)
        from public.orders o where o.id = v_order_id);
    end if;
    v_order_id := gen_random_uuid();
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
      where pv.id = (v_item ->> 'variantId')::uuid and pv.is_active for update;
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
  v_order_number := 'VLX-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 6));

  insert into public.orders (
    id, order_number, idempotency_key, customer_id, contact_email, order_notes, payment_method,
    subtotal, discount_total, shipping_total, total, discount_id,
    shipping_first_name, shipping_last_name, shipping_address1, shipping_address2,
    shipping_city, shipping_region, shipping_postal_code, shipping_country_code, shipping_phone
  ) values (
    v_order_id, v_order_number, p_idempotency_key, v_user_id, lower(trim(p_contact_email)), p_order_notes, 'COD',
    v_subtotal, v_discount_total, v_shipping_total, v_total, case when v_has_discount then v_discount.id else null end,
    trim(p_shipping_first_name), coalesce(nullif(trim(p_shipping_last_name), ''), trim(p_shipping_first_name)),
    trim(p_shipping_address1), nullif(trim(coalesce(p_shipping_address2, '')), ''),
    trim(p_shipping_city), nullif(trim(coalesce(p_shipping_region, '')), ''),
    nullif(trim(coalesce(p_shipping_postal_code, '')), ''), 'PK', trim(p_shipping_phone)
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_variant from public.product_variants pv
      where pv.id = (v_item ->> 'variantId')::uuid and pv.is_active for update;
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
    'orderNotes', o.order_notes, 'subtotal', o.subtotal, 'discountTotal', o.discount_total,
    'shippingTotal', o.shipping_total, 'total', o.total, 'status', o.status, 'createdAt', o.created_at,
    'shippingFirstName', o.shipping_first_name, 'shippingLastName', o.shipping_last_name,
    'shippingAddress1', o.shipping_address1, 'shippingCity', o.shipping_city, 'shippingPhone', o.shipping_phone,
    'items', coalesce((select jsonb_agg(jsonb_build_object('productTitle', oi.product_title, 'variantTitle', oi.variant_title,
      'quantity', oi.quantity, 'lineTotal', oi.line_total, 'unitPrice', oi.unit_price)) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb))
    from public.orders o where o.id = v_order_id);
end;
$$;

create function public.update_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if v_order.status = 'CANCELLED' and p_status <> 'CANCELLED' then
    raise exception 'Cancelled orders cannot be reopened' using errcode = '22023';
  end if;
  if p_status = 'CANCELLED' and v_order.status <> 'CANCELLED' then
    for v_item in select variant_id, sku, quantity from public.order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        insert into public.inventory (variant_id, quantity) values (v_item.variant_id, v_item.quantity)
          on conflict (variant_id) do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();
        insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
          values (v_item.variant_id, v_item.sku, 'RETURNED', v_item.quantity, 'Cancelled order ' || v_order.order_number, auth.uid());
      end if;
    end loop;
  end if;
  update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  insert into public.order_timeline (order_id, status, note, actor_id) values (p_order_id, p_status, p_note, auth.uid());
end;
$$;

create function public.update_payment_status(p_order_id uuid, p_payment_status public.payment_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  update public.payments set status = p_payment_status,
    verified_at = case when p_payment_status = 'PAID' then now() else verified_at end,
    updated_at = now()
    where order_id = p_order_id;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.adjust_inventory(p_variant_id uuid, p_quantity integer, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku text;
  v_old_quantity integer;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select sku into v_sku from public.product_variants where id = p_variant_id;
  if not found then raise exception 'Variant not found' using errcode = 'P0002'; end if;
  select quantity into v_old_quantity from public.inventory where variant_id = p_variant_id for update;
  if not found then
    insert into public.inventory (variant_id, quantity) values (p_variant_id, greatest(p_quantity, 0));
    v_old_quantity := 0;
  else
    update public.inventory set quantity = greatest(p_quantity, 0), updated_at = now() where variant_id = p_variant_id;
  end if;
  insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
    values (p_variant_id, v_sku, 'ADJUSTED', greatest(p_quantity, 0) - v_old_quantity, p_note, auth.uid());
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.search_products(integer, integer, text, text, text, numeric, numeric, text, text, text) from public;
grant execute on function public.search_products(integer, integer, text, text, text, numeric, numeric, text, text, text) to anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.checkout_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.checkout_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.update_order_status(uuid, public.order_status, text) from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
revoke all on function public.update_payment_status(uuid, public.payment_status) from public, anon, authenticated;
grant execute on function public.update_payment_status(uuid, public.payment_status) to authenticated;
revoke all on function public.adjust_inventory(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','categories','collections','products','product_images','product_variants','inventory','addresses','discounts','orders','payments','store_settings','banners','newsletter_subscribers','reviews','wishlists'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_collections enable row level security;
alter table public.addresses enable row level security;
alter table public.discounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_timeline enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.store_settings enable row level security;
alter table public.banners enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

create policy "Profiles are visible to their owner or admins" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers update their own non-role profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and role = 'customer')
  with check (id = (select auth.uid()) and role = 'customer' and status = 'ACTIVE'
    and email = (select lower(email) from auth.users where id = (select auth.uid())));
create policy "Admins manage profiles" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public reads categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads collections" on public.collections for select to anon, authenticated using (true);
create policy "Admins manage collections" on public.collections for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public reads published products" on public.products for select to anon, authenticated
  using (status = 'PUBLISHED' or (select public.is_admin()));
create policy "Admins manage products" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads images for published products" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED')
    or (select public.is_admin()));
create policy "Admins manage product images" on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads variants for published products" on public.product_variants for select to anon, authenticated
  using (is_active and (exists (select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED')
    or (select public.is_admin())));
create policy "Admins manage variants" on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads stock for published products" on public.inventory for select to anon, authenticated
  using (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and p.status = 'PUBLISHED' and v.is_active) or (select public.is_admin()));
create policy "Admins manage inventory rows" on public.inventory for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads product categories" on public.product_categories for select to anon, authenticated using (true);
create policy "Admins manage product categories" on public.product_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads product collections" on public.product_collections for select to anon, authenticated using (true);
create policy "Admins manage product collections" on public.product_collections for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers read own addresses" on public.addresses for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers create own addresses" on public.addresses for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy "Customers update own addresses" on public.addresses for update to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy "Customers delete own addresses" on public.addresses for delete to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage discounts" on public.discounts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers validate active discounts" on public.discounts for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at >= now()));

create policy "Customers read own orders" on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage orders" on public.orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
    or (select public.is_admin()));
create policy "Admins manage order items" on public.order_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own payments" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
    or (select public.is_admin()));
create policy "Admins manage payments" on public.payments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own order timeline" on public.order_timeline for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
    or (select public.is_admin()));
create policy "Admins manage order timeline" on public.order_timeline for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins read inventory transactions" on public.inventory_transactions for select to authenticated
  using ((select public.is_admin()));
create policy "Admins manage inventory transactions" on public.inventory_transactions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public reads public settings" on public.store_settings for select to anon, authenticated
  using (is_public or (select public.is_admin()));
create policy "Admins manage settings" on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads active banners" on public.banners for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
    or (select public.is_admin()));
create policy "Admins manage banners" on public.banners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Anyone can subscribe to newsletter" on public.newsletter_subscribers for insert to anon, authenticated
  with check (status = 'SUBSCRIBED');
create policy "Admins manage newsletter" on public.newsletter_subscribers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads approved reviews" on public.reviews for select to anon, authenticated
  using (status = 'APPROVED' or customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers write own pending reviews" on public.reviews for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'PENDING');
create policy "Customers update own pending reviews" on public.reviews for update to authenticated
  using (customer_id = (select auth.uid()) and status = 'PENDING')
  with check (customer_id = (select auth.uid()) and status = 'PENDING');
create policy "Admins manage reviews" on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers manage own wishlist" on public.wishlists for all to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()))
  with check (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Customers manage own wishlist items" on public.wishlist_items for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.customer_id = (select auth.uid()))
    or (select public.is_admin()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.customer_id = (select auth.uid()))
    or (select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('store-assets', 'store-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads storefront images" on storage.objects for select to anon, authenticated
  using (bucket_id in ('product-images', 'store-assets'));
create policy "Admins upload storefront images" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'store-assets') and (select public.is_admin())
    and (storage.extension(name) = any (array['jpg','jpeg','png','webp','avif','svg']))
    and (metadata ->> 'size')::bigint <= 5242880);
create policy "Admins update storefront images" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()))
  with check (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()));
create policy "Admins delete storefront images" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()));
