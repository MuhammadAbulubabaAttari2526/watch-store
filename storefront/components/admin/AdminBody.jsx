'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { adminLogoutAction } from '@/lib/admin/actions';

const navigation = [
  ['overview', 'Overview', 'M0 3h7v7H0zM10 3h7v7h-7zM0 13h7v7H0zM10 13h7v7h-7z', '/admin'],
  ['orders', 'Orders', 'M4 3h16v18H4zM8 1v4M16 1v4M4 8h16M8 12h3M8 16h6', '/admin?tab=orders'],
  ['products', 'Products', 'm12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10', '/admin?tab=products'],
  ['customers', 'Customers', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6', '/admin?tab=customers'],
  ['reviews', 'Reviews', 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2Z', '/admin?tab=reviews'],
  ['inventory', 'Inventory history', 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2', '/admin?tab=inventory'],
  ['settings', 'Store settings', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.2l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-2.8-1.6.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.2l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.6-2.8.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.2l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 2.8 1.6-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3.2l-.2.1a1.7 1.7 0 0 0-1 1.6Z', '/admin?tab=settings'],
  ['security', 'Security', 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11ZM9 12l2 2 4-4', '/admin?tab=security'],
];

function AdminIcon({ path }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

export default function AdminBody({ admin, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = navigation.some(([key]) => key === requestedTab) ? requestedTab : 'overview';
  const sectionName = pathname.startsWith('/admin/products')
    ? 'products'
    : pathname.startsWith('/admin/orders')
      ? 'orders'
      : pathname.startsWith('/admin/customers')
        ? 'customers'
        : activeTab;
  const displayName = [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email || 'Administrator';
  const initials = displayName.slice(0, 1).toUpperCase();
  const canSearch = ['products', 'orders', 'customers'].includes(sectionName);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    document.body.classList.add('admin-ui');
    return () => document.body.classList.remove('admin-ui');
  }, []);

  return (
    <div className={`admin-shell${sidebarOpen ? '' : ' admin-shell--collapsed'}`}>
      <aside className="admin-sidebar">
        <Link className="admin-sidebar__brand" href="/admin" aria-label="VELTRIX Administration home">
          <span className="admin-sidebar__mark" aria-hidden="true">V</span>
          <span className="admin-sidebar__wordmark">VELTRIX</span>
          <span className="admin-sidebar__tagline">PREMIUM WATCHES</span>
        </Link>
        <nav id="admin-navigation" className="admin-nav" aria-label="Admin navigation">
          {navigation.map(([key, label, icon, href]) => (
            <Link
              key={key}
              className={sectionName === key ? 'is-active' : ''}
              href={href}
              aria-current={sectionName === key ? 'page' : undefined}
            >
              <AdminIcon path={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__user">
          <span className="admin-avatar" aria-hidden="true">{initials}</span>
          <span className="admin-sidebar__identity">
            <strong>{displayName}</strong>
            <small>{admin.role}</small>
          </span>
          <form action={adminLogoutAction}><button type="submit" aria-label="Sign out">↗</button></form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-globalbar">
          <div className="admin-globalbar__left">
            <button
              className="admin-menu-toggle"
              type="button"
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-navigation"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {canSearch ? (
              <form className="admin-global-search" action="/admin" role="search">
                <input type="hidden" name="tab" value={sectionName} />
                <AdminIcon path="m20 20-4.3-4.3M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                <input
                  type="search"
                  name="q"
                  aria-label={`Search ${sectionName}`}
                  placeholder="Search products, orders..."
                  defaultValue={searchParams.get('q') || ''}
                />
                <button className="visually-hidden" type="submit">Search</button>
              </form>
            ) : <p><span>VELTRIX</span><i aria-hidden="true">/</i> Administration</p>}
          </div>
          <div className="admin-globalbar__account">
            <span className="admin-avatar" aria-hidden="true">{initials}</span>
            <span>{displayName}</span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
