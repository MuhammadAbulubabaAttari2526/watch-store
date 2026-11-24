create or replace function public.save_product(p_product jsonb)
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
  v_original_quantity integer;
  v_quantity_delta integer;
  v_new_quantity integer;
  v_quantity_changed boolean;
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
    v_quantity_changed := coalesce((v_variant ->> 'quantityChanged')::boolean, false);
    v_original_quantity := coalesce((v_variant ->> 'originalQuantity')::integer, v_quantity);
    if v_quantity < 0 or v_original_quantity < 0 then
      raise exception 'Stock quantity cannot be negative' using errcode = '22023';
    end if;
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

      v_quantity_delta := case when v_quantity_changed then v_quantity - v_original_quantity else 0 end;
      select quantity into v_old_quantity from public.inventory where variant_id = v_variant_id for update;
      if not found then
        v_old_quantity := 0;
        v_new_quantity := v_quantity_delta;
        if v_new_quantity < 0 then
          raise exception 'This stock adjustment would make inventory negative. Refresh and try again.' using errcode = '22023';
        end if;
        insert into public.inventory (variant_id, quantity) values (v_variant_id, v_new_quantity);
      elsif v_quantity_delta <> 0 then
        v_new_quantity := v_old_quantity + v_quantity_delta;
        if v_new_quantity < 0 then
          raise exception 'This stock adjustment would make inventory negative. Refresh and try again.' using errcode = '22023';
        end if;
        update public.inventory set quantity = v_new_quantity, updated_at = now() where variant_id = v_variant_id;
      end if;

      if v_quantity_delta <> 0 then
        insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
          values (v_variant_id, trim(v_variant ->> 'sku'), 'ADJUSTED', v_quantity_delta, 'Product editor stock adjustment', auth.uid());
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

drop function public.adjust_inventory(text, integer, text);

create function public.adjust_inventory(p_variant_id text, p_delta integer, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku text;
  v_old_quantity integer;
  v_new_quantity integer;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_delta is null then raise exception 'Enter a valid stock adjustment' using errcode = '22023'; end if;
  select sku into v_sku from public.product_variants where id = p_variant_id;
  if not found then raise exception 'Variant not found' using errcode = 'P0002'; end if;
  insert into public.inventory (variant_id, quantity) values (p_variant_id, 0)
    on conflict (variant_id) do nothing;
  select quantity into v_old_quantity from public.inventory where variant_id = p_variant_id for update;
  v_new_quantity := v_old_quantity + p_delta;
  if v_new_quantity < 0 then
    raise exception 'This stock adjustment would make inventory negative' using errcode = '22023';
  end if;
  if p_delta = 0 then return; end if;
  update public.inventory set quantity = v_new_quantity, updated_at = now() where variant_id = p_variant_id;
  insert into public.inventory_transactions (variant_id, variant_sku, type, change, note, user_id)
    values (p_variant_id, v_sku, 'ADJUSTED', p_delta, p_note, auth.uid());
end;
$$;

revoke all on function public.save_product(jsonb) from public, anon, authenticated;
grant execute on function public.save_product(jsonb) to authenticated;
revoke all on function public.adjust_inventory(text, integer, text) from public, anon, authenticated;
grant execute on function public.adjust_inventory(text, integer, text) to authenticated;
