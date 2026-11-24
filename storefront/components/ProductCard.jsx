'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils/format';
import { useCart } from './CartProvider';
import QuickView from './QuickView';
import { useStoreCurrency } from './StoreProvider';

function FeaturedCartAction({ product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const options = product.options || [];
  const needsChoice = options.some((option) => option.values.length > 1);
  const variant = needsChoice ? null : product.variants?.find((item) =>
    options.every((option) => option.values.length !== 1
      || String(item.options?.[option.id] ?? '') === String(option.values[0]))
  );
  const label = needsChoice ? 'Choose options'
    : variant ? (variant.available ? 'Add to Cart' : 'Sold Out')
      : 'View Details';

  async function addToCart() {
    if (needsChoice || !variant) {
      router.push(`/products/${product.handle}`);
      return;
    }
    if (!variant.available || !variant.id) return;
    setWorking(true);
    setError('');
    try {
      await addItem(variant.id, 1);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button className="featured-card__cart" type="button" onClick={addToCart}
        disabled={working || (variant && !variant.available)}>
        {working ? 'Adding…' : label}
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6" />
          <circle cx="10" cy="21" r="1" /><circle cx="18" cy="21" r="1" />
        </svg>
      </button>
      {error && <span className="featured-card__error" role="alert">{error}</span>}
    </>
  );
}

export default function ProductCard({ product: p, featured = false }) {
  const currency = useStoreCurrency();
  const href = `/products/${p.handle}`;
  if (featured) {
    return (
      <article className="product-card product-card--featured">
        <Link href={href} className="product-card__media" tabIndex={-1} aria-hidden="true">
          {p.thumbnail ? <img src={p.thumbnail} alt="" loading="lazy" decoding="async" width="640" height="800" sizes="(min-width: 48em) 31rem, 100vw" /> : <div className="ph">No image yet</div>}
        </Link>
        <span className="featured-card__badge">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.2 6.1 6.5.3-5 4 1.7 6.3-5.4-3.6-5.4 3.6 1.7-6.3-5-4 6.5-.3L12 2Z" /></svg>
          Featured
        </span>
        {p.onSale && <span className="featured-card__sale">-{p.discount}%</span>}
        <QuickView product={p} featured />
        <div className="product-card__body product-card__body--featured">
          <Link href={href} className="product-card__link"><h3 className="product-card__name">{p.title}</h3></Link>
          {p.subtitle && <span className="product-card__meta">{p.subtitle}</span>}
          {p.price != null
            ? <div className={'price price--featured' + (p.onSale ? ' price--sale' : '')}>{formatPrice(p.price, currency)}{p.onSale && <s>{formatPrice(p.original, currency)}</s>}</div>
            : <div className="product-card__meta">Price on request</div>}
          <FeaturedCartAction product={p} />
        </div>
      </article>
    );
  }
  return (
    <article className="product-card">
      <Link href={href} className="product-card__media" tabIndex={-1} aria-hidden="true">
        {p.thumbnail ? <img src={p.thumbnail} alt="" loading="lazy" decoding="async" width="640" height="800" sizes="(min-width: 72em) 20vw, (min-width: 48em) 30vw, 50vw" /> : <div className="ph">No image yet</div>}
        {p.onSale && <div className="product-card__badges"><span className="badge badge--sale">-{p.discount}%</span></div>}
      </Link>
      <div className="product-card__body">
        <Link href={href} className="product-card__link"><h3 className="product-card__name">{p.title}</h3></Link>
        {p.subtitle && <span className="product-card__meta">{p.subtitle}</span>}
        {p.price != null
          ? <div className={'price' + (p.onSale ? ' price--sale' : '')}>{formatPrice(p.price, currency)}{p.onSale && <s>{formatPrice(p.original, currency)}</s>}</div>
          : <div className="product-card__meta">Price on request</div>}
        <QuickView product={p} />
      </div>
    </article>
  );
}
