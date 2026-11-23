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
          <div className="admin-login__identity">
            <span className="admin-login__wordmark">VELTRIX</span>
            <span className="admin-login__rule" />
            <p>Innovation in Every Detail</p>
          </div>
          <p className="admin-login__eyebrow"><span />Administration</p>
        </div>
        <section className="admin-login__panel">
          <div className="admin-login__card">
            <div className="admin-login__crest" aria-hidden="true"><span>V</span></div>
            <h1>Welcome back</h1>
            <p className="admin-login__copy">Sign in to manage VELTRIX.</p>
            <AdminLoginForm />
            <div className="admin-login__back-row">
              <span />
              <Link className="admin-login__back" href="/"><b aria-hidden="true">←</b>Back to storefront</Link>
              <span />
            </div>
          </div>
        </section>
      </main>
    </AdminBody>
  );
}
