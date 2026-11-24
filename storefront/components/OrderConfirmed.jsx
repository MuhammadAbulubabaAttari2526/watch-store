'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice, whatsappUrl } from '@/lib/utils/format';
import { etaFor } from '@/lib/config/delivery';
import { useStoreCurrency } from './StoreProvider';

export default function OrderConfirmed() {
  const storeCurrency = useStoreCurrency();
  const [o, setO] = useState(undefined);
  useEffect(() => {
    let recentOrder = null;
    let savedOrderNumber = null;
    try { recentOrder = JSON.parse(sessionStorage.getItem('veltrix_last_order')) || null; } catch {}
    try { savedOrderNumber = localStorage.getItem('veltrix_last_order_number'); } catch {}
    setO(recentOrder || (savedOrderNumber ? { number: savedOrderNumber, persistedOnly: true } : null));
  }, []);
  if (o === undefined) return <div className="skeleton" style={{ height: 240 }} aria-busy="true" />;
  if (!o) return <div className="empty"><h2 style={{ fontSize: 'var(--fs-xl)' }}>No recent order found</h2><p>If you just placed an order, check this device for your saved order number.</p><Link className="btn" href="/products">Continue shopping</Link></div>;
  if (o.persistedOnly) return (
    <div className="confirm stack">
      <div className="alert alert--success" role="status">Your saved order number is <strong>#{o.number}</strong>.</div>
      <p>No email confirmation is sent at the moment. Keep this number for reference.</p>
      <Link className="btn btn--ghost" href="/products">Continue shopping</Link>
    </div>
  );
  const currency = o.currency || storeCurrency;
  const wa = whatsappUrl(`Hello VELTRIX, I placed order #${o.number} (${formatPrice(o.total, currency)}, cash on delivery) for delivery to ${o.address.first_name} ${o.address.last_name || ''} in ${o.address.city}. Please confirm.`);
  return (
    <div className="confirm stack">
      <div className="alert alert--success" role="status">Order placed. Your order number is <strong>#{o.number}</strong>.</div>
      <p>No email confirmation is sent at the moment. Keep order number #{o.number} for reference, and please keep your phone nearby with the amount ready for the courier.</p>
      <ul className="mini">{o.items.map((i, n) => <li key={n}><span>{i.title}{i.variant && !/^default/i.test(i.variant) ? ` (${i.variant})` : ''} x {i.qty}</span><span>{formatPrice(i.total, currency)}</span></li>)}</ul>
      <dl className="summary">
        <div><dt>Subtotal</dt><dd>{formatPrice(o.subtotal, currency)}</dd></div>
        {o.discount_total > 0 && <div className="summary__disc"><dt>Discount</dt><dd>-{formatPrice(o.discount_total, currency)}</dd></div>}
        <div><dt>Delivery</dt><dd>{formatPrice(o.shipping_total, currency)}</dd></div>
        <div className="summary__total"><dt>Total to pay on delivery</dt><dd>{formatPrice(o.total, currency)}</dd></div>
      </dl>
      <p>Estimated delivery to {o.address.city}: {etaFor(o.address.city)}.</p>
      <p><strong>Delivering to:</strong> {o.address.first_name} {o.address.last_name}, {o.address.address_1}, {o.address.city}. {o.address.phone}</p>
      <div className="row">{wa && <a className="btn btn--gold" href={wa} target="_blank" rel="noopener noreferrer">Confirm on WhatsApp</a>}<Link className="btn btn--ghost" href="/products">Continue shopping</Link></div>
    </div>
  );
}
