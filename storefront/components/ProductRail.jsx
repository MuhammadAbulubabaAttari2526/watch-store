import { Suspense } from 'react';
import ProductCard from './ProductCard';
import RetryButton from './RetryButton';

function Skeleton() {
  return (
    <div className="product-grid" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i}><div className="skeleton" style={{ aspectRatio: '4/5' }} /><div className="skeleton skeleton--text" style={{ width: '70%', marginTop: 12 }} /><div className="skeleton skeleton--text" style={{ width: '35%' }} /></div>
      ))}
    </div>
  );
}

async function Body({ load, empty }) {
  let products;
  try { products = await load(); }
  catch (e) {
    return <div className="alert alert--error stack"><p>We could not load these watches. {e.message}</p><RetryButton /></div>;
  }
  if (products.length === 0) return <div className="empty"><p>{empty}</p></div>;
  return <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}

export default function ProductRail({ id, title, load, empty }) {
  return (
    <section id={id} className="section" aria-labelledby={id + '-t'}>
      <div className="container">
        <div className="section-head"><h2 id={id + '-t'}>{title}</h2><hr className="tick-rule" /></div>
        <Suspense fallback={<Skeleton />}><Body load={load} empty={empty} /></Suspense>
      </div>
    </section>
  );
}
