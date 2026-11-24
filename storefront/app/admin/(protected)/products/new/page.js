import { redirect } from 'next/navigation';
import ProductEditorForm from '@/components/admin/ProductEditorForm';
import { requireAdmin } from '@/lib/admin/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Add product | VELTRIX', robots: { index: false } };

export default async function NewProductPage() {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const [{ data: categories, error: categoryError }, { data: collections, error: collectionError }] = await Promise.all([
    supabase.from('categories').select('id,name').order('name'),
    supabase.from('collections').select('id,name').order('name'),
  ]);
  if (categoryError || collectionError) throw new Error(`Could not load catalog options: ${categoryError?.message || collectionError?.message}`);
  return <section className="admin-page"><ProductEditorForm categories={categories || []} collections={collections || []} /></section>;
}
