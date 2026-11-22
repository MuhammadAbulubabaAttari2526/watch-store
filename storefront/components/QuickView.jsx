'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils/format';

export default function QuickView({ product: p }) {
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
      <button type="button" className="link-btn" onClick={() => setOpen(true)} aria-label={`Quick view of ${p.title}`}>Quick view</button>
      {open && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal__panel" role="dialog" aria-modal="true" aria-label={p.title}>
            <button ref={closeRef} type="button" className="modal__close" onClick={() => setOpen(false)} aria-label="Close quick view">&times;</button>
            <div className="modal__media">{p.thumbnail ? <img src={p.thumbnail} alt={p.title} /> : <div className="ph">No image yet</div>}</div>
            <div className="modal__body stack">
              <h3>{p.title}</h3>
              {p.price != null && <div className={'price' + (p.onSale ? ' price--sale' : '')}>{formatPrice(p.price)}{p.onSale && <s>{formatPrice(p.original)}</s>}</div>}
              {p.description && <p>{p.description}</p>}
              <Link className="btn" href={`/products/${p.handle}`}>View details</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
