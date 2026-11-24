import Link from 'next/link';
import { notFound } from 'next/navigation';
import CustomerStatusForm from '@/components/admin/CustomerStatusForm';
import { getAdminCustomer } from '@/lib/admin/server';
import { formatPrice } from '@/lib/utils/format';

export const metadata = { title: 'Customer details | VELTRIX', robots: { index: false } };

export default async function AdminCustomerPage({ params }) {
  const customer = await getAdminCustomer(params.id);
  if (!customer) notFound();

  return (
    <main className="admin-page admin-page--detail">
        <Link href="/admin?tab=customers">Back to customers</Link>
        <header className="admin-topbar">
          <div>
            <p>Customer account</p>
            <h1>{[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email}</h1>
          </div>
          <span className={`admin-status admin-status--${customer.status.toLowerCase()}`}>{customer.status}</span>
        </header>
        <div className="admin-grid">
          <article className="admin-panel stack">
            <h2>Contact</h2>
            <p>{customer.email}<br />{customer.phone || 'No phone number'}</p>
            <p>Joined {new Date(customer.created_at).toLocaleDateString('en-PK')}</p>
            <CustomerStatusForm customer={{ id: customer.id, status: customer.status }} />
          </article>
          <article className="admin-panel stack">
            <h2>Saved addresses</h2>
            {(customer.addresses || []).map((address) => (
              <p key={address.id}>
                <strong>{address.label || `${address.first_name} ${address.last_name}`}</strong><br />
                {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}<br />
                {address.city}{address.region ? `, ${address.region}` : ''} {address.postal_code}
                {address.is_default && <small> · Default</small>}
              </p>
            ))}
            {!customer.addresses?.length && <p>No saved addresses.</p>}
          </article>
        </div>
        <article className="admin-panel">
          <div className="admin-panel__head"><h2>Orders</h2><span>{customer.orders?.length || 0}</span></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead>
              <tbody>
                {(customer.orders || []).map((order) => (
                  <tr key={order.id}>
                    <td><Link href={`/admin/orders/${encodeURIComponent(order.id)}`}>{order.order_number}</Link></td>
                    <td>{order.status}</td>
                    <td>{formatPrice(order.total, order.currency_code)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString('en-PK')}</td>
                  </tr>
                ))}
                {!customer.orders?.length && <tr><td className="admin-empty" colSpan={4}>No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
    </main>
  );
}
