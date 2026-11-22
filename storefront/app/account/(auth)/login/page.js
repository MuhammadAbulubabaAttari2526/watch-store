import { guestOnly } from '@/components/account/guard';
import LoginForm from '@/components/account/LoginForm';
export const metadata = { title: 'Sign in | VELTRIX', robots: { index: false } };
export default async function Page({ searchParams }) {
  await guestOnly(searchParams.next);
  return (
    <section className="section"><div className="container auth">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Sign in</h1>
      <hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} />
      <LoginForm next={searchParams.next} reset={searchParams.reset} />
    </div></section>
  );
}
