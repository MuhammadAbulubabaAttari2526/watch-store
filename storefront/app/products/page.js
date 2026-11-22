import Link from 'next/link';
import { searchProducts, listFilters, listOptionValues } from '@/lib/api/store';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop watches | VELTRIX', description: 'Browse VELTRIX watches by collection, category and price.', alternates: { canonical: '/products' } };

const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : undefined; };

export default async function ProductsPage({ searchParams }) {
  const q = {
    page: Math.max(1, num(searchParams.page) || 1), sort: searchParams.sort || 'newest',
    collection: searchParams.collection || '', category: searchParams.category || '',
    min: num(searchParams.min), max: num(searchParams.max), q: searchParams.q || '',
    color: searchParams.color || '', strap: searchParams.strap || '',
  };
  let result, filters, error;
  try {
    let opts;
    [result, filters, opts] = await Promise.all([searchProducts(q), listFilters(), listOptionValues()]);
    filters = { ...filters, ...opts };
  }
  catch (e) { error = e; }

  const hrefFor = (page) => {
    const p = new URLSearchParams();
    Object.entries({ ...q, page }).forEach(([k, v]) => v !== '' && v != null && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'newest') && p.set(k, v));
    const s = p.toString();
    return s ? `/products?${s}` : '/products';
  };
  const activeCollection = filters?.collections.find((c) => c.handle === q.collection);

  return (
    <section className="section">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Watches</span></nav>
        <div className="section-head"><h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>{q.q ? `Results for \u201c${q.q}\u201d` : activeCollection ? activeCollection.title : 'All watches'}</h1><hr className="tick-rule" /></div>

        {error && <div className="alert alert--error stack"><p>We could not load watches. {error.message}</p><Link className="btn btn--ghost" href={hrefFor(q.page)}>Try again</Link></div>}
        {!error && (
          <>
            <ProductFilters filters={filters} current={q} />
            <p className="results-count" role="status">{result.total === 0 ? 'No watches found' : `${result.total} ${result.total === 1 ? 'watch' : 'watches'}`}</p>
            {result.items.length === 0
              ? <div className="empty"><h2 style={{ fontSize: 'var(--fs-xl)' }}>No watches match these filters</h2><p>Try a wider price range or another collection.</p><Link className="btn" href="/products">Reset filters</Link></div>
              : <div className="product-grid">{result.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
            <Pagination page={result.page} pages={result.pages} hrefFor={hrefFor} />
          </>
        )}
      </div>
    </section>
  );
}
