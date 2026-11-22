'use client';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { registerAction } from '@/lib/auth/actions';
import Field, { Submit, Notice } from './Field';

export default function RegisterForm({ next }) {
  const [state, action] = useFormState(registerAction, {});
  const e = state.errors || {};
  return (
    <form action={action} className="stack" noValidate>
      <Notice state={state} />
      <input type="hidden" name="next" value={next || ''} />
      <div className="two"><Field name="first_name" label="First name" autoComplete="given-name" error={e.first_name} /><Field name="last_name" label="Last name" autoComplete="family-name" /></div>
      <Field name="email" label="Email" type="email" autoComplete="email" error={e.email} />
      <Field name="phone" label="Phone (optional)" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" error={e.phone} />
      <Field name="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." error={e.password} />
      <Submit className="btn--block">Create account</Submit>
      <p className="auth__links"><Link href="/account/login">I already have an account</Link></p>
    </form>
  );
}
