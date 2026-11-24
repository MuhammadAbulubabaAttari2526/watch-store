import { getSupabaseServer } from '@/lib/supabase/server';
import { toProduct } from './mappers';

const collection = (item) => ({ ...item, handle: item.slug, title: item.name });

function mapProduct(row) {
  if (!row) return null;
  return {
    ...row,
    caseMaterial: row.caseMaterial ?? row.case_material,
    caseDiameter: row.caseDiameter ?? row.case_diameter,
    strapMaterial: row.strapMaterial ?? row.strap_material,
    waterResistance: row.waterResistance ?? row.water_resistance,
    dialColor: row.dialColor ?? row.dial_color,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    images: (row.images ?? row.product_images ?? []).slice().sort((a, b) => (a.position || 0) - (b.position || 0)),
    variants: (row.variants ?? row.product_variants ?? []).map((variant) => ({
      ...variant,
      salePrice: variant.salePrice ?? variant.sale_price,
      isActive: variant.isActive ?? variant.is_active,
      inventory: Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory,
    })),
    collections: row.collections ?? (row.product_collections || []).map((entry) => entry.collection).filter(Boolean),
  };
}

export async function listProducts({ limit = 8, collectionHandle, category, sort } = {}) {
  const result = await searchProducts({ page: 1, pageSize: limit, collection: collectionHandle, category, sort });
  return result.items;
}

export async function listCollections() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from('collections').select('id,name,slug,description').order('name');
  if (error) throw new Error(`Could not load collections: ${error.message}`);
  return (data || []).map(collection);
}

export async function getPublicStoreSettings() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from('store_settings').select('key,value').eq('is_public', true);
  if (error?.code === 'PGRST205') return {};
  if (error) throw new Error(`Could not load store settings: ${error.message}`);
  return Object.fromEntries((data || []).map(({ key, value }) => [key, value]));
}

export async function listBanners() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('banners')
    .select('id,title,image_url,link_url,alt_text')
    .eq('is_active', true)
    .order('position');
  if (error?.code === 'PGRST205') return [];
  if (error) throw new Error(`Could not load store banners: ${error.message}`);
  return (data || []).map((banner) => ({
    ...banner,
    imageUrl: banner.image_url,
    linkUrl: banner.link_url,
    altText: banner.alt_text,
  }));
}

export async function listFilters() {
  const supabase = getSupabaseServer();
  const [{ data: categories, error: categoriesError }, collections] = await Promise.all([
    supabase.from('categories').select('id,name,slug,parent_id').order('name'),
    listCollections(),
  ]);
  if (categoriesError) throw new Error(`Could not load categories: ${categoriesError.message}`);
  return {
    categories: (categories || []).map((item) => ({ ...item, parentId: item.parent_id, handle: item.slug })),
    collections,
  };
}

export async function listOptionValues() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('product_variants')
    .select('options,products!inner(status)')
    .eq('is_active', true)
    .eq('products.status', 'PUBLISHED');
  if (error) throw new Error(`Could not load product options: ${error.message}`);
  const values = (data || []).flatMap(({ options }) => options && typeof options === 'object' && !Array.isArray(options)
    ? Object.entries(options)
    : []);
  const collect = (pattern) => [...new Set(values.filter(([key]) => pattern.test(key)).map(([, value]) => String(value)))].sort();
  return { colors: collect(/colou?r/i), straps: collect(/strap/i) };
}

export async function searchProducts(filters = {}) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc('search_products', {
    p_page: filters.page || 1,
    p_limit: filters.pageSize || filters.limit || 12,
    p_search: filters.q || null,
    p_category: filters.category || null,
    p_collection: filters.collection || null,
    p_min: filters.min ?? null,
    p_max: filters.max ?? null,
    p_color: filters.color || null,
    p_strap: filters.strap || null,
    p_sort: filters.sort === 'name' ? 'title' : filters.sort || 'newest',
  });
  if (error) throw new Error(`Could not search products: ${error.message}`);
  const result = data || { items: [], total: 0, page: 1, pages: 1 };
  return { ...result, items: (result.items || []).map((product) => toProduct(mapProduct(product))) };
}

export async function getProduct(handle) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('products')
    .select('*,product_images(*),product_variants(*,inventory(*)),product_collections(collection:collections(*))')
    .eq('slug', handle)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  return data ? toProduct(mapProduct(data)) : null;
}

export async function getProductReviews(productId) {
  const supabase = getSupabaseServer();
  const [reviewsResult, authResult] = await Promise.all([
    supabase.from('reviews')
      .select('id,rating,title,body,created_at')
      .eq('product_id', productId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.auth.getUser(),
  ]);

  if (reviewsResult.error) throw new Error(`Could not load product reviews: ${reviewsResult.error.message}`);

  let ownReview = null;
  const user = authResult.data?.user;
  if (user) {
    const { data, error } = await supabase.from('reviews')
      .select('id,rating,status,created_at')
      .eq('product_id', productId)
      .eq('customer_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Could not load your product review: ${error.message}`);
    ownReview = data;
  }

  return { items: reviewsResult.data || [], ownReview };
}

export async function listProductHandles() {
  const first = await searchProducts({ page: 1, pageSize: 100 });
  const remaining = await Promise.all(Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) =>
    searchProducts({ page: index + 2, pageSize: 100 })
  ));
  return [first, ...remaining].flatMap((result) => result.items.map((product) => ({
    handle: product.slug,
    updatedAt: product.updatedAt,
  })));
}
