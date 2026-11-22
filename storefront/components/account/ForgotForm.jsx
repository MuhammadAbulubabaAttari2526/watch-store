'use client';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { forgotPasswordAction } from '@/lib/auth/actions';
import Field, { Submit, Notice } from './Field';

export default function ForgotForm() {
  const [state, action] = useFormState(forgotPasswordAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Notice state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.errors?.email} />
      <Submit className="btn--block">Send reset link</Submit>
      <p className="auth__links"><Link href="/account/login">Back to sign in</Link></p>
    </form>
  );
}
