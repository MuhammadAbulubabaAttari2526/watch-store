import { guestOnly } from '@/components/account/guard';
import ForgotForm from '@/components/account/ForgotForm';
export const metadata = { title: 'Forgot password | VELTRIX', robots: { index: false } };
export default async function Page({ searchParams }) {
  await guestOnly(searchParams.next);
  return (
    <section className="section"><div className="container auth">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Reset your password</h1>
      <hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} />
      <ForgotForm  />
    </div></section>
  );
}
