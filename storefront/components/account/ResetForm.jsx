'use client';
import { useFormState } from 'react-dom';
import { resetPasswordAction } from '@/lib/auth/actions';
import Field, { Submit, Notice } from './Field';

export default function ResetForm({ code, token_hash: tokenHash, recovery }) {
  const [state, action] = useFormState(resetPasswordAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Notice state={state} />
      <input type="hidden" name="code" value={code || ''} /><input type="hidden" name="token_hash" value={tokenHash || ''} />
      <input type="hidden" name="recovery" value={recovery ? '1' : ''} />
      <Field name="password" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." error={state.errors?.password} />
      <Submit className="btn--block">Save new password</Submit>
    </form>
  );
}
