import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomer } from '@/lib/auth/server';
import { logoutAction } from '@/lib/auth/actions';

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }) {
  const customer = await getCustomer();
  if (!customer) redirect('/account/login');
  return (
    <section className="section"><div className="container account">
      <nav className="account__nav" aria-label="Account">
        <Link href="/account">Profile</Link><Link href="/account/orders">Orders</Link><Link href="/account/addresses">Addresses</Link>
        <form action={logoutAction}><button type="submit" className="link-btn">Sign out</button></form>
      </nav>
      <div>{children}</div>
    </div></section>
  );
}
