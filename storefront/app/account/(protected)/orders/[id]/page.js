import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/auth/server';
import { formatPrice, whatsappUrl } from '@/lib/utils/format';
import OrderTrack from '@/components/account/OrderTrack';
export const metadata = { title: 'Order details | VELTRIX' };

export default async function Page({ params }) {
  let order;
  try { order = await getOrder(params.id); } catch (e) { return <div className="alert alert--error">We could not load this order. {e.message}</div>; }
  if (!order) notFound();
  const currency = order.currencyCode;
  const a = order.shipping_address || {};
  const wa = whatsappUrl(`Hello VELTRIX, I have a question about order #${order.display_id}.`);
  return (
    <div className="stack" style={{ '--stack': 'var(--sp-6)' }}>
      <div><Link href="/account/orders" className="link-btn">All orders</Link><h1 style={{ fontSize: 'var(--fs-2xl)', marginTop: 'var(--sp-2)' }}>Order #{order.display_id}</h1>
        <p className="product-card__meta">Placed {new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <OrderTrack order={order} />
      <ul className="mini">{(order.items || []).map((i) => <li key={i.id}><span>{i.product_title || i.title}{i.variant_title && !/^default/i.test(i.variant_title) ? ` (${i.variant_title})` : ''} x {i.quantity}</span><span>{formatPrice(i.total, currency)}</span></li>)}</ul>
      <dl className="summary" style={{ maxWidth: '24rem' }}>
        <div><dt>Subtotal</dt><dd>{formatPrice(order.item_subtotal ?? order.subtotal, currency)}</dd></div>
        {order.discount_total > 0 && <div className="summary__disc"><dt>Discount</dt><dd>-{formatPrice(order.discount_total, currency)}</dd></div>}
        <div><dt>Delivery</dt><dd>{formatPrice(order.shipping_total, currency)}</dd></div>
        <div className="summary__total"><dt>Total</dt><dd>{formatPrice(order.total, currency)}</dd></div>
      </dl>
      <p><strong>Payment:</strong> Cash on delivery{order.payment_status === 'captured' ? ' (paid)' : ''}</p>
      <p><strong>Delivering to:</strong> {a.first_name} {a.last_name}, {a.address_1}, {a.city}{a.postal_code ? `, ${a.postal_code}` : ''}. {a.phone}</p>
      {wa && <a className="btn btn--gold" href={wa} target="_blank" rel="noopener noreferrer">Ask about this order on WhatsApp</a>}
    </div>
  );
}
