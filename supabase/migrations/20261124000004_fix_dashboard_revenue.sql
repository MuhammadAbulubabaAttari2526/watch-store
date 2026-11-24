create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'totalRevenue', coalesce((
      select sum(o.total) from public.orders o
      where o.status = 'DELIVERED'
        or exists (select 1 from public.payments pm where pm.order_id = o.id and pm.status = 'PAID')
    ), 0),
    'totalRevenueByCurrency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency_code, 'total', revenue) order by currency_code)
      from (
        select o.currency_code, sum(o.total) as revenue from public.orders o
        where o.status = 'DELIVERED'
          or exists (select 1 from public.payments pm where pm.order_id = o.id and pm.status = 'PAID')
        group by o.currency_code
      ) revenue_by_currency
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
