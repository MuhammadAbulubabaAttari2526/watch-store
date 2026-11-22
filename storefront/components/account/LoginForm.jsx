'use client';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { loginAction } from '@/lib/auth/actions';
import Field, { Submit, Notice } from './Field';

export default function LoginForm({ next, reset }) {
  const [state, action] = useFormState(loginAction, {});
  return (
    <form action={action} className="stack" noValidate>
      {reset && <div className="alert alert--success" role="status">Password updated. Sign in with your new password.</div>}
      <Notice state={state} />
      <input type="hidden" name="next" value={next || ''} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.errors?.email} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" />
      <Submit className="btn--block">Sign in</Submit>
      <p className="auth__links"><Link href="/account/forgot-password">Forgot your password?</Link><Link href="/account/register">Create an account</Link></p>
    </form>
  );
}
