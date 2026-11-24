import Link from 'next/link';
import { adminApi } from '@/lib/admin/server';
import { updateOrderStatusAction, updateProductStatusAction } from '@/lib/admin/actions';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import BannerManager from '@/components/admin/BannerManager';
import TaxonomyManager from '@/components/admin/TaxonomyManager';
import DiscountManager from '@/components/admin/DiscountManager';
import CustomerStatusForm from '@/components/admin/CustomerStatusForm';
import ReviewStatusForm from '@/components/admin/ReviewStatusForm';
import AdminPasswordForm from '@/components/admin/AdminPasswordForm';
import { formatPrice } from '@/lib/utils/format';

export const metadata = { title: 'Admin dashboard | VELTRIX', robots: { index: false } };

const money = (value, currency = 'PKR') => formatPrice(Number(value || 0), currency);
const date = (value) => value ? new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '-';
const name = (customer) => [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || customer?.email || 'Guest';

async function loadDashboard(tab, searchParams) {
  const overview = tab === 'overview' ? await adminApi('GET', '/api/admin/analytics/overview') : null;
  let orders = null;
  let products = null;
  let settings = null;
  let customers = null;
  let reviews = null;
  let inventory = null;
  if (tab === 'orders') orders = await adminApi('GET', '/api/admin/orders', {
    params: { limit: 50, status: searchParams.status, search: searchParams.q },
  });
  if (tab === 'products') products = await adminApi('GET', '/api/admin/products', {
    params: { limit: 50, search: searchParams.q },
  });
  if (tab === 'settings') settings = await adminApi('GET', '/api/admin/settings');
  if (tab === 'customers') customers = await adminApi('GET', '/api/admin/customers', {
    params: { limit: 50, status: searchParams.status, search: searchParams.q },
  });
  if (tab === 'reviews') reviews = await adminApi('GET', '/api/admin/reviews', {
    params: { limit: 100, status: searchParams.status },
  });
  if (tab === 'inventory') inventory = await adminApi('GET', '/api/admin/inventory/history');
  return { overview, orders, products, settings, customers, reviews, inventory };
}

export default async function Page({ searchParams }) {
  const tab = ['overview', 'orders', 'products', 'customers', 'reviews', 'inventory', 'settings', 'security'].includes(searchParams.tab) ? searchParams.tab : 'overview';
  const { overview, orders, products, settings, customers, reviews, inventory } = await loadDashboard(tab, searchParams);
  const headings = {
    overview: 'Dashboard', orders: 'Orders', products: 'Products', customers: 'Customers',
    reviews: 'Reviews', inventory: 'Inventory history', settings: 'Store settings', security: 'Security',
  };

  return (
    <main className="admin-page">
        <header className="admin-topbar">
          <div>
            <p>VELTRIX Administration</p>
            <h1>{headings[tab]}</h1>
          </div>
          <Link className="admin-store-link" href="/">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
            View store
          </Link>
        </header>

        {tab === 'overview' && (
          <>
            <div className="admin-metrics">
              <MetricCard
                icon="revenue"
                label="Revenue"
                value={overview.totalRevenueByCurrency?.length
                  ? overview.totalRevenueByCurrency.map(({ currency, total }) => money(total, currency)).join(' · ')
                  : money(0)}
                note={`${overview.completedOrders} completed orders`}
              />
              <MetricCard icon="orders" label="Orders" value={overview.totalOrders} note={`${overview.pendingOrders} pending`} />
              <MetricCard icon="customers" label="Customers" value={overview.totalCustomers} note="Registered accounts" />
              <MetricCard icon="products" label="Products" value={overview.totalProducts} note={`${overview.lowStock?.length || 0} low stock`} />
            </div>
            <div className="admin-grid">
              <article className="admin-panel">
                <div className="admin-panel__head">
                  <div className="admin-section-heading">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2" /></svg>
                    <h2>Recent orders</h2>
                  </div>
                  <Link className="admin-view-all" href="/admin?tab=orders">View all <span aria-hidden="true">→</span></Link>
                </div>
                <OrderTable items={overview.recentOrders || []} compact />
              </article>
              <article className="admin-panel">
                <div className="admin-panel__head">
                  <div className="admin-section-heading">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 10 18H2L12 3ZM12 9v5M12 18h.01" /></svg>
                    <h2>Low stock</h2>
                  </div>
                </div>
                {(overview.lowStock || []).length ? (
                  <ul className="admin-stock">
                    {(overview.lowStock || []).slice(0, 8).map((item) => (
                      <li key={item.id}>
                        <span className="admin-stock__image">
                          {item.image ? <img src={item.image} alt="" /> : <span aria-hidden="true">V</span>}
                        </span>
                        <div className="admin-stock__details">
                          <strong>{item.variant?.product?.title || 'Product'}</strong>
                          <span>{item.variant?.sku}</span>
                        </div>
                        <b>{item.quantity} left</b>
                      </li>
                    ))}
                  </ul>
                ) : <p className="admin-empty">All products are adequately stocked.</p>}
              </article>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <article className="admin-panel">
            <div className="admin-panel__head">
              <div className="admin-section-heading">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14v17H5zM9 2v4M15 2v4M8 10h8M8 14h8M8 18h5" /></svg>
                <h2>All orders</h2>
              </div>
              <span>{orders?.total || 0} total</span>
            </div>
            <form method="get" className="admin-panel__head admin-filter-bar">
              <input type="hidden" name="tab" value="orders" />
              <label className="field">Search orders<input className="input" type="search" name="q" defaultValue={searchParams.q || ''} placeholder="Order number or email" /></label>
              <label className="field">Status<select className="input" name="status" defaultValue={searchParams.status || ''}><option value="">All statuses</option>{['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].map((status) => <option key={status}>{status}</option>)}</select></label>
              <button className="btn btn--ghost" type="submit">Filter</button>
            </form>
            <OrderTable items={orders?.items || []} />
          </article>
        )}

        {tab === 'products' && (
          <article className="admin-panel">
            <div className="admin-catalog-head">
              <div className="admin-catalog-head__title">
                <span className="admin-catalog-head__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10" /></svg>
                </span>
                <div><h2>Catalog</h2><p>Manage your products and inventory</p></div>
              </div>
              <div className="admin-catalog-head__actions">
                <span>{products?.total || 0} products</span>
                <Link className="btn admin-primary-button" href="/admin/products/new"><span aria-hidden="true">+</span> Add product</Link>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--products">
                <thead><tr><th>Product</th><th>Brand</th><th>Status</th><th>Stock</th><th>Updated</th><th>Manage</th></tr></thead>
                <tbody>
                  {(products?.items || []).map((product) => {
                    const stock = (product.variants || []).reduce((sum, variant) => sum + (variant.inventory?.quantity || 0), 0);
                    const image = (product.product_images || []).slice().sort((a, b) => a.position - b.position)[0]?.url;
                    return (
                      <tr key={product.id}>
                        <td className="admin-product-cell">
                          <div className="admin-product-cell__inner">
                            <span className="admin-product-thumb">
                              {image ? <img src={image} alt="" /> : <span aria-hidden="true">V</span>}
                            </span>
                            <span><strong>{product.title}</strong><small>{product.slug}</small></span>
                          </div>
                        </td>
                        <td><em>{product.brand}</em></td>
                        <td><StatusBadge value={product.status} /></td>
                        <td>{stock}</td>
                        <td>{date(product.updatedAt)}</td>
                        <td><Link className="link-btn" href={`/admin/products/${encodeURIComponent(product.id)}`}>Edit</Link>{' '}
                          <form action={updateProductStatusAction} style={{ display: 'inline-flex', gap: 8 }}>
                            <input type="hidden" name="id" value={product.id} />
                            <select className="input" aria-label={`Set status for ${product.title}`} name="status" defaultValue={product.status}>
                              {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => <option key={status}>{status}</option>)}
                            </select>
                            <button className="link-btn" type="submit">Save status</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        )}
        {tab === 'customers' && (
          <article className="admin-panel">
            <div className="admin-panel__head"><h2>Customer accounts</h2><span>{customers?.total || 0} total</span></div>
            <form method="get" className="admin-panel__head admin-filter-bar">
              <input type="hidden" name="tab" value="customers" />
              <label className="field">Search customers<input className="input" type="search" name="q" defaultValue={searchParams.q || ''} placeholder="Name or email" /></label>
              <label className="field">Status<select className="input" name="status" defaultValue={searchParams.status || ''}><option value="">All statuses</option><option>ACTIVE</option><option>DISABLED</option></select></label>
              <button className="btn btn--ghost" type="submit">Filter</button>
            </form>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Status</th><th>Manage</th></tr></thead>
                <tbody>
                  {(customers?.items || []).map((customer) => (
                    <tr key={customer.id}>
                      <td><Link href={`/admin/customers/${encodeURIComponent(customer.id)}`}><strong>{[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email}</strong></Link><small>{customer.email}</small></td>
                      <td>{customer.phone || '-'}</td><td>{customer.order_count}</td><td>{date(customer.created_at)}</td>
                      <td><StatusBadge value={customer.status} /></td>
                      <td><CustomerStatusForm customer={{ id: customer.id, status: customer.status }} /></td>
                    </tr>
                  ))}
                  {!customers?.items?.length && <tr><td className="admin-empty" colSpan={6}>No customers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        )}
        {tab === 'reviews' && (
          <article className="admin-panel stack">
            <div className="admin-panel__head"><h2>Review moderation</h2></div>
            <form method="get" className="admin-panel__head admin-filter-bar">
              <input type="hidden" name="tab" value="reviews" />
              <label className="field">Status<select className="input" name="status" defaultValue={searchParams.status || ''}><option value="">All statuses</option>{['PENDING', 'APPROVED', 'REJECTED'].map((status) => <option key={status}>{status}</option>)}</select></label>
              <button className="btn btn--ghost" type="submit">Filter</button>
            </form>
            {(reviews?.items || []).map((review) => (
              <article className="admin-panel stack" key={review.id}>
                <div className="admin-panel__head">
                  <div><h3>{review.title || `Review for ${review.product?.title || 'product'}`}</h3>
                    <small>{review.customer ? `${review.customer.first_name} ${review.customer.last_name} · ${review.customer.email}` : 'Customer unavailable'} · {date(review.created_at)}</small>
                  </div>
                  <StatusBadge value={review.status} />
                </div>
                <p>{review.rating}/5 · {review.product?.title || 'Product removed'}</p>
                <p>{review.body}</p>
                <ReviewStatusForm review={review} />
              </article>
            ))}
            {!reviews?.items?.length && <p className="admin-empty">No reviews found.</p>}
          </article>
        )}
        {tab === 'inventory' && (
          <article className="admin-panel">
            <div className="admin-panel__head"><h2>Recent stock activity</h2><span>Latest 200 entries</span></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Date</th><th>Product / SKU</th><th>Type</th><th>Change</th><th>Note</th><th>Actor</th></tr></thead>
                <tbody>
                  {(inventory?.items || []).map((entry) => (
                    <tr key={entry.id}>
                      <td>{date(entry.created_at)}</td>
                      <td>{entry.variant?.product?.title || 'Product removed'}<small>{entry.variant_sku}</small></td>
                      <td>{entry.type}</td><td>{entry.change > 0 ? `+${entry.change}` : entry.change}</td>
                      <td>{entry.note || '-'}</td>
                      <td>{entry.user ? [entry.user.first_name, entry.user.last_name].filter(Boolean).join(' ') || entry.user.email : 'System / legacy'}</td>
                    </tr>
                  ))}
                  {!inventory?.items?.length && <tr><td className="admin-empty" colSpan={6}>No inventory activity recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        )}
        {tab === 'settings' && (
          <div className="stack">
            <StoreSettingsForm settings={settings?.settings} />
            <TaxonomyManager categories={settings?.categories} collections={settings?.collections} />
            <DiscountManager discounts={settings?.discounts} />
            <BannerManager banners={settings?.banners} />
          </div>
        )}
        {tab === 'security' && (
          <article className="admin-panel admin-security">
            <div className="admin-panel__head"><h2>Change administrator password</h2></div>
            <div className="admin-security__body">
              <p>Confirm your current password before choosing a new one.</p>
              <AdminPasswordForm />
            </div>
          </article>
        )}
      </main>
  );
}

function StatusBadge({ value }) {
  return <span className={`admin-status admin-status--${String(value).toLowerCase()}`}>{value}</span>;
}

function MetricCard({ icon, label, value, note }) {
  const paths = {
    revenue: 'M3 7h18l-2 11H5L3 7ZM3 7 2 4H1M8 11h.01M16 11h.01M8 21h.01M17 21h.01',
    orders: 'M6 3h9l4 4v14H6zM15 3v5h5M9 12h7M9 16h7',
    customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11a4 4 0 0 0 0-8M18 15a4 4 0 0 1 4 4v2',
    products: 'm12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10',
  };
  return (
    <article className="admin-metric">
      <div className="admin-metric__top">
        <span className="admin-metric__icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]} /></svg>
        </span>
        <span className="admin-metric__label">{label}</span>
        <svg className="admin-metric__trend" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19v-5M10 19V9M16 19V5M22 19V2" /></svg>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function OrderTable({ items, compact = false }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th>{!compact && <th>Update status</th>}</tr></thead>
        <tbody>
          {items.map((order) => (
            <tr key={order.id}>
              <td><Link href={`/admin/orders/${encodeURIComponent(order.id)}`}><strong>{order.orderNumber}</strong></Link>{compact && <small>{order.items?.length || 0} items</small>}</td>
              <td>{name(order.customer)}</td>
              <td><StatusBadge value={order.status} /></td>
              <td>{money(order.total, order.currencyCode)}</td>
              <td>{date(order.createdAt)}</td>
              {!compact && <td><form action={updateOrderStatusAction} style={{ display: 'inline-flex', gap: 8 }}>
                <input type="hidden" name="id" value={order.id} />
                <select className="input" name="status" aria-label={`Update order ${order.orderNumber}`} defaultValue={order.status}>
                  {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].map((status) => <option key={status}>{status}</option>)}
                </select>
                <button className="link-btn" type="submit">Save</button>
              </form></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className={`admin-empty-state${compact ? ' admin-empty-state--compact' : ''}`}>
          <svg aria-hidden="true" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 19h36l4 9v18H6V28l4-9ZM10 19l4-10h28l4 10M6 28h13l4 5h10l4-5h13M20 17h16" />
          </svg>
          <strong>No orders yet.</strong>
          <p>Orders will appear here once customers make a purchase.</p>
        </div>
      )}
    </div>
  );
}
