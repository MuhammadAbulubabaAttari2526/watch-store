import Link from 'next/link';
import ResetForm from '@/components/account/ResetForm';
export const metadata = { title: 'Choose a new password | VELTRIX', robots: { index: false } };
export default function Page({ searchParams }) {
  const { code, token_hash: tokenHash } = searchParams;
  return (
    <section className="section"><div className="container auth">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Choose a new password</h1>
      <hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} />
      {code || tokenHash ? <ResetForm code={code} token_hash={tokenHash} returnTo={searchParams.returnTo} /> : <div className="stack"><div className="alert alert--error">This reset link is not valid.</div><Link className="btn" href="/account/forgot-password">Request a new link</Link></div>}
    </div></section>
  );
}
