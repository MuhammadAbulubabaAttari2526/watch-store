import Link from 'next/link';
import { adminApi, requireAdmin } from '@/lib/admin/server';
import { adminLogoutAction } from '@/lib/admin/actions';

export const metadata = { title: 'Admin dashboard | VELTRIX', robots: { index: false } };

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-PK')}`;
const date = (value) => value ? new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '-';
const name = (customer) => [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || customer?.email || 'Guest';

async function loadDashboard(tab) {
  const overview = await adminApi('GET', '/api/admin/analytics/overview');
  let orders = null;
  let products = null;
  if (tab === 'orders') orders = await adminApi('GET', '/api/admin/orders', { params: { limit: 50 } });
  if (tab === 'products') products = await adminApi('GET', '/api/admin/products', { params: { limit: 50 } });
  return { overview, orders, products };
}

export default async function Page({ searchParams }) {
  const admin = await requireAdmin();
  const tab = ['overview', 'orders', 'products'].includes(searchParams.tab) ? searchParams.tab : 'overview';
  const { overview, orders, products } = await loadDashboard(tab);
  const nav = [
    ['overview', 'Overview'],
    ['orders', 'Orders'],
    ['products', 'Products'],
  ];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar__brand" href="/admin">VELTRIX</Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {nav.map(([value, label]) => (
            <Link key={value} className={tab === value ? 'is-active' : ''} href={value === 'overview' ? '/admin' : `/admin?tab=${value}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__user">
          <strong>{admin.firstName || 'Admin'} {admin.lastName || ''}</strong>
          <span>{admin.role}</span>
          <form action={adminLogoutAction}><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p>VELTRIX Administration</p>
            <h1>{tab === 'overview' ? 'Dashboard' : tab === 'orders' ? 'Orders' : 'Products'}</h1>
          </div>
          <Link className="admin-store-link" href="/">View store</Link>
        </header>

        {tab === 'overview' && (
          <>
            <div className="admin-metrics">
              <article><span>Revenue</span><strong>{money(overview.totalRevenue)}</strong><small>{overview.completedOrders} completed orders</small></article>
              <article><span>Orders</span><strong>{overview.totalOrders}</strong><small>{overview.pendingOrders} pending</small></article>
              <article><span>Customers</span><strong>{overview.totalCustomers}</strong><small>Registered accounts</small></article>
              <article><span>Products</span><strong>{overview.totalProducts}</strong><small>{overview.lowStock?.length || 0} low stock</small></article>
            </div>
            <div className="admin-grid">
              <article className="admin-panel">
                <div className="admin-panel__head"><h2>Recent orders</h2><Link href="/admin?tab=orders">View all</Link></div>
                <OrderTable items={overview.recentOrders || []} compact />
              </article>
              <article className="admin-panel">
                <div className="admin-panel__head"><h2>Low stock</h2></div>
                {(overview.lowStock || []).length ? (
                  <ul className="admin-stock">
                    {(overview.lowStock || []).slice(0, 8).map((item) => (
                      <li key={item.id}><div><strong>{item.variant?.product?.title || 'Product'}</strong><span>{item.variant?.sku}</span></div><b>{item.quantity} left</b></li>
                    ))}
                  </ul>
                ) : <p className="admin-empty">All products are adequately stocked.</p>}
              </article>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <article className="admin-panel">
            <div className="admin-panel__head"><h2>All orders</h2><span>{orders?.total || 0} total</span></div>
            <OrderTable items={orders?.items || []} />
          </article>
        )}

        {tab === 'products' && (
          <article className="admin-panel">
            <div className="admin-panel__head"><h2>Catalog</h2><span>{products?.total || 0} products</span></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Brand</th><th>Status</th><th>Stock</th><th>Updated</th></tr></thead>
                <tbody>
                  {(products?.items || []).map((product) => {
                    const stock = (product.variants || []).reduce((sum, variant) => sum + (variant.inventory?.quantity || 0), 0);
                    return (
                      <tr key={product.id}>
                        <td><strong>{product.title}</strong><small>{product.slug}</small></td>
                        <td>{product.brand}</td>
                        <td><StatusBadge value={product.status} /></td>
                        <td>{stock}</td>
                        <td>{date(product.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ value }) {
  return <span className={`admin-status admin-status--${String(value).toLowerCase()}`}>{value}</span>;
}

function OrderTable({ items, compact = false }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
        <tbody>
          {items.map((order) => (
            <tr key={order.id}>
              <td><strong>{order.orderNumber}</strong>{compact && <small>{order.items?.length || 0} items</small>}</td>
              <td>{name(order.customer)}</td>
              <td><StatusBadge value={order.status} /></td>
              <td>{money(order.total)}</td>
              <td>{date(order.createdAt)}</td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan="5" className="admin-empty">No orders yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
