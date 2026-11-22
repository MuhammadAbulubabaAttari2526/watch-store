'use client';

import { useFormState } from 'react-dom';
import { adminLoginAction } from '@/lib/admin/actions';
import Field, { Submit, Notice } from '@/components/account/Field';

export default function AdminLoginForm() {
  const [state, action] = useFormState(adminLoginAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Notice state={state} />
      <Field name="email" label="Admin email" type="email" autoComplete="email" />
      <Field name="password" label="Password" type="password" autoComplete="current-password" />
      <Submit className="btn--block">Sign in to dashboard</Submit>
    </form>
  );
}
