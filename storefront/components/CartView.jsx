'use client';
import Link from 'next/link';
import { useCart } from './CartProvider';
import CartLines from './CartLines';
import CartSummary from './CartSummary';
import CouponForm from './CouponForm';

export default function CartView() {
  const { cart, items, ready, shipFrom, error } = useCart();
  if (!ready) return <div className="skeleton" style={{ height: 240 }} aria-busy="true" />;
  if (items.length === 0) return <div className="empty"><h2 style={{ fontSize: 'var(--fs-xl)' }}>Your cart is empty</h2><p>Browse the collection and add a watch to get started.</p><Link className="btn" href="/products">Continue shopping</Link></div>;
  return (
    <div className="cart-layout">
      <div>{error && <div className="alert alert--error" role="alert">{error}</div>}<CartLines /></div>
      <div className="cart-side stack">
        <CouponForm />
        <CartSummary cart={cart} shipFrom={shipFrom} />
        <Link className="btn btn--block" href="/checkout">Proceed to checkout</Link>
        <Link className="btn btn--ghost btn--block" href="/products">Continue shopping</Link>
      </div>
    </div>
  );
}
