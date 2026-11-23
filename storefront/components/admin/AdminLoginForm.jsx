'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';
import { adminLoginAction } from '@/lib/admin/actions';
import Field, { Submit, Notice } from '@/components/account/Field';

export default function AdminLoginForm() {
  const [state, action] = useFormState(adminLoginAction, {});
  return (
    <form action={action} className="stack admin-login__form" noValidate>
      <Notice state={state} />
      <Field className="admin-login__email" name="email" label="Admin email" type="email" autoComplete="email" />
      <Field className="admin-login__password" name="password" label="Password" type="password" autoComplete="current-password" />
      <Submit className="btn--block admin-login__submit">Sign in to dashboard <span aria-hidden="true">→</span></Submit>
      <Link className="admin-login__forgot" href="/account/forgot-password">Forgot your password?</Link>
    </form>
  );
}
