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
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  description text,
  parent_id text references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  variant_id text not null unique references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  product_id text not null references public.products(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.product_collections (
  product_id text not null references public.products(id) on delete cascade,
  collection_id text not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.addresses (
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
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
  discount_id text references public.discounts(id) on delete set null,
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
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  variant_id text references public.product_variants(id) on delete set null,
  product_title text not null,
  variant_title text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  amount numeric(12,2) not null check (amount >= 0),
  provider_reference text unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_timeline (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inventory_transactions (
  id text primary key default gen_random_uuid()::text,
  variant_id text references public.product_variants(id) on delete set null,
  variant_sku text not null,
  type public.inventory_transaction_type not null,
  change integer not null,
  note text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  id text primary key default gen_random_uuid()::text,
  key text not null unique,
  value jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.banners (
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  status text not null default 'SUBSCRIBED' check (status in ('SUBSCRIBED', 'UNSUBSCRIBED')),
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references public.products(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  customer_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_items (
  wishlist_id text not null references public.wishlists(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
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
      and ((p_min is null and p_max is null) or exists (
        select 1 from public.product_variants v where v.product_id = p.id and v.is_active
          and (p_min is null or coalesce(v.sale_price, v.price) >= p_min)
          and (p_max is null or coalesce(v.sale_price, v.price) <= p_max)))
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
      case when p_sort = 'oldest' then c.created_at end asc,
      case when p_sort = 'price-asc' then (select min(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = c.id and v.is_active) end asc,
      case when p_sort = 'price-desc' then (select max(coalesce(v.sale_price, v.price)) from public.product_variants v where v.product_id = c.id and v.is_active) end desc,
      c.created_at desc
    limit least(greatest(coalesce(p_limit, 12), 1), 100)
    offset (greatest(coalesce(p_page, 1), 1)::bigint - 1) * least(greatest(coalesce(p_limit, 12), 1), 100)::bigint
  ),
  serialized as (
    select p.*,
      (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'altText', i.alt_text, 'position', i.position)
        order by i.position), '[]'::jsonb) from public.product_images i where i.product_id = p.id) as images,
      (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'title', v.title, 'sku', v.sku, 'options', v.options,
        'price', v.price, 'salePrice', v.sale_price, 'isActive', v.is_active,
        'inventory', jsonb_build_object('quantity', coalesce(inv.quantity, 0)))
        order by coalesce(v.sale_price, v.price))) from public.product_variants v
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
      case when p_sort = 'oldest' then s.created_at end asc,
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

create function public.is_active_customer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'customer' and status = 'ACTIVE'
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
  if v_user_id is not null and not public.is_active_customer() then
    raise exception 'Customer account is disabled' using errcode = '42501';
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

create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'totalRevenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED'), 0),
    'totalRevenueByCurrency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency_code, 'total', revenue) order by currency_code)
      from (select currency_code, sum(total) as revenue from public.orders
        where status <> 'CANCELLED' group by currency_code) revenue_by_currency
    ), '[]'::jsonb),
    'completedOrders', (select count(*) from public.orders where status = 'DELIVERED'),
    'totalOrders', (select count(*) from public.orders),
    'pendingOrders', (select count(*) from public.orders where status = 'PENDING'),
    'totalCustomers', (select count(*) from public.profiles where role = 'customer' and status = 'ACTIVE'),
    'totalProducts', (select count(*) from public.products where status = 'PUBLISHED'),
    'recentOrders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'orderNumber', o.order_number, 'total', o.total, 'currencyCode', o.currency_code, 'status', o.status,
        'createdAt', o.created_at, 'customer', case when p.id is null then null else jsonb_build_object(
          'firstName', p.first_name, 'lastName', p.last_name, 'email', p.email) end,
        'items', coalesce((select jsonb_agg(jsonb_build_object('id', oi.id)) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
      ) order by o.created_at desc)
      from (select * from public.orders order by created_at desc limit 8) o
      left join public.profiles p on p.id = o.customer_id
    ), '[]'::jsonb),
    'lowStock', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'quantity', i.quantity,
        'variant', jsonb_build_object('sku', v.sku, 'product', jsonb_build_object('title', p.title))
      ) order by i.quantity asc)
      from public.inventory i
      join public.product_variants v on v.id = i.variant_id
      join public.products p on p.id = v.product_id
      where i.quantity <= i.low_stock_threshold
    ), '[]'::jsonb)
  );
end;
$$;

create function public.save_product(p_product jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(trim(p_product ->> 'id'), '');
  v_variant jsonb;
  v_image jsonb;
  v_variant_id text;
  v_keep_variant_ids text[] := array[]::text[];
  v_old_quantity integer;
  v_quantity integer;
  v_status public.product_status;
  v_slug text := trim(coalesce(p_product ->> 'slug', ''));
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_product ->> 'title', ''))) < 2
    or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or length(trim(coalesce(p_product ->> 'brand', ''))) < 1 then
    raise exception 'Product details or variants are invalid' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_product -> 'variants'), '') <> 'array'
    or jsonb_array_length(p_product -> 'variants') = 0 then
    raise exception 'Product needs at least one variant' using errcode = '22023';
  end if;
  v_id := coalesce(v_id, gen_random_uuid()::text);
  v_status := coalesce(nullif(p_product ->> 'status', ''), 'DRAFT')::public.product_status;

  insert into public.products (
    id, slug, title, description, brand, model, movement, case_material,
    case_diameter, strap_material, water_resistance, dial_color, warranty,
    status, featured, published_at
  ) values (
    v_id, v_slug, trim(p_product ->> 'title'), coalesce(p_product ->> 'description', ''),
    trim(p_product ->> 'brand'), nullif(trim(coalesce(p_product ->> 'model', '')), ''),
    nullif(trim(coalesce(p_product ->> 'movement', '')), ''),
    nullif(trim(coalesce(p_product ->> 'case_material', '')), ''),
    nullif(trim(coalesce(p_product ->> 'case_diameter', '')), ''),
    nullif(trim(coalesce(p_product ->> 'strap_material', '')), ''),
    nullif(trim(coalesce(p_product ->> 'water_resistance', '')), ''),
    nullif(trim(coalesce(p_product ->> 'dial_color', '')), ''),
    nullif(trim(coalesce(p_product ->> 'warranty', '')), ''),
    v_status, coalesce((p_product ->> 'featured')::boolean, false),
    case when v_status = 'PUBLISHED' then now() else null end
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, description = excluded.description,
    brand = excluded.brand, model = excluded.model, movement = excluded.movement,
    case_material = excluded.case_material, case_diameter = excluded.case_diameter,
    strap_material = excluded.strap_material, water_resistance = excluded.water_resistance,
    dial_color = excluded.dial_color, warranty = excluded.warranty, status = excluded.status,
    featured = excluded.featured,
    published_at = case when excluded.status = 'PUBLISHED' then coalesce(public.products.published_at, now()) else null end,
    updated_at = now();

  if jsonb_typeof(p_product -> 'images') = 'array' then
    delete from public.product_images where product_id = v_id;
    for v_image in select value from jsonb_array_elements(p_product -> 'images') loop
      if coalesce(v_image ->> 'url', '') !~ '^https?://.*/storage/v1/object/public/product-images/.+' then
        raise exception 'Product images must use the product-images storage bucket' using errcode = '22023';
      end if;
      insert into public.product_images (product_id, url, alt_text, position)
        values (v_id, v_image ->> 'url', nullif(v_image ->> 'altText', ''), coalesce((v_image ->> 'position')::integer, 0));
    end loop;
  end if;

  for v_variant in select value from jsonb_array_elements(p_product -> 'variants') loop
    if length(trim(coalesce(v_variant ->> 'sku', ''))) = 0 then
      raise exception 'Every variant needs a SKU' using errcode = '22023';
    end if;
    v_quantity := coalesce((v_variant ->> 'quantity')::integer, 0);
    if v_quantity < 0 then raise exception 'Stock quantity cannot be negative' using errcode = '22023'; end if;
    v_variant_id := nullif(trim(v_variant ->> 'id'), '');
    if v_variant_id is null then
      insert into public.product_variants (
        product_id, title, sku, options, price, sale_price, is_active
      ) values (
        v_id, coalesce(nullif(trim(v_variant ->> 'title'), ''), 'Default'),
        trim(v_variant ->> 'sku'), coalesce(v_variant -> 'options', '{}'::jsonb),
        (v_variant ->> 'price')::numeric, nullif(v_variant ->> 'salePrice', '')::numeric,
        coalesce((v_variant ->> 'isActive')::boolean, true)
      ) returning id into v_variant_id;
      insert into public.inventory (variant_id, quantity) values (v_variant_id, v_quantity);
      if v_quantity > 0 then
        insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
          values (v_variant_id, trim(v_variant ->> 'sku'), 'RECEIVED', v_quantity, 'Initial product stock', auth.uid());
      end if;
    else
      if not exists (select 1 from public.product_variants where id = v_variant_id and product_id = v_id) then
        raise exception 'Variant does not belong to this product' using errcode = '22023';
      end if;
      update public.product_variants set
        title = coalesce(nullif(trim(v_variant ->> 'title'), ''), 'Default'),
        sku = trim(v_variant ->> 'sku'), options = coalesce(v_variant -> 'options', '{}'::jsonb),
        price = (v_variant ->> 'price')::numeric,
        sale_price = nullif(v_variant ->> 'salePrice', '')::numeric,
        is_active = coalesce((v_variant ->> 'isActive')::boolean, true),
        updated_at = now()
        where id = v_variant_id and product_id = v_id;
      select quantity into v_old_quantity from public.inventory where variant_id = v_variant_id for update;
      if not found then
        insert into public.inventory (variant_id, quantity) values (v_variant_id, v_quantity);
        v_old_quantity := 0;
      else
        update public.inventory set quantity = v_quantity, updated_at = now() where variant_id = v_variant_id;
      end if;
      if v_old_quantity <> v_quantity then
        insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
          values (v_variant_id, trim(v_variant ->> 'sku'), 'ADJUSTED', v_quantity - v_old_quantity, 'Product editor stock update', auth.uid());
      end if;
    end if;
    v_keep_variant_ids := array_append(v_keep_variant_ids, v_variant_id);
  end loop;

  update public.product_variants set is_active = false, updated_at = now()
    where product_id = v_id and is_active
      and not (id = any(v_keep_variant_ids));
  if jsonb_typeof(p_product -> 'categoryIds') = 'array' then
    delete from public.product_categories where product_id = v_id;
    insert into public.product_categories (product_id, category_id)
      select v_id, value #>> '{}' from jsonb_array_elements(p_product -> 'categoryIds');
  end if;
  if jsonb_typeof(p_product -> 'collectionIds') = 'array' then
    delete from public.product_collections where product_id = v_id;
    insert into public.product_collections (product_id, collection_id)
      select v_id, value #>> '{}' from jsonb_array_elements(p_product -> 'collectionIds');
  end if;
  return v_id;
end;
$$;

create function public.update_order_status(p_order_id text, p_status public.order_status, p_note text default null)
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
  if v_order.status = p_status then return; end if;
  if not (
    (v_order.status = 'PENDING' and p_status = 'CONFIRMED')
    or (v_order.status = 'CONFIRMED' and p_status = 'PROCESSING')
    or (v_order.status = 'PROCESSING' and p_status in ('SHIPPED', 'CANCELLED'))
    or (v_order.status = 'PENDING' and p_status = 'CANCELLED')
    or (v_order.status = 'CONFIRMED' and p_status = 'CANCELLED')
    or (v_order.status = 'SHIPPED' and p_status in ('DELIVERED', 'RETURNED'))
    or (v_order.status = 'DELIVERED' and p_status = 'RETURNED')
  ) then
    raise exception 'Order cannot move from % to %', v_order.status, p_status using errcode = '22023';
  end if;
  if p_status in ('CANCELLED', 'RETURNED') then
    for v_item in select variant_id, sku, quantity from public.order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        insert into public.inventory (variant_id, quantity) values (v_item.variant_id, v_item.quantity)
          on conflict (variant_id) do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();
        insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
          values (v_item.variant_id, v_item.sku,
            case when p_status = 'CANCELLED' then 'RELEASED'::public.inventory_transaction_type else 'RETURNED'::public.inventory_transaction_type end,
            v_item.quantity,
            case when p_status = 'CANCELLED' then 'Cancelled order ' || v_order.order_number else 'Returned order ' || v_order.order_number end,
            auth.uid());
      end if;
    end loop;
  end if;
  update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  insert into public.order_timeline (order_id, status, note, actor_id)
    values (p_order_id, p_status, coalesce(p_note, 'Status changed from ' || v_order.status), auth.uid());
end;
$$;

create function public.update_payment_status(p_order_id text, p_payment_status public.payment_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_payment_status = 'PAID' and exists (
    select 1 from public.payments where order_id = p_order_id and method = 'ONLINE'
  ) then raise exception 'Online payment requires provider verification' using errcode = '22023'; end if;
  update public.payments set status = p_payment_status,
    verified_at = case when p_payment_status = 'PAID' then now() else null end,
    updated_at = now()
    where order_id = p_order_id;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.validate_discount(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discount public.discounts%rowtype;
begin
  select * into v_discount from public.discounts
  where code = upper(trim(coalesce(p_code, ''))) and is_active
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (usage_limit is null or usage_count < usage_limit)
    and (minimum_order is null or minimum_order <= p_subtotal);
  if not found then raise exception 'That discount code is not valid' using errcode = '22023'; end if;
  return jsonb_build_object('id', v_discount.id, 'code', v_discount.code,
    'type', v_discount.type, 'value', v_discount.value);
end;
$$;

create function public.save_customer_address(p_address jsonb, p_id text default null)
returns public.addresses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.addresses%rowtype;
  v_default boolean := coalesce((p_address ->> 'is_default')::boolean, false);
begin
  if v_user_id is null or not public.is_active_customer() then
    raise exception 'An active customer account is required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_address ->> 'first_name', ''))) < 2
    or length(trim(coalesce(p_address ->> 'address_line1', ''))) < 6
    or length(trim(coalesce(p_address ->> 'city', ''))) < 2
    or length(trim(coalesce(p_address ->> 'phone', ''))) < 6 then
    raise exception 'Invalid address details' using errcode = '22023';
  end if;
  if p_id is not null and not exists (
    select 1 from public.addresses where id = p_id and customer_id = v_user_id
  ) then raise exception 'Address not found' using errcode = 'P0002'; end if;
  if v_default then
    update public.addresses set is_default = false
      where customer_id = v_user_id and (p_id is null or id <> p_id) and is_default;
  end if;

  if p_id is null then
    insert into public.addresses (
      customer_id, label, first_name, last_name, address_line1, address_line2,
      city, region, postal_code, country_code, phone, is_default
    ) values (
      v_user_id, nullif(trim(coalesce(p_address ->> 'label', '')), ''),
      trim(p_address ->> 'first_name'), coalesce(nullif(trim(p_address ->> 'last_name'), ''), trim(p_address ->> 'first_name')),
      trim(p_address ->> 'address_line1'), nullif(trim(coalesce(p_address ->> 'address_line2', '')), ''),
      trim(p_address ->> 'city'), nullif(trim(coalesce(p_address ->> 'region', '')), ''),
      nullif(trim(coalesce(p_address ->> 'postal_code', '')), ''),
      coalesce(nullif(trim(p_address ->> 'country_code'), ''), 'PK'), trim(p_address ->> 'phone'), v_default
    ) returning * into v_address;
  else
    update public.addresses set
      label = nullif(trim(coalesce(p_address ->> 'label', '')), ''),
      first_name = trim(p_address ->> 'first_name'),
      last_name = coalesce(nullif(trim(p_address ->> 'last_name'), ''), trim(p_address ->> 'first_name')),
      address_line1 = trim(p_address ->> 'address_line1'),
      address_line2 = nullif(trim(coalesce(p_address ->> 'address_line2', '')), ''),
      city = trim(p_address ->> 'city'),
      region = nullif(trim(coalesce(p_address ->> 'region', '')), ''),
      postal_code = nullif(trim(coalesce(p_address ->> 'postal_code', '')), ''),
      country_code = coalesce(nullif(trim(p_address ->> 'country_code'), ''), 'PK'),
      phone = trim(p_address ->> 'phone'),
      is_default = v_default
    where id = p_id and customer_id = v_user_id returning * into v_address;
  end if;
  return v_address;
end;
$$;

create function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email, status, subscribed_at, updated_at)
    values (v_email, 'SUBSCRIBED', now(), now())
    on conflict (email) do update set status = 'SUBSCRIBED', subscribed_at = now(), updated_at = now();
end;
$$;

create function public.adjust_inventory(p_variant_id text, p_quantity integer, p_note text default null)
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
  if p_quantity < 0 then raise exception 'Stock quantity cannot be negative' using errcode = '22023'; end if;
  select sku into v_sku from public.product_variants where id = p_variant_id;
  if not found then raise exception 'Variant not found' using errcode = 'P0002'; end if;
  select quantity into v_old_quantity from public.inventory where variant_id = p_variant_id for update;
  if not found then
    insert into public.inventory (variant_id, quantity) values (p_variant_id, p_quantity);
    v_old_quantity := 0;
  else
    update public.inventory set quantity = p_quantity, updated_at = now() where variant_id = p_variant_id;
  end if;
  insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
    values (p_variant_id, v_sku, 'ADJUSTED', p_quantity - v_old_quantity, p_note, auth.uid());
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.search_products(integer, integer, text, text, text, numeric, numeric, text, text, text) from public;
grant execute on function public.search_products(integer, integer, text, text, text, numeric, numeric, text, text, text) to anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;
revoke all on function public.is_active_customer() from public, anon;
grant execute on function public.is_active_customer() to authenticated;
grant execute on function public.is_active_customer() to anon;
revoke all on function public.checkout_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.checkout_order(jsonb, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.save_product(jsonb) from public, anon, authenticated;
grant execute on function public.save_product(jsonb) to authenticated;
revoke all on function public.update_order_status(text, public.order_status, text) from public, anon, authenticated;
grant execute on function public.update_order_status(text, public.order_status, text) to authenticated;
revoke all on function public.update_payment_status(text, public.payment_status) from public, anon, authenticated;
grant execute on function public.update_payment_status(text, public.payment_status) to authenticated;
revoke all on function public.validate_discount(text, numeric) from public;
grant execute on function public.validate_discount(text, numeric) to anon, authenticated;
revoke all on function public.save_customer_address(jsonb, text) from public, anon;
grant execute on function public.save_customer_address(jsonb, text) to authenticated;
revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
revoke all on function public.adjust_inventory(text, integer, text) from public, anon, authenticated;
grant execute on function public.adjust_inventory(text, integer, text) to authenticated;

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
  using ((id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()));
create policy "Customers update their own non-role profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and role = 'customer')
  with check (id = (select auth.uid()) and role = 'customer' and status = 'ACTIVE'
    and email = lower((select auth.jwt() ->> 'email')));
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
create policy "Public reads product categories" on public.product_categories for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED')
    or (select public.is_admin()));
create policy "Admins manage product categories" on public.product_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Public reads product collections" on public.product_collections for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'PUBLISHED')
    or (select public.is_admin()));
create policy "Admins manage product collections" on public.product_collections for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers read own addresses" on public.addresses for select to authenticated
  using ((customer_id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()));
create policy "Customers create own addresses" on public.addresses for insert to authenticated
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()));
create policy "Customers update own addresses" on public.addresses for update to authenticated
  using (customer_id = (select auth.uid()) and (select public.is_active_customer()))
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()));
create policy "Customers delete own addresses" on public.addresses for delete to authenticated
  using ((customer_id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()));
create policy "Admins manage discounts" on public.discounts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Customers read own orders" on public.orders for select to authenticated
  using ((customer_id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()));
create policy "Admins manage orders" on public.orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())
      and (select public.is_active_customer()))
    or (select public.is_admin()));
create policy "Admins manage order items" on public.order_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own payments" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())
      and (select public.is_active_customer()))
    or (select public.is_admin()));
create policy "Admins manage payments" on public.payments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers read own order timeline" on public.order_timeline for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())
      and (select public.is_active_customer()))
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
  using (status = 'APPROVED'
    or (customer_id = (select auth.uid()) and (select public.is_active_customer()))
    or (select public.is_admin()));
create policy "Customers write own pending reviews" on public.reviews for insert to authenticated
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()) and status = 'PENDING');
create policy "Customers update own pending reviews" on public.reviews for update to authenticated
  using (customer_id = (select auth.uid()) and (select public.is_active_customer()) and status = 'PENDING')
  with check (customer_id = (select auth.uid()) and (select public.is_active_customer()) and status = 'PENDING');
create policy "Admins manage reviews" on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Customers manage own wishlist" on public.wishlists for all to authenticated
  using ((customer_id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()))
  with check ((customer_id = (select auth.uid()) and (select public.is_active_customer())) or (select public.is_admin()));
create policy "Customers manage own wishlist items" on public.wishlist_items for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.customer_id = (select auth.uid())
      and (select public.is_active_customer()))
    or (select public.is_admin()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.customer_id = (select auth.uid())
      and (select public.is_active_customer()))
    or (select public.is_admin()));

grant select on public.categories, public.collections, public.products, public.product_images,
  public.product_variants, public.inventory, public.product_categories, public.product_collections,
  public.store_settings, public.banners, public.reviews to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.newsletter_subscribers to anon;

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
    and (storage.extension(name) = any (array['jpg','jpeg','png','webp','avif','svg'])));
create policy "Admins update storefront images" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()))
  with check (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()));
create policy "Admins delete storefront images" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'store-assets') and (select public.is_admin()));
