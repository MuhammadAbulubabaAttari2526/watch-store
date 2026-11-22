import { getSupabaseBrowser } from '@/lib/supabase/client';
import { toProduct } from './mappers';

export async function suggest(query) {
  const { data, error } = await getSupabaseBrowser().rpc('search_products', {
    p_page: 1,
    p_limit: 5,
    p_search: query,
  });
  if (error) throw new Error(`Could not search products: ${error.message}`);
  return (data?.items || []).map(toProduct);
}
