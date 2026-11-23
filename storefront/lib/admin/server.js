import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

function mapProduct(product) {
  return {
    ...product,
    updatedAt: product.updated_at,
    variants: (product.product_variants || []).map((variant) => ({
      ...variant,
      inventory: Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory,
    })),
  };
}

function mapOrder(order) {
  return {
    ...order,
    orderNumber: order.order_number,
    currencyCode: order.currency_code,
    createdAt: order.created_at,
    customer: order.customer ? {
      firstName: order.customer.first_name,
      lastName: order.customer.last_name,
      email: order.customer.email,
    } : null,
    items: order.order_items || [],
  };
}

export async function getAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError?.name === 'AuthSessionMissingError' ||
      authError?.message?.toLowerCase().includes('auth session missing')) {
    return null;
  }
  if (authError) throw new Error(`Could not verify admin session: ${authError.message}`);
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,first_name,last_name,role,status')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load admin profile: ${error.message}`);
  if (!profile || profile.role !== 'admin' || profile.status !== 'ACTIVE') return null;
  return {
    ...profile,
    email: user.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

export async function getAdminProduct(id) {
  await requireAdmin();
  const { data, error } = await getSupabaseServer()
    .from('products')
    .select('*,product_images(*),product_variants(*,inventory(*)),product_categories(category_id),product_collections(collection_id)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  return data;
}

export async function getAdminOrder(id) {
  await requireAdmin();
  const { data, error } = await getSupabaseServer()
    .from('orders')
    .select('*,customer:profiles(id,email,first_name,last_name,phone),order_items(*),payments(*),order_timeline(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  return data;
}

export async function getAdminCustomer(id) {
  await requireAdmin();
  const { data, error } = await getSupabaseServer()
    .from('profiles')
    .select('id,email,first_name,last_name,phone,status,created_at,addresses(*),orders:orders!orders_customer_id_fkey(id,order_number,status,total,currency_code,created_at)')
    .eq('id', id)
    .eq('role', 'customer')
    .maybeSingle();
  if (error) throw new Error(`Could not load customer: ${error.message}`);
  return data;
}

export async function adminApi(method, path, options = {}) {
  await requireAdmin();
  if (method !== 'GET') throw new Error('Admin data operations must use their dedicated secure actions.');
  const supabase = getSupabaseServer();

  if (path === '/api/admin/analytics/overview') {
    const { data, error } = await supabase.rpc('admin_overview');
    if (error) throw new Error(`Could not load dashboard analytics: ${error.message}`);
    return data;
  }

  if (path === '/api/admin/orders') {
    const limit = Math.min(Math.max(Number(options.params?.limit) || 50, 1), 100);
    let query = supabase
      .from('orders')
      .select('*,customer:profiles(first_name,last_name,email),order_items(*),payments(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (options.params?.status) query = query.eq('status', options.params.status);
    if (options.params?.search) {
      const search = String(options.params.search).replace(/[,%()]/g, ' ').trim();
      if (search) query = query.or(`order_number.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }
    const { data, count, error } = await query;
    if (error) throw new Error(`Could not load admin orders: ${error.message}`);
    return { items: (data || []).map(mapOrder), total: count || 0 };
  }

  if (path === '/api/admin/products') {
    const limit = Math.min(Math.max(Number(options.params?.limit) || 50, 1), 100);
    const { data, count, error } = await supabase
      .from('products')
      .select('*,product_variants(*,inventory(*))', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Could not load admin products: ${error.message}`);
    return { items: (data || []).map(mapProduct), total: count || 0 };
  }

  if (path === '/api/admin/customers') {
    const limit = Math.min(Math.max(Number(options.params?.limit) || 50, 1), 100);
    let query = supabase
      .from('profiles')
      .select('id,email,first_name,last_name,phone,status,created_at,orders:orders!orders_customer_id_fkey(count)', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (options.params?.status && ['ACTIVE', 'DISABLED'].includes(options.params.status)) {
      query = query.eq('status', options.params.status);
    }
    const search = String(options.params?.search || '').replace(/[^a-zA-Z0-9@.+ -]/g, ' ').trim().slice(0, 100);
    if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    const { data, count, error } = await query;
    if (error) throw new Error(`Could not load admin customers: ${error.message}`);
    return {
      items: (data || []).map(({ orders: customerOrders, ...customer }) => ({
        ...customer,
        order_count: customerOrders?.[0]?.count || 0,
      })),
      total: count || 0,
    };
  }

  if (path === '/api/admin/reviews') {
    const limit = Math.min(Math.max(Number(options.params?.limit) || 100, 1), 200);
    let query = supabase
      .from('reviews')
      .select('id,rating,title,body,status,created_at,product:products(title,slug),customer:profiles(first_name,last_name,email)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (options.params?.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(options.params.status)) {
      query = query.eq('status', options.params.status);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Could not load admin reviews: ${error.message}`);
    return { items: data || [] };
  }

  if (path === '/api/admin/inventory/history') {
    const { data, error } = await supabase.from('inventory_transactions')
      .select('id,variant_id,variant_sku,type,change,note,user_id,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(`Could not load inventory history: ${error.message}`);
    const variantIds = [...new Set((data || []).map((entry) => entry.variant_id).filter(Boolean))];
    const userIds = [...new Set((data || []).map((entry) => entry.user_id).filter(Boolean))];
    const [variantsResult, usersResult] = await Promise.all([
      variantIds.length
        ? supabase.from('product_variants').select('id,title,product:products(title,slug)').in('id', variantIds)
        : { data: [], error: null },
      userIds.length
        ? supabase.from('profiles').select('id,first_name,last_name,email').in('id', userIds)
        : { data: [], error: null },
    ]);
    if (variantsResult.error || usersResult.error) {
      throw new Error(`Could not load inventory history details: ${variantsResult.error?.message || usersResult.error?.message}`);
    }
    const variants = new Map((variantsResult.data || []).map((variant) => [variant.id, variant]));
    const users = new Map((usersResult.data || []).map((user) => [user.id, user]));
    return {
      items: (data || []).map((entry) => ({
        ...entry,
        variant: variants.get(entry.variant_id) || null,
        user: users.get(entry.user_id) || null,
      })),
    };
  }

  if (path === '/api/admin/settings') {
    const [
      { data: settings, error: settingsError },
      { data: banners, error: bannerError },
      { data: categories, error: categoriesError },
      { data: collections, error: collectionsError },
      { data: discounts, error: discountsError },
    ] = await Promise.all([
      supabase.from('store_settings').select('key,value').order('key'),
      supabase.from('banners').select('*').order('position'),
      supabase.from('categories').select('id,name,slug,description,parent_id').order('name'),
      supabase.from('collections').select('id,name,slug,description').order('name'),
      supabase.from('discounts').select('*').order('created_at', { ascending: false }),
    ]);
    const queryError = settingsError || bannerError || categoriesError || collectionsError || discountsError;
    if (queryError) throw new Error(`Could not load admin settings: ${queryError.message}`);
    return {
      settings: Object.fromEntries((settings || []).map(({ key, value }) => [key, value])),
      banners: banners || [],
      categories: categories || [],
      collections: collections || [],
      discounts: discounts || [],
    };
  }

  throw new Error(`Unsupported admin query: ${path}`);
}
