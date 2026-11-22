'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import QuickView from './QuickView';
import { useStoreCurrency } from './StoreProvider';

export default function ProductCard({ product: p }) {
  const currency = useStoreCurrency();
  const href = `/products/${p.handle}`;
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
