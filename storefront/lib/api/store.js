import { request } from './client';
import { toProduct } from './mappers';

const collection = (item) => ({ ...item, handle: item.slug, title: item.name });
const optionEntries = (options) => options && typeof options === 'object' && !Array.isArray(options) ? Object.entries(options) : [];

export async function listProducts({ limit = 8, collectionHandle, category, sort } = {}) {
  const result = await searchProducts({ page: 1, pageSize: limit, collection: collectionHandle, category, sort });
  return result.items;
}

export async function listCollections() {
  const { collections } = await request('/api/collections', { params: { limit: 100 } });
  return (collections || []).map(collection);
}

export async function listFilters() {
  const [{ categories }, collections] = await Promise.all([
    request('/api/categories'),
    listCollections(),
  ]);
  return {
    categories: (categories || []).map((category) => ({ ...category, handle: category.slug })),
    collections,
  };
}

export async function listOptionValues() {
  const { items } = await request('/api/products', { params: { page: 1, limit: 100 } });
  const values = (items || []).flatMap((product) => (product.variants || []).flatMap((variant) => optionEntries(variant.options)));
  const collect = (pattern) => [...new Set(values.filter(([key]) => pattern.test(key)).map(([, value]) => String(value)))].sort();
  return { colors: collect(/colou?r|dial/i), straps: collect(/strap/i) };
}

export async function searchProducts(filters = {}) {
  const sort = filters.sort === 'name' ? 'title' : filters.sort;
  const { items = [], ...page } = await request('/api/products', {
    params: {
      page: filters.page || 1,
      limit: filters.pageSize || filters.limit || 12,
      search: filters.q,
      category: filters.category,
      collection: filters.collection,
      min: filters.min,
      max: filters.max,
      color: filters.color,
      strap: filters.strap,
      sort,
    },
  });
  return { ...page, items: items.map(toProduct) };
}

export async function getProduct(handle) {
  const { product } = await request(`/api/products/${encodeURIComponent(handle)}`);
  return product ? toProduct(product) : null;
}

export async function listProductHandles() {
  const first = await request('/api/products', { params: { page: 1, limit: 100 } });
  const pages = await Promise.all(Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) =>
    request('/api/products', { params: { page: index + 2, limit: 100 } })
  ));
  return [first, ...pages].flatMap((result) => (result.items || []).map((product) => ({
    handle: product.slug,
    updatedAt: product.updatedAt,
  })));
}
