import { guestOnly } from '@/components/account/guard';
import RegisterForm from '@/components/account/RegisterForm';
export const metadata = { title: 'Create account | VELTRIX', robots: { index: false } };
export default async function Page({ searchParams }) {
  await guestOnly(searchParams.next);
  return (
    <section className="section"><div className="container auth">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Create your account</h1>
      <hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} />
      <RegisterForm next={searchParams.next} />
    </div></section>
  );
}
