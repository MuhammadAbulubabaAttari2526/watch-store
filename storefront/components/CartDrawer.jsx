'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import CartLines from './CartLines';
import CartSummary from './CartSummary';

export default function CartDrawer() {
  const { open, closeDrawer, cart, items, shipFrom, error } = useCart();
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, closeDrawer]);
  return (
    <div className={'drawer' + (open ? ' is-open' : '')} aria-hidden={!open}>
      <div className="drawer__scrim" onClick={closeDrawer} />
      <aside className="drawer__panel" role="dialog" aria-modal="true" aria-label="Shopping cart">
        <div className="drawer__head"><h2>Your cart</h2><button ref={closeRef} type="button" className="icon-btn" onClick={closeDrawer} aria-label="Close cart" tabIndex={open ? 0 : -1}>&times;</button></div>
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        {items.length === 0 ? (
          <div className="empty"><h3>Your cart is empty</h3><p>Add a watch to get started.</p><Link className="btn" href="/products" onClick={closeDrawer}>Continue shopping</Link></div>
        ) : (
          <>
            <div className="drawer__body"><CartLines /></div>
            <div className="drawer__foot stack">
              <CartSummary cart={cart} shipFrom={shipFrom} />
              <Link className="btn btn--block" href="/checkout" onClick={closeDrawer}>Proceed to checkout</Link>
              <Link className="btn btn--ghost btn--block" href="/cart" onClick={closeDrawer}>View cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
