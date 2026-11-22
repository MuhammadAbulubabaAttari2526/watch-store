'use client';
import { useFormState } from 'react-dom';
import { updateProfileAction } from '@/lib/auth/actions';
import Field, { Submit, Notice } from './Field';

export default function ProfileForm({ customer }) {
  const [state, action] = useFormState(updateProfileAction, {});
  const e = state.errors || {};
  return (
    <form action={action} className="stack" noValidate>
      <Notice state={state} />
      <div className="two"><Field name="first_name" label="First name" defaultValue={customer.first_name || ''} error={e.first_name} /><Field name="last_name" label="Last name" defaultValue={customer.last_name || ''} /></div>
      <Field name="email" label="Email" value={customer.email} readOnly hint="Contact us on WhatsApp to change your email." />
      <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={customer.phone || ''} placeholder="0300 1234567" error={e.phone} />
      <Submit>Save changes</Submit>
    </form>
  );
}
