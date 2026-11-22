import { request } from './client';
import { toProduct } from './mappers';

export async function suggest(query) {
  const { items } = await request('/api/products', { params: { search: query, limit: 5 } });
  return (items || []).map(toProduct);
}
