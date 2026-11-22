import ProductEditorForm from '@/components/admin/ProductEditorForm';
import { getAdminProduct, requireAdmin } from '@/lib/admin/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Edit product | VELTRIX', robots: { index: false } };

export default async function EditProductPage({ params }) {
  await requireAdmin();
  const [product, supabase] = await Promise.all([getAdminProduct(params.id), Promise.resolve(getSupabaseServer())]);
  if (!product) return <main className="admin-shell"><section className="admin-content"><p>Product not found.</p></section></main>;
  const [{ data: categories, error: categoryError }, { data: collections, error: collectionError }] = await Promise.all([
    supabase.from('categories').select('id,name').order('name'),
    supabase.from('collections').select('id,name').order('name'),
  ]);
  if (categoryError || collectionError) throw new Error(`Could not load catalog options: ${categoryError?.message || collectionError?.message}`);
  return <main className="admin-shell"><section className="admin-content"><ProductEditorForm product={product} categories={categories || []} collections={collections || []} /></section></main>;
}
