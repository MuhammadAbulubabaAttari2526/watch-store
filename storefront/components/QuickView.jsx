'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from './StoreProvider';

export default function QuickView({ product: p, featured = false }) {
  const currency = useStoreCurrency();
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" className={featured ? 'featured-card__quickview' : 'link-btn'} onClick={() => setOpen(true)} aria-label={`Quick view of ${p.title}`}>
        {featured ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        ) : 'Quick view'}
      </button>
      {open && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal__panel" role="dialog" aria-modal="true" aria-label={p.title}>
            <button ref={closeRef} type="button" className="modal__close" onClick={() => setOpen(false)} aria-label="Close quick view">&times;</button>
            <div className="modal__media">{p.thumbnail ? <img src={p.thumbnail} alt={p.title} /> : <div className="ph">No image yet</div>}</div>
            <div className="modal__body stack">
              <h3>{p.title}</h3>
              {p.price != null && <div className={'price' + (p.onSale ? ' price--sale' : '')}>{formatPrice(p.price, currency)}{p.onSale && <s>{formatPrice(p.original, currency)}</s>}</div>}
              {p.description && <p>{p.description}</p>}
              <Link className="btn" href={`/products/${p.handle}`}>View details</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
