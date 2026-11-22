import Link from 'next/link';
import { listOrders } from '@/lib/auth/server';
import { formatPrice } from '@/lib/utils/format';
import Pagination from '@/components/Pagination';
export const metadata = { title: 'Order history | VELTRIX' };

const label = (o) => (o.status === 'canceled' ? 'Cancelled' : { delivered: 'Delivered', partially_delivered: 'Delivered', shipped: 'Shipped', partially_shipped: 'Shipped', fulfilled: 'Being prepared', partially_fulfilled: 'Being prepared' }[o.fulfillment_status] || 'Order placed');

export default async function Page({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams.page, 10) || 1);
  let data, error;
  try { data = await listOrders(page); } catch (e) { error = e; }
  return (
    <>
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Orders</h1><hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} />
      {error && <div className="alert alert--error">We could not load your orders. {error.message}</div>}
      {data && data.orders.length === 0 && <div className="empty"><h3>No orders yet</h3><p>When you place an order it will show up here.</p><Link className="btn" href="/products">Browse watches</Link></div>}
      {data && data.orders.length > 0 && (
        <>
          <ul className="orders">
            {data.orders.map((o) => (
              <li key={o.id}><Link href={`/account/orders/${o.id}`} className="orders__row">
                <span><strong>Order #{o.display_id}</strong><small>{new Date(o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
                <span className="badge badge--muted">{label(o)}</span><span className="price">{formatPrice(o.total, o.currencyCode)}</span>
              </Link></li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} hrefFor={(n) => (n === 1 ? '/account/orders' : `/account/orders?page=${n}`)} />
        </>
      )}
    </>
  );
}
