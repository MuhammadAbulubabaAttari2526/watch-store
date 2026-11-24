import { Suspense } from 'react';
import ProductCard from './ProductCard';
import RetryButton from './RetryButton';
import Link from 'next/link';

function Skeleton({ featured = false }) {
  return (
    <div className={'product-grid' + (featured ? ' product-grid--featured' : '')} aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i}><div className="skeleton" style={{ aspectRatio: '4/5' }} /><div className="skeleton skeleton--text" style={{ width: '70%', marginTop: 12 }} /><div className="skeleton skeleton--text" style={{ width: '35%' }} /></div>
      ))}
    </div>
  );
}

async function Body({ load, empty, featured = false }) {
  let products;
  try { products = await load(); }
  catch (e) {
    return <div className="alert alert--error stack"><p>We could not load these watches. {e.message}</p><RetryButton /></div>;
  }
  if (products.length === 0) return <div className="empty"><p>{empty}</p></div>;
  return <div className={'product-grid' + (featured ? ' product-grid--featured' : '')}>{products.map((p) => <ProductCard key={p.id} product={p} featured={featured} />)}</div>;
}

export default function ProductRail({ id, title, load, empty }) {
  const featured = id === 'featured';
  return (
    <section id={id} className={'section product-rail' + (featured ? ' product-rail--featured' : '')} aria-labelledby={id + '-t'}>
      <div className="container">
        {featured ? (
          <div className="featured-heading">
            <span className="featured-heading__rule" aria-hidden="true" />
            <div className="featured-heading__copy">
              <h2 id={id + '-t'}>Featured <em>Watches</em></h2>
              <p>Timeless pieces. Exceptional style.</p>
            </div>
            <Link className="featured-heading__link" href="/products">View All <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="section-head"><h2 id={id + '-t'}>{title}</h2><hr className="tick-rule" /></div>
        )}
        <Suspense fallback={<Skeleton featured={featured} />}><Body load={load} empty={empty} featured={featured} /></Suspense>
      </div>
    </section>
  );
}
