'use client';

import { useFormState } from 'react-dom';
import { changeAdminPasswordAction } from '@/lib/admin/actions';
import Field, { Notice, Submit } from '@/components/account/Field';

export default function AdminPasswordForm() {
  const [state, action] = useFormState(changeAdminPasswordAction, {});
  return (
    <form action={action} className="stack admin-security-form" noValidate>
      <Notice state={state} />
      <Field name="current_password" label="Current password" type="password" autoComplete="current-password" />
      <Field name="new_password" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      <Field name="confirm_password" label="Confirm new password" type="password" autoComplete="new-password" />
      <Submit className="btn--block">Change password</Submit>
    </form>
  );
}
