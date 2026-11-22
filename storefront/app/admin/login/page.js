import Link from 'next/link';
import AdminBody from '@/components/admin/AdminBody';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getAdmin } from '@/lib/admin/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin login | VELTRIX', robots: { index: false } };

export default async function Page() {
  if (await getAdmin()) redirect('/admin');
  return (
    <AdminBody>
      <main className="admin-login">
        <div className="admin-login__brand">
          <span>VELTRIX</span>
          <p>Administration</p>
        </div>
        <div className="admin-login__card">
          <h1>Welcome back</h1>
          <p className="admin-login__copy">Sign in to manage VELTRIX.</p>
          <AdminLoginForm />
          <Link className="admin-login__back" href="/">Back to storefront</Link>
        </div>
      </main>
    </AdminBody>
  );
}
