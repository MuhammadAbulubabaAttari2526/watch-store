import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminOrder } from '@/lib/admin/server';
import { updateOrderStatusAction, updatePaymentStatusAction } from '@/lib/admin/actions';
import { formatPrice } from '@/lib/utils/format';

export const metadata = { title: 'Order details | VELTRIX', robots: { index: false } };

export default async function AdminOrderPage({ params }) {
  const order = await getAdminOrder(params.id);
  if (!order) notFound();
  const currency = order.currency_code || 'PKR';
  const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ');

  return (
    <main className="admin-shell">
      <section className="admin-content stack">
        <Link href="/admin?tab=orders">Back to orders</Link>
        <header className="admin-topbar">
          <div><p>Order details</p><h1>#{order.order_number}</h1></div>
          <span className={`admin-status admin-status--${order.status.toLowerCase()}`}>{order.status}</span>
        </header>
        <div className="admin-grid">
          <article className="admin-panel stack">
            <h2>Customer</h2>
            <p>{customerName || 'Guest'}<br />{order.contact_email}<br />{order.customer?.phone || order.shipping_phone}</p>
            <h3>Delivery address</h3>
            <p>{order.shipping_first_name} {order.shipping_last_name}<br />{order.shipping_address1}{order.shipping_address2 ? `, ${order.shipping_address2}` : ''}<br />{order.shipping_city}{order.shipping_region ? `, ${order.shipping_region}` : ''} {order.shipping_postal_code}<br />{order.shipping_phone}</p>
            {order.order_notes && <><h3>Order notes</h3><p>{order.order_notes}</p></>}
          </article>
          <article className="admin-panel stack">
            <h2>Totals and payment</h2>
            <dl className="summary">
              <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal, currency)}</dd></div>
              <div><dt>Discount</dt><dd>{formatPrice(order.discount_total, currency)}</dd></div>
              <div><dt>Delivery</dt><dd>{formatPrice(order.shipping_total, currency)}</dd></div>
              <div className="summary__total"><dt>Total</dt><dd>{formatPrice(order.total, currency)}</dd></div>
            </dl>
            {(order.payments || []).map((payment) => (
              <form action={updatePaymentStatusAction} className="stack" key={payment.id}>
                <input type="hidden" name="id" value={order.id} />
                <label className="field">Payment status ({payment.method})
                  <select className="input" name="status" defaultValue={payment.status}>
                    {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <button className="btn btn--ghost" type="submit">Update payment</button>
              </form>
            ))}
          </article>
        </div>
        <article className="admin-panel">
          <div className="admin-panel__head"><h2>Items</h2></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Unit price</th><th>Quantity</th><th>Line total</th></tr></thead>
            <tbody>{(order.order_items || []).map((item) => (
              <tr key={item.id}><td>{item.product_title} <small>{item.variant_title}</small></td><td>{item.sku}</td><td>{formatPrice(item.unit_price, currency)}</td><td>{item.quantity}</td><td>{formatPrice(item.line_total, currency)}</td></tr>
            ))}</tbody>
          </table></div>
        </article>
        <article className="admin-panel stack">
          <div className="admin-panel__head"><h2>Status and timeline</h2></div>
          <form action={updateOrderStatusAction} className="admin-panel__head">
            <input type="hidden" name="id" value={order.id} />
            <label className="field">New status<select className="input" name="status" defaultValue={order.status}>
              {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].map((status) => <option key={status}>{status}</option>)}
            </select></label>
            <label className="field">Note<input className="input" name="note" maxLength="500" /></label>
            <button className="btn" type="submit">Update order</button>
          </form>
          <ol>{(order.order_timeline || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((item) => (
            <li key={item.id}>{item.status} — {item.note || 'Status updated'} ({new Date(item.created_at).toLocaleString('en-PK')})</li>
          ))}</ol>
        </article>
      </section>
    </main>
  );
}
